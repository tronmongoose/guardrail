import { describe, it, expect } from "vitest";
import {
  distributeClipsToLessons,
  validateAndFixClipDistribution,
  formatDistributionPlanForPrompt,
} from "@guide-rail/ai";
import type { EnrichedContentDigest, ContentDigest } from "@guide-rail/ai";

// Helper to create an EnrichedContentDigest with topics
function makeEnrichedDigest(
  id: string,
  title: string,
  topics: { label: string; startSeconds: number; endSeconds: number }[],
  durationSeconds?: number,
): EnrichedContentDigest {
  return {
    contentId: id,
    contentTitle: title,
    contentType: "video",
    keyConcepts: topics.map((t) => t.label),
    skillsIntroduced: [],
    memorableExamples: [],
    difficultyLevel: "intermediate",
    summary: `Video about ${title}`,
    segments: topics.map((t) => ({
      startSeconds: t.startSeconds,
      endSeconds: t.endSeconds,
      text: `Segment text for ${t.label}`,
      topic: t.label,
    })),
    topics: topics.map((t) => ({
      label: t.label,
      startSeconds: t.startSeconds,
      endSeconds: t.endSeconds,
    })),
    keyMoments: [],
    durationSeconds: durationSeconds ?? topics[topics.length - 1]?.endSeconds ?? 600,
  };
}

function makeBasicDigest(id: string, title: string): ContentDigest {
  return {
    contentId: id,
    contentTitle: title,
    contentType: "video",
    keyConcepts: [title],
    skillsIntroduced: [],
    memorableExamples: [],
    difficultyLevel: "intermediate",
    summary: `Video about ${title}`,
  };
}

describe("distributeClipsToLessons", () => {
  it("distributes 3 videos x 3 topics across 6 lessons evenly", () => {
    const enriched = [
      makeEnrichedDigest("v1", "Upper Body", [
        { label: "Warm-up", startSeconds: 0, endSeconds: 180 },
        { label: "Main drill", startSeconds: 180, endSeconds: 360 },
        { label: "Cool-down", startSeconds: 360, endSeconds: 540 },
      ], 540),
      makeEnrichedDigest("v2", "Core Work", [
        { label: "Core basics", startSeconds: 0, endSeconds: 200 },
        { label: "Plank series", startSeconds: 200, endSeconds: 400 },
        { label: "Advanced core", startSeconds: 400, endSeconds: 600 },
      ], 600),
      makeEnrichedDigest("v3", "Lower Body", [
        { label: "Squat form", startSeconds: 0, endSeconds: 150 },
        { label: "Lunge variations", startSeconds: 150, endSeconds: 300 },
        { label: "Cooldown stretch", startSeconds: 300, endSeconds: 480 },
      ], 480),
    ];

    const plan = distributeClipsToLessons(enriched, [], 6);

    // Should create exactly 6 lessons
    expect(plan.lessons).toHaveLength(6);

    // Every lesson should have at least 1 clip
    for (const lesson of plan.lessons) {
      expect(lesson.clips.length).toBeGreaterThanOrEqual(1);
    }

    // All 3 videos should appear
    const usedVideoIds = new Set(
      plan.lessons.flatMap((l) => l.clips.map((c) => c.videoId)),
    );
    expect(usedVideoIds).toContain("v1");
    expect(usedVideoIds).toContain("v2");
    expect(usedVideoIds).toContain("v3");

    // Total clips should match total topics (9)
    expect(plan.totalClips).toBe(9);

    // No fill-related warnings — we have 9 clips for 6 lessons.
    for (const w of plan.warnings) {
      expect(w).not.toMatch(/splitting|duplicating/i);
    }

    // Core rule: no identical clip (same videoId + startSeconds + endSeconds)
    // may appear twice. Parts of the same video across adjacent lessons are OK.
    const clipKeys = plan.lessons.flatMap((l) =>
      l.clips.map((c) => `${c.videoId}:${c.startSeconds}:${c.endSeconds}`),
    );
    expect(new Set(clipKeys).size).toBe(clipKeys.length);
  });

  it("fills more lessons than clips by splitting parts, never duplicating full clips", () => {
    const enriched = [
      makeEnrichedDigest("v1", "Short Video", [
        { label: "Only topic", startSeconds: 0, endSeconds: 300 },
      ], 300),
      makeEnrichedDigest("v2", "Another Short", [
        { label: "Single topic", startSeconds: 0, endSeconds: 240 },
      ], 240),
    ];

    const plan = distributeClipsToLessons(enriched, [], 5);

    // Should still create 5 lessons
    expect(plan.lessons).toHaveLength(5);

    // Every lesson should have at least 1 clip
    for (const lesson of plan.lessons) {
      expect(lesson.clips.length).toBeGreaterThanOrEqual(1);
    }

    // Should have a splitting warning (new behavior — we split instead of duplicating)
    expect(plan.warnings.some((w) => w.includes("splitting"))).toBe(true);

    // No identical (videoId, startSeconds, endSeconds) tuple may appear in
    // more than one lesson. Parts of the same video are fine; exact dupes are not.
    const clipKeys = plan.lessons.flatMap((l) =>
      l.clips.map((c) => `${c.videoId}:${c.startSeconds}:${c.endSeconds}`),
    );
    const uniqueKeys = new Set(clipKeys);
    expect(uniqueKeys.size).toBe(clipKeys.length);
  });

  it("handles many clips in few lessons by merging", () => {
    const enriched = [
      makeEnrichedDigest("v1", "Long Video", [
        { label: "Topic A", startSeconds: 0, endSeconds: 120 },
        { label: "Topic B", startSeconds: 120, endSeconds: 240 },
        { label: "Topic C", startSeconds: 240, endSeconds: 360 },
        { label: "Topic D", startSeconds: 360, endSeconds: 480 },
        { label: "Topic E", startSeconds: 480, endSeconds: 600 },
        { label: "Topic F", startSeconds: 600, endSeconds: 720 },
        { label: "Topic G", startSeconds: 720, endSeconds: 840 },
      ], 840),
      makeEnrichedDigest("v2", "Another Long", [
        { label: "Topic 1", startSeconds: 0, endSeconds: 120 },
        { label: "Topic 2", startSeconds: 120, endSeconds: 240 },
        { label: "Topic 3", startSeconds: 240, endSeconds: 360 },
        { label: "Topic 4", startSeconds: 360, endSeconds: 480 },
        { label: "Topic 5", startSeconds: 480, endSeconds: 600 },
        { label: "Topic 6", startSeconds: 600, endSeconds: 720 },
        { label: "Topic 7", startSeconds: 720, endSeconds: 840 },
      ], 840),
    ];

    const plan = distributeClipsToLessons(enriched, [], 2);

    expect(plan.lessons).toHaveLength(2);

    // Each lesson should not exceed 6 clips
    for (const lesson of plan.lessons) {
      expect(lesson.clips.length).toBeLessThanOrEqual(6);
    }

    // Both videos should appear
    const usedVideoIds = new Set(
      plan.lessons.flatMap((l) => l.clips.map((c) => c.videoId)),
    );
    expect(usedVideoIds).toContain("v1");
    expect(usedVideoIds).toContain("v2");
  });

  it("includes basic (non-enriched) video digests as full clips", () => {
    const enriched = [
      makeEnrichedDigest("v1", "Enriched Video", [
        { label: "Topic A", startSeconds: 0, endSeconds: 300 },
        { label: "Topic B", startSeconds: 300, endSeconds: 600 },
      ], 600),
    ];
    const basic = [makeBasicDigest("v2", "Basic Video")];

    const plan = distributeClipsToLessons(enriched, basic, 3);

    expect(plan.lessons).toHaveLength(3);

    // Both videos should be assigned
    const usedVideoIds = new Set(
      plan.lessons.flatMap((l) => l.clips.map((c) => c.videoId)),
    );
    expect(usedVideoIds).toContain("v1");
    expect(usedVideoIds).toContain("v2");
  });

  it("handles single video across multiple lessons", () => {
    const enriched = [
      makeEnrichedDigest("v1", "One Big Video", [
        { label: "Intro", startSeconds: 0, endSeconds: 180 },
        { label: "Theory", startSeconds: 180, endSeconds: 360 },
        { label: "Practice", startSeconds: 360, endSeconds: 540 },
        { label: "Advanced", startSeconds: 540, endSeconds: 720 },
        { label: "Wrap-up", startSeconds: 720, endSeconds: 900 },
      ], 900),
    ];

    const plan = distributeClipsToLessons(enriched, [], 5);

    expect(plan.lessons).toHaveLength(5);

    // Each lesson should have exactly 1 clip (5 topics, 5 lessons)
    for (const lesson of plan.lessons) {
      expect(lesson.clips.length).toBeGreaterThanOrEqual(1);
    }

    // All clips should reference v1
    const usedVideoIds = new Set(
      plan.lessons.flatMap((l) => l.clips.map((c) => c.videoId)),
    );
    expect(usedVideoIds.size).toBe(1);
    expect(usedVideoIds).toContain("v1");
  });

  it("returns empty lessons with warning when no clips available", () => {
    const plan = distributeClipsToLessons([], [], 3);

    expect(plan.lessons).toHaveLength(3);
    expect(plan.totalClips).toBe(0);
    expect(plan.warnings).toHaveLength(1);
    expect(plan.warnings[0]).toContain("No clips");
  });
});

describe("formatDistributionPlanForPrompt", () => {
  it("formats a plan as readable text", () => {
    // Duration ≥ 480s and two distinct topic labels → distributor splits into
    // two clips (one per lesson) so the formatter shows both topic labels.
    const enriched = [
      makeEnrichedDigest("v1", "My Video", [
        { label: "Intro", startSeconds: 0, endSeconds: 300 },
        { label: "Main", startSeconds: 300, endSeconds: 600 },
      ], 600),
    ];
    const plan = distributeClipsToLessons(enriched, [], 2);
    const text = formatDistributionPlanForPrompt(plan);

    expect(text).toContain("VIDEO ASSIGNMENT PLAN (MANDATORY)");
    expect(text).toContain("Lesson 1");
    expect(text).toContain("Lesson 2");
    expect(text).toContain("My Video");
    expect(text).toContain("Intro");
    expect(text).toContain("Main");
    expect(text).toContain("MUST follow them exactly");
  });
});

describe("validateAndFixClipDistribution", () => {
  it("passes a valid draft", () => {
    const enriched = [
      makeEnrichedDigest("v1", "Video 1", [
        { label: "Topic A", startSeconds: 0, endSeconds: 300 },
      ], 300),
    ];
    const plan = distributeClipsToLessons(enriched, [], 1);

    const draft = {
      weeks: [
        {
          weekNumber: 1,
          title: "Week 1",
          summary: "test",
          sessions: [
            {
              title: "Session 1",
              summary: "test",
              keyTakeaways: ["a"],
              orderIndex: 0,
              actions: [],
              clips: [
                { youtubeVideoId: "v1", startSeconds: 0, endSeconds: 300, orderIndex: 0 },
              ],
              overlays: [
                { type: "TITLE_CARD", content: {}, position: "CENTER", durationMs: 4000, orderIndex: 0, triggerAtSeconds: 0 },
              ],
            },
          ],
        },
      ],
    };

    const result = validateAndFixClipDistribution(draft, plan, enriched);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("detects missing videos and provides a fix", () => {
    const enriched = [
      makeEnrichedDigest("v1", "Video 1", [
        { label: "Topic A", startSeconds: 0, endSeconds: 300 },
      ], 300),
      makeEnrichedDigest("v2", "Video 2", [
        { label: "Topic B", startSeconds: 0, endSeconds: 250 },
      ], 250),
    ];
    const plan = distributeClipsToLessons(enriched, [], 2);

    // Draft is missing v2 entirely
    const draft = {
      weeks: [
        {
          weekNumber: 1,
          title: "Week 1",
          summary: "test",
          sessions: [
            {
              title: "Session 1",
              summary: "test",
              keyTakeaways: ["a"],
              orderIndex: 0,
              actions: [],
              clips: [
                { youtubeVideoId: "v1", startSeconds: 0, endSeconds: 300, orderIndex: 0 },
              ],
            },
          ],
        },
        {
          weekNumber: 2,
          title: "Week 2",
          summary: "test",
          sessions: [
            {
              title: "Session 2",
              summary: "test",
              keyTakeaways: ["b"],
              orderIndex: 0,
              actions: [],
              clips: [
                { youtubeVideoId: "v1", startSeconds: 0, endSeconds: 300, orderIndex: 0 },
              ],
            },
          ],
        },
      ],
    };

    const result = validateAndFixClipDistribution(draft, plan, enriched);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("v2"))).toBe(true);
    expect(result.fixedDraft).toBeDefined();

    // The fixed draft should have v2 in it
    const fixedVideoIds = new Set(
      result.fixedDraft!.weeks.flatMap((w: { sessions: { clips: { youtubeVideoId: string }[] }[] }) =>
        w.sessions.flatMap((s: { clips: { youtubeVideoId: string }[] }) =>
          (s.clips ?? []).map((c: { youtubeVideoId: string }) => c.youtubeVideoId),
        ),
      ),
    );
    expect(fixedVideoIds).toContain("v2");
  });

  it("detects sessions with no clips", () => {
    const enriched = [
      makeEnrichedDigest("v1", "Video 1", [
        { label: "Topic A", startSeconds: 0, endSeconds: 300 },
      ], 300),
    ];
    const plan = distributeClipsToLessons(enriched, [], 2);

    const draft = {
      weeks: [
        {
          weekNumber: 1,
          sessions: [
            { clips: [{ youtubeVideoId: "v1", startSeconds: 0, endSeconds: 300 }] },
          ],
        },
        {
          weekNumber: 2,
          sessions: [
            { clips: [] }, // Empty!
          ],
        },
      ],
    };

    const result = validateAndFixClipDistribution(draft, plan, enriched);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("no clips"))).toBe(true);
  });
});
