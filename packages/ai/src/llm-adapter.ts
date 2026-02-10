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
    summary?: string;
  }[];
}

const MAX_REPAIR_ATTEMPTS = 2;

export async function generateProgramDraft(
  input: GenerateInput
): Promise<ProgramDraft> {
  const provider = (process.env.LLM_PROVIDER || "stub") as LLMProvider;
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

  // Parse + validate + repair loop
  for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
    try {
      const json = extractJSON(raw);
      const parsed = JSON.parse(json);
      return ProgramDraftSchema.parse(parsed);
    } catch (err) {
      if (attempt === MAX_REPAIR_ATTEMPTS) {
        throw new Error(
          `LLM output failed validation after ${MAX_REPAIR_ATTEMPTS} repair attempts: ${err}`
        );
      }
      // Attempt repair by re-calling with error context
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
  return `You are a curriculum designer. Given these video clusters for a ${input.durationWeeks}-week program titled "${input.programTitle}", generate a structured program.

${input.programDescription ? `Program description: ${input.programDescription}` : ""}
${input.outcomeStatement ? `Intended outcome: ${input.outcomeStatement}` : ""}

Video clusters:
${input.clusters
  .map(
    (c) =>
      `Cluster ${c.clusterId}: Videos: ${c.videoTitles.join(", ")}${c.summary ? ` | Summary: ${c.summary}` : ""}`
  )
  .join("\n")}

Output ONLY valid JSON matching this structure:
{
  "programId": "${input.programId}",
  "title": "...",
  "description": "...",
  "pacingMode": "drip_by_week",
  "durationWeeks": ${input.durationWeeks},
  "weeks": [
    {
      "title": "...",
      "summary": "...",
      "weekNumber": 1,
      "sessions": [
        {
          "title": "...",
          "summary": "...",
          "orderIndex": 0,
          "actions": [
            {
              "title": "...",
              "type": "watch|read|do|reflect",
              "instructions": "...",
              "reflectionPrompt": "...(only for reflect type)",
              "youtubeVideoId": "...(if watch type)",
              "orderIndex": 0
            }
          ]
        }
      ]
    }
  ]
}

Rules:
- Each cluster maps to one week (or split if more weeks than clusters)
- Each week must have at least one session with at least one action
- "watch" actions must reference a youtubeVideoId from the cluster (use the exact video ID provided)
- Write clear, actionable instructions for each action that guide learners on what to focus on
- Add a "do" action after watch actions with practical exercises to apply concepts
- Add a "reflect" action at the end of each week with thought-provoking prompts
- Reflection prompts should connect to the intended outcome if provided
- Keep titles concise and professional
- Structure content to progressively build toward the intended outcome`;
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
