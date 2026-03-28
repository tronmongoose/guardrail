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

  console.log("[blob-upload] POST received", { programId, bodyType: body.type, hasToken: !!process.env.BLOB_READ_WRITE_TOKEN });

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        console.log("[blob-upload] onBeforeGenerateToken", { pathname, programId });
        const user = await getOrCreateUser();
        if (!user) throw new Error("Unauthorized");

        const program = await prisma.program.findUnique({
          where: { id: programId },
          select: { creatorId: true },
        });
        if (!program) throw new Error("Program not found");
        if (program.creatorId !== user.id) throw new Error("Forbidden");

        return {
          allowedContentTypes: [
            "video/mp4",
            "video/quicktime",
            "video/webm",
            "video/x-mp4",
            "video/x-m4v",
            "video/mpeg",
            "video/x-matroska",
            "video/x-msvideo",
            "audio/mpeg",           // MP3
            "audio/wav",            // WAV
            "audio/mp4",            // M4A
            "audio/x-m4a",         // M4A (Safari)
            "audio/ogg",            // OGG
            "application/octet-stream", // fallback when browser doesn't detect MIME
          ],
          tokenPayload: JSON.stringify({ programId }),
        };
      },
      // DB record creation is handled client-side via POST /api/programs/[id]/videos
      // after the upload completes, so nothing needed here.
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('onUploadCompleted called', blob.url, tokenPayload);
      },
    });

    console.log("[blob-upload] handleUpload response", JSON.stringify(jsonResponse).slice(0, 200));
    return NextResponse.json(jsonResponse);
  } catch (err) {
    console.error("[blob-upload-token] Failed for program", programId, "—", (err as Error).message, (err as Error).stack);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
}
