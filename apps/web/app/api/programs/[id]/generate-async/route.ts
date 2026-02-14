import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEmbeddings, clusterEmbeddings, generateProgramDraft, extractContentDigests } from "@guide-rail/ai";
import { ProgramDraftSchema } from "@guide-rail/shared";
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
    include: { videos: true },
  });

  if (!program || program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (program.videos.length === 0) {
    return NextResponse.json({ error: "No videos to process" }, { status: 400 });
  }

  // Check for existing pending/processing job
  const existingJob = await prisma.generationJob.findFirst({
    where: {
      programId,
      status: { in: ["PENDING", "PROCESSING"] },
    },
  });

  if (existingJob) {
    return NextResponse.json({
      jobId: existingJob.id,
      status: existingJob.status,
      stage: existingJob.stage,
      progress: existingJob.progress,
      message: "Generation already in progress",
    });
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
 */
async function processGenerationJob(jobId: string, programId: string) {
  const timer = createTimer();

  try {
    // Mark as processing
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING", stage: "embedding", progress: 5, startedAt: new Date() },
    });

    // Fetch program with videos
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: { videos: true },
    });

    if (!program) throw new Error("Program not found");

    // Step 1: Embeddings (10-40%)
    const embeddingInputs = program.videos.map((v) => ({
      videoId: v.id,
      text: v.transcript
        ? `${v.title ?? ""}: ${v.transcript}`.slice(0, 4000)
        : `${v.title ?? ""} ${v.description ?? ""}`.trim() || v.videoId,
    }));

    aiLogger.embeddingStart(programId, program.videos.length);
    const embeddingTimer = createTimer();

    const embeddingResults = await getEmbeddings(embeddingInputs);
    aiLogger.embeddingSuccess(programId, embeddingTimer.elapsed(), embeddingResults.length);

    // Store embeddings
    for (const result of embeddingResults) {
      await prisma.embedding.upsert({
        where: {
          programId_videoId_model: { programId, videoId: result.videoId, model: HF_MODEL },
        },
        create: { programId, videoId: result.videoId, model: HF_MODEL, vector: result.embedding },
        update: { vector: result.embedding },
      });
    }

    await prisma.generationJob.update({
      where: { id: jobId },
      data: { stage: "clustering", progress: 25 },
    });

    // Step 2: Clustering (40-50%)
    const clusterInputs = embeddingResults.map((r) => ({
      videoId: r.videoId,
      embedding: r.embedding,
    }));

    const k = Math.min(program.durationWeeks, program.videos.length);
    const clusters = clusterEmbeddings(clusterInputs, k);

    aiLogger.clusteringComplete(programId, timer.elapsed(), {
      videoCount: program.videos.length,
      clusterCount: clusters.length,
    });

    // Store cluster assignments
    for (const cluster of clusters) {
      for (const videoId of cluster.videoIds) {
        await prisma.clusterAssignment.upsert({
          where: { programId_videoId: { programId, videoId } },
          create: { programId, videoId, clusterId: cluster.clusterId },
          update: { clusterId: cluster.clusterId },
        });
      }
    }

    // Step 2.5: Content Extraction / Analysis (35-60%)
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { stage: "analyzing", progress: 35 },
    });

    const videosForExtraction = program.videos.map((v) => ({
      videoId: v.id,
      videoTitle: v.title ?? "Untitled",
      transcript: v.transcript,
    }));

    aiLogger.extractionStart(programId, videosForExtraction.length);
    const extractionTimer = createTimer();

    const contentDigests = await extractContentDigests(
      videosForExtraction,
      async (completed, total) => {
        const extractionProgress = 35 + Math.round((completed / total) * 25);
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { progress: extractionProgress },
        });
      },
    );

    aiLogger.extractionSuccess(programId, extractionTimer.elapsed(), contentDigests.length);

    // Step 3: LLM Generation (60-85%)
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { stage: "generating", progress: 60 },
    });

    const videoMap = new Map(program.videos.map((v) => [v.id, v]));
    const clusterData = clusters.map((c) => ({
      clusterId: c.clusterId,
      videoIds: c.videoIds,
      videoTitles: c.videoIds.map((vid) => videoMap.get(vid)?.title ?? "Untitled"),
      videoTranscripts: c.videoIds.map((vid) => videoMap.get(vid)?.transcript ?? ""),
      summary: `Group of ${c.videoIds.length} video(s)`,
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
      contentDigests,
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

    // Step 4: Persist (90-100%)
    const savedDraft = await prisma.programDraft.create({
      data: {
        programId,
        draftJson: JSON.parse(JSON.stringify(validated.data)),
        status: "PENDING",
      },
    });

    // Delete existing structure and create new
    await prisma.week.deleteMany({ where: { programId } });

    let sessionCount = 0;
    let actionCount = 0;

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

        for (const action of session.actions) {
          actionCount++;
          await prisma.action.create({
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
      }
    }

    aiLogger.generationSuccess(programId, timer.elapsed(), {
      weekCount: validated.data.weeks.length,
      sessionCount,
      actionCount,
    });

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
