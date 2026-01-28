import { describe, it, expect } from "vitest";
import { parseYouTubeVideoId } from "@guide-rail/shared";

describe("parseYouTubeVideoId", () => {
  it("parses standard youtube.com URLs", () => {
    expect(parseYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("parses youtu.be short URLs", () => {
    expect(parseYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("parses URLs with extra params", () => {
    expect(parseYouTubeVideoId("https://www.youtube.com/watch?v=abc123&t=30")).toBe("abc123");
  });

  it("parses mobile URLs", () => {
    expect(parseYouTubeVideoId("https://m.youtube.com/watch?v=xyz789")).toBe("xyz789");
  });

  it("returns null for non-YouTube URLs", () => {
    expect(parseYouTubeVideoId("https://vimeo.com/12345")).toBeNull();
  });

  it("returns null for invalid URLs", () => {
    expect(parseYouTubeVideoId("not-a-url")).toBeNull();
  });

  it("returns null for youtube.com without v param", () => {
    expect(parseYouTubeVideoId("https://www.youtube.com/channel/abc")).toBeNull();
  });
});
