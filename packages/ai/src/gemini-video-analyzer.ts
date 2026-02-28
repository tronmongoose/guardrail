/**
 * Gemini video analyzer — sends YouTube URLs to Google AI Studio for
 * structured video analysis (transcript, topics, key moments, people).
 *
 * Gemini natively accepts YouTube URLs via fileData.fileUri and watches
 * the video (audio + 1fps visual sampling).
 *
 * Env: GOOGLE_AI_API_KEY (from Google AI Studio, $300 free credit)
 * Model: configurable via GEMINI_MODEL, defaults to gemini-2.5-flash-preview-05-20
 */

import type { VideoAnalysisOutput } from "@guide-rail/shared";
import { VideoAnalysisOutputSchema } from "@guide-rail/shared";

const GEMINI_TIMEOUT_MS = 180_000; // 3 minutes — video analysis can be slow
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.5-flash-preview-05-20";

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function buildVideoAnalysisPrompt(videoTitle: string): string {
  return `You are an expert video content analyst. Analyze this video thoroughly and return structured JSON.

VIDEO TITLE: "${videoTitle}"

Extract the following information as a single JSON object (no markdown, no code fences):

{
  "summary": "2-3 sentence summary of what the video covers and its core message",
  "fullTranscript": "Complete transcript of the video with natural paragraph breaks",
  "segments": [
    {
      "startSeconds": 0,
      "endSeconds": 45,
      "text": "Transcript text for this segment",
      "topic": "Topic label for this segment",
      "speakerName": "Name of person speaking (if identifiable)"
    }
  ],
  "topics": [
    {
      "label": "Topic or section name",
      "startSeconds": 0,
      "endSeconds": 225,
      "subtopics": ["subtopic 1", "subtopic 2"]
    }
  ],
  "keyMoments": [
    {
      "timestampSeconds": 135,
      "description": "What makes this moment notable",
      "significance": "high",
      "type": "insight"
    }
  ],
  "people": [
    {
      "name": "Person's name",
      "role": "host"
    }
  ],
  "durationSeconds": 1234
}

REQUIREMENTS:
- segments: Break the video into segments at natural topic boundaries (roughly every 30-90 seconds). Include the spoken text for each segment.
- topics: Group segments into broader topic sections. Each topic should be 2-10 minutes.
- keyMoments: Identify the most important moments — memorable analogies, case studies, exercise demonstrations, key insights, transitions between major sections. Mark significance as "high" for must-see moments, "medium" for notable, "low" for minor.
  - type should be one of: "insight", "example", "exercise", "transition", "summary"
- people: List anyone who appears or is prominently mentioned, with their role (host, guest, expert, etc.)
- durationSeconds: Total video length in seconds
- Be precise with timestamps — they will be used to create video clips

Return ONLY the JSON object.`;
}

/**
 * Stub analysis for local dev without Gemini API key.
 * Generates plausible synthetic data from the video title.
 */
function generateStubAnalysis(videoTitle: string, durationSeconds?: number): VideoAnalysisOutput {
  const duration = durationSeconds || 600; // default 10 min
  const segmentCount = Math.max(3, Math.ceil(duration / 60));

  const segments = [];
  const segmentDuration = Math.floor(duration / segmentCount);
  for (let i = 0; i < segmentCount; i++) {
    segments.push({
      startSeconds: i * segmentDuration,
      endSeconds: Math.min((i + 1) * segmentDuration, duration),
      text: `Segment ${i + 1} of "${videoTitle}" covering key concepts and examples.`,
      topic: `Section ${i + 1}`,
    });
  }

  const topicCount = Math.max(2, Math.ceil(segmentCount / 3));
  const topicDuration = Math.floor(duration / topicCount);
  const topics = [];
  for (let i = 0; i < topicCount; i++) {
    topics.push({
      label: `Topic ${i + 1}: ${videoTitle.split(" ").slice(0, 3).join(" ")}`,
      startSeconds: i * topicDuration,
      endSeconds: Math.min((i + 1) * topicDuration, duration),
    });
  }

  return {
    summary: `This video covers "${videoTitle}". It explores key concepts, provides practical examples, and offers actionable insights for learners.`,
    fullTranscript: segments.map((s) => s.text).join(" "),
    segments,
    topics,
    keyMoments: [
      {
        timestampSeconds: Math.floor(duration * 0.15),
        description: "Key framework introduction",
        significance: "high" as const,
        type: "insight" as const,
      },
      {
        timestampSeconds: Math.floor(duration * 0.5),
        description: "Practical example demonstration",
        significance: "high" as const,
        type: "example" as const,
      },
      {
        timestampSeconds: Math.floor(duration * 0.85),
        description: "Summary and next steps",
        significance: "medium" as const,
        type: "summary" as const,
      },
    ],
    durationSeconds: duration,
  };
}

function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text;
}

/**
 * Analyze a YouTube video using Google Gemini.
 * Returns structured analysis with timestamps, topics, key moments.
 */
export async function analyzeVideoWithGemini(
  youtubeVideoId: string,
  videoTitle: string,
  durationSeconds?: number,
): Promise<VideoAnalysisOutput> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    console.info("[gemini] No GOOGLE_AI_API_KEY, using stub analysis");
    return generateStubAnalysis(videoTitle, durationSeconds);
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
  const prompt = buildVideoAnalysisPrompt(videoTitle);

  console.info(`[gemini] Analyzing video: ${videoTitle} (${youtubeVideoId}) with ${model}`);

  const requestBody = {
    contents: [
      {
        parts: [
          {
            fileData: {
              fileUri: youtubeUrl,
            },
          },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  };

  const res = await fetchWithTimeout(
    `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    },
    GEMINI_TIMEOUT_MS,
  );

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`Gemini API error: ${res.status} - ${errorBody}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();

  const candidates = data.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("Gemini returned no candidates");
  }

  const rawText = candidates[0].content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("Gemini returned empty response");
  }

  console.info(`[gemini] Raw response length: ${rawText.length} chars`);

  const json = extractJSON(rawText);
  const parsed = JSON.parse(json);
  const validated = VideoAnalysisOutputSchema.parse(parsed);

  console.info(
    `[gemini] Analysis complete: ${validated.segments.length} segments, ${validated.topics.length} topics, ${validated.keyMoments?.length ?? 0} key moments`,
  );

  return validated;
}
