import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/programs/[id]/videos/[videoId]/analysis
 * Returns analysis status and data for a specific video.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  const { id: programId, videoId } = await params;

  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify program ownership
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { creatorId: true },
  });

  if (!program || program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find the video (videoId param is the YouTubeVideo record ID)
  const video = await prisma.youTubeVideo.findFirst({
    where: { id: videoId, programId },
    select: { id: true, videoId: true },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // Check for analysis
  const analysis = await prisma.videoAnalysis.findUnique({
    where: { youtubeVideoId: video.id },
  });

  if (!analysis) {
    return NextResponse.json({ status: "pending" });
  }

  return NextResponse.json({
    status: "ready",
    analysis: {
      summary: analysis.summary,
      fullTranscript: analysis.fullTranscript,
      segments: analysis.segments,
      topics: analysis.topics,
      keyMoments: analysis.keyMoments,
      people: analysis.people,
      durationSeconds: analysis.durationSeconds,
      model: analysis.model,
      analyzedAt: analysis.analyzedAt,
    },
  });
}
