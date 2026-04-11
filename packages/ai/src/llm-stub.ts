/**
 * Stub LLM — generates deterministic ProgramDraft JSON for local dev without API keys.
 * Uses the clip distributor for even video distribution across weeks.
 * When enriched digests are available, generates scene-based output with clips/overlays.
 */

import type { ProgramDraft } from "@guide-rail/shared";
import type { ContentDigest, EnrichedContentDigest } from "./llm-adapter";
import { distributeClipsToLessons } from "./clip-distributor";
import type { DistributionPlan } from "./clip-distributor";

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
  hasVideoAnalysis?: boolean;
  clipDistributionPlan?: DistributionPlan;
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

  const useSceneMode = input.hasVideoAnalysis === true;

  // Use clip distribution plan if provided, or compute one for scene mode
  let plan = input.clipDistributionPlan;
  if (!plan && useSceneMode) {
    const enriched = (input.contentDigests ?? []).filter(
      (d): d is EnrichedContentDigest => "topics" in d && ((d as EnrichedContentDigest).topics?.length ?? 0) > 0,
    );
    const basic = (input.contentDigests ?? []).filter(
      (d) => !("topics" in d) || !((d as EnrichedContentDigest).topics?.length),
    );
    if (enriched.length > 0) {
      plan = distributeClipsToLessons(enriched, basic, input.durationWeeks, 1);
    }
  }

  const weeks: ProgramDraft["weeks"] = [];

  for (let weekNum = 1; weekNum <= input.durationWeeks; weekNum++) {
    const lessonIdx = weekNum - 1;
    const planLesson = plan?.lessons[lessonIdx];

    // Determine which content items are relevant for this lesson
    // Use plan clips to find video IDs, or fall back to simple slice distribution
    const weekVideoIds = planLesson
      ? [...new Set(planLesson.clips.map((c) => c.videoId))]
      : [];
    const weekContent = weekVideoIds.length > 0
      ? weekVideoIds.map((vid) => allContent.find((c) => c.id === vid)).filter(Boolean) as typeof allContent
      : allContent.slice(
          lessonIdx * Math.max(1, Math.ceil(allContent.length / input.durationWeeks)),
          (lessonIdx + 1) * Math.max(1, Math.ceil(allContent.length / input.durationWeeks)),
        );

    const actions: ProgramDraft["weeks"][0]["sessions"][0]["actions"] = [];
    let orderIndex = 0;

    // In scene mode, DO NOT add WATCH actions (clips handle video viewing)
    if (!useSceneMode) {
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
    }

    // Use digest for content-aware DO/REFLECT when available
    const weekDigest = weekContent.length > 0
      ? digestMap.get(weekContent[0].id)
      : undefined;

    // Add a DO action
    const doInstructions = weekDigest && weekDigest.keyConcepts.length > 0
      ? `Apply the "${weekDigest.keyConcepts[0]}" concept:\n1. Review the framework presented in the content\n2. Identify a real situation where this applies to you\n3. Practice using the ${weekDigest.skillsIntroduced[0] || "technique"} on that situation\n4. Document your results and insights`
      : `Apply what you learned this lesson:\n1. Review your notes from the content\n2. Identify one key concept to practice\n3. Complete a hands-on exercise applying that concept\n4. Document what you learned`;

    actions.push({
      title: weekDigest
        ? `Practice: ${weekDigest.keyConcepts[0]?.slice(0, 40) || `Lesson ${weekNum} Exercise`}`
        : `Practice: Lesson ${weekNum} Exercise`,
      type: "do" as const,
      instructions: doInstructions,
      orderIndex: orderIndex++,
    });

    // Add a REFLECT action
    const reflectionPrompt = weekDigest && weekDigest.memorableExamples.length > 0
      ? `Thinking about the ${weekDigest.memorableExamples[0]}, how does this parallel your own experience? What would you do differently now that you understand ${weekDigest.keyConcepts[0] || "this concept"}?`
      : input.outcomeStatement
        ? `How does what you learned this lesson connect to your goal of: "${input.outcomeStatement}"? What will you do differently?`
        : `What was your biggest insight from lesson ${weekNum}? How will you apply it in practice?`;

    actions.push({
      title: `Reflect: Lesson ${weekNum} Insights`,
      type: "reflect" as const,
      instructions: "Take time to reflect on your learning journey this lesson.",
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
              : `Build foundational skills for lesson ${weekNum + 1}`,
          ]
        : [
            `Consolidate your learning from previous lessons`,
            `Identify gaps in your understanding`,
            `Prepare for advanced application`,
          ];

    // Build clips and overlays in scene mode
    let clips: ProgramDraft["weeks"][0]["sessions"][0]["clips"];
    let overlays: ProgramDraft["weeks"][0]["sessions"][0]["overlays"];

    if (useSceneMode && planLesson && planLesson.clips.length > 0) {
      // Use pre-computed distribution plan clips
      clips = planLesson.clips.map((planClip, idx) => ({
        youtubeVideoId: planClip.videoId,
        startSeconds: planClip.startSeconds,
        endSeconds: planClip.endSeconds,
        orderIndex: idx,
        transitionType: idx === 0 ? "NONE" : "FADE",
        transitionDurationMs: 500,
        chapterTitle: planClip.topicLabel,
        chapterDescription: planClip.subtopics?.join(", "),
      }));

      overlays = [
        {
          type: "TITLE_CARD",
          content: { title: `Learning Session`, subtitle: `Lesson ${weekNum}` },
          position: "CENTER",
          durationMs: 4000,
          orderIndex: 0,
          triggerAtSeconds: 0,
        },
      ];

      if (keyTakeaways.length > 0 && clips.length > 1) {
        overlays.push({
          type: "KEY_POINTS",
          content: { points: keyTakeaways },
          clipOrderIndex: 1,
          position: "BOTTOM",
          durationMs: 6000,
          orderIndex: 1,
          triggerAtSeconds: 5,
        });
      }
    } else if (useSceneMode) {
      // Fallback: inline clip generation from digests (no plan)
      const videoItems = weekContent.filter((item) => item.type === "video");
      clips = [];
      overlays = [];

      let clipOrder = 0;
      for (const item of videoItems) {
        const enriched = digestMap.get(item.id) as EnrichedContentDigest | undefined;
        if (enriched?.topics && enriched.topics.length > 0) {
          for (const topic of enriched.topics.slice(0, 4)) {
            clips.push({
              youtubeVideoId: item.id,
              startSeconds: topic.startSeconds,
              endSeconds: topic.endSeconds,
              orderIndex: clipOrder,
              transitionType: clipOrder === 0 ? "NONE" : "FADE",
              transitionDurationMs: 500,
              chapterTitle: topic.label,
              chapterDescription: topic.subtopics?.join(", "),
            });
            clipOrder++;
          }
        } else {
          clips.push({
            youtubeVideoId: item.id,
            startSeconds: 0,
            endSeconds: enriched?.durationSeconds ?? 600,
            orderIndex: clipOrder,
            transitionType: clipOrder === 0 ? "NONE" : "FADE",
            transitionDurationMs: 500,
            chapterTitle: item.title,
          });
          clipOrder++;
        }
      }

      overlays.push({
        type: "TITLE_CARD",
        content: { title: weekContent.length > 0 ? `Learning Session` : `Review Session`, subtitle: `Lesson ${weekNum}` },
        position: "CENTER",
        durationMs: 4000,
        orderIndex: 0,
        triggerAtSeconds: 0,
      });

      if (keyTakeaways.length > 0 && clips.length > 1) {
        overlays.push({
          type: "KEY_POINTS",
          content: { points: keyTakeaways },
          clipOrderIndex: 1,
          position: "BOTTOM",
          durationMs: 6000,
          orderIndex: 1,
          triggerAtSeconds: 5,
        });
      }
    }

    weeks.push({
      title: `Lesson ${weekNum}: ${weekTitle}`,
      summary: weekDigest
        ? weekDigest.summary.slice(0, 500)
        : weekContent.length > 0
          ? `Explore ${weekContent.length} content source(s) and practice key concepts`
          : `Review previous lessons and consolidate your learning`,
      weekNumber: weekNum,
      sessions: [
        {
          title: weekContent.length > 0 ? `Learning Session` : `Review Session`,
          summary: `Lesson ${weekNum} core activities`,
          keyTakeaways,
          orderIndex: 0,
          actions,
          ...(clips && clips.length > 0 ? { clips } : {}),
          ...(overlays && overlays.length > 0 ? { overlays } : {}),
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
