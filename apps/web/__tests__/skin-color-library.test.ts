import { describe, it, expect } from "vitest";
import { pickColorFromPrompt } from "@/lib/skin-color-library";

describe("pickColorFromPrompt", () => {
  it("returns null for empty or unmatched prompts", () => {
    expect(pickColorFromPrompt(null)).toBeNull();
    expect(pickColorFromPrompt("")).toBeNull();
    expect(pickColorFromPrompt("generic sleek modern")).toBeNull();
  });

  it("detects a single color and returns a solid palette", () => {
    const res = pickColorFromPrompt("warm brown tones");
    expect(res?.name).toBe("Brown");
    expect(res?.primary).toMatch(/^#[0-9a-f]{6}$/i);
    expect(res?.secondary).toMatch(/^#[0-9a-f]{6}$/i);
    expect(res?.gradient).toBeUndefined();
  });

  it("detects multi-word keywords", () => {
    const res = pickColorFromPrompt("dusty rose palette");
    expect(res?.name).toBe("Rose");
  });

  it("returns a gradient when two colors + gradient intent are present", () => {
    const res = pickColorFromPrompt("ocean to sunset gradient");
    expect(res?.gradient).toBeDefined();
    expect(res?.gradient).toContain("linear-gradient");
    expect(res?.name).toContain("→");
  });

  it("uses the 'X to Y' phrase alone as gradient intent", () => {
    const res = pickColorFromPrompt("forest to gold");
    expect(res?.gradient).toBeDefined();
  });

  it("falls back to solid when two colors appear without gradient intent", () => {
    const res = pickColorFromPrompt("navy with forest accents");
    expect(res?.gradient).toBeUndefined();
    // The earlier color in the string wins.
    expect(res?.name).toBe("Navy");
  });
});
