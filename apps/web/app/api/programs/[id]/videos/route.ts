import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseYouTubeVideoId, fetchYouTubeOEmbed } from "@guide-rail/shared";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { creatorId: true }
  });
  if (!program) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { url } = await req.json();
  const videoId = parseYouTubeVideoId(url);
  if (!videoId) {
    return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
  }

  // Check duplicate
  const existing = await prisma.youTubeVideo.findUnique({
    where: { programId_videoId: { programId, videoId } },
  });
  if (existing) return NextResponse.json(existing);

  // Fetch metadata via oEmbed
  let meta: { title: string; authorName: string; thumbnailUrl: string };
  try {
    meta = await fetchYouTubeOEmbed(videoId);
  } catch {
    meta = { title: videoId, authorName: "", thumbnailUrl: "" };
  }

  const video = await prisma.youTubeVideo.create({
    data: {
      videoId,
      url,
      title: meta.title,
      authorName: meta.authorName,
      thumbnailUrl: meta.thumbnailUrl,
      programId,
    },
  });

  return NextResponse.json(video);
}
