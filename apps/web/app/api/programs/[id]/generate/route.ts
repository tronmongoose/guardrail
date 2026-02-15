import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateProgramDraft } from "@guide-rail/ai";
import { ProgramDraftSchema } from "@guide-rail/shared";
import { aiLogger, createTimer } from "@/lib/logger";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;
  const timer = createTimer();

  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: {
      videos: true,
      clusters: true,
    },
  });

  if (!program || program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (program.clusters.length === 0) {
    return NextResponse.json(
      { error: "Run auto-structure first" },
      { status: 400 }
    );
  }

  // Build cluster groups from stored assignments
  const videoMap = new Map(program.videos.map((v) => [v.id, v]));
  const clusterMap = new Map<number, { contentIds: string[]; contentTitles: string[]; contentTranscripts: string[] }>();

  for (const ca of program.clusters) {
    if (!clusterMap.has(ca.clusterId)) {
      clusterMap.set(ca.clusterId, { contentIds: [], contentTitles: [], contentTranscripts: [] });
    }
    const group = clusterMap.get(ca.clusterId)!;
    const video = videoMap.get(ca.videoId);
    group.contentIds.push(ca.videoId);
    group.contentTitles.push(video?.title ?? "Untitled");
    group.contentTranscripts.push(video?.transcript ?? "");
  }

  const clusters = Array.from(clusterMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([clusterId, data]) => ({
      clusterId,
      ...data,
      summary: `Group of ${data.contentIds.length} video(s)`,
    }));

  aiLogger.generationStart(programId, {
    clusterCount: clusters.length,
    durationWeeks: program.durationWeeks,
  });

  // Generate via LLM adapter
  let draft;
  const llmTimer = createTimer();
  try {
    draft = await generateProgramDraft({
      programId,
      programTitle: program.title,
      programDescription: program.description ?? undefined,
      outcomeStatement: program.outcomeStatement ?? undefined,
      targetAudience: program.targetAudience ?? undefined,
      targetTransformation: program.targetTransformation ?? undefined,
      vibePrompt: program.vibePrompt ?? undefined,
      durationWeeks: program.durationWeeks,
      clusters,
    });
  } catch (err) {
    aiLogger.generationFailure(programId, llmTimer.elapsed(), err, "llm");
    return NextResponse.json(
      { error: "Draft generation failed", detail: String(err) },
      { status: 502 }
    );
  }

  // Validate with zod
  const validated = ProgramDraftSchema.safeParse(draft);
  if (!validated.success) {
    aiLogger.validationFailure(programId, validated.error.issues.length);
    aiLogger.generationFailure(programId, timer.elapsed(), new Error("Schema validation failed"), "validation");
    return NextResponse.json(
      { error: "Generated draft failed validation", issues: validated.error.issues },
      { status: 500 }
    );
  }

  // Persist draft as plain JSON
  try {
    const savedDraft = await prisma.programDraft.create({
      data: {
        programId,
        draftJson: JSON.parse(JSON.stringify(validated.data)),
        status: "PENDING",
      },
    });

    // Auto-apply: create Week/Session/Action records from draft
    // Delete existing structure first
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
          // Map youtubeVideoId from the draft (which uses DB video ID)
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

    return NextResponse.json({ draftId: savedDraft.id, draft: validated.data });
  } catch (err) {
    aiLogger.generationFailure(programId, timer.elapsed(), err, "persistence");
    throw err;
  }
}
