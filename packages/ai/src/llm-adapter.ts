/**
 * LLM adapter — provider-agnostic wrapper for generating ProgramDraft JSON.
 *
 * Two-pass architecture:
 *   Pass 1 (extractContentDigests): Per-video content extraction → structured digests
 *   Pass 2 (generateProgramDraft):  Curriculum design using rich digests
 *
 * Supports: "anthropic" | "openai" | "stub"
 * Configured via LLM_PROVIDER env var. Defaults to "stub" for local dev.
 */

import { ProgramDraftSchema } from "@guide-rail/shared";
import type { ProgramDraft } from "@guide-rail/shared";
import { generateWithStub, generateStubContentDigest } from "./llm-stub";

export type LLMProvider = "anthropic" | "openai" | "stub";

export interface ContentDigest {
  videoId: string;
  videoTitle: string;
  keyConcepts: string[];
  skillsIntroduced: string[];
  memorableExamples: string[];
  difficultyLevel: string;
  summary: string;
}

interface GenerateInput {
  programId: string;
  programTitle: string;
  programDescription?: string;
  outcomeStatement?: string;
  targetAudience?: string;
  targetTransformation?: string;
  vibePrompt?: string;
  durationWeeks: number;
  clusters: {
    clusterId: number;
    videoIds: string[];
    videoTitles: string[];
    videoTranscripts?: string[];
    summary?: string;
  }[];
  contentDigests?: ContentDigest[];
}

const MAX_REPAIR_ATTEMPTS = 2;

// ---------------------------------------------------------------------------
// Pass 1: Content Extraction
// ---------------------------------------------------------------------------

function buildExtractionPrompt(videoTitle: string, transcript: string): string {
  return `You are an expert content analyst. Analyze the following video transcript and extract structured information about what it teaches.

VIDEO TITLE: "${videoTitle}"

TRANSCRIPT:
${transcript}

Extract the following information as JSON (no markdown, no code fences):
{
  "keyConcepts": ["3-5 key concepts, techniques, or ideas taught in this video"],
  "skillsIntroduced": ["specific skills, frameworks, or methodologies introduced"],
  "memorableExamples": ["notable examples, case studies, or stories used to illustrate points"],
  "difficultyLevel": "beginner | intermediate | advanced",
  "summary": "2-3 sentence summary of what this video teaches and its core message"
}

Be specific and concrete — reference actual content from the transcript, not generic descriptions.
Return ONLY the JSON object.`;
}

async function extractSingleDigest(
  videoId: string,
  videoTitle: string,
  transcript: string,
  provider: LLMProvider,
): Promise<ContentDigest> {
  const prompt = buildExtractionPrompt(videoTitle, transcript);

  let raw: string;
  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY not set");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    raw = data.content[0].text;
  } else {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY not set");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    raw = data.choices[0].message.content;
  }

  try {
    const json = extractJSON(raw);
    const parsed = JSON.parse(json);
    return {
      videoId,
      videoTitle,
      keyConcepts: parsed.keyConcepts ?? [],
      skillsIntroduced: parsed.skillsIntroduced ?? [],
      memorableExamples: parsed.memorableExamples ?? [],
      difficultyLevel: parsed.difficultyLevel ?? "intermediate",
      summary: parsed.summary ?? "",
    };
  } catch (err) {
    console.error(`[LLM] Failed to parse content digest for ${videoId}:`, err);
    return fallbackDigest(videoId, videoTitle);
  }
}

function fallbackDigest(videoId: string, videoTitle: string): ContentDigest {
  return {
    videoId,
    videoTitle,
    keyConcepts: [],
    skillsIntroduced: [],
    memorableExamples: [],
    difficultyLevel: "intermediate",
    summary: `Content from "${videoTitle}"`,
  };
}

/**
 * Pass 1: Extract structured content digests from each video's transcript.
 * Parallelized with concurrency limit. Gracefully falls back per-video on failure.
 */
export async function extractContentDigests(
  videos: { videoId: string; videoTitle: string; transcript: string | null }[],
  onProgress?: (completed: number, total: number) => void,
): Promise<ContentDigest[]> {
  const provider = (process.env.LLM_PROVIDER || "stub") as LLMProvider;

  if (provider === "stub") {
    const digests = videos.map((v) =>
      generateStubContentDigest(v.videoId, v.videoTitle),
    );
    onProgress?.(videos.length, videos.length);
    return digests;
  }

  const CONCURRENCY = 3;
  const digests: ContentDigest[] = [];
  let completed = 0;

  for (let i = 0; i < videos.length; i += CONCURRENCY) {
    const batch = videos.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((v) => {
        if (!v.transcript || v.transcript.length < 50) {
          return Promise.resolve(fallbackDigest(v.videoId, v.videoTitle));
        }
        return extractSingleDigest(v.videoId, v.videoTitle, v.transcript, provider);
      }),
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === "fulfilled") {
        digests.push(result.value);
      } else {
        console.error("[LLM] Content extraction failed:", result.reason);
        digests.push(fallbackDigest(batch[j].videoId, batch[j].videoTitle));
      }
    }

    completed += batch.length;
    onProgress?.(completed, videos.length);
  }

  return digests;
}

// ---------------------------------------------------------------------------
// Pass 2: Curriculum Generation
// ---------------------------------------------------------------------------

export async function generateProgramDraft(
  input: GenerateInput
): Promise<ProgramDraft> {
  const provider = (process.env.LLM_PROVIDER || "stub") as LLMProvider;

  // Log input summary (privacy-conscious - no full transcripts)
  const inputSummary = {
    programId: input.programId,
    programTitle: input.programTitle,
    durationWeeks: input.durationWeeks,
    totalVideos: input.clusters.reduce((sum, c) => sum + c.videoIds.length, 0),
    clusterCount: input.clusters.length,
    hasOutcomeStatement: !!input.outcomeStatement,
    hasTargetAudience: !!input.targetAudience,
    hasTargetTransformation: !!input.targetTransformation,
    hasVibePrompt: !!input.vibePrompt,
    hasTranscripts: input.clusters.some(c => c.videoTranscripts?.some(t => t && t.length > 0)),
    hasContentDigests: !!input.contentDigests?.length,
    digestCount: input.contentDigests?.length ?? 0,
  };
  console.log(`[LLM] Generation request:`, JSON.stringify(inputSummary));
  console.log(`[LLM] Using provider: ${provider}`);

  let raw: string;

  if (provider === "stub") {
    console.log("[LLM] Generating with stub (no API call)");
    return generateWithStub(input);
  } else if (provider === "anthropic") {
    console.log("[LLM] Calling Anthropic API");
    raw = await callAnthropic(input);
  } else if (provider === "openai") {
    console.log("[LLM] Calling OpenAI API");
    raw = await callOpenAI(input);
  } else {
    throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
  }

  console.log(`[LLM] Raw response length: ${raw.length} chars`);

  // Parse + validate + repair loop
  for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
    try {
      const json = extractJSON(raw);
      const parsed = JSON.parse(json);
      const validated = ProgramDraftSchema.parse(parsed);

      // Log output summary
      console.log(`[LLM] Generated draft: ${validated.weeks.length} weeks, ${
        validated.weeks.reduce((sum, w) => sum + w.sessions.length, 0)
      } sessions, ${
        validated.weeks.reduce((sum, w) =>
          sum + w.sessions.reduce((s, sess) => s + sess.actions.length, 0), 0)
      } actions`);

      return validated;
    } catch (err) {
      console.error(`[LLM] Parse attempt ${attempt + 1} failed:`, err);
      if (attempt === MAX_REPAIR_ATTEMPTS) {
        throw new Error(
          `LLM output failed validation after ${MAX_REPAIR_ATTEMPTS} repair attempts: ${err}`
        );
      }
      // Attempt repair by re-calling with error context
      console.log(`[LLM] Attempting repair...`);
      raw = await repairJSON(raw, String(err), provider, input);
    }
  }

  throw new Error("Unreachable");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractJSON(text: string): string {
  // Try to find JSON block in markdown code fence or raw
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  // Try raw JSON
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text;
}

function buildPrompt(input: GenerateInput): string {
  // Build digest lookup
  const digestMap = new Map(
    (input.contentDigests ?? []).map((d) => [d.videoId, d]),
  );

  // Flatten all videos with their transcripts for the prompt
  const allVideos: { id: string; title: string; transcript?: string; clusterId: number }[] = [];
  for (const c of input.clusters) {
    for (let i = 0; i < c.videoIds.length; i++) {
      allVideos.push({
        id: c.videoIds[i],
        title: c.videoTitles[i],
        transcript: c.videoTranscripts?.[i],
        clusterId: c.clusterId,
      });
    }
  }

  // Build video descriptions — use rich digests when available, fall back to transcript snippet
  const videoDescriptions = allVideos.map((v, i) => {
    const digest = digestMap.get(v.id);
    if (digest && digest.keyConcepts.length > 0) {
      return [
        `${i + 1}. "${v.title}" (ID: ${v.id}, Cluster: ${v.clusterId})`,
        `   Summary: ${digest.summary}`,
        `   Key concepts: ${digest.keyConcepts.join(", ")}`,
        `   Skills introduced: ${digest.skillsIntroduced.join(", ") || "N/A"}`,
        `   Notable examples: ${digest.memorableExamples.join("; ") || "N/A"}`,
        `   Difficulty: ${digest.difficultyLevel}`,
      ].join("\n");
    }
    // Fallback to transcript snippet
    const transcriptSnippet = v.transcript
      ? `\n   Content preview: ${v.transcript.slice(0, 600)}${v.transcript.length > 600 ? "..." : ""}`
      : "";
    return `${i + 1}. "${v.title}" (ID: ${v.id}, Cluster: ${v.clusterId})${transcriptSnippet}`;
  }).join("\n\n");

  const totalVideos = allVideos.length;
  const videosPerWeek = Math.max(1, Math.ceil(totalVideos / input.durationWeeks));

  // Build audience and transformation context
  const audienceContext = input.targetAudience
    ? `- Target Audience: ${input.targetAudience}`
    : "";
  const transformationContext = input.targetTransformation
    ? `- Target Transformation: ${input.targetTransformation}`
    : "";

  // Build vibe/style instructions
  const vibeInstructions = input.vibePrompt
    ? `\nCREATOR'S STYLE GUIDE:
${input.vibePrompt}

Apply this style throughout all titles, descriptions, instructions, and reflection prompts.`
    : "";

  return `You are an expert curriculum designer creating a transformational learning program.

PROGRAM CONTEXT:
- Title: "${input.programTitle}"
- Duration: EXACTLY ${input.durationWeeks} weeks (you MUST create ${input.durationWeeks} weeks)
- Total videos available: ${totalVideos}
${input.programDescription ? `- Description: ${input.programDescription}` : ""}
${audienceContext}
${transformationContext}
${input.outcomeStatement ? `- Outcome Statement: ${input.outcomeStatement}` : ""}
${vibeInstructions}

AVAILABLE VIDEO CONTENT:
${videoDescriptions}

YOUR TASK:
Create a ${input.durationWeeks}-week structured learning program that transforms ${input.targetAudience || "learners"} toward ${input.targetTransformation || "the intended outcome"}.

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ${input.durationWeeks} weeks (weekNumber 1 through ${input.durationWeeks})
2. Distribute videos logically across all ${input.durationWeeks} weeks (approximately ${videosPerWeek} video(s) per week)
3. Each week needs a clear theme that builds toward the transformation
4. Videos from the same cluster share related topics - use this to group them logically
5. Each session MUST include 2-3 key takeaways (keyTakeaways array)

STRUCTURE EACH WEEK WITH:
- 1-2 sessions per week
- Each session should have:
  * keyTakeaways: 2-3 concise bullet points summarizing what learners will gain
  * WATCH action(s) - reference videos by their exact ID
  * DO action - practical exercise applying what was learned
  * REFLECT action (at least one per week) - thought-provoking prompt connecting to the transformation

OUTPUT FORMAT (JSON only, no markdown):
{
  "programId": "${input.programId}",
  "title": "${input.programTitle}",
  "description": "A compelling 1-2 sentence description of the program transformation",
  "pacingMode": "drip_by_week",
  "durationWeeks": ${input.durationWeeks},
  "weeks": [
    {
      "title": "Week 1: [Theme]",
      "summary": "What learners will achieve this week",
      "weekNumber": 1,
      "sessions": [
        {
          "title": "Session title",
          "summary": "Session focus",
          "keyTakeaways": [
            "First key insight or skill they'll gain",
            "Second key insight or skill they'll gain",
            "Third key insight or skill they'll gain"
          ],
          "orderIndex": 0,
          "actions": [
            {
              "title": "Watch: [Video title]",
              "type": "watch",
              "instructions": "Specific guidance on what to focus on while watching",
              "youtubeVideoId": "[exact video ID from above]",
              "orderIndex": 0
            },
            {
              "title": "Practice: [Exercise name]",
              "type": "do",
              "instructions": "Clear, actionable exercise (3-5 steps)",
              "orderIndex": 1
            },
            {
              "title": "Reflect: [Topic]",
              "type": "reflect",
              "instructions": "Context for the reflection",
              "reflectionPrompt": "Thought-provoking question connecting to the transformation",
              "orderIndex": 2
            }
          ]
        }
      ]
    }
  ]
}

QUALITY GUIDELINES:
- Week titles should be engaging and transformation-oriented (e.g., "Week 1: Building Your Foundation")
- Key takeaways should be specific, actionable outcomes - not vague promises
- Instructions should be specific and actionable, not generic
- DO actions should have concrete exercises learners can complete
- REFLECT prompts should encourage deep thinking and personal application
- Build complexity progressively - earlier weeks introduce concepts, later weeks integrate them
- Final week should synthesize learning and prepare for real-world application
- If a style guide was provided, ensure all content matches that tone and energy
- Use the specific concepts, skills, and examples from each video to design exercises and reflection prompts
- DO exercises should reference real techniques from the video content, not generic activities
- Reflection prompts should ask about specific concepts or examples mentioned in the videos
- Key takeaways should reflect actual insights from the video content`;
}

async function callAnthropic(input: GenerateInput): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [{ role: "user", content: buildPrompt(input) }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  return data.content[0].text;
}

async function callOpenAI(input: GenerateInput): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");

  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const prompt = buildPrompt(input);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8192,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`OpenAI API error: ${res.status} - ${errorBody}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  return data.choices[0].message.content;
}

async function repairJSON(
  badOutput: string,
  error: string,
  provider: LLMProvider,
  _input: GenerateInput
): Promise<string> {
  const repairPrompt = `The following JSON output was invalid:\n\n${badOutput}\n\nError: ${error}\n\nPlease fix the JSON to match the required schema and return ONLY valid JSON.`;

  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY!;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        max_tokens: 8192,
        messages: [{ role: "user", content: repairPrompt }],
      }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    return data.content[0].text;
  }

  // OpenAI
  const key = process.env.OPENAI_API_KEY!;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [{ role: "user", content: repairPrompt }],
      max_tokens: 8192,
    }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  return data.choices[0].message.content;
}
