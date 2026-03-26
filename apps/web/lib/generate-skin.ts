/**
 * AI-powered custom skin generator.
 *
 * Takes a creator's vibe context (title, transformation goal, vibe prompt) and
 * uses Claude to generate a color palette + typography token set. The result is
 * deep-merged with classic-minimal defaults so the full SkinTokens interface is
 * always satisfied.
 *
 * Returns null when LLM_PROVIDER=stub (no API call made).
 */

import type { SkinTokens } from "@guide-rail/shared";
import { getSkinTokens } from "@/lib/skin-bundles/registry";

export interface SkinVibeContext {
  title: string;
  targetTransformation?: string | null;
  vibePrompt?: string | null;
  niche?: string | null;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildSkinPrompt(ctx: SkinVibeContext): string {
  const parts: string[] = [];
  parts.push(`Program title: "${ctx.title}"`);
  if (ctx.targetTransformation) parts.push(`Goal: ${ctx.targetTransformation}`);
  if (ctx.vibePrompt) parts.push(`Vibe: ${ctx.vibePrompt}`);
  if (ctx.niche) parts.push(`Niche: ${ctx.niche}`);

  return `You are a design systems expert. Generate a custom brand skin for a digital learning program.

${parts.join("\n")}

Respond with ONLY a JSON object — no explanation, no markdown fences. Use this exact shape:

{
  "color": {
    "background": {
      "default": "#rrggbb",
      "elevated": "#rrggbb",
      "hero": "#rrggbb",
      "surface": "#rrggbb"
    },
    "border": { "subtle": "#rrggbb" },
    "text": {
      "primary": "#rrggbb",
      "secondary": "#rrggbb"
    },
    "accent": {
      "primary": "#rrggbb",
      "secondary": "#rrggbb"
    },
    "accentHover": "#rrggbb",
    "semantic": {
      "success": "#22c55e",
      "warning": "#f59e0b",
      "error": "#ef4444",
      "actionDo": "#rrggbb",
      "actionReflect": "#rrggbb"
    }
  },
  "text": {
    "heading": {
      "display": { "font": "CSS font-family string", "size": "72px", "weight": "700", "lineHeight": "1.1" },
      "xl":      { "font": "CSS font-family string", "size": "48px", "weight": "700", "lineHeight": "1.15" },
      "lg":      { "font": "CSS font-family string", "size": "30px", "weight": "600", "lineHeight": "1.2" },
      "md":      { "font": "CSS font-family string", "size": "24px", "weight": "600", "lineHeight": "1.3" }
    },
    "body": {
      "md": { "font": "CSS font-family string", "size": "16px", "weight": "400", "lineHeight": "1.6" },
      "sm": { "font": "CSS font-family string", "size": "14px", "weight": "400", "lineHeight": "1.5" }
    },
    "label": {
      "sm": { "font": "CSS font-family string", "size": "12px", "weight": "500", "lineHeight": "1.4" }
    }
  }
}

Rules:
- All colors must be valid 6-digit hex strings starting with # (e.g. #1a2b3c)
- Use Google Fonts or system font stacks with proper CSS font-family fallbacks
- Ensure text.primary has strong contrast against color.background.default
- Make the palette unique and cohesive — it should feel on-brand for the program
- Do NOT use generic defaults — base your choices on the program context above`;
}

// ---------------------------------------------------------------------------
// Anthropic call
// ---------------------------------------------------------------------------

async function callAnthropicForSkin(prompt: string): Promise<string> {
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
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

// ---------------------------------------------------------------------------
// JSON extraction + merge
// ---------------------------------------------------------------------------

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text;
}

/** Deep-merge `override` onto `base`, returning a new object. */
function deepMerge<T>(base: T, override: Partial<T>): T {
  if (!override || typeof override !== "object") return base;
  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(override as object)) {
    const bv = (base as Record<string, unknown>)[key];
    const ov = (override as Record<string, unknown>)[key];
    if (ov && typeof ov === "object" && !Array.isArray(ov) && bv && typeof bv === "object") {
      result[key] = deepMerge(bv, ov as Partial<typeof bv>);
    } else if (ov !== undefined) {
      result[key] = ov;
    }
  }
  return result as T;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a custom SkinTokens bundle from the creator's vibe context.
 *
 * Returns null when LLM_PROVIDER=stub or when the API call/parse fails
 * (caller should skip creating a CustomSkin in those cases).
 */
export async function generateSkinFromVibe(
  ctx: SkinVibeContext,
): Promise<SkinTokens | null> {
  const provider = process.env.LLM_PROVIDER || "stub";

  if (provider === "stub") {
    console.info("[SkinGen] Stub mode — skipping skin generation");
    return null;
  }

  if (provider !== "anthropic") {
    console.warn(`[SkinGen] Provider "${provider}" not supported for skin generation, skipping`);
    return null;
  }

  const prompt = buildSkinPrompt(ctx);

  let raw: string;
  try {
    raw = await callAnthropicForSkin(prompt);
  } catch (err) {
    console.error("[SkinGen] API call failed:", err);
    return null;
  }

  let partial: Partial<SkinTokens>;
  try {
    const json = extractJSON(raw);
    partial = JSON.parse(json);
  } catch (err) {
    console.error("[SkinGen] Failed to parse response:", err, "\nRaw:", raw.slice(0, 500));
    return null;
  }

  // Merge AI output onto classic-minimal base so all required fields are present
  const base = getSkinTokens("classic-minimal");
  const merged = deepMerge(base, partial as Partial<SkinTokens>);

  // Preserve the base id/name/description — caller assigns program-specific values
  return {
    ...merged,
    id: base.id,
    name: ctx.title,
    description: ctx.vibePrompt ?? "Custom skin",
  };
}
