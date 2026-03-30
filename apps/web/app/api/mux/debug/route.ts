import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/mux/debug?programId=xxx
 * Shows all Mux-related fields for a program's videos and actions.
 */
export async function GET(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user || user.role !== "CREATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const programId = req.nextUrl.searchParams.get("programId");
  if (!programId) {
    return NextResponse.json({ error: "programId query param required" }, { status: 400 });
  }

  const videos = await prisma.youTubeVideo.findMany({
    where: { programId },
    select: {
      id: true,
      videoId: true,
      url: true,
      title: true,
      muxUploadId: true,
      muxAssetId: true,
      muxPlaybackId: true,
      muxStatus: true,
    },
  });

  const sessions = await prisma.session.findMany({
    where: { week: { programId } },
    select: {
      id: true,
      title: true,
      actions: {
        select: {
          id: true,
          title: true,
          type: true,
          muxUploadId: true,
          muxAssetId: true,
          muxPlaybackId: true,
          muxStatus: true,
          youtubeVideoId: true,
        },
      },
    },
  });

  return NextResponse.json({ programId, videos, sessions });
}
