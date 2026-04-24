import { describe, it, expect } from "vitest";
import { pickSeedSkin } from "@/lib/skin-seed-matcher";
import { getSkinTokens } from "@/lib/skin-bundles/registry";

/** Luminance helper copied from skin-decorations.ts — kept inline so tests
 *  don't depend on that module's fence. */
function luminance(hex: string): number {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114;
}

describe("pickSeedSkin", () => {
  it("returns null for empty context", () => {
    expect(pickSeedSkin({})).toBeNull();
    expect(pickSeedSkin({ vibePrompt: "" })).toBeNull();
  });

  it("returns null when no catalog keyword appears in the vibe", () => {
    // Short, unfamiliar tokens — none match category synonyms, names, or
    // descriptions. Matcher should signal null so the caller can fall back.
    const match = pickSeedSkin({ vibePrompt: "xyz qqq zzz" });
    expect(match).toBeNull();
  });

  it("picks a LIGHT seed for a warm morning coffee vibe", () => {
    const match = pickSeedSkin({
      title: "Morning Ritual",
      vibePrompt: "warm morning coffee calm",
    });
    expect(match).not.toBeNull();
    // Should land in a light category (classic / lifestyle / pro-creator etc.) —
    // the point is to avoid dark defaults for a warm morning vibe.
    expect(luminance(match!.tokens.color.background.default)).toBeGreaterThan(140);
  });

  it("picks a DARK seed for a neon esports vibe", () => {
    const match = pickSeedSkin({
      title: "Rise of the Gamer",
      vibePrompt: "neon cyberpunk esports gaming arcade",
    });
    expect(match).not.toBeNull();
    // Creative esports / entertainment / music — all dark in the catalog.
    expect(luminance(match!.tokens.color.background.default)).toBeLessThan(100);
  });

  it("prefers lifestyle-zen for an exact name hit", () => {
    const match = pickSeedSkin({ vibePrompt: "zen mindful yoga" });
    expect(match?.skinId).toBe("lifestyle-zen");
  });

  it("routes 'professional executive consulting' to a pro-* skin", () => {
    const match = pickSeedSkin({
      title: "Executive Leadership",
      targetTransformation: "professional consulting business",
    });
    expect(match?.category).toBe("professional");
  });

  it("is deterministic — same input returns same seed", () => {
    const a = pickSeedSkin({ vibePrompt: "warm coffee" });
    const b = pickSeedSkin({ vibePrompt: "warm coffee" });
    expect(a?.skinId).toBe(b?.skinId);
  });

  it("score is positive when a match exists", () => {
    const match = pickSeedSkin({ vibePrompt: "minimal clean classic" });
    expect(match).not.toBeNull();
    expect(match!.score).toBeGreaterThan(0);
  });

  it("returned tokens are a valid full SkinTokens object", () => {
    const match = pickSeedSkin({ vibePrompt: "luxury elegant refined" });
    expect(match).not.toBeNull();
    // Structural check — if seed tokens were undefined, generate-skin.ts
    // deepMerge would explode.
    expect(match!.tokens).toMatchObject({
      id: expect.any(String),
      color: expect.objectContaining({
        background: expect.objectContaining({ default: expect.any(String) }),
        text: expect.objectContaining({ primary: expect.any(String) }),
      }),
    });
    // Sanity: tokens resolved from the registry match what we expect
    expect(match!.tokens).toStrictEqual(getSkinTokens(match!.skinId));
  });
});
