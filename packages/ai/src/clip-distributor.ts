/**
 * Clip Distributor — deterministic video-to-lesson assignment.
 *
 * Pre-computes which topic clips from which videos go to which lessons,
 * then formats the plan for injection into the LLM prompt.
 * Also provides post-validation to repair LLM output that deviates from the plan.
 */

import type { ContentDigest, EnrichedContentDigest } from "./llm-adapter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TopicClip {
  videoId: string;
  videoTitle: string;
  topicLabel: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  subtopics?: string[];
}

export interface LessonAssignment {
  lessonIndex: number;         // 0-based
  weekNumber: number;          // 1-based
  sessionIndex: number;        // 0 or 1 within a week
  clips: TopicClip[];
  totalDurationSeconds: number;
}

export interface DistributionPlan {
  lessons: LessonAssignment[];
  totalClips: number;
  totalDurationSeconds: number;
  warnings: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  /** If auto-fixable, the corrected draft (same shape as ProgramDraft) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fixedDraft?: any;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_CLIP_DURATION_SECONDS = 30;
const MAX_CLIPS_PER_LESSON = 6;
const TARGET_LESSON_MIN_SECONDS = 5 * 60;   // 5 min
const TARGET_LESSON_MAX_SECONDS = 15 * 60;  // 15 min
const DEFAULT_VIDEO_DURATION = 600;          // 10 min fallback

// ---------------------------------------------------------------------------
// Distribution Algorithm
// ---------------------------------------------------------------------------

/**
 * Build a flat list of topic clips from enriched and basic digests.
 * Enriched digests produce one clip per topic; basic digests produce one full-video clip.
 */
function collectClips(
  enrichedDigests: EnrichedContentDigest[],
  basicDigests: ContentDigest[],
): TopicClip[] {
  const clips: TopicClip[] = [];

  for (const digest of enrichedDigests) {
    if (digest.topics && digest.topics.length > 0) {
      for (const topic of digest.topics) {
        const dur = topic.endSeconds - topic.startSeconds;
        if (dur < MIN_CLIP_DURATION_SECONDS) continue; // skip tiny topics
        clips.push({
          videoId: digest.contentId,
          videoTitle: digest.contentTitle,
          topicLabel: topic.label,
          startSeconds: topic.startSeconds,
          endSeconds: topic.endSeconds,
          durationSeconds: dur,
          subtopics: topic.subtopics,
        });
      }
      // If all topics were too short, add the full video as one clip
      if (clips.filter((c) => c.videoId === digest.contentId).length === 0) {
        clips.push({
          videoId: digest.contentId,
          videoTitle: digest.contentTitle,
          topicLabel: digest.topics[0].label,
          startSeconds: 0,
          endSeconds: digest.durationSeconds ?? DEFAULT_VIDEO_DURATION,
          durationSeconds: digest.durationSeconds ?? DEFAULT_VIDEO_DURATION,
        });
      }
    } else {
      // Enriched but no topics — single full clip
      clips.push({
        videoId: digest.contentId,
        videoTitle: digest.contentTitle,
        topicLabel: digest.contentTitle,
        startSeconds: 0,
        endSeconds: digest.durationSeconds ?? DEFAULT_VIDEO_DURATION,
        durationSeconds: digest.durationSeconds ?? DEFAULT_VIDEO_DURATION,
      });
    }
  }

  for (const digest of basicDigests) {
    if (digest.contentType !== "video") continue;
    clips.push({
      videoId: digest.contentId,
      videoTitle: digest.contentTitle,
      topicLabel: digest.contentTitle,
      startSeconds: 0,
      endSeconds: DEFAULT_VIDEO_DURATION,
      durationSeconds: DEFAULT_VIDEO_DURATION,
    });
  }

  return clips;
}

/**
 * Distribute collected clips across lessons using greedy bin-packing.
 *
 * Hard constraints:
 *   - Every lesson gets >= 1 clip
 *   - Every video appears in at least 1 lesson
 *   - No lesson exceeds MAX_CLIPS_PER_LESSON clips
 */
export function distributeClipsToLessons(
  enrichedDigests: EnrichedContentDigest[],
  basicDigests: ContentDigest[],
  durationWeeks: number,
  sessionsPerWeek: number = 1,
): DistributionPlan {
  const totalLessons = durationWeeks * sessionsPerWeek;
  const warnings: string[] = [];

  let clips = collectClips(enrichedDigests, basicDigests);

  if (clips.length === 0) {
    warnings.push("No clips could be extracted from any video");
    return {
      lessons: Array.from({ length: totalLessons }, (_, i) => ({
        lessonIndex: i,
        weekNumber: Math.floor(i / sessionsPerWeek) + 1,
        sessionIndex: i % sessionsPerWeek,
        clips: [],
        totalDurationSeconds: 0,
      })),
      totalClips: 0,
      totalDurationSeconds: 0,
      warnings,
    };
  }

  // If fewer clips than lessons, duplicate the longest clips to fill
  if (clips.length < totalLessons) {
    warnings.push(
      `Only ${clips.length} topic clip(s) for ${totalLessons} lessons — duplicating longest clips to fill`,
    );
    const sorted = [...clips].sort((a, b) => b.durationSeconds - a.durationSeconds);
    let idx = 0;
    while (clips.length < totalLessons) {
      const source = sorted[idx % sorted.length];
      clips.push({ ...source }); // shallow copy
      idx++;
    }
  }

  // If way too many clips per lesson, merge adjacent same-video topics
  if (clips.length > totalLessons * MAX_CLIPS_PER_LESSON) {
    clips = mergeAdjacentClips(clips, totalLessons * MAX_CLIPS_PER_LESSON);
    warnings.push("Merged adjacent topics to fit within clip-per-lesson limits");
  }

  const totalDuration = clips.reduce((sum, c) => sum + c.durationSeconds, 0);
  const rawTarget = totalDuration / totalLessons;
  // Don't clamp — use the actual average so we distribute evenly regardless of clip durations
  const targetPerLesson = rawTarget > 0 ? rawTarget : TARGET_LESSON_MIN_SECONDS;

  // Greedy bin-packing
  const lessons: LessonAssignment[] = Array.from({ length: totalLessons }, (_, i) => ({
    lessonIndex: i,
    weekNumber: Math.floor(i / sessionsPerWeek) + 1,
    sessionIndex: i % sessionsPerWeek,
    clips: [] as TopicClip[],
    totalDurationSeconds: 0,
  }));

  let currentLesson = 0;

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const lesson = lessons[currentLesson];
    lesson.clips.push(clip);
    lesson.totalDurationSeconds += clip.durationSeconds;

    // Decide whether to advance to next lesson
    const remainingClips = clips.length - (i + 1);
    const remainingLessons = totalLessons - (currentLesson + 1);

    if (currentLesson >= totalLessons - 1) continue; // already on last lesson

    // MUST advance: exactly enough clips left for remaining lessons (1 per lesson)
    const mustAdvance = remainingClips > 0 && remainingClips === remainingLessons;

    // SHOULD advance: duration target met or clip count at limit
    const shouldAdvance =
      remainingClips >= remainingLessons && // enough clips left
      (lesson.totalDurationSeconds >= targetPerLesson ||
        lesson.clips.length >= MAX_CLIPS_PER_LESSON);

    if (mustAdvance || shouldAdvance) {
      currentLesson++;
    }
  }

  // Post-pass: rebalance any lesson that exceeds MAX_CLIPS_PER_LESSON
  // by moving excess clips backwards to the previous lesson (if it has room)
  for (let l = lessons.length - 1; l > 0; l--) {
    while (lessons[l].clips.length > MAX_CLIPS_PER_LESSON) {
      const prev = lessons[l - 1];
      if (prev.clips.length >= MAX_CLIPS_PER_LESSON) break; // no room
      // Move the first clip from this lesson to the end of the previous lesson
      const moved = lessons[l].clips.shift()!;
      lessons[l].totalDurationSeconds -= moved.durationSeconds;
      prev.clips.push(moved);
      prev.totalDurationSeconds += moved.durationSeconds;
    }
  }

  // Ensure every video appears at least once
  const videoIds = new Set([
    ...enrichedDigests.map((d) => d.contentId),
    ...basicDigests.filter((d) => d.contentType === "video").map((d) => d.contentId),
  ]);
  const assignedVideoIds = new Set(
    lessons.flatMap((l) => l.clips.map((c) => c.videoId)),
  );
  for (const vid of videoIds) {
    if (!assignedVideoIds.has(vid)) {
      // Find the enriched digest for this video
      const digest = enrichedDigests.find((d) => d.contentId === vid);
      const title = digest?.contentTitle ?? "Untitled";
      const dur = digest?.durationSeconds ?? DEFAULT_VIDEO_DURATION;

      // Add to the lesson with the least total duration
      const leastLoaded = lessons.reduce((min, l) =>
        l.totalDurationSeconds < min.totalDurationSeconds ? l : min,
      );
      leastLoaded.clips.push({
        videoId: vid,
        videoTitle: title,
        topicLabel: title,
        startSeconds: 0,
        endSeconds: dur,
        durationSeconds: dur,
      });
      leastLoaded.totalDurationSeconds += dur;
      warnings.push(`Video "${title}" had no clips assigned — added full clip to lesson ${leastLoaded.lessonIndex + 1}`);
    }
  }

  return {
    lessons,
    totalClips: lessons.reduce((sum, l) => sum + l.clips.length, 0),
    totalDurationSeconds: lessons.reduce((sum, l) => sum + l.totalDurationSeconds, 0),
    warnings,
  };
}

/**
 * Merge adjacent clips from the same video to reduce total clip count.
 */
function mergeAdjacentClips(clips: TopicClip[], maxTotal: number): TopicClip[] {
  if (clips.length <= maxTotal) return clips;

  const merged: TopicClip[] = [];
  let current: TopicClip | null = null;

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    if (
      current &&
      current.videoId === clip.videoId &&
      clip.startSeconds <= current.endSeconds + 5 // allow 5s gap
    ) {
      // Merge into current
      const prev: TopicClip = current!;
      current = {
        videoId: prev.videoId,
        videoTitle: prev.videoTitle,
        topicLabel: `${prev.topicLabel} + ${clip.topicLabel}`,
        startSeconds: prev.startSeconds,
        endSeconds: clip.endSeconds,
        durationSeconds: clip.endSeconds - prev.startSeconds,
        subtopics: [
          ...(prev.subtopics ?? []),
          ...(clip.subtopics ?? []),
        ],
      };
    } else {
      if (current) merged.push(current);
      current = { ...clip };
    }

    // Stop merging once we're under the limit
    const remaining = clips.length - (i + 1);
    if (merged.length + 1 + remaining <= maxTotal && current) {
      merged.push(current);
      current = null;
      // Push remaining as-is
      merged.push(...clips.slice(i + 1));
      return merged;
    }
  }

  if (current) merged.push(current);
  return merged;
}

// ---------------------------------------------------------------------------
// Prompt Formatter
// ---------------------------------------------------------------------------

function formatTime(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/**
 * Format the distribution plan as a text block for injection into the LLM prompt.
 */
export function formatDistributionPlanForPrompt(plan: DistributionPlan): string {
  const lines: string[] = [
    `═══ VIDEO ASSIGNMENT PLAN (MANDATORY) ═══`,
    `The following clip assignments have been pre-computed. You MUST follow them exactly.`,
    `Do NOT reassign, omit, or add video clips beyond this plan.`,
    `Your job is to write great titles, summaries, takeaways, DO/REFLECT actions, and overlay details for each lesson — but the video clips are fixed.`,
    ``,
  ];

  for (const lesson of plan.lessons) {
    lines.push(`Lesson ${lesson.lessonIndex + 1} (Session ${lesson.sessionIndex + 1}):`);

    for (let i = 0; i < lesson.clips.length; i++) {
      const clip = lesson.clips[i];
      lines.push(
        `  Clip ${i + 1}: Video "${clip.videoTitle}" (ID: ${clip.videoId}) @ ${formatTime(clip.startSeconds)}-${formatTime(clip.endSeconds)} — "${clip.topicLabel}"`,
      );
    }

    lines.push(`  Total: ${formatTime(lesson.totalDurationSeconds)}`);
    lines.push(``);
  }

  lines.push(`═══ END VIDEO ASSIGNMENT PLAN ═══`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Post-Validation
// ---------------------------------------------------------------------------

/**
 * Validate that an LLM-generated draft follows the distribution plan.
 * If deviations are found, programmatically repair the clips.
 */
export function validateAndFixClipDistribution(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  draft: any,
  plan: DistributionPlan,
  enrichedDigests: EnrichedContentDigest[],
): ValidationResult {
  const errors: string[] = [];
  const validVideoIds = new Set([
    ...enrichedDigests.map((d) => d.contentId),
    ...plan.lessons.flatMap((l) => l.clips.map((c) => c.videoId)),
  ]);

  // Build duration lookup
  const durationMap = new Map<string, number>();
  for (const d of enrichedDigests) {
    if (d.durationSeconds) durationMap.set(d.contentId, d.durationSeconds);
  }

  // Flatten all sessions from the draft in order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const draftSessions: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const week of (draft.weeks ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const session of (week.sessions ?? [])) {
      draftSessions.push(session);
    }
  }

  // Check 1: All plan videos are referenced somewhere in the draft
  const planVideoIds = new Set(plan.lessons.flatMap((l) => l.clips.map((c) => c.videoId)));
  const draftVideoIds = new Set(
    draftSessions.flatMap(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) => (s.clips ?? []).map((c: any) => c.youtubeVideoId),
    ),
  );
  for (const vid of planVideoIds) {
    if (!draftVideoIds.has(vid)) {
      errors.push(`Video ${vid} from plan is missing in draft`);
    }
  }

  // Check 2: All sessions have at least 1 clip
  for (let i = 0; i < draftSessions.length; i++) {
    const session = draftSessions[i];
    if (!session.clips || session.clips.length === 0) {
      errors.push(`Session ${i + 1} has no clips`);
    }
  }

  // Check 3: No hallucinated video IDs
  for (let i = 0; i < draftSessions.length; i++) {
    const session = draftSessions[i];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const clip of (session.clips ?? [])) {
      if (!validVideoIds.has(clip.youtubeVideoId)) {
        errors.push(`Session ${i + 1} has hallucinated video ID: ${clip.youtubeVideoId}`);
      }
    }
  }

  // Check 4: Timestamps within bounds
  for (let i = 0; i < draftSessions.length; i++) {
    const session = draftSessions[i];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const clip of (session.clips ?? [])) {
      const dur = durationMap.get(clip.youtubeVideoId);
      if (dur && clip.endSeconds > dur + 5) { // 5s tolerance
        errors.push(
          `Session ${i + 1} clip for video ${clip.youtubeVideoId} has endSeconds=${clip.endSeconds} exceeding duration=${dur}`,
        );
      }
    }
  }

  // Check 5: Structural match — week/session layout must match the plan
  const expectedWeekNumbers = [...new Set(plan.lessons.map((l) => l.weekNumber))].sort((a, b) => a - b);
  const expectedWeekCount = expectedWeekNumbers.length;
  let structuralMismatch = false;

  if ((draft.weeks ?? []).length !== expectedWeekCount) {
    errors.push(
      `Structural mismatch: plan has ${expectedWeekCount} lessons but draft has ${(draft.weeks ?? []).length} weeks`,
    );
    structuralMismatch = true;
  } else {
    for (let w = 0; w < expectedWeekCount; w++) {
      const expectedSessions = plan.lessons.filter((l) => l.weekNumber === expectedWeekNumbers[w]).length;
      const actualSessions = (draft.weeks[w]?.sessions ?? []).length;
      if (actualSessions !== expectedSessions) {
        errors.push(
          `Structural mismatch: lesson ${w + 1} should have ${expectedSessions} session(s) but has ${actualSessions}`,
        );
        structuralMismatch = true;
      }
    }
  }

  if (errors.length === 0) {
    return { valid: true, errors: [] };
  }

  // Auto-fix: if structural mismatch, restructure the draft to match the plan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fixedDraft: any;

  if (structuralMismatch) {
    // Flatten all sessions from the draft, preserving their content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flatSessions: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const week of (draft.weeks ?? [])) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const session of (week.sessions ?? [])) {
        flatSessions.push(JSON.parse(JSON.stringify(session)));
      }
    }

    // Build the correct week/session structure from the plan
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newWeeks: any[] = [];
    let sessionIdx = 0;

    for (const weekNum of expectedWeekNumbers) {
      const lessonsForWeek = plan.lessons.filter((l) => l.weekNumber === weekNum);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sessions: any[] = [];

      for (let s = 0; s < lessonsForWeek.length; s++) {
        // Reuse the corresponding flat session if available, otherwise create a stub
        const source = sessionIdx < flatSessions.length
          ? flatSessions[sessionIdx]
          : { title: `Session ${s + 1}`, summary: "", keyTakeaways: [], orderIndex: s, actions: [] };
        source.orderIndex = s;
        sessions.push(source);
        sessionIdx++;
      }

      // Find the original week data for title/summary if it existed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const origWeek = (draft.weeks ?? []).find((w: any) => w.weekNumber === weekNum);
      newWeeks.push({
        title: origWeek?.title ?? `Lesson ${weekNum}`,
        summary: origWeek?.summary ?? sessions[0]?.summary ?? "",
        weekNumber: weekNum,
        sessions,
      });
    }

    fixedDraft = JSON.parse(JSON.stringify(draft));
    fixedDraft.weeks = newWeeks;
    fixedDraft.durationWeeks = expectedWeekCount;
  } else {
    fixedDraft = JSON.parse(JSON.stringify(draft));
  }

  // Now fix clips in each session to match the plan
  let planLessonIdx = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const week of fixedDraft.weeks) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const session of week.sessions) {
      if (planLessonIdx >= plan.lessons.length) break;

      const planLesson = plan.lessons[planLessonIdx];

      // Build replacement clips from the plan
      session.clips = planLesson.clips.map((planClip, idx) => {
        // Try to preserve chapterTitle/chapterDescription from existing LLM output
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingClip = (session.clips ?? []).find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => c.youtubeVideoId === planClip.videoId && c.orderIndex === idx,
        );

        return {
          youtubeVideoId: planClip.videoId,
          startSeconds: planClip.startSeconds,
          endSeconds: planClip.endSeconds,
          orderIndex: idx,
          transitionType: idx === 0 ? "NONE" : "FADE",
          transitionDurationMs: 500,
          chapterTitle: existingClip?.chapterTitle ?? planClip.topicLabel,
          chapterDescription: existingClip?.chapterDescription ?? planClip.subtopics?.join(", "),
        };
      });

      // Ensure overlays exist (at minimum a TITLE_CARD)
      if (!session.overlays || session.overlays.length === 0) {
        session.overlays = [
          {
            type: "TITLE_CARD",
            content: { title: session.title, subtitle: `Lesson ${week.weekNumber}` },
            position: "CENTER",
            durationMs: 4000,
            orderIndex: 0,
            triggerAtSeconds: 0,
          },
        ];
      }

      planLessonIdx++;
    }
  }

  return { valid: false, errors, fixedDraft };
}
