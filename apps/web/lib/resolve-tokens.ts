/**
 * Server-only utility for resolving a program's active SkinTokens.
 *
 * Checks for a custom AI-generated skin first, then falls back to the catalog.
 * Import this only in server components / API routes — never in client components.
 */

import type { SkinTokens } from "@guide-rail/shared";
import { prisma } from "@/lib/prisma";
import { getSkinTokens } from "@/lib/skin-bundles/registry";

export async function resolveTokens(program: {
  skinId: string;
  customSkinId: string | null;
}): Promise<SkinTokens> {
  if (program.customSkinId) {
    const custom = await prisma.customSkin.findUnique({
      where: { id: program.customSkinId },
    });
    if (custom) return custom.tokens as unknown as SkinTokens;
  }
  return getSkinTokens(program.skinId);
}
