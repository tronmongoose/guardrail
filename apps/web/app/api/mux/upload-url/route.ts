import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { getMux } from "@/lib/mux";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "CREATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { actionId } = body as { actionId?: string };

  // If actionId provided, verify the action belongs to a program owned by this creator
  if (actionId) {
    const action = await prisma.action.findUnique({
      where: { id: actionId },
      select: {
        session: {
          select: {
            week: {
              select: {
                program: { select: { creatorId: true } },
              },
            },
          },
        },
      },
    });
    if (!action) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }
    if (action.session.week.program.creatorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://journeyline.app";

  const mux = getMux();
  const upload = await mux.video.uploads.create({
    cors_origin: appUrl,
    new_asset_settings: {
      playback_policy: ["public"],
      mp4_support: "capped-1080p",
    },
  });

  // Persist the uploadId to the action so the webhook can link it to the right record
  if (actionId) {
    await prisma.action.update({
      where: { id: actionId },
      data: {
        muxUploadId: upload.id,
        muxStatus: "waiting",
      },
    });
  }

  return NextResponse.json({
    uploadId: upload.id,
    uploadUrl: upload.url,
  });
}
