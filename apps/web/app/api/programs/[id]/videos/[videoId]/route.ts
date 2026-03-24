import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/programs/[id]/videos/[videoId]
 * Update per-video settings (currently: desiredSegmentCount).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  const { id: programId, videoId } = await params;

  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { creatorId: true },
  });

  if (!program || program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { desiredSegmentCount } = body;

  if (
    typeof desiredSegmentCount !== "number" ||
    !Number.isInteger(desiredSegmentCount) ||
    desiredSegmentCount < 1 ||
    desiredSegmentCount > 4
  ) {
    return NextResponse.json(
      { error: "desiredSegmentCount must be an integer between 1 and 4" },
      { status: 400 }
    );
  }

  const video = await prisma.youTubeVideo.updateMany({
    where: { id: videoId, programId, isSegment: false },
    data: { desiredSegmentCount },
  });

  if (video.count === 0) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
