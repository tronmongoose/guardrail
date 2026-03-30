/**
 * @mux/ai chapter generation — runs after video.track.ready fires.
 *
 * Fetches the auto-generated English transcript from the Mux asset, runs
 * generateChapters() via the LLM provider configured in the environment, and
 * upserts a VideoAnalysis record that the generation pipeline treats exactly
 * the same as a Gemini-produced analysis (topics, segments, transcript).
 *
 * Called from the Mux webhook handler using Next.js `after()` so the webhook
 * returns 200 immediately and the AI work runs in the background.
 */

import { generateChapters } from "@mux/ai/workflows";
import { fetchTranscriptForAsset } from "@mux/ai/primitives";
import { getMux, isMuxConfigured } from "@/lib/mux";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChapterAnalysisInput {
  assetId: string;
  playbackId: string;
  ytVideoId: string;
}

// ---------------------------------------------------------------------------
// Provider resolution
// ---------------------------------------------------------------------------

type SupportedProvider = "anthropic" | "openai";

function resolveProvider(): { provider: SupportedProvider; apiKey: string } | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: "openai", apiKey: process.env.OPENAI_API_KEY };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function generateMuxVideoAnalysis({
  assetId,
  playbackId,
  ytVideoId,
}: ChapterAnalysisInput): Promise<void> {
  if (!isMuxConfigured()) {
    logger.warn({ operation: "mux_ai.mux_not_configured", ytVideoId });
    return;
  }

  const resolved = resolveProvider();
  if (!resolved) {
    logger.warn({ operation: "mux_ai.no_llm_provider", ytVideoId });
    return;
  }

  const { provider, apiKey } = resolved;

  const credentials = {
    muxTokenId: process.env.MUX_TOKEN_ID!,
    muxTokenSecret: process.env.MUX_TOKEN_SECRET!,
    ...(provider === "anthropic" ? { anthropicApiKey: apiKey } : { openaiApiKey: apiKey }),
  };

  try {
    const mux = getMux();

    // Fetch the full asset object — @mux/ai's MuxAsset type is exactly
    // Awaited<ReturnType<Mux["video"]["assets"]["retrieve"]>>, so this is safe.
    const asset = await mux.video.assets.retrieve(assetId);

    // Run transcript fetch and chapter generation in parallel.
    const [transcriptResult, chaptersResult] = await Promise.all([
      fetchTranscriptForAsset(asset, playbackId).catch((err) => {
        logger.warn({ operation: "mux_ai.transcript_fetch_failed", ytVideoId }, err);
        return null;
      }),
      generateChapters(assetId, "en", {
        provider,
        credentials,
        // Guide the model toward learning-friendly chapter titles
        promptOverrides: {
          titleGuidelines:
            "Use concise, educational titles that describe what the viewer will learn. Under 8 words.",
        },
      }),
    ]);

    const chapters = chaptersResult.chapters;
    const durationSeconds = asset.duration ? Math.round(asset.duration) : undefined;

    // Map chapters → topics (same shape as Gemini VideoTopic[])
    const topics = chapters.map((ch, i, arr) => ({
      label: ch.title,
      startSeconds: ch.startTime,
      endSeconds: arr[i + 1]?.startTime ?? durationSeconds ?? ch.startTime + 300,
      subtopics: [] as string[],
    }));

    // Use chapter boundaries as segments; transcript text will be blank unless
    // we parse VTT cues per-chapter (future improvement).
    const segments = chapters.map((ch, i, arr) => ({
      startSeconds: ch.startTime,
      endSeconds: arr[i + 1]?.startTime ?? durationSeconds ?? ch.startTime + 300,
      text: "",
      topic: ch.title,
    }));

    // Build a readable summary from chapter titles as a fallback.
    const chapterList = chapters.map((c) => c.title).join("; ");
    const summary =
      chapters.length > 0
        ? `Chapters: ${chapterList}`
        : "Video analysis via Mux AI.";

    const analysisData = {
      summary,
      fullTranscript: transcriptResult?.transcriptText ?? null,
      segments: segments as object[],
      topics: topics as object[],
      keyMoments: [] as object[],
      people: [] as object[],
      durationSeconds: durationSeconds ?? null,
      model: "mux-ai/chapters",
      analyzedAt: new Date(),
    };

    await prisma.videoAnalysis.upsert({
      where: { youtubeVideoId: ytVideoId },
      create: { youtubeVideoId: ytVideoId, ...analysisData },
      update: analysisData,
    });

    // Back-fill durationSeconds on the video record if it wasn't already set.
    if (durationSeconds) {
      await prisma.youTubeVideo.update({
        where: { id: ytVideoId },
        data: { durationSeconds },
      });
    }

    logger.info({
      operation: "mux_ai.analysis_complete",
      ytVideoId,
      chapters: chapters.length,
      haTranscript: !!transcriptResult?.transcriptText,
      durationSeconds,
    });
  } catch (err) {
    // Non-blocking — log and continue. The program can still generate with
    // the metadata-only path; this analysis enriches it.
    logger.error({ operation: "mux_ai.analysis_failed", ytVideoId, assetId }, err);
  }
}
