import { NextRequest, NextResponse } from "next/server";
import { getMux, isMuxConfigured } from "@/lib/mux";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

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
      // Link the Mux asset ID to the Action that holds the upload ID.
      const uploadId: string = event.data?.upload_id ?? "";
      const assetId: string = event.data?.id ?? "";

      if (!uploadId || !assetId) {
        logger.warn({
          operation: "mux.webhook.upload_asset_created.missing_ids",
          uploadId,
          assetId,
        });
        break;
      }

      const action = await prisma.action.findFirst({
        where: { muxUploadId: uploadId },
      });

      if (!action) {
        logger.warn({
          operation: "mux.webhook.upload_asset_created.no_action_found",
          uploadId,
          assetId,
        });
        break;
      }

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

    case "video.asset.ready": {
      // Asset is fully processed and playable.
      const assetId: string = event.data?.id ?? "";
      const playbackId: string = event.data?.playback_ids?.[0]?.id ?? "";

      if (!assetId || !playbackId) {
        logger.warn({
          operation: "mux.webhook.asset_ready.missing_ids",
          assetId,
          playbackId,
        });
        break;
      }

      const action = await prisma.action.findFirst({
        where: { muxAssetId: assetId },
      });

      if (!action) {
        logger.warn({
          operation: "mux.webhook.asset_ready.no_action_found",
          assetId,
        });
        break;
      }

      await prisma.action.update({
        where: { id: action.id },
        data: {
          muxPlaybackId: playbackId,
          muxStatus: "ready",
        },
      });

      logger.info({
        operation: "mux.webhook.asset_ready",
        actionId: action.id,
        assetId,
        playbackId,
      });
      break;
    }

    case "video.asset.errored": {
      const assetId: string = event.data?.id ?? "";

      if (!assetId) break;

      const action = await prisma.action.findFirst({
        where: { muxAssetId: assetId },
      });

      if (!action) break;

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

    default:
      logger.info({
        operation: "mux.webhook.unhandled_event",
        eventType,
      });
  }

  return NextResponse.json({ received: true });
}
