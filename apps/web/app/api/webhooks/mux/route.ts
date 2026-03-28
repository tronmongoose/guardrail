import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, data } = body;

  switch (type) {
    case "video.asset.ready": {
      const playbackId = data.playback_ids?.[0]?.id;
      if (data.id && playbackId) {
        await prisma.youTubeVideo.updateMany({
          where: { muxAssetId: data.id },
          data: { muxPlaybackId: playbackId },
        });
        console.log(`[mux-webhook] Asset ready: ${data.id} → playback=${playbackId}`);
      }
      break;
    }
    case "video.asset.errored": {
      console.error(`[mux-webhook] Asset errored: ${data.id}`, data.errors);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
