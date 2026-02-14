/**
 * Stub LLM — generates deterministic ProgramDraft JSON for local dev without API keys.
 * Distributes videos evenly across all weeks.
 */

import type { ProgramDraft } from "@guide-rail/shared";
import type { ContentDigest } from "./llm-adapter";

interface StubInput {
  programId: string;
  programTitle: string;
  programDescription?: string;
  outcomeStatement?: string;
  targetAudience?: string;
  targetTransformation?: string;
  vibePrompt?: string;
  durationWeeks: number;
  clusters: {
    clusterId: number;
    videoIds: string[];
    videoTitles: string[];
    videoTranscripts?: string[];
    summary?: string;
  }[];
  contentDigests?: ContentDigest[];
}

/**
 * Generate a deterministic content digest from a video title (no API call).
 */
export function generateStubContentDigest(
  videoId: string,
  videoTitle: string,
): ContentDigest {
  const titleWords = videoTitle.split(/\s+/).filter((w) => w.length > 3);
  const topic = titleWords.slice(0, 3).join(" ") || "the topic";

  return {
    videoId,
    videoTitle,
    keyConcepts: [
      `Core framework for ${topic}`,
      `Practical application of ${titleWords[0] || "key"} techniques`,
      `Mental model for approaching ${titleWords[1] || "challenges"}`,
    ],
    skillsIntroduced: [
      `${titleWords[0] || "Primary"} methodology`,
      `Self-assessment for ${topic}`,
    ],
    memorableExamples: [
      `Case study demonstrating ${topic} in practice`,
    ],
    difficultyLevel: "intermediate",
    summary: `This video teaches ${topic} through practical examples and frameworks. Viewers learn actionable techniques they can apply immediately.`,
  };
}

export function generateWithStub(input: StubInput): ProgramDraft {
  // Flatten all videos from all clusters
  const allVideos: { id: string; title: string }[] = [];
  for (const c of input.clusters) {
    for (let i = 0; i < c.videoIds.length; i++) {
      allVideos.push({
        id: c.videoIds[i],
        title: c.videoTitles[i] ?? `Video ${allVideos.length + 1}`,
      });
    }
  }

  // Build digest lookup
  const digestMap = new Map(
    (input.contentDigests ?? []).map((d) => [d.videoId, d]),
  );

  // Distribute videos across weeks
  const videosPerWeek = Math.max(1, Math.ceil(allVideos.length / input.durationWeeks));
  const weeks: ProgramDraft["weeks"] = [];

  for (let weekNum = 1; weekNum <= input.durationWeeks; weekNum++) {
    const startIdx = (weekNum - 1) * videosPerWeek;
    const weekVideos = allVideos.slice(startIdx, startIdx + videosPerWeek);

    const actions: ProgramDraft["weeks"][0]["sessions"][0]["actions"] = [];
    let orderIndex = 0;

    // Add watch actions for each video
    for (const video of weekVideos) {
      actions.push({
        title: `Watch: ${video.title}`,
        type: "watch" as const,
        instructions: `Watch the video carefully and take notes on the key concepts discussed.`,
        youtubeVideoId: video.id,
        orderIndex: orderIndex++,
      });
    }

    // Use digest for content-aware DO/REFLECT when available
    const weekDigest = weekVideos.length > 0
      ? digestMap.get(weekVideos[0].id)
      : undefined;

    // Add a DO action
    const doInstructions = weekDigest && weekDigest.keyConcepts.length > 0
      ? `Apply the "${weekDigest.keyConcepts[0]}" concept:\n1. Review the framework presented in the video\n2. Identify a real situation where this applies to you\n3. Practice using the ${weekDigest.skillsIntroduced[0] || "technique"} on that situation\n4. Document your results and insights`
      : `Apply what you learned this week:\n1. Review your notes from the videos\n2. Identify one key concept to practice\n3. Complete a hands-on exercise applying that concept\n4. Document what you learned`;

    actions.push({
      title: weekDigest
        ? `Practice: ${weekDigest.keyConcepts[0]?.slice(0, 40) || `Week ${weekNum} Exercise`}`
        : `Practice: Week ${weekNum} Exercise`,
      type: "do" as const,
      instructions: doInstructions,
      orderIndex: orderIndex++,
    });

    // Add a REFLECT action
    const reflectionPrompt = weekDigest && weekDigest.memorableExamples.length > 0
      ? `Thinking about the ${weekDigest.memorableExamples[0]}, how does this parallel your own experience? What would you do differently now that you understand ${weekDigest.keyConcepts[0] || "this concept"}?`
      : input.outcomeStatement
        ? `How does what you learned this week connect to your goal of: "${input.outcomeStatement}"? What will you do differently?`
        : `What was your biggest insight from week ${weekNum}? How will you apply it in practice?`;

    actions.push({
      title: `Reflect: Week ${weekNum} Insights`,
      type: "reflect" as const,
      instructions: "Take time to reflect on your learning journey this week.",
      reflectionPrompt,
      orderIndex: orderIndex++,
    });

    const weekTitle = weekVideos.length > 0
      ? weekVideos[0].title.split(":")[0] || `Topic ${weekNum}`
      : `Review & Integration`;

    // Generate keyTakeaways based on digest or context
    const keyTakeaways = weekDigest && weekDigest.keyConcepts.length > 0
      ? weekDigest.keyConcepts.slice(0, 3).map((c) => c.slice(0, 200))
      : weekVideos.length > 0
        ? [
            `Understand the core concepts from ${weekVideos[0].title}`,
            `Apply practical techniques to your own situation`,
            input.targetTransformation
              ? `Progress toward: ${input.targetTransformation.slice(0, 80)}`
              : `Build foundational skills for week ${weekNum + 1}`,
          ]
        : [
            `Consolidate your learning from previous weeks`,
            `Identify gaps in your understanding`,
            `Prepare for advanced application`,
          ];

    weeks.push({
      title: `Week ${weekNum}: ${weekTitle}`,
      summary: weekDigest
        ? weekDigest.summary.slice(0, 500)
        : weekVideos.length > 0
          ? `Explore ${weekVideos.length} video(s) and practice key concepts`
          : `Review previous weeks and consolidate your learning`,
      weekNumber: weekNum,
      sessions: [
        {
          title: weekVideos.length > 0 ? `Learning Session` : `Review Session`,
          summary: `Week ${weekNum} core activities`,
          keyTakeaways,
          orderIndex: 0,
          actions,
        },
      ],
    });
  }

  return {
    programId: input.programId,
    title: input.programTitle,
    description: input.programDescription ?? `A ${input.durationWeeks}-week program to help you achieve your learning goals.`,
    pacingMode: "drip_by_week",
    durationWeeks: input.durationWeeks,
    weeks,
  };
}
