/**
 * Centralized registry for skin token bundles.
 *
 * This is the single entry point for getting a complete SkinTokens bundle.
 * Prefer this over the legacy getSkin() + getSkinCSSVars() path.
 */

import type { SkinTokens, SkinId } from "@guide-rail/shared";
import { defaultTokens } from "./default";
import { professionalTokens } from "./professional";
import { warmTokens } from "./warm";
import { minimalTokens } from "./minimal";

export const SKIN_TOKENS: Record<SkinId, SkinTokens> = {
  default: defaultTokens,
  professional: professionalTokens,
  warm: warmTokens,
  minimal: minimalTokens,
};

/**
 * Look up a complete SkinTokens bundle by skin ID.
 * Falls back to the default skin for unknown IDs.
 */
export function getSkinTokens(skinId: string): SkinTokens {
  return SKIN_TOKENS[skinId as SkinId] ?? SKIN_TOKENS.default;
}
