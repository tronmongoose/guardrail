import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseYouTubeVideoId, fetchYouTubeOEmbed, fetchYouTubeTranscript } from "@guide-rail/shared";
import { videoLogger, createTimer } from "@/lib/logger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;
  const timer = createTimer();

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
    videoLogger.ingestionFailure(programId, null, timer.elapsed(), new Error("Invalid YouTube URL"), {
      stage: "parse",
      source: "single",
    });
    return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
  }

  videoLogger.ingestionStart(programId, videoId, "single");

  // Check duplicate
  const existing = await prisma.youTubeVideo.findUnique({
    where: { programId_videoId: { programId, videoId } },
  });
  if (existing) return NextResponse.json(existing);

  // Fetch metadata via oEmbed
  let meta: { title: string; authorName: string; thumbnailUrl: string };
  let hasMetadata = true;
  try {
    meta = await fetchYouTubeOEmbed(videoId);
  } catch {
    hasMetadata = false;
    meta = { title: videoId, authorName: "", thumbnailUrl: "" };
  }

  // Fetch transcript (best effort, don't fail if unavailable)
  let transcript: string | null = null;
  let hasTranscript = false;
  try {
    transcript = await fetchYouTubeTranscript(videoId);
    hasTranscript = !!transcript;
  } catch {
    videoLogger.transcriptUnavailable(programId, videoId);
  }

  try {
    const video = await prisma.youTubeVideo.create({
      data: {
        videoId,
        url,
        title: meta.title,
        authorName: meta.authorName,
        thumbnailUrl: meta.thumbnailUrl,
        transcript,
        programId,
      },
    });

    videoLogger.ingestionSuccess(programId, videoId, timer.elapsed(), {
      hasTranscript,
      hasMetadata,
      source: "single",
    });

    return NextResponse.json(video);
  } catch (err) {
    videoLogger.ingestionFailure(programId, videoId, timer.elapsed(), err, {
      stage: "database",
      source: "single",
    });
    throw err;
  }
}
