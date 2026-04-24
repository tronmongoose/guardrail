import { describe, it, expect } from "vitest";
import { pickEmojiFromPrompt } from "@/lib/skin-emoji-library";

describe("pickEmojiFromPrompt", () => {
  it("returns null for empty or nullish prompts", () => {
    expect(pickEmojiFromPrompt(null)).toBeNull();
    expect(pickEmojiFromPrompt(undefined)).toBeNull();
    expect(pickEmojiFromPrompt("")).toBeNull();
  });

  it("matches single-word keywords", () => {
    expect(pickEmojiFromPrompt("morning coffee vibes")).toBe("☕");
    expect(pickEmojiFromPrompt("a calm yoga flow")).toBe("🧘");
    expect(pickEmojiFromPrompt("bright sunny morning")).toBe("☀️");
  });

  it("covers user-requested keywords: computer and monkey", () => {
    expect(pickEmojiFromPrompt("computer science bootcamp")).toBe("💻");
    expect(pickEmojiFromPrompt("a monkey themed program")).toBe("🐒");
  });

  it("is case-insensitive and ignores punctuation", () => {
    expect(pickEmojiFromPrompt("COFFEE, tea, and donuts!")).toBe("☕");
    expect(pickEmojiFromPrompt("Fitness-focused program")).toBe("💪");
  });

  it("matches multi-word keywords via substring", () => {
    // "high end" is a multi-word keyword on the crown emoji; earlier
    // single-word matches like "luxury" (💎) should lose only when there's no
    // single-word hit, so check a phrase where only the multi-word keyword fits.
    expect(pickEmojiFromPrompt("we want a high end feel")).toBe("👑");
  });

  it("returns null when no keyword matches", () => {
    // "program" is intentionally excluded from the library because it's
    // overloaded in this app's domain.
    expect(pickEmojiFromPrompt("generic beige program")).toBeNull();
  });

  it("does not false-positive on substrings of unrelated words", () => {
    // "tear" contains "tea" as a substring — must not match because we
    // tokenize on word boundaries for single-word keywords. (No other
    // keyword appears in this input.)
    expect(pickEmojiFromPrompt("tears rolling down")).toBeNull();
  });
});
