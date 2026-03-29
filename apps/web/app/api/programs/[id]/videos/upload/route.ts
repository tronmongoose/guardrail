// MUX_MIGRATION: This Vercel Blob client-upload token handler has been superseded
// by POST /api/mux/upload-url which issues Mux direct upload URLs instead.
// Remove this file once all video upload surfaces have been migrated to MuxUploader.
//
// Original Blob upload implementation preserved below for reference:
//
// import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
// import { NextRequest, NextResponse } from "next/server";
// import { getOrCreateUser } from "@/lib/auth";
// import { prisma } from "@/lib/prisma";
//
// export async function POST(
//   req: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   const { id: programId } = await params;
//   const body = (await req.json()) as HandleUploadBody;
//
//   try {
//     const jsonResponse = await handleUpload({
//       body,
//       request: req,
//       onBeforeGenerateToken: async () => {
//         const user = await getOrCreateUser();
//         if (!user) throw new Error("Unauthorized");
//
//         const program = await prisma.program.findUnique({
//           where: { id: programId },
//           select: { creatorId: true },
//         });
//         if (!program) throw new Error("Program not found");
//         if (program.creatorId !== user.id) throw new Error("Forbidden");
//
//         return {
//           allowedContentTypes: [
//             "video/mp4", "video/quicktime", "video/webm", "video/x-mp4",
//             "video/x-m4v", "video/mpeg", "video/x-matroska", "video/x-msvideo",
//             "audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a",
//             "audio/ogg", "application/octet-stream",
//           ],
//           tokenPayload: JSON.stringify({ programId }),
//         };
//       },
//       onUploadCompleted: async () => {},
//     });
//
//     return NextResponse.json(jsonResponse);
//   } catch (err) {
//     console.error("[blob-upload-token] Failed for program", programId, "—", (err as Error).message);
//     return NextResponse.json({ error: (err as Error).message }, { status: 400 });
//   }
// }

export {};
