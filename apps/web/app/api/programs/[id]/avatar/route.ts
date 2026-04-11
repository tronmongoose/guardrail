import { NextRequest, NextResponse } from "next/server";
import { put, del, get } from "@vercel/blob";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

/**
 * Proxy the private blob avatar image so browsers can render it.
 * Public route — no auth required (avatars are shown on public pages).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;

  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { creatorAvatarUrl: true },
  });

  if (!program?.creatorAvatarUrl) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const result = await get(program.creatorAvatarUrl, { access: "private" });
    if (!result || result.statusCode !== 200) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}

/**
 * Upload a creator avatar image for a program.
 * Accepts raw image bytes via PUT with ?filename= query param.
 * Stores in Vercel Blob and saves URL to program.creatorAvatarUrl.
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
    select: { creatorId: true, creatorAvatarUrl: true },
  });
  if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });
  if (program.creatorId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const filename = req.nextUrl.searchParams.get("filename");
  if (!filename) return NextResponse.json({ error: "Missing filename" }, { status: 400 });

  const contentType = req.headers.get("content-type") || "image/jpeg";
  if (!req.body) return NextResponse.json({ error: "No body" }, { status: 400 });

  try {
    // Delete old avatar blob if it exists
    if (program.creatorAvatarUrl) {
      try {
        await del(program.creatorAvatarUrl);
      } catch {
        // Ignore deletion failures — old blob may already be gone
      }
    }

    const blob = await put(`avatars/${programId}/${filename}`, req.body, {
      access: "private",
      addRandomSuffix: true,
      contentType,
    });

    // Save URL to program
    await prisma.program.update({
      where: { id: programId },
      data: { creatorAvatarUrl: blob.url },
    });

    // Return the proxy URL so browsers can render it (private blob URLs are not directly accessible)
    return NextResponse.json({ url: `/api/programs/${programId}/avatar` });
  } catch (err) {
    console.error("[avatar-upload] Failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}

/**
 * Remove the creator avatar from a program.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;

  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { creatorId: true, creatorAvatarUrl: true },
  });
  if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });
  if (program.creatorId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (program.creatorAvatarUrl) {
    try {
      await del(program.creatorAvatarUrl);
    } catch {
      // Ignore
    }
  }

  await prisma.program.update({
    where: { id: programId },
    data: { creatorAvatarUrl: null },
  });

  return NextResponse.json({ success: true });
}
