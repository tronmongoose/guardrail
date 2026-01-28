import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateProgramDraft } from "@guide-rail/ai";
import { ProgramDraftSchema } from "@guide-rail/shared";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;
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
  const clusterMap = new Map<number, { videoIds: string[]; videoTitles: string[] }>();

  for (const ca of program.clusters) {
    if (!clusterMap.has(ca.clusterId)) {
      clusterMap.set(ca.clusterId, { videoIds: [], videoTitles: [] });
    }
    const group = clusterMap.get(ca.clusterId)!;
    group.videoIds.push(ca.videoId);
    group.videoTitles.push(videoMap.get(ca.videoId)?.title ?? "Untitled");
  }

  const clusters = Array.from(clusterMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([clusterId, data]) => ({
      clusterId,
      ...data,
      summary: `Group of ${data.videoIds.length} video(s)`,
    }));

  // Generate via LLM adapter
  let draft;
  try {
    draft = await generateProgramDraft({
      programId,
      programTitle: program.title,
      programDescription: program.description ?? undefined,
      durationWeeks: program.durationWeeks,
      clusters,
    });
  } catch (err) {
    console.error("LLM generation error:", err);
    return NextResponse.json(
      { error: "Draft generation failed", detail: String(err) },
      { status: 502 }
    );
  }

  // Validate with zod
  const validated = ProgramDraftSchema.safeParse(draft);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Generated draft failed validation", issues: validated.error.issues },
      { status: 500 }
    );
  }

  // Persist draft
  const savedDraft = await prisma.programDraft.create({
    data: {
      programId,
      draftJson: validated.data as unknown as Record<string, unknown>,
      status: "PENDING",
    },
  });

  // Auto-apply: create Week/Session/Action records from draft
  // Delete existing structure first
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
      const createdSession = await prisma.session.create({
        data: {
          weekId: createdWeek.id,
          title: session.title,
          summary: session.summary,
          orderIndex: session.orderIndex,
        },
      });

      for (const action of session.actions) {
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

  return NextResponse.json({ draftId: savedDraft.id, draft: validated.data });
}
