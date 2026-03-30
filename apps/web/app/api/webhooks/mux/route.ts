import { NextRequest, NextResponse, after } from "next/server";
import { getMux, isMuxConfigured } from "@/lib/mux";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateMuxVideoAnalysis } from "@/lib/mux-ai-analysis";

export async function POST(req: NextRequest) {
  if (!isMuxConfigured()) {
    return NextResponse.json({ error: "Mux not configured" }, { status: 501 });
  }

  const webhookSecret = process.env.MUX_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.warn({ operation: "mux.webhook.missing_secret" });
    return NextResponse.json({ error: "Webhook not configured" }, { status: 501 });
  }

  // Raw body required for signature verification — do NOT use req.json()
  const body = await req.text();

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Verify signature and parse event in one call
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    const mux = getMux();
    event = mux.webhooks.unwrap(body, headers, webhookSecret);
  } catch (err) {
    logger.error({ operation: "mux.webhook.signature_failed" }, err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const eventType: string = event.type ?? "";

  switch (eventType) {
    case "video.upload.asset_created": {
      // Bridge: the upload has been ingested and an asset has been created.
      // The event.data is a Mux Upload object:
      //   event.data.id        = the upload ID  (matches YouTubeVideo.muxUploadId / Action.muxUploadId)
      //   event.data.asset_id  = the new asset ID to store as muxAssetId
      const uploadId: string = event.data?.id ?? "";
      const assetId: string = event.data?.asset_id ?? "";

      if (!uploadId || !assetId) {
        logger.warn({
          operation: "mux.webhook.upload_asset_created.missing_ids",
          uploadId,
          assetId,
        });
        break;
      }

      // Check Action first (lesson-level uploads)
      const action = await prisma.action.findFirst({
        where: { muxUploadId: uploadId },
      });

      if (action) {
        await prisma.action.update({
          where: { id: action.id },
          data: { muxAssetId: assetId },
        });
        logger.info({
          operation: "mux.webhook.upload_asset_created",
          actionId: action.id,
          uploadId,
          assetId,
        });
        break;
      }

      // Check YouTubeVideo (wizard program-level uploads)
      const ytVideo = await prisma.youTubeVideo.findFirst({
        where: { muxUploadId: uploadId },
      });

      if (ytVideo) {
        await prisma.youTubeVideo.update({
          where: { id: ytVideo.id },
          data: { muxAssetId: assetId },
        });
        logger.info({
          operation: "mux.webhook.upload_asset_created.youtube_video",
          youtubeVideoId: ytVideo.id,
          uploadId,
          assetId,
        });
        break;
      }

      logger.warn({
        operation: "mux.webhook.upload_asset_created.no_record_found",
        uploadId,
        assetId,
      });
      break;
    }

    case "video.asset.ready": {
      // Asset is fully processed and playable.
      const assetId: string = event.data?.id ?? "";
      const playbackId: string = event.data?.playback_ids?.[0]?.id ?? "";
      const uploadId: string = event.data?.upload_id ?? "";

      if (!assetId || !playbackId) {
        logger.warn({
          operation: "mux.webhook.asset_ready.missing_ids",
          assetId,
          playbackId,
        });
        break;
      }

      // Check Action first by muxAssetId, then fall back to muxUploadId
      let action = await prisma.action.findFirst({
        where: { muxAssetId: assetId },
      });
      if (!action && uploadId) {
        action = await prisma.action.findFirst({
          where: { muxUploadId: uploadId },
        });
      }

      if (action) {
        await prisma.action.update({
          where: { id: action.id },
          data: {
            muxAssetId: assetId,
            muxPlaybackId: playbackId,
            muxStatus: "ready",
          },
        });
        logger.info({
          operation: "mux.webhook.asset_ready",
          actionId: action.id,
          assetId,
          playbackId,
          lookupBy: action.muxAssetId ? "assetId" : "uploadId",
        });
        break;
      }

      // Check YouTubeVideo by muxAssetId, then fall back to muxUploadId
      let ytVideo = await prisma.youTubeVideo.findFirst({
        where: { muxAssetId: assetId },
      });
      if (!ytVideo && uploadId) {
        ytVideo = await prisma.youTubeVideo.findFirst({
          where: { muxUploadId: uploadId },
        });
      }

      if (ytVideo) {
        await prisma.youTubeVideo.update({
          where: { id: ytVideo.id },
          data: {
            muxAssetId: assetId,
            muxPlaybackId: playbackId,
            muxStatus: "ready",
            url: `https://stream.mux.com/${playbackId}`,
          },
        });
        logger.info({
          operation: "mux.webhook.asset_ready.youtube_video",
          youtubeVideoId: ytVideo.id,
          assetId,
          playbackId,
          lookupBy: ytVideo.muxAssetId ? "assetId" : "uploadId",
        });
        break;
      }

      logger.warn({
        operation: "mux.webhook.asset_ready.no_record_found",
        assetId,
        uploadId,
      });
      break;
    }

    case "video.asset.errored": {
      const assetId: string = event.data?.id ?? "";

      if (!assetId) break;

      const action = await prisma.action.findFirst({
        where: { muxAssetId: assetId },
      });

      if (action) {
        await prisma.action.update({
          where: { id: action.id },
          data: { muxStatus: "errored" },
        });
        logger.warn({
          operation: "mux.webhook.asset_errored",
          actionId: action.id,
          assetId,
        });
        break;
      }

      // Also handle YouTubeVideo errored state
      const ytVideo = await prisma.youTubeVideo.findFirst({
        where: { muxAssetId: assetId },
      });

      if (ytVideo) {
        await prisma.youTubeVideo.update({
          where: { id: ytVideo.id },
          data: { muxStatus: "errored" },
        });
        logger.warn({
          operation: "mux.webhook.asset_errored.youtube_video",
          youtubeVideoId: ytVideo.id,
          assetId,
        });
      }
      break;
    }

    case "video.track.ready": {
      // Fires when a text track (caption/subtitle) becomes available.
      // We use this — rather than video.asset.ready — to trigger @mux/ai chapter
      // generation because the caption track must exist before fetchTranscriptForAsset
      // can succeed. Ensure "video.track.ready" is enabled in your Mux dashboard
      // webhook settings alongside the other events.
      const trackType: string = event.data?.type ?? "";
      if (trackType !== "text") break; // only caption/subtitle tracks

      const assetId: string = event.data?.asset_id ?? "";
      if (!assetId) break;

      const ytVideo = await prisma.youTubeVideo.findFirst({
        where: { muxAssetId: assetId },
        select: { id: true, muxPlaybackId: true },
      });

      if (!ytVideo) {
        // This track belongs to an Action upload (lesson-level) — no AI analysis needed.
        break;
      }

      if (!ytVideo.muxPlaybackId) {
        // video.asset.ready hasn't fired yet; skip — transcript isn't accessible.
        logger.warn({
          operation: "mux.webhook.track_ready.no_playback_id",
          assetId,
          ytVideoId: ytVideo.id,
        });
        break;
      }

      logger.info({
        operation: "mux.webhook.track_ready.queueing_analysis",
        ytVideoId: ytVideo.id,
        assetId,
      });

      // Fire and forget — webhook returns 200 immediately.
      after(() =>
        generateMuxVideoAnalysis({
          assetId,
          playbackId: ytVideo.muxPlaybackId!,
          ytVideoId: ytVideo.id,
        })
      );
      break;
    }

    default:
      logger.info({
        operation: "mux.webhook.unhandled_event",
        eventType,
      });
  }

  return NextResponse.json({ received: true });
}
