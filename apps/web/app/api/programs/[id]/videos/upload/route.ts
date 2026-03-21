import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;
  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        const user = await getOrCreateUser();
        if (!user) throw new Error("Unauthorized");

        const program = await prisma.program.findUnique({
          where: { id: programId },
          select: { creatorId: true },
        });
        if (!program) throw new Error("Program not found");
        if (program.creatorId !== user.id) throw new Error("Forbidden");

        return {
          allowedContentTypes: ["video/mp4", "video/quicktime", "video/webm"],
          tokenPayload: JSON.stringify({ programId }),
        };
      },
      // DB record creation is handled client-side via POST /api/programs/[id]/videos
      // after the upload completes, so nothing needed here.
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
}
