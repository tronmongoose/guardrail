import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseYouTubeVideoId, fetchYouTubeOEmbed, fetchYouTubeTranscript } from "@guide-rail/shared";

interface VideoResult {
  id: string;
  videoId: string;
  url: string;
  title: string | null;
  thumbnailUrl: string | null;
  transcript: string | null;
}

interface VideoError {
  url: string;
  error: string;
}

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

  const { urls } = await req.json();
  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: "urls array is required" }, { status: 400 });
  }

  // Limit batch size to prevent abuse
  const maxBatchSize = 20;
  const urlsToProcess = urls.slice(0, maxBatchSize);

  const success: VideoResult[] = [];
  const errors: VideoError[] = [];

  // Process videos in parallel with concurrency limit
  const concurrencyLimit = 5;
  const chunks: string[][] = [];
  for (let i = 0; i < urlsToProcess.length; i += concurrencyLimit) {
    chunks.push(urlsToProcess.slice(i, i + concurrencyLimit));
  }

  for (const chunk of chunks) {
    const results = await Promise.allSettled(
      chunk.map(async (url: string) => {
        const trimmedUrl = url.trim();
        if (!trimmedUrl) {
          throw new Error("Empty URL");
        }

        const videoId = parseYouTubeVideoId(trimmedUrl);
        if (!videoId) {
          throw new Error("Invalid YouTube URL");
        }

        // Check if already exists
        const existing = await prisma.youTubeVideo.findUnique({
          where: { programId_videoId: { programId, videoId } },
        });
        if (existing) {
          return {
            id: existing.id,
            videoId: existing.videoId,
            url: existing.url,
            title: existing.title,
            thumbnailUrl: existing.thumbnailUrl,
            transcript: existing.transcript,
          };
        }

        // Fetch metadata
        let meta: { title: string; authorName: string; thumbnailUrl: string };
        try {
          meta = await fetchYouTubeOEmbed(videoId);
        } catch {
          meta = { title: videoId, authorName: "", thumbnailUrl: "" };
        }

        // Fetch transcript (best effort)
        let transcript: string | null = null;
        try {
          transcript = await fetchYouTubeTranscript(videoId);
        } catch {
          // Transcript unavailable, continue without it
        }

        const video = await prisma.youTubeVideo.create({
          data: {
            videoId,
            url: trimmedUrl,
            title: meta.title,
            authorName: meta.authorName,
            thumbnailUrl: meta.thumbnailUrl,
            transcript,
            programId,
          },
        });

        return {
          id: video.id,
          videoId: video.videoId,
          url: video.url,
          title: video.title,
          thumbnailUrl: video.thumbnailUrl,
          transcript: video.transcript,
        };
      })
    );

    // Process results
    results.forEach((result, index) => {
      const url = chunk[index];
      if (result.status === "fulfilled") {
        success.push(result.value);
      } else {
        errors.push({
          url,
          error: result.reason?.message || "Unknown error",
        });
      }
    });
  }

  return NextResponse.json({ success, errors });
}
