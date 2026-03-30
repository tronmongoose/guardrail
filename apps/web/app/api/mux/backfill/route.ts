import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { getMux, isMuxConfigured } from "@/lib/mux";
import { prisma } from "@/lib/prisma";

/**
 * Backfill correct Mux playback IDs for all YouTubeVideo and Action records
 * that have a muxAssetId but are missing or have a wrong muxPlaybackId.
 *
 * GET /api/mux/backfill — creator-only, scans and fixes all records.
 */
export async function GET() {
  const user = await getOrCreateUser();
  if (!user || user.role !== "CREATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isMuxConfigured()) {
    return NextResponse.json({ error: "Mux not configured" }, { status: 501 });
  }

  const mux = getMux();
  const fixed: { id: string; table: string; oldPlaybackId: string | null; newPlaybackId: string }[] = [];
  const errors: { id: string; table: string; error: string }[] = [];

  // Fix YouTubeVideo records
  const videos = await prisma.youTubeVideo.findMany({
    where: { muxAssetId: { not: null } },
    select: { id: true, muxAssetId: true, muxPlaybackId: true },
  });

  for (const v of videos) {
    if (!v.muxAssetId) continue;
    // Skip if playback ID looks valid (47+ chars)
    if (v.muxPlaybackId && v.muxPlaybackId.length >= 40) continue;

    try {
      const asset = await mux.video.assets.retrieve(v.muxAssetId);
      const playbackId = asset.playback_ids?.[0]?.id;
      if (playbackId) {
        await prisma.youTubeVideo.update({
          where: { id: v.id },
          data: { muxPlaybackId: playbackId, muxStatus: "ready" },
        });
        fixed.push({ id: v.id, table: "YouTubeVideo", oldPlaybackId: v.muxPlaybackId, newPlaybackId: playbackId });
      }
    } catch (err) {
      errors.push({ id: v.id, table: "YouTubeVideo", error: (err as Error).message });
    }
  }

  // Fix Action records
  const actions = await prisma.action.findMany({
    where: { muxAssetId: { not: null } },
    select: { id: true, muxAssetId: true, muxPlaybackId: true },
  });

  for (const a of actions) {
    if (!a.muxAssetId) continue;
    if (a.muxPlaybackId && a.muxPlaybackId.length >= 40) continue;

    try {
      const asset = await mux.video.assets.retrieve(a.muxAssetId);
      const playbackId = asset.playback_ids?.[0]?.id;
      if (playbackId) {
        await prisma.action.update({
          where: { id: a.id },
          data: { muxPlaybackId: playbackId, muxStatus: "ready" },
        });
        fixed.push({ id: a.id, table: "Action", oldPlaybackId: a.muxPlaybackId, newPlaybackId: playbackId });
      }
    } catch (err) {
      errors.push({ id: a.id, table: "Action", error: (err as Error).message });
    }
  }

  return NextResponse.json({ fixed, errors, scanned: videos.length + actions.length });
}
