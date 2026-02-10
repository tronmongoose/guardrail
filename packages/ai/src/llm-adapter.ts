/**
 * LLM adapter — provider-agnostic wrapper for generating ProgramDraft JSON.
 *
 * Supports: "anthropic" | "openai" | "stub"
 * Configured via LLM_PROVIDER env var. Defaults to "stub" for local dev.
 */

import { ProgramDraftSchema } from "@guide-rail/shared";
import type { ProgramDraft } from "@guide-rail/shared";
import { generateWithStub } from "./llm-stub";

export type LLMProvider = "anthropic" | "openai" | "stub";

interface GenerateInput {
  programId: string;
  programTitle: string;
  programDescription?: string;
  outcomeStatement?: string;
  durationWeeks: number;
  clusters: {
    clusterId: number;
    videoIds: string[];
    videoTitles: string[];
    videoTranscripts?: string[];
    summary?: string;
  }[];
}

const MAX_REPAIR_ATTEMPTS = 2;

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
    hasTranscripts: input.clusters.some(c => c.videoTranscripts?.some(t => t && t.length > 0)),
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

  // Build video descriptions with transcripts
  const videoDescriptions = allVideos.map((v, i) => {
    const transcriptSnippet = v.transcript
      ? `\n   Content preview: ${v.transcript.slice(0, 600)}${v.transcript.length > 600 ? "..." : ""}`
      : "";
    return `${i + 1}. "${v.title}" (ID: ${v.id}, Cluster: ${v.clusterId})${transcriptSnippet}`;
  }).join("\n\n");

  const totalVideos = allVideos.length;
  const videosPerWeek = Math.max(1, Math.ceil(totalVideos / input.durationWeeks));

  return `You are an expert curriculum designer creating a transformational learning program.

PROGRAM DETAILS:
- Title: "${input.programTitle}"
- Duration: EXACTLY ${input.durationWeeks} weeks (you MUST create ${input.durationWeeks} weeks)
- Total videos available: ${totalVideos}
${input.programDescription ? `- Description: ${input.programDescription}` : ""}
${input.outcomeStatement ? `- Intended learner outcome: ${input.outcomeStatement}` : ""}

AVAILABLE VIDEO CONTENT:
${videoDescriptions}

YOUR TASK:
Create a ${input.durationWeeks}-week structured learning program that transforms learners toward the intended outcome.

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ${input.durationWeeks} weeks (weekNumber 1 through ${input.durationWeeks})
2. Distribute videos logically across all ${input.durationWeeks} weeks (approximately ${videosPerWeek} video(s) per week)
3. Each week needs a clear theme that builds toward the outcome
4. Videos from the same cluster share related topics - use this to group them logically

STRUCTURE EACH WEEK WITH:
- 1-2 sessions per week
- Each session should have:
  * WATCH action(s) - reference videos by their exact ID
  * DO action - practical exercise applying what was learned
  * REFLECT action (at least one per week) - thought-provoking prompt connecting to the outcome

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
              "reflectionPrompt": "Thought-provoking question connecting to the outcome",
              "orderIndex": 2
            }
          ]
        }
      ]
    }
  ]
}

QUALITY GUIDELINES:
- Week titles should be engaging and outcome-oriented (e.g., "Week 1: Building Your Foundation")
- Instructions should be specific and actionable, not generic
- DO actions should have concrete exercises learners can complete
- REFLECT prompts should encourage deep thinking and personal application
- Build complexity progressively - earlier weeks introduce concepts, later weeks integrate them
- Final week should synthesize learning and prepare for real-world application`;
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
      max_tokens: 4096,
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
      max_tokens: 4096,
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
  input: GenerateInput
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
        max_tokens: 4096,
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
      max_tokens: 4096,
    }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  return data.choices[0].message.content;
}
