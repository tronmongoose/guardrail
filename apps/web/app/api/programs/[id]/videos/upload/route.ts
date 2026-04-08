import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 120;

/**
 * Server-side Vercel Blob upload.
 * Streams the raw request body directly to Blob storage.
 * Client sends: PUT with raw file bytes + query params for filename.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;

  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { creatorId: true },
  });
  if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });
  if (program.creatorId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const filename = req.nextUrl.searchParams.get("filename");
  if (!filename) return NextResponse.json({ error: "Missing filename" }, { status: 400 });

  const contentType = req.headers.get("content-type") || "video/mp4";

  if (!req.body) return NextResponse.json({ error: "No body" }, { status: 400 });

  try {
    const blob = await put(filename, req.body, {
      access: "public",
      addRandomSuffix: true,
      contentType,
    });

    return NextResponse.json({ url: blob.url, pathname: blob.pathname });
  } catch (err) {
    console.error("[blob-upload] Failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
