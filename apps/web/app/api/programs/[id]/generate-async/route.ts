import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEmbeddings, clusterEmbeddings, generateProgramDraft, extractContentDigests, analyzeVideoWithGemini, analyzeUploadedVideoWithGemini } from "@guide-rail/ai";
import type { ContentDigest, EnrichedContentDigest } from "@guide-rail/ai";
import { maybeSegmentVideo } from "@/lib/video-segmentation";
import { ProgramDraftSchema } from "@guide-rail/shared";
import type { VideoAnalysisOutput } from "@guide-rail/shared";
import { Prisma } from "@prisma/client";
import { aiLogger, createTimer } from "@/lib/logger";
import { generateSkinFromVibe } from "@/lib/generate-skin";
import { sendProgramReadyEmail } from "@/lib/email";

export const maxDuration = 300; // Vercel Pro: keep function alive while background job runs

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
  const STALE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes without progress = stale

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
const JOB_TIMEOUT_MS = 12 * 60 * 1000; // 12 minutes (within Vercel Pro 300s maxDuration)

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

    // Build ID sets for later lookups — will be updated after segmentation re-fetch
    const videoIdSet = new Set(program.videos.map((v) => v.id));

    // ── Step 0: Video Analysis (0-10%) ──
    // Only analyze top-level (non-segment) videos; segment children inherit parent's analysis
    checkDeadline("video_analysis");
    const videosNeedingAnalysis = program.videos.filter(
      (v) => !v.isSegment && !v.analysis && !v.url.startsWith("mux-upload://")
    );
    let analysisCount = 0;

    if (videosNeedingAnalysis.length > 0 && process.env.GOOGLE_AI_API_KEY) {
      console.info(`[generate-async] Running Gemini analysis for ${videosNeedingAnalysis.length} video(s)`);
      const ANALYSIS_CONCURRENCY = 3;

      for (let i = 0; i < videosNeedingAnalysis.length; i += ANALYSIS_CONCURRENCY) {
        checkDeadline("video_analysis");
        const batch = videosNeedingAnalysis.slice(i, i + ANALYSIS_CONCURRENCY);
        // ── Run all AI calls in the batch concurrently — NO DB access during AI ──
        // Connections are released before analysis begins; DB writes happen after.
        const aiResults = await Promise.allSettled(
          batch.map((v) => {
            const isUpload = !v.url.includes("youtube.com") && !v.url.includes("youtu.be") && !v.url.startsWith("mux-upload://");
            return isUpload
              ? analyzeUploadedVideoWithGemini(
                  v.url,
                  v.title ?? "Untitled",
                  v.url.toLowerCase().endsWith(".mov") ? "video/quicktime" : "video/mp4",
                )
              : analyzeVideoWithGemini(v.videoId, v.title ?? "Untitled", v.durationSeconds ?? undefined);
          }),
        );

        // ── Write results after AI completes — connections acquired only for writes ──
        for (let j = 0; j < batch.length; j++) {
          const v = batch[j];
          const result = aiResults[j];
          if (result.status === "rejected") {
            console.warn(`[generate-async] Gemini analysis failed for "${v.title}":`, result.reason);
            continue;
          }
          const analysis = result.value;
          analysisCount++;

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

          // Create virtual segments after analysis is written
          if (analysis.durationSeconds) {
            await maybeSegmentVideo(
              prisma, v, analysis.topics, analysis.durationSeconds,
              v.desiredSegmentCount ?? 1,
            );
          }
        }

        // Single batch heartbeat — one DB call per batch instead of one per video
        const analysisProgress = Math.round(((i + batch.length) / videosNeedingAnalysis.length) * 10);
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { progress: analysisProgress },
        });
      }
    }

    // For videos that still have no analysis (e.g. stub mode / Gemini skipped) but have a
    // creator-requested split count, segment them using even splits (no topic boundaries).
    const videosWithoutAnalysis = program.videos.filter(
      (v) => !v.isSegment && !v.analysis && (v.desiredSegmentCount ?? 1) > 1 && v.durationSeconds,
    );
    for (const v of videosWithoutAnalysis) {
      await maybeSegmentVideo(prisma, v, [], v.durationSeconds!, v.desiredSegmentCount ?? 1);
    }

    // Re-fetch all videos (including newly created segment children) with analyses
    const allVideosWithAnalysis = await prisma.youTubeVideo.findMany({
      where: { programId },
      include: { analysis: true },
    });

    // Segment-aware pipeline filter:
    // Use child segments when available; exclude parents that have been segmented
    const segmentedParentIds = new Set(
      allVideosWithAnalysis.filter((v) => v.isSegment && v.parentVideoId).map((v) => v.parentVideoId as string),
    );
    const videosForPipeline = allVideosWithAnalysis.filter(
      (v) => (v.isSegment || !segmentedParentIds.has(v.id)) && !v.url.startsWith("mux-upload://"),
    );

    // Mux direct uploads have no accessible content for AI processing — include them
    // as minimal digests so the LLM knows they exist when building the program structure.
    const muxOnlyVideos = allVideosWithAnalysis.filter((v) => v.url.startsWith("mux-upload://"));

    // For backwards-compat: keep using videosWithAnalysis name for analysis map building
    const videosWithAnalysis = videosForPipeline;

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

    // Update videoIdSet to reflect the pipeline videos (includes segment children + mux-only)
    for (const v of videosForPipeline) videoIdSet.add(v.id);
    for (const v of muxOnlyVideos) videoIdSet.add(v.id);

    const hasVideoAnalysis = analysisMap.size > 0;
    console.info(`[generate-async] Video analysis: ${analysisMap.size}/${allVideosWithAnalysis.length} videos analyzed (${analysisCount} new), ${videosForPipeline.length} in pipeline`);

    // ── Step 1: Embeddings (10-25%) ──
    checkDeadline("embedding");
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { stage: "embedding", progress: 10 },
    });

    // Use analysis summaries for richer embeddings when available.
    // For segment children, build narrowed embedding text from the matching topic slice.
    const videoEmbeddingInputs = videosForPipeline.map((v) => {
      if (v.isSegment && v.parentVideoId) {
        const parentAnalysis = analysisMap.get(v.parentVideoId);
        if (parentAnalysis) {
          const matchingTopic = parentAnalysis.topics.find(
            (t) => Math.abs(t.startSeconds - (v.startSeconds ?? 0)) < 10,
          );
          return {
            contentId: v.id,
            text: `${v.title ?? ""}: ${matchingTopic?.label ?? parentAnalysis.summary}`.slice(0, 4000),
          };
        }
      }
      const analysis = analysisMap.get(v.id);
      if (analysis) {
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

    const totalContent = videosForPipeline.length + usableArtifacts.length;
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

    for (const v of videosForPipeline) {
      // For segment children, use the parent's analysis filtered to this segment's time range
      const sourceAnalysis = v.isSegment && v.parentVideoId
        ? analysisMap.get(v.parentVideoId)
        : analysisMap.get(v.id);

      if (sourceAnalysis && sourceAnalysis.topics.length > 0) {
        // For segments, narrow topics/segments to this child's time bounds
        const relevantTopics = v.isSegment
          ? sourceAnalysis.topics.filter(
              (t) => t.startSeconds >= (v.startSeconds ?? 0) && t.endSeconds <= ((v.endSeconds ?? Infinity) + 5),
            )
          : sourceAnalysis.topics;
        const relevantSegments = v.isSegment
          ? sourceAnalysis.segments.filter(
              (s) => s.startSeconds >= (v.startSeconds ?? 0) && s.endSeconds <= ((v.endSeconds ?? Infinity) + 5),
            )
          : sourceAnalysis.segments;
        const relevantMoments = v.isSegment
          ? (sourceAnalysis.keyMoments ?? []).filter(
              (m) => m.timestampSeconds >= (v.startSeconds ?? 0) && m.timestampSeconds <= (v.endSeconds ?? Infinity),
            )
          : (sourceAnalysis.keyMoments ?? []);

        const topicsForDigest = relevantTopics.length > 0 ? relevantTopics : sourceAnalysis.topics;

        const enriched: EnrichedContentDigest = {
          contentId: v.id,
          contentTitle: v.title ?? "Untitled",
          contentType: "video",
          keyConcepts: topicsForDigest.map((t) => t.label),
          skillsIntroduced: topicsForDigest.flatMap((t) => t.subtopics ?? []).slice(0, 5),
          memorableExamples: relevantMoments
            .filter((m) => m.significance === "high")
            .map((m) => m.description)
            .slice(0, 3),
          difficultyLevel: "intermediate",
          summary: v.isSegment
            ? `${v.title}: ${topicsForDigest.map((t) => t.label).join(", ")}`
            : sourceAnalysis.summary,
          segments: relevantSegments,
          topics: topicsForDigest,
          keyMoments: relevantMoments,
          durationSeconds: v.isSegment
            ? (v.endSeconds ?? 0) - (v.startSeconds ?? 0)
            : sourceAnalysis.durationSeconds,
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

      // Progress callback is intentionally synchronous (no DB call) — holding a
      // Prisma connection open across an LLM call exhausts the pool.
      // A single DB write happens after all extraction completes (line below).
      const llmDigests = await extractContentDigests(
        allForExtraction,
        (completed, total) => {
          console.info(`[generate-async] Extraction progress: ${completed}/${total}`);
        },
      );
      enrichedDigests.push(...llmDigests);
      aiLogger.extractionSuccess(programId, extractionTimer.elapsed(), llmDigests.length);
    } else {
      console.info(`[generate-async] All videos have Gemini analysis — skipping LLM extraction`);
    }

    // Add minimal digests for Mux-only uploads (no transcript/analysis available)
    for (const v of muxOnlyVideos) {
      enrichedDigests.push({
        contentId: v.id,
        contentTitle: v.title ?? "Untitled",
        contentType: "video",
        keyConcepts: [v.title ?? "Video content"],
        skillsIntroduced: [],
        memorableExamples: [],
        difficultyLevel: "intermediate",
        summary: `Uploaded video: ${v.title ?? "Untitled"}`,
      } as ContentDigest);
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
    const videoMap = new Map(videosForPipeline.map((v) => [v.id, v]));
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

    // Sequential queries (no $transaction) to avoid Neon PgBouncer timeout issues.
    let sessionCount = 0;
    let actionCount = 0;
    let compositeCount = 0;

    // Wake up Neon compute — may have suspended during the minutes-long AI stages above
    await prisma.$queryRaw`SELECT 1`;

    await prisma.week.deleteMany({ where: { programId } });

    for (const week of validated.data.weeks) {
      const createdWeek = await prisma.week.create({
        data: {
          programId,
          title: week.title,
          summary: week.summary,
          weekNumber: week.weekNumber,
        },
      });

      for (const session of week.sessions) {
        sessionCount++;
        const createdSession = await prisma.session.create({
          data: {
            weekId: createdWeek.id,
            title: session.title,
            summary: session.summary,
            keyTakeaways: session.keyTakeaways ?? [],
            orderIndex: session.orderIndex,
          },
        });

        if (session.actions.length > 0) {
          actionCount += session.actions.length;
          await prisma.action.createMany({
            data: session.actions.map((action) => ({
              sessionId: createdSession.id,
              title: action.title,
              type: action.type.toUpperCase() as "WATCH" | "READ" | "DO" | "REFLECT",
              instructions: action.instructions,
              reflectionPrompt: action.reflectionPrompt,
              orderIndex: action.orderIndex,
              youtubeVideoId: action.youtubeVideoId,
            })),
          });
        }

        if (session.clips && session.clips.length > 0) {
          compositeCount++;
          const compositeSession = await prisma.compositeSession.create({
            data: {
              sessionId: createdSession.id,
              title: session.title,
              description: session.summary,
              autoAdvance: true,
            },
          });

          await prisma.sessionClip.createMany({
            data: session.clips.map((clip) => ({
              compositeSessionId: compositeSession.id,
              youtubeVideoId: clip.youtubeVideoId,
              startSeconds: clip.startSeconds ?? null,
              endSeconds: clip.endSeconds ?? null,
              orderIndex: clip.orderIndex,
              transitionType: (clip.transitionType ?? "NONE") as "NONE" | "FADE" | "CROSSFADE" | "SLIDE_LEFT",
              transitionDurationMs: clip.transitionDurationMs ?? 500,
              chapterTitle: clip.chapterTitle ?? null,
              chapterDescription: clip.chapterDescription ?? null,
            })),
          });

          if (session.overlays && session.overlays.length > 0) {
            await prisma.sessionOverlay.createMany({
              data: session.overlays.map((overlay) => ({
                compositeSessionId: compositeSession.id,
                type: overlay.type as "TITLE_CARD" | "CHAPTER_TITLE" | "KEY_POINTS" | "LOWER_THIRD" | "CTA" | "OUTRO",
                content: overlay.content as unknown as Prisma.InputJsonValue,
                clipOrderIndex: overlay.clipOrderIndex ?? null,
                triggerAtSeconds: overlay.triggerAtSeconds ?? null,
                durationMs: overlay.durationMs ?? 5000,
                position: (overlay.position ?? "CENTER") as "CENTER" | "BOTTOM" | "TOP" | "LOWER_THIRD",
                orderIndex: overlay.orderIndex,
              })),
            });
          }
        }
      }
    }

    aiLogger.generationSuccess(programId, timer.elapsed(), {
      weekCount: validated.data.weeks.length,
      sessionCount,
      actionCount,
    });

    console.info(`[generate-async] Persisted: ${sessionCount} sessions, ${actionCount} actions, ${compositeCount} composite sessions`);

    // ── Step 5: Custom Skin Generation (93-100%) ──
    // Only runs when the creator selected "Build My Own" in the skin picker (skinId = "auto-generate")
    if (program.skinId === "auto-generate") {
      checkDeadline("generating_skin");
      await prisma.generationJob.update({
        where: { id: jobId },
        data: { stage: "generating_skin", progress: 93 },
      });

      try {
        const skinTokens = await generateSkinFromVibe({
          title: program.title,
          targetTransformation: program.targetTransformation,
          vibePrompt: program.vibePrompt,
          niche: null,
        });

        if (skinTokens) {
          const customSkin = await prisma.customSkin.upsert({
            where: {
              // If there's already a custom skin for this program, update it
              id: program.customSkinId ?? "__none__",
            },
            create: {
              creatorId: program.creatorId,
              name: program.title,
              tokens: skinTokens as unknown as Prisma.InputJsonValue,
            },
            update: {
              name: program.title,
              tokens: skinTokens as unknown as Prisma.InputJsonValue,
            },
          });

          await prisma.program.update({
            where: { id: programId },
            data: {
              customSkinId: customSkin.id,
              skinId: "classic-minimal", // clear sentinel; custom skin takes precedence
            },
          });

          console.info(`[generate-async] Custom skin generated and linked: ${customSkin.id}`);
        } else {
          // Stub mode or unsupported provider — reset sentinel to catalog fallback
          await prisma.program.update({
            where: { id: programId },
            data: { skinId: "classic-minimal" },
          });
        }
      } catch (skinErr) {
        // Skin generation failure is non-fatal — log and fall back to catalog skin
        console.error("[generate-async] Skin generation failed (non-fatal):", skinErr);
        await prisma.program.update({
          where: { id: programId },
          data: { skinId: "classic-minimal" },
        });
      }
    }

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

    // Notify creator via email (best-effort, non-blocking)
    try {
      const creator = await prisma.user.findUnique({
        where: { id: program.creatorId },
        select: { email: true, name: true },
      });
      if (creator?.email) {
        await sendProgramReadyEmail(
          creator.email,
          creator.name ?? "there",
          program.title ?? "Your Program",
          programId,
        );
      }
    } catch (err) {
      console.error("[generate-async] Failed to send completion email:", err);
    }

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
