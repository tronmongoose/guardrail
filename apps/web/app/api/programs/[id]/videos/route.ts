import { NextRequest, NextResponse, after } from "next/server";
import { getOrCreateUser } from "@/lib/auth";

export const maxDuration = 300; // Keep function alive for post-response Gemini analysis
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Mux from "@mux/mux-node";
import { parseYouTubeVideoId, fetchYouTubeOEmbed, fetchYouTubeTranscript } from "@guide-rail/shared";
import { analyzeVideoWithGemini, analyzeUploadedVideoWithGemini } from "@guide-rail/ai";
import { maybeSegmentVideo } from "@/lib/video-segmentation";
import { videoLogger, createTimer } from "@/lib/logger";

const mux = new Mux();

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

  const { url, source, title: uploadedTitle } = await req.json();

  // Handle direct file uploads (from Vercel Blob)
  if (source === "upload") {
    const rawName = (uploadedTitle as string | undefined) || url.split("/").pop() || "Uploaded Video";
    const title = rawName.replace(/\.[^/.]+$/, ""); // strip extension
    const video = await prisma.youTubeVideo.create({
      data: {
        videoId: crypto.randomUUID(),
        url,
        title,
        programId,
      },
    });

    // Run Mux transcoding + Gemini analysis after the response is sent
    const mimeType = url.toLowerCase().endsWith(".mov") ? "video/quicktime" : "video/mp4";
    const videoId = video.id;
    after(async () => {
      // Kick off Mux transcoding (non-blocking, runs in parallel with Gemini)
      if (process.env.MUX_TOKEN_ID) {
        try {
          const asset = await mux.video.assets.create({
            inputs: [{ url }],
            playback_policy: ["public"],
            video_quality: "basic",
          });
          const playbackId = asset.playback_ids?.[0]?.id;
          await prisma.youTubeVideo.update({
            where: { id: videoId },
            data: { muxAssetId: asset.id, muxPlaybackId: playbackId ?? null },
          });
          console.log(`[mux] Asset created for "${title}" — asset=${asset.id} playback=${playbackId}`);
        } catch (muxErr) {
          console.error(`[mux] Asset creation failed for "${title}":`, muxErr);
        }
      }

      try {
        const analysis = await analyzeUploadedVideoWithGemini(url, title, mimeType);
        await prisma.videoAnalysis.upsert({
          where: { youtubeVideoId: videoId },
          create: {
            youtubeVideoId: videoId,
            summary: analysis.summary,
            fullTranscript: analysis.fullTranscript ?? null,
            segments: analysis.segments as unknown as Prisma.InputJsonValue,
            topics: analysis.topics as unknown as Prisma.InputJsonValue,
            keyMoments: analysis.keyMoments as unknown as Prisma.InputJsonValue ?? undefined,
            people: analysis.people as unknown as Prisma.InputJsonValue ?? undefined,
            durationSeconds: analysis.durationSeconds ?? null,
          },
          update: {
            summary: analysis.summary,
            fullTranscript: analysis.fullTranscript ?? null,
            segments: analysis.segments as unknown as Prisma.InputJsonValue,
            topics: analysis.topics as unknown as Prisma.InputJsonValue,
            keyMoments: analysis.keyMoments as unknown as Prisma.InputJsonValue ?? undefined,
            people: analysis.people as unknown as Prisma.InputJsonValue ?? undefined,
            durationSeconds: analysis.durationSeconds ?? null,
            analyzedAt: new Date(),
          },
        });
        if (analysis.durationSeconds) {
          await maybeSegmentVideo(prisma, video, analysis.topics, analysis.durationSeconds);
        }
        console.log(`[gemini] Upload analysis saved for "${title}" (record ${videoId})`);
      } catch (err) {
        console.error(`[gemini] Upload analysis failed for "${title}":`, err);
      }
    });

    return NextResponse.json(video);
  }

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

    // Fire-and-forget Gemini video analysis (runs in background)
    analyzeVideoWithGemini(videoId, meta.title, undefined)
      .then(async (analysis) => {
        await prisma.videoAnalysis.upsert({
          where: { youtubeVideoId: video.id },
          create: {
            youtubeVideoId: video.id,
            summary: analysis.summary,
            fullTranscript: analysis.fullTranscript ?? null,
            segments: analysis.segments as unknown as Prisma.InputJsonValue,
            topics: analysis.topics as unknown as Prisma.InputJsonValue,
            keyMoments: analysis.keyMoments as unknown as Prisma.InputJsonValue ?? undefined,
            people: analysis.people as unknown as Prisma.InputJsonValue ?? undefined,
            durationSeconds: analysis.durationSeconds ?? null,
          },
          update: {
            summary: analysis.summary,
            fullTranscript: analysis.fullTranscript ?? null,
            segments: analysis.segments as unknown as Prisma.InputJsonValue,
            topics: analysis.topics as unknown as Prisma.InputJsonValue,
            keyMoments: analysis.keyMoments as unknown as Prisma.InputJsonValue ?? undefined,
            people: analysis.people as unknown as Prisma.InputJsonValue ?? undefined,
            durationSeconds: analysis.durationSeconds ?? null,
            analyzedAt: new Date(),
          },
        });
        if (analysis.durationSeconds) {
          await maybeSegmentVideo(prisma, video, analysis.topics, analysis.durationSeconds);
        }
        console.log(`[gemini] Video analysis saved for ${videoId} (record ${video.id})`);
      })
      .catch((err) => {
        console.error(`[gemini] Video analysis failed for ${videoId}:`, err);
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

export async function GET(
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
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (program.creatorId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const videos = await prisma.youTubeVideo.findMany({
    where: { programId, isSegment: false },
    include: {
      _count: { select: { segments: true } },
      analysis: { select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Return analysis as a boolean flag to keep payload small
  return NextResponse.json(
    videos.map(({ analysis, ...v }) => ({ ...v, hasAnalysis: analysis !== null }))
  );
}
