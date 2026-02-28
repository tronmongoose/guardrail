import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEmbeddings, clusterEmbeddings, generateProgramDraft, extractContentDigests, analyzeVideoWithGemini } from "@guide-rail/ai";
import type { ContentDigest, EnrichedContentDigest } from "@guide-rail/ai";
import { ProgramDraftSchema } from "@guide-rail/shared";
import type { VideoAnalysisOutput } from "@guide-rail/shared";
import { Prisma } from "@prisma/client";
import { aiLogger, createTimer } from "@/lib/logger";

const HF_MODEL = process.env.HF_EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2";

/**
 * Async program generation endpoint.
 * Creates a GenerationJob and processes it in the background.
 * Returns immediately with the job ID for polling.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;

  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { videos: true, artifacts: true },
  });

  if (!program || program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hasContent = program.videos.length > 0 || program.artifacts.length > 0;
  if (!hasContent) {
    return NextResponse.json({ error: "No content to process" }, { status: 400 });
  }

  // Check for existing pending/processing job
  const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes without progress = stale

  const existingJob = await prisma.generationJob.findFirst({
    where: {
      programId,
      status: { in: ["PENDING", "PROCESSING"] },
    },
  });

  if (existingJob) {
    const lastActivity = existingJob.updatedAt ?? existingJob.createdAt;
    const isStale = Date.now() - lastActivity.getTime() > STALE_THRESHOLD_MS;

    if (isStale) {
      // Auto-cancel stale job so user can retry
      await prisma.generationJob.update({
        where: { id: existingJob.id },
        data: {
          status: "FAILED",
          error: `Automatically cancelled: no progress for ${Math.round(STALE_THRESHOLD_MS / 60000)} minutes (stuck at ${existingJob.progress}% / ${existingJob.stage})`,
          completedAt: new Date(),
        },
      });
      console.warn(`[generate-async] Auto-cancelled stale job ${existingJob.id} for program ${programId}`);
      // Fall through to create a new job
    } else {
      return NextResponse.json({
        jobId: existingJob.id,
        status: existingJob.status,
        stage: existingJob.stage,
        progress: existingJob.progress,
        message: "Generation already in progress",
      });
    }
  }

  // Create new job
  const job = await prisma.generationJob.create({
    data: {
      programId,
      status: "PENDING",
      stage: "queued",
      progress: 0,
    },
  });

  // Start async processing (fire and forget)
  processGenerationJob(job.id, programId).catch((err) => {
    console.error("[generate-async] Background job failed:", err);
  });

  return NextResponse.json({
    jobId: job.id,
    status: "PENDING",
    stage: "queued",
    progress: 0,
    message: "Generation started",
  });
}

/**
 * Background processing function.
 * Updates job status/progress as it runs.
 * Processes both YouTube videos and uploaded artifacts (PDFs, DOCXs, etc.).
 */
const JOB_TIMEOUT_MS = 8 * 60 * 1000; // 8 minutes (headroom before frontend 10-min timeout)

async function processGenerationJob(jobId: string, programId: string) {
  const timer = createTimer();
  const deadline = Date.now() + JOB_TIMEOUT_MS;

  function checkDeadline(stage: string) {
    if (Date.now() > deadline) {
      throw new Error(`Job timed out after ${Math.round(JOB_TIMEOUT_MS / 60000)} minutes during ${stage} stage`);
    }
  }

  try {
    // Mark as processing — start with video_analysis stage
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING", stage: "video_analysis", progress: 0, startedAt: new Date() },
    });

    // Fetch program with videos, artifacts, and existing analyses
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        videos: {
          include: { analysis: true },
        },
        artifacts: true,
      },
    });

    if (!program) throw new Error("Program not found");

    // Filter artifacts with usable text
    const usableArtifacts = program.artifacts.filter(
      (a) => a.extractedText && a.extractedText.length > 0
    );

    // Build ID sets for later lookups
    const videoIdSet = new Set(program.videos.map((v) => v.id));

    // ── Step 0: Video Analysis (0-10%) ──
    // Check/run Gemini analysis for videos missing it
    checkDeadline("video_analysis");
    const videosNeedingAnalysis = program.videos.filter((v) => !v.analysis);
    let analysisCount = 0;

    if (videosNeedingAnalysis.length > 0 && process.env.GOOGLE_AI_API_KEY) {
      console.info(`[generate-async] Running Gemini analysis for ${videosNeedingAnalysis.length} video(s)`);
      const ANALYSIS_CONCURRENCY = 2;

      for (let i = 0; i < videosNeedingAnalysis.length; i += ANALYSIS_CONCURRENCY) {
        checkDeadline("video_analysis");
        const batch = videosNeedingAnalysis.slice(i, i + ANALYSIS_CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map(async (v) => {
            const analysis = await analyzeVideoWithGemini(v.videoId, v.title ?? "Untitled", v.durationSeconds ?? undefined);
            await prisma.videoAnalysis.upsert({
              where: { youtubeVideoId: v.id },
              create: {
                youtubeVideoId: v.id,
                summary: analysis.summary,
                fullTranscript: analysis.fullTranscript ?? null,
                segments: analysis.segments as unknown as Prisma.InputJsonValue,
                topics: analysis.topics as unknown as Prisma.InputJsonValue,
                keyMoments: analysis.keyMoments as unknown as Prisma.InputJsonValue ?? undefined,
                people: analysis.people as unknown as Prisma.InputJsonValue ?? undefined,
                durationSeconds: analysis.durationSeconds ?? null,
              },
              update: {
                summary: analysis.summary,
                fullTranscript: analysis.fullTranscript ?? null,
                segments: analysis.segments as unknown as Prisma.InputJsonValue,
                topics: analysis.topics as unknown as Prisma.InputJsonValue,
                keyMoments: analysis.keyMoments as unknown as Prisma.InputJsonValue ?? undefined,
                people: analysis.people as unknown as Prisma.InputJsonValue ?? undefined,
                durationSeconds: analysis.durationSeconds ?? null,
                analyzedAt: new Date(),
              },
            });
            return analysis;
          }),
        );

        for (const r of results) {
          if (r.status === "fulfilled") analysisCount++;
          else console.warn(`[generate-async] Gemini analysis failed for a video:`, r.reason);
        }

        const analysisProgress = Math.round(((i + batch.length) / videosNeedingAnalysis.length) * 10);
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { progress: analysisProgress },
        });
      }
    }

    // Re-fetch videos with analyses after running new ones
    const videosWithAnalysis = await prisma.youTubeVideo.findMany({
      where: { programId },
      include: { analysis: true },
    });

    // Build analysis lookup: video record ID → VideoAnalysis data
    const analysisMap = new Map<string, VideoAnalysisOutput>();
    for (const v of videosWithAnalysis) {
      if (v.analysis) {
        analysisMap.set(v.id, {
          summary: v.analysis.summary,
          fullTranscript: v.analysis.fullTranscript ?? undefined,
          segments: v.analysis.segments as unknown as VideoAnalysisOutput["segments"],
          topics: v.analysis.topics as unknown as VideoAnalysisOutput["topics"],
          keyMoments: v.analysis.keyMoments as unknown as VideoAnalysisOutput["keyMoments"],
          people: v.analysis.people as unknown as VideoAnalysisOutput["people"],
          durationSeconds: v.analysis.durationSeconds ?? undefined,
        });
      }
    }

    const hasVideoAnalysis = analysisMap.size > 0;
    console.info(`[generate-async] Video analysis: ${analysisMap.size}/${program.videos.length} videos analyzed (${analysisCount} new)`);

    // ── Step 1: Embeddings (10-25%) ──
    checkDeadline("embedding");
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { stage: "embedding", progress: 10 },
    });

    // Use analysis summaries for richer embeddings when available
    const videoEmbeddingInputs = program.videos.map((v) => {
      const analysis = analysisMap.get(v.id);
      if (analysis) {
        // Richer embedding text from analysis
        const topicLabels = analysis.topics.map((t) => t.label).join(". ");
        return {
          contentId: v.id,
          text: `${v.title ?? ""}: ${analysis.summary}. Topics: ${topicLabels}`.slice(0, 4000),
        };
      }
      return {
        contentId: v.id,
        text: v.transcript
          ? `${v.title ?? ""}: ${v.transcript}`.slice(0, 4000)
          : `${v.title ?? ""} ${v.description ?? ""}`.trim() || v.videoId,
      };
    });

    const artifactEmbeddingInputs = usableArtifacts.map((a) => ({
      contentId: a.id,
      text: `${a.originalFilename}: ${a.extractedText!}`.slice(0, 4000),
    }));

    const embeddingInputs = [...videoEmbeddingInputs, ...artifactEmbeddingInputs];

    aiLogger.embeddingStart(programId, embeddingInputs.length);
    const embeddingTimer = createTimer();

    const embeddingResults = await getEmbeddings(embeddingInputs);
    aiLogger.embeddingSuccess(programId, embeddingTimer.elapsed(), embeddingResults.length);

    // Store video embeddings only (Embedding table has FK to YouTubeVideo)
    for (const result of embeddingResults) {
      if (videoIdSet.has(result.contentId)) {
        await prisma.embedding.upsert({
          where: {
            programId_videoId_model: { programId, videoId: result.contentId, model: HF_MODEL },
          },
          create: { programId, videoId: result.contentId, model: HF_MODEL, vector: result.embedding },
          update: { vector: result.embedding },
        });
      }
    }

    await prisma.generationJob.update({
      where: { id: jobId },
      data: { stage: "clustering", progress: 25 },
    });

    // ── Step 2: Clustering (25-35%) ──
    checkDeadline("clustering");
    const clusterInputs = embeddingResults.map((r) => ({
      contentId: r.contentId,
      embedding: r.embedding,
    }));

    const totalContent = program.videos.length + usableArtifacts.length;
    const k = Math.min(program.durationWeeks, totalContent);
    const clusters = clusterEmbeddings(clusterInputs, k);

    aiLogger.clusteringComplete(programId, timer.elapsed(), {
      videoCount: program.videos.length,
      clusterCount: clusters.length,
    });

    // Store cluster assignments for videos only
    for (const cluster of clusters) {
      for (const contentId of cluster.contentIds) {
        if (videoIdSet.has(contentId)) {
          await prisma.clusterAssignment.upsert({
            where: { programId_videoId: { programId, videoId: contentId } },
            create: { programId, videoId: contentId, clusterId: cluster.clusterId },
            update: { clusterId: cluster.clusterId },
          });
        }
      }
    }

    // ── Step 2.5: Content Extraction / Enriched Digests (35-55%) ──
    checkDeadline("analyzing");
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { stage: "analyzing", progress: 35 },
    });

    // Build enriched digests from analysis (skip LLM for these)
    const enrichedDigests: (ContentDigest | EnrichedContentDigest)[] = [];
    const videosNeedingLLMExtraction: { contentId: string; contentTitle: string; text: string | null; contentType: "video" }[] = [];

    for (const v of program.videos) {
      const analysis = analysisMap.get(v.id);
      if (analysis && analysis.topics.length > 0) {
        // Build enriched digest directly from Gemini analysis — no LLM call needed
        const enriched: EnrichedContentDigest = {
          contentId: v.id,
          contentTitle: v.title ?? "Untitled",
          contentType: "video",
          keyConcepts: analysis.topics.map((t) => t.label),
          skillsIntroduced: analysis.topics
            .flatMap((t) => t.subtopics ?? [])
            .slice(0, 5),
          memorableExamples: (analysis.keyMoments ?? [])
            .filter((m) => m.significance === "high")
            .map((m) => m.description)
            .slice(0, 3),
          difficultyLevel: "intermediate",
          summary: analysis.summary,
          segments: analysis.segments,
          topics: analysis.topics,
          keyMoments: analysis.keyMoments ?? [],
          durationSeconds: analysis.durationSeconds,
        };
        enrichedDigests.push(enriched);
      } else {
        // No analysis — needs LLM extraction
        videosNeedingLLMExtraction.push({
          contentId: v.id,
          contentTitle: v.title ?? "Untitled",
          text: v.transcript,
          contentType: "video",
        });
      }
    }

    // Artifacts always go through LLM extraction
    const artifactsForExtraction = usableArtifacts.map((a) => ({
      contentId: a.id,
      contentTitle: a.originalFilename,
      text: a.extractedText,
      contentType: "document" as const,
    }));

    const allForExtraction = [...videosNeedingLLMExtraction, ...artifactsForExtraction];

    if (allForExtraction.length > 0) {
      aiLogger.extractionStart(programId, allForExtraction.length);
      const extractionTimer = createTimer();

      const llmDigests = await extractContentDigests(
        allForExtraction,
        async (completed, total) => {
          const extractionProgress = 35 + Math.round((completed / total) * 20);
          await prisma.generationJob.update({
            where: { id: jobId },
            data: { progress: extractionProgress },
          });
        },
      );
      enrichedDigests.push(...llmDigests);
      aiLogger.extractionSuccess(programId, extractionTimer.elapsed(), llmDigests.length);
    } else {
      console.info(`[generate-async] All videos have Gemini analysis — skipping LLM extraction`);
    }

    await prisma.generationJob.update({
      where: { id: jobId },
      data: { progress: 55 },
    });

    // ── Step 3: LLM Generation (55-85%) ──
    checkDeadline("generating");
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { stage: "generating", progress: 55 },
    });

    // Build lookup maps
    const videoMap = new Map(program.videos.map((v) => [v.id, v]));
    const artifactMap = new Map(usableArtifacts.map((a) => [a.id, a]));

    const clusterData = clusters.map((c) => ({
      clusterId: c.clusterId,
      contentIds: c.contentIds,
      contentTitles: c.contentIds.map((cid) => {
        const video = videoMap.get(cid);
        if (video) return video.title ?? "Untitled";
        const artifact = artifactMap.get(cid);
        if (artifact) return artifact.originalFilename;
        return "Untitled";
      }),
      contentTranscripts: c.contentIds.map((cid) => {
        const video = videoMap.get(cid);
        if (video) return video.transcript ?? "";
        const artifact = artifactMap.get(cid);
        if (artifact) return artifact.extractedText ?? "";
        return "";
      }),
      contentTypes: c.contentIds.map((cid): "video" | "document" =>
        videoIdSet.has(cid) ? "video" : "document"
      ),
      summary: `Group of ${c.contentIds.length} content source(s)`,
    }));

    aiLogger.generationStart(programId, {
      clusterCount: clusters.length,
      durationWeeks: program.durationWeeks,
    });

    const llmTimer = createTimer();
    const draft = await generateProgramDraft({
      programId,
      programTitle: program.title,
      programDescription: program.description ?? undefined,
      outcomeStatement: program.outcomeStatement ?? undefined,
      targetAudience: program.targetAudience ?? undefined,
      targetTransformation: program.targetTransformation ?? undefined,
      vibePrompt: program.vibePrompt ?? undefined,
      durationWeeks: program.durationWeeks,
      clusters: clusterData,
      contentDigests: enrichedDigests,
      hasVideoAnalysis,
    });

    await prisma.generationJob.update({
      where: { id: jobId },
      data: { stage: "validating", progress: 85 },
    });

    // Validate
    const validated = ProgramDraftSchema.safeParse(draft);
    if (!validated.success) {
      aiLogger.validationFailure(programId, validated.error.issues.length);
      throw new Error(`Schema validation failed: ${JSON.stringify(validated.error.issues)}`);
    }

    await prisma.generationJob.update({
      where: { id: jobId },
      data: { stage: "persisting", progress: 90 },
    });

    // ── Step 4: Persist (90-100%) ──
    checkDeadline("persisting");
    await prisma.programDraft.create({
      data: {
        programId,
        draftJson: JSON.parse(JSON.stringify(validated.data)),
        status: "PENDING",
      },
    });

    // Delete existing structure and create new
    let sessionCount = 0;
    let actionCount = 0;
    let compositeCount = 0;

    await prisma.$transaction(async (tx) => {
      await tx.week.deleteMany({ where: { programId } });

      for (const week of validated.data.weeks) {
        const createdWeek = await tx.week.create({
          data: {
            programId,
            title: week.title,
            summary: week.summary,
            weekNumber: week.weekNumber,
          },
        });

        for (const session of week.sessions) {
          sessionCount++;
          const createdSession = await tx.session.create({
            data: {
              weekId: createdWeek.id,
              title: session.title,
              summary: session.summary,
              keyTakeaways: session.keyTakeaways ?? [],
              orderIndex: session.orderIndex,
            },
          });

          for (const action of session.actions) {
            actionCount++;
            await tx.action.create({
              data: {
                sessionId: createdSession.id,
                title: action.title,
                type: action.type.toUpperCase() as "WATCH" | "READ" | "DO" | "REFLECT",
                instructions: action.instructions,
                reflectionPrompt: action.reflectionPrompt,
                orderIndex: action.orderIndex,
                youtubeVideoId: action.youtubeVideoId,
              },
            });
          }

          // Persist CompositeSession + clips + overlays if present
          if (session.clips && session.clips.length > 0) {
            compositeCount++;
            const compositeSession = await tx.compositeSession.create({
              data: {
                sessionId: createdSession.id,
                title: session.title,
                description: session.summary,
                autoAdvance: true,
              },
            });

            for (const clip of session.clips) {
              await tx.sessionClip.create({
                data: {
                  compositeSessionId: compositeSession.id,
                  youtubeVideoId: clip.youtubeVideoId,
                  startSeconds: clip.startSeconds ?? null,
                  endSeconds: clip.endSeconds ?? null,
                  orderIndex: clip.orderIndex,
                  transitionType: (clip.transitionType ?? "NONE") as "NONE" | "FADE" | "CROSSFADE" | "SLIDE_LEFT",
                  transitionDurationMs: clip.transitionDurationMs ?? 500,
                  chapterTitle: clip.chapterTitle ?? null,
                  chapterDescription: clip.chapterDescription ?? null,
                },
              });
            }

            for (const overlay of session.overlays ?? []) {
              await tx.sessionOverlay.create({
                data: {
                  compositeSessionId: compositeSession.id,
                  type: overlay.type as "TITLE_CARD" | "CHAPTER_TITLE" | "KEY_POINTS" | "LOWER_THIRD" | "CTA" | "OUTRO",
                  content: overlay.content as unknown as Prisma.InputJsonValue,
                  clipOrderIndex: overlay.clipOrderIndex ?? null,
                  triggerAtSeconds: overlay.triggerAtSeconds ?? null,
                  durationMs: overlay.durationMs ?? 5000,
                  position: (overlay.position ?? "CENTER") as "CENTER" | "BOTTOM" | "TOP" | "LOWER_THIRD",
                  orderIndex: overlay.orderIndex,
                },
              });
            }
          }
        }
      }
    }, { timeout: 30000 });

    aiLogger.generationSuccess(programId, timer.elapsed(), {
      weekCount: validated.data.weeks.length,
      sessionCount,
      actionCount,
    });

    console.info(`[generate-async] Persisted: ${sessionCount} sessions, ${actionCount} actions, ${compositeCount} composite sessions`);

    // Mark complete
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        stage: "complete",
        progress: 100,
        completedAt: new Date(),
      },
    });

  } catch (err) {
    console.error("[generate-async] Job failed:", err);

    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        error: err instanceof Error ? err.message : String(err),
        completedAt: new Date(),
      },
    });
  }
}
