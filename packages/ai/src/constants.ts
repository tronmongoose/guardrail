/**
 * AI model constants — single source of truth for all model IDs.
 *
 * Override at runtime via environment variables:
 *   GEMINI_MODEL — overrides DEFAULT_GEMINI_MODEL
 */

/** Default Gemini model for text generation (curriculum, content extraction, skin generation) */
export const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite-preview";

/** Gemini API base URL */
export const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Resolve the Gemini model from env or fallback to default */
export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}
