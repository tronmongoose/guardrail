/**
 * Stub LLM — generates deterministic ProgramDraft JSON for local dev without API keys.
 */

import type { ProgramDraft } from "@guide-rail/shared";

interface StubInput {
  programId: string;
  programTitle: string;
  programDescription?: string;
  durationWeeks: number;
  clusters: {
    clusterId: number;
    videoIds: string[];
    videoTitles: string[];
    summary?: string;
  }[];
}

type ActionType = "watch" | "read" | "do" | "reflect";

export function generateWithStub(input: StubInput): ProgramDraft {
  const weeks: ProgramDraft["weeks"] = input.clusters.map((cluster, i) => ({
    title: `Week ${i + 1}: ${cluster.videoTitles[0] ?? `Topic ${i + 1}`}`,
    summary: cluster.summary ?? `Explore topics from cluster ${cluster.clusterId}`,
    weekNumber: i + 1,
    sessions: [
      {
        title: `Session: ${cluster.videoTitles.join(" & ") || "Study"}`,
        summary: `Watch and engage with week ${i + 1} content`,
        orderIndex: 0,
        actions: [
          ...cluster.videoIds.map((vid, j) => ({
            title: `Watch: ${cluster.videoTitles[j] ?? `Video ${j + 1}`}`,
            type: "watch" as const,
            instructions: `Watch the video and take notes on key concepts.`,
            youtubeVideoId: vid,
            orderIndex: j,
          })),
          {
            title: `Reflect on Week ${i + 1}`,
            type: "reflect" as const,
            instructions: "Take a moment to reflect on what you learned this week.",
            reflectionPrompt: `What was your biggest takeaway from week ${i + 1}? How will you apply it?`,
            orderIndex: cluster.videoIds.length,
          },
        ],
      },
    ],
  }));

  // Pad to durationWeeks if fewer clusters
  while (weeks.length < input.durationWeeks) {
    const n = weeks.length + 1;
    weeks.push({
      title: `Week ${n}: Review & Practice`,
      summary: "Review and apply what you've learned",
      weekNumber: n,
      sessions: [
        {
          title: "Review Session",
          orderIndex: 0,
          actions: [
            {
              title: "Practice Exercise",
              type: "do" as const,
              instructions: "Apply concepts from previous weeks.",
              orderIndex: 0,
            },
            {
              title: "Weekly Reflection",
              type: "reflect" as const,
              reflectionPrompt: "What progress have you made? What challenges remain?",
              orderIndex: 1,
            },
          ],
        },
      ],
    });
  }

  return {
    programId: input.programId,
    title: input.programTitle,
    description: input.programDescription,
    pacingMode: "drip_by_week",
    durationWeeks: input.durationWeeks,
    weeks: weeks.slice(0, input.durationWeeks),
  };
}
