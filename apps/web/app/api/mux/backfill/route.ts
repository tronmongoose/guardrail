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

  // Fix YouTubeVideo records — scan any record that has Mux fields set
  const videos = await prisma.youTubeVideo.findMany({
    where: {
      OR: [
        { muxAssetId: { not: null } },
        { muxUploadId: { not: null } },
        { muxPlaybackId: { not: null } },
      ],
    },
    select: { id: true, muxAssetId: true, muxUploadId: true, muxPlaybackId: true },
  });

  for (const v of videos) {
    // Skip if playback ID already present
    if (v.muxPlaybackId) continue;

    try {
      let assetId = v.muxAssetId;

      // If no assetId but we have uploadId, look up the upload to find the asset
      if (!assetId && v.muxUploadId) {
        const upload = await mux.video.uploads.retrieve(v.muxUploadId);
        assetId = upload.asset_id ?? null;
        if (assetId) {
          await prisma.youTubeVideo.update({
            where: { id: v.id },
            data: { muxAssetId: assetId },
          });
        }
      }

      if (!assetId) continue;

      const asset = await mux.video.assets.retrieve(assetId);
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

  // Fix Action records — scan any Action that has Mux fields set
  const actions = await prisma.action.findMany({
    where: {
      OR: [
        { muxAssetId: { not: null } },
        { muxUploadId: { not: null } },
        { muxPlaybackId: { not: null } },
      ],
    },
    select: { id: true, muxAssetId: true, muxUploadId: true, muxPlaybackId: true },
  });

  for (const a of actions) {
    // Skip if playback ID already present
    if (a.muxPlaybackId) continue;

    try {
      let assetId = a.muxAssetId;

      // If no assetId but we have uploadId, look up the upload to find the asset
      if (!assetId && a.muxUploadId) {
        const upload = await mux.video.uploads.retrieve(a.muxUploadId);
        assetId = upload.asset_id ?? null;
        if (assetId) {
          await prisma.action.update({
            where: { id: a.id },
            data: { muxAssetId: assetId },
          });
        }
      }

      if (!assetId) continue;

      const asset = await mux.video.assets.retrieve(assetId);
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
