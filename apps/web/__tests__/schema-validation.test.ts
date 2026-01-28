import { describe, it, expect } from "vitest";
import { ProgramDraftSchema } from "@guide-rail/shared";

describe("ProgramDraftSchema validation", () => {
  const validDraft = {
    programId: "prog_123",
    title: "Learn Photography",
    description: "A 6-week journey into photography",
    pacingMode: "drip_by_week",
    durationWeeks: 6,
    weeks: [
      {
        title: "Week 1: Basics",
        summary: "Learn the fundamentals",
        weekNumber: 1,
        sessions: [
          {
            title: "Getting Started",
            orderIndex: 0,
            actions: [
              {
                title: "Watch: Camera Basics",
                type: "watch",
                instructions: "Watch the intro video",
                youtubeVideoId: "vid_1",
                orderIndex: 0,
              },
              {
                title: "Reflect on basics",
                type: "reflect",
                reflectionPrompt: "What did you learn?",
                orderIndex: 1,
              },
            ],
          },
        ],
      },
    ],
  };

  it("accepts a valid draft", () => {
    const result = ProgramDraftSchema.safeParse(validDraft);
    expect(result.success).toBe(true);
  });

  it("rejects missing programId", () => {
    const { programId, ...rest } = validDraft;
    const result = ProgramDraftSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects empty weeks", () => {
    const result = ProgramDraftSchema.safeParse({ ...validDraft, weeks: [] });
    expect(result.success).toBe(false);
  });

  it("rejects invalid action type", () => {
    const bad = structuredClone(validDraft);
    bad.weeks[0].sessions[0].actions[0].type = "sing" as never;
    const result = ProgramDraftSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects invalid pacing mode", () => {
    const result = ProgramDraftSchema.safeParse({ ...validDraft, pacingMode: "yolo" });
    expect(result.success).toBe(false);
  });

  it("rejects durationWeeks over 52", () => {
    const result = ProgramDraftSchema.safeParse({ ...validDraft, durationWeeks: 100 });
    expect(result.success).toBe(false);
  });

  it("allows optional fields to be missing", () => {
    const minimal = {
      programId: "p1",
      title: "Test",
      pacingMode: "drip_by_week",
      durationWeeks: 1,
      weeks: [
        {
          title: "W1",
          weekNumber: 1,
          sessions: [
            {
              title: "S1",
              orderIndex: 0,
              actions: [{ title: "A1", type: "do", orderIndex: 0 }],
            },
          ],
        },
      ],
    };
    const result = ProgramDraftSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });
});
