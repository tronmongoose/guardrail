/**
 * Stub LLM — generates deterministic ProgramDraft JSON for local dev without API keys.
 * Distributes content evenly across all weeks.
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
    contentIds: string[];
    contentTitles: string[];
    contentTranscripts?: string[];
    contentTypes?: ("video" | "document")[];
    summary?: string;
  }[];
  contentDigests?: ContentDigest[];
}

/**
 * Generate a deterministic content digest from a title (no API call).
 */
export function generateStubContentDigest(
  contentId: string,
  contentTitle: string,
  contentType: "video" | "document" = "video",
): ContentDigest {
  const titleWords = contentTitle.split(/\s+/).filter((w) => w.length > 3);
  const topic = titleWords.slice(0, 3).join(" ") || "the topic";
  const sourceLabel = contentType === "video" ? "video" : "document";

  return {
    contentId,
    contentTitle,
    contentType,
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
    summary: `This ${sourceLabel} teaches ${topic} through practical examples and frameworks. Learners gain actionable techniques they can apply immediately.`,
  };
}

export function generateWithStub(input: StubInput): ProgramDraft {
  // Flatten all content from all clusters
  const allContent: { id: string; title: string; type: "video" | "document" }[] = [];
  for (const c of input.clusters) {
    for (let i = 0; i < c.contentIds.length; i++) {
      allContent.push({
        id: c.contentIds[i],
        title: c.contentTitles[i] ?? `Content ${allContent.length + 1}`,
        type: c.contentTypes?.[i] ?? "video",
      });
    }
  }

  // Build digest lookup
  const digestMap = new Map(
    (input.contentDigests ?? []).map((d) => [d.contentId, d]),
  );

  // Distribute content across weeks
  const itemsPerWeek = Math.max(1, Math.ceil(allContent.length / input.durationWeeks));
  const weeks: ProgramDraft["weeks"] = [];

  for (let weekNum = 1; weekNum <= input.durationWeeks; weekNum++) {
    const startIdx = (weekNum - 1) * itemsPerWeek;
    const weekContent = allContent.slice(startIdx, startIdx + itemsPerWeek);

    const actions: ProgramDraft["weeks"][0]["sessions"][0]["actions"] = [];
    let orderIndex = 0;

    // Add watch/read actions for each content item
    for (const item of weekContent) {
      if (item.type === "video") {
        actions.push({
          title: `Watch: ${item.title}`,
          type: "watch" as const,
          instructions: `Watch the video carefully and take notes on the key concepts discussed.`,
          youtubeVideoId: item.id,
          orderIndex: orderIndex++,
        });
      } else {
        actions.push({
          title: `Read: ${item.title}`,
          type: "read" as const,
          instructions: `Read through the document and identify the key concepts, frameworks, and actionable insights.`,
          orderIndex: orderIndex++,
        });
      }
    }

    // Use digest for content-aware DO/REFLECT when available
    const weekDigest = weekContent.length > 0
      ? digestMap.get(weekContent[0].id)
      : undefined;

    // Add a DO action
    const doInstructions = weekDigest && weekDigest.keyConcepts.length > 0
      ? `Apply the "${weekDigest.keyConcepts[0]}" concept:\n1. Review the framework presented in the content\n2. Identify a real situation where this applies to you\n3. Practice using the ${weekDigest.skillsIntroduced[0] || "technique"} on that situation\n4. Document your results and insights`
      : `Apply what you learned this week:\n1. Review your notes from the content\n2. Identify one key concept to practice\n3. Complete a hands-on exercise applying that concept\n4. Document what you learned`;

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

    const weekTitle = weekContent.length > 0
      ? weekContent[0].title.split(":")[0] || `Topic ${weekNum}`
      : `Review & Integration`;

    // Generate keyTakeaways based on digest or context
    const keyTakeaways = weekDigest && weekDigest.keyConcepts.length > 0
      ? weekDigest.keyConcepts.slice(0, 3).map((c) => c.slice(0, 200))
      : weekContent.length > 0
        ? [
            `Understand the core concepts from ${weekContent[0].title}`,
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
        : weekContent.length > 0
          ? `Explore ${weekContent.length} content source(s) and practice key concepts`
          : `Review previous weeks and consolidate your learning`,
      weekNumber: weekNum,
      sessions: [
        {
          title: weekContent.length > 0 ? `Learning Session` : `Review Session`,
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
