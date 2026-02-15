/**
 * LLM adapter — provider-agnostic wrapper for generating ProgramDraft JSON.
 *
 * Two-pass architecture:
 *   Pass 1 (extractContentDigests): Per-content-source extraction → structured digests
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
  contentId: string;
  contentTitle: string;
  contentType: "video" | "document";
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
    contentIds: string[];
    contentTitles: string[];
    contentTranscripts?: string[];
    contentTypes?: ("video" | "document")[];
    summary?: string;
  }[];
  contentDigests?: ContentDigest[];
}

const MAX_REPAIR_ATTEMPTS = 2;

// ---------------------------------------------------------------------------
// Pass 1: Content Extraction
// ---------------------------------------------------------------------------

function buildExtractionPrompt(contentTitle: string, text: string, contentType: "video" | "document" = "video"): string {
  const sourceLabel = contentType === "video" ? "VIDEO" : "DOCUMENT";
  const textLabel = contentType === "video" ? "TRANSCRIPT" : "CONTENT";
  const truncated = text.slice(0, 8000);
  return `You are an expert content analyst. Analyze the following ${sourceLabel.toLowerCase()} and extract structured information about what it teaches.

${sourceLabel} TITLE: "${contentTitle}"

${textLabel}:
${truncated}${text.length > 8000 ? "..." : ""}

Extract the following information as JSON (no markdown, no code fences):
{
  "keyConcepts": ["3-5 key concepts, techniques, or ideas taught in this ${sourceLabel.toLowerCase()}"],
  "skillsIntroduced": ["specific skills, frameworks, or methodologies introduced"],
  "memorableExamples": ["notable examples, case studies, or stories used to illustrate points"],
  "difficultyLevel": "beginner | intermediate | advanced",
  "summary": "2-3 sentence summary of what this ${sourceLabel.toLowerCase()} teaches and its core message"
}

Be specific and concrete — reference actual content from the ${textLabel.toLowerCase()}, not generic descriptions.
Return ONLY the JSON object.`;
}

async function extractSingleDigest(
  contentId: string,
  contentTitle: string,
  text: string,
  contentType: "video" | "document",
  provider: LLMProvider,
): Promise<ContentDigest> {
  const prompt = buildExtractionPrompt(contentTitle, text, contentType);

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
      contentId,
      contentTitle,
      contentType,
      keyConcepts: parsed.keyConcepts ?? [],
      skillsIntroduced: parsed.skillsIntroduced ?? [],
      memorableExamples: parsed.memorableExamples ?? [],
      difficultyLevel: parsed.difficultyLevel ?? "intermediate",
      summary: parsed.summary ?? "",
    };
  } catch (err) {
    console.error(`[LLM] Failed to parse content digest for ${contentId}:`, err);
    return fallbackDigest(contentId, contentTitle, contentType);
  }
}

function fallbackDigest(contentId: string, contentTitle: string, contentType: "video" | "document" = "video"): ContentDigest {
  return {
    contentId,
    contentTitle,
    contentType,
    keyConcepts: [],
    skillsIntroduced: [],
    memorableExamples: [],
    difficultyLevel: "intermediate",
    summary: `Content from "${contentTitle}"`,
  };
}

/**
 * Pass 1: Extract structured content digests from each content source.
 * Parallelized with concurrency limit. Gracefully falls back per-item on failure.
 */
export async function extractContentDigests(
  items: { contentId: string; contentTitle: string; text: string | null; contentType?: "video" | "document" }[],
  onProgress?: (completed: number, total: number) => void,
): Promise<ContentDigest[]> {
  const provider = (process.env.LLM_PROVIDER || "stub") as LLMProvider;

  if (provider === "stub") {
    const digests = items.map((item) =>
      generateStubContentDigest(item.contentId, item.contentTitle, item.contentType ?? "video"),
    );
    onProgress?.(items.length, items.length);
    return digests;
  }

  const CONCURRENCY = 3;
  const digests: ContentDigest[] = [];
  let completed = 0;

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((item) => {
        const ct = item.contentType ?? "video";
        if (!item.text || item.text.length < 50) {
          return Promise.resolve(fallbackDigest(item.contentId, item.contentTitle, ct));
        }
        return extractSingleDigest(item.contentId, item.contentTitle, item.text, ct, provider);
      }),
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === "fulfilled") {
        digests.push(result.value);
      } else {
        console.error("[LLM] Content extraction failed:", result.reason);
        digests.push(fallbackDigest(batch[j].contentId, batch[j].contentTitle, batch[j].contentType ?? "video"));
      }
    }

    completed += batch.length;
    onProgress?.(completed, items.length);
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
    totalContent: input.clusters.reduce((sum, c) => sum + c.contentIds.length, 0),
    clusterCount: input.clusters.length,
    hasOutcomeStatement: !!input.outcomeStatement,
    hasTargetAudience: !!input.targetAudience,
    hasTargetTransformation: !!input.targetTransformation,
    hasVibePrompt: !!input.vibePrompt,
    hasTranscripts: input.clusters.some(c => c.contentTranscripts?.some(t => t && t.length > 0)),
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
    (input.contentDigests ?? []).map((d) => [d.contentId, d]),
  );

  // Flatten all content items with their text for the prompt
  const allContent: { id: string; title: string; text?: string; clusterId: number; type: "video" | "document" }[] = [];
  for (const c of input.clusters) {
    for (let i = 0; i < c.contentIds.length; i++) {
      allContent.push({
        id: c.contentIds[i],
        title: c.contentTitles[i],
        text: c.contentTranscripts?.[i],
        clusterId: c.clusterId,
        type: c.contentTypes?.[i] ?? "video",
      });
    }
  }

  const videoCount = allContent.filter(c => c.type === "video").length;
  const docCount = allContent.filter(c => c.type === "document").length;
  const hasVideos = videoCount > 0;
  const hasDocs = docCount > 0;

  // Build content descriptions — use rich digests when available, fall back to text snippet
  const contentDescriptions = allContent.map((item, i) => {
    const typeLabel = item.type === "video" ? "VIDEO" : "DOCUMENT";
    const digest = digestMap.get(item.id);
    if (digest && digest.keyConcepts.length > 0) {
      return [
        `${i + 1}. [${typeLabel}] "${item.title}" (ID: ${item.id}, Cluster: ${item.clusterId})`,
        `   Summary: ${digest.summary}`,
        `   Key concepts: ${digest.keyConcepts.join(", ")}`,
        `   Skills introduced: ${digest.skillsIntroduced.join(", ") || "N/A"}`,
        `   Notable examples: ${digest.memorableExamples.join("; ") || "N/A"}`,
        `   Difficulty: ${digest.difficultyLevel}`,
      ].join("\n");
    }
    // Fallback to text snippet
    const textSnippet = item.text
      ? `\n   Content preview: ${item.text.slice(0, 600)}${item.text.length > 600 ? "..." : ""}`
      : "";
    return `${i + 1}. [${typeLabel}] "${item.title}" (ID: ${item.id}, Cluster: ${item.clusterId})${textSnippet}`;
  }).join("\n\n");

  const totalContent = allContent.length;
  const contentPerWeek = Math.max(1, Math.ceil(totalContent / input.durationWeeks));

  // Build content summary line
  const contentSummaryParts: string[] = [];
  if (hasVideos) contentSummaryParts.push(`${videoCount} video(s)`);
  if (hasDocs) contentSummaryParts.push(`${docCount} document(s)`);
  const contentSummary = contentSummaryParts.join(" and ");

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

  // Build content-type-specific action instructions
  const actionInstructions = [];
  if (hasVideos) {
    actionInstructions.push(`  * WATCH action(s) — for VIDEO content, reference videos by their exact ID in the youtubeVideoId field`);
  }
  if (hasDocs) {
    actionInstructions.push(`  * READ action(s) — for DOCUMENT content, create reading assignments that reference the document's key points`);
  }
  actionInstructions.push(`  * DO action — practical exercise applying what was learned`);
  actionInstructions.push(`  * REFLECT action (at least one per week) — thought-provoking prompt connecting to the transformation`);

  // Build action format examples
  const actionExamples = [];
  if (hasVideos) {
    actionExamples.push(`            {
              "title": "Watch: [Video title]",
              "type": "watch",
              "instructions": "Specific guidance on what to focus on while watching",
              "youtubeVideoId": "[exact video ID from above]",
              "orderIndex": 0
            }`);
  }
  if (hasDocs) {
    actionExamples.push(`            {
              "title": "Read: [Document title or section]",
              "type": "read",
              "instructions": "Key sections to focus on and what to look for",
              "orderIndex": ${hasVideos ? 1 : 0}
            }`);
  }
  actionExamples.push(`            {
              "title": "Practice: [Exercise name]",
              "type": "do",
              "instructions": "Clear, actionable exercise (3-5 steps)",
              "orderIndex": ${actionExamples.length}
            }`);
  actionExamples.push(`            {
              "title": "Reflect: [Topic]",
              "type": "reflect",
              "instructions": "Context for the reflection",
              "reflectionPrompt": "Thought-provoking question connecting to the transformation",
              "orderIndex": ${actionExamples.length}
            }`);

  return `You are an expert curriculum designer creating a transformational learning program.

PROGRAM CONTEXT:
- Title: "${input.programTitle}"
- Duration: EXACTLY ${input.durationWeeks} weeks (you MUST create ${input.durationWeeks} weeks)
- Content available: ${contentSummary}
${input.programDescription ? `- Description: ${input.programDescription}` : ""}
${audienceContext}
${transformationContext}
${input.outcomeStatement ? `- Outcome Statement: ${input.outcomeStatement}` : ""}
${vibeInstructions}

AVAILABLE CONTENT SOURCES:
${contentDescriptions}

YOUR TASK:
Create a ${input.durationWeeks}-week structured learning program that transforms ${input.targetAudience || "learners"} toward ${input.targetTransformation || "the intended outcome"}.

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ${input.durationWeeks} weeks (weekNumber 1 through ${input.durationWeeks})
2. Distribute content logically across all ${input.durationWeeks} weeks (approximately ${contentPerWeek} source(s) per week)
3. Each week needs a clear theme that builds toward the transformation
4. Content from the same cluster shares related topics — use this to group them logically
5. Each session MUST include 2-3 key takeaways (keyTakeaways array)
${hasVideos ? `6. For VIDEO content: create WATCH actions with the exact youtubeVideoId` : ""}
${hasDocs ? `${hasVideos ? "7" : "6"}. For DOCUMENT content: create READ actions referencing key points from the document` : ""}

STRUCTURE EACH WEEK WITH:
- 1-2 sessions per week
- Each session should have:
  * keyTakeaways: 2-3 concise bullet points summarizing what learners will gain
${actionInstructions.join("\n")}

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
${actionExamples.join(",\n")}
          ]
        }
      ]
    }
  ]
}

QUALITY GUIDELINES:
- Week titles should be engaging and transformation-oriented (e.g., "Week 1: Building Your Foundation")
- Key takeaways should be specific, actionable outcomes — not vague promises
- Instructions should be specific and actionable, not generic
- DO actions should have concrete exercises learners can complete
- REFLECT prompts should encourage deep thinking and personal application
- Build complexity progressively — earlier weeks introduce concepts, later weeks integrate them
- Final week should synthesize learning and prepare for real-world application
- If a style guide was provided, ensure all content matches that tone and energy
- Use the specific concepts, skills, and examples from each content source to design exercises and reflection prompts
- DO exercises should reference real techniques from the content, not generic activities
- Reflection prompts should ask about specific concepts or examples from the content
- Key takeaways should reflect actual insights from the content`;
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
