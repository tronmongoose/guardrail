import { describe, it, expect } from "vitest";
import { buildSkinPrompt, deepMerge } from "@/lib/generate-skin";
import { getSkinTokens } from "@/lib/skin-bundles/registry";
import type { SkinTokens } from "@guide-rail/shared";

describe("buildSkinPrompt", () => {
  it("uses seed prompt when no currentTokens/refinementPrompt", () => {
    const out = buildSkinPrompt({
      title: "Runner's Reset",
      vibePrompt: "grounded and warm",
    });
    expect(out).toContain('Program title: "Runner\'s Reset"');
    expect(out).toContain("Vibe: grounded and warm");
    expect(out).not.toContain("Current palette:");
    expect(out).not.toContain("Refinement request:");
  });

  it("switches to refine prompt when currentTokens + refinementPrompt present", () => {
    const base = getSkinTokens("classic-minimal");
    const out = buildSkinPrompt({
      title: "Runner's Reset",
      currentTokens: base,
      refinementPrompt: "make it cooler",
    });
    expect(out).toContain("Current palette:");
    expect(out).toContain(`background.default: ${base.color.background.default}`);
    expect(out).toContain(`accent.primary: ${base.color.accent.primary}`);
    expect(out).toContain('Refinement request: "make it cooler"');
    // Refine prompt omits the `motion`/`component` fields (only color/text deltas accepted)
    expect(out).not.toContain('"motion"');
  });

  it("falls back to seed when only one of currentTokens/refinementPrompt is set", () => {
    const base = getSkinTokens("classic-minimal");
    const withoutPrompt = buildSkinPrompt({ title: "X", currentTokens: base });
    const withoutTokens = buildSkinPrompt({ title: "X", refinementPrompt: "warmer" });
    expect(withoutPrompt).not.toContain("Refinement request:");
    expect(withoutTokens).not.toContain("Current palette:");
  });
});

describe("deepMerge", () => {
  it("overrides leaf fields while preserving sibling fields", () => {
    const base = getSkinTokens("classic-minimal");
    const delta: Partial<SkinTokens> = {
      color: {
        ...base.color,
        accent: { primary: "#ff0000", secondary: base.color.accent.secondary },
      },
    };
    const merged = deepMerge(base, delta);
    expect(merged.color.accent.primary).toBe("#ff0000");
    expect(merged.color.background.default).toBe(base.color.background.default);
    expect(merged.radius).toEqual(base.radius);
  });
});
