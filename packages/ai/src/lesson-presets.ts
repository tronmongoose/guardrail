/**
 * Smart lesson-count presets for the program creation wizard.
 *
 * Middle preset = videoCount (1 lesson per video), scaled around it:
 *   Compact:  videoCount / 2  (group videos together)
 *   Natural:  videoCount      (1 lesson per video)
 *   Detailed: videoCount * 2  (split each video into 2)
 *
 * When Gemini analysis is available, the preset whose multiplier best
 * matches the average topics-per-video gets an "AI recommends" badge.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VideoInfo {
  durationSeconds?: number | null;
  topicCount?: number;
}

export interface LessonPreset {
  weeks: number;
  label: string;            // "Compact" | "Natural" | "Detailed"
  ratioNote: string;        // e.g. "~8 min/lesson" or "~2 videos/lesson"
  aiRecommended?: boolean;
}

// ---------------------------------------------------------------------------
// Constants (shared with clip-distributor)
// ---------------------------------------------------------------------------

const DEFAULT_VIDEO_DURATION = 600; // 10 min fallback
const MAX_WEEKS = 26;

// ---------------------------------------------------------------------------
// Core function
// ---------------------------------------------------------------------------

export function computeSmartPresets(
  videoCount: number,
  videos: VideoInfo[],
): LessonPreset[] {
  // No videos — static fallback
  if (videoCount === 0) {
    return [
      { weeks: 4, label: "Compact", ratioNote: "Focused sprint" },
      { weeks: 8, label: "Natural", ratioNote: "Most popular" },
      { weeks: 12, label: "Detailed", ratioNote: "Deep dive" },
    ];
  }

  // --- Compute preset week counts ---
  const compact = Math.max(2, Math.floor(videoCount / 2));
  const natural = Math.max(compact + 1, videoCount);
  let detailed = Math.min(MAX_WEEKS, videoCount * 2);
  // Ensure strict ordering
  if (detailed <= natural) detailed = Math.min(MAX_WEEKS, natural + 1);

  const presets: [number, string][] = [
    [compact, "Compact"],
    [natural, "Natural"],
    [detailed, "Detailed"],
  ];

  // --- Duration info ---
  const analyzedVideos = videos.filter(
    (v) => v.durationSeconds != null && v.durationSeconds > 0,
  );
  const hasDuration = analyzedVideos.length > 0;

  let totalDurationSeconds: number;
  if (hasDuration) {
    const knownTotal = analyzedVideos.reduce(
      (sum, v) => sum + v.durationSeconds!,
      0,
    );
    const avgDuration = knownTotal / analyzedVideos.length;
    const unknownCount = videoCount - analyzedVideos.length;
    totalDurationSeconds = knownTotal + unknownCount * avgDuration;
  } else {
    totalDurationSeconds = videoCount * DEFAULT_VIDEO_DURATION;
  }

  // --- Topic info for AI badge ---
  const totalTopics = videos.reduce(
    (sum, v) => sum + (v.topicCount ?? 0),
    0,
  );
  const hasTopics = totalTopics > 0;
  const avgTopicsPerVideo = hasTopics ? totalTopics / videoCount : 0;

  // --- Build ratio notes ---
  const makeNote = (weekCount: number): string => {
    if (hasDuration) {
      const perLesson = Math.round(totalDurationSeconds / weekCount / 60);
      return `~${perLesson} min/lesson`;
    }
    const ratio = videoCount / weekCount;
    if (ratio >= 1) {
      return `~${ratio.toFixed(1)} videos/lesson`;
    }
    const inverse = weekCount / videoCount;
    return `~${inverse.toFixed(1)} lessons/video`;
  };

  // --- AI badge: match avg topics-per-video to the preset multiplier ---
  // Multipliers: compact=0.5x, natural=1x, detailed=2x
  const multipliers = [0.5, 1, 2];
  let aiRecommendedIndex: number | undefined;
  if (hasTopics) {
    let bestDist = Infinity;
    multipliers.forEach((m, i) => {
      const dist = Math.abs(avgTopicsPerVideo - m);
      if (dist < bestDist) {
        bestDist = dist;
        aiRecommendedIndex = i;
      }
    });
  }

  return presets.map(([weeks, label], i) => ({
    weeks,
    label,
    ratioNote: makeNote(weeks),
    ...(aiRecommendedIndex === i ? { aiRecommended: true } : {}),
  }));
}

// ---------------------------------------------------------------------------
// AI-derived lesson count
// ---------------------------------------------------------------------------

/**
 * Derive lesson count from Gemini topic analysis.
 * Blends topic density with duration to avoid over/under-splitting.
 * Used by the "Let AI decide" path in the wizard.
 */
export function computeLessonCountFromTopics(videos: VideoInfo[]): number {
  const totalTopics = videos.reduce((sum, v) => sum + (v.topicCount ?? 0), 0);
  const totalDurationSec = videos.reduce(
    (sum, v) => sum + (v.durationSeconds ?? DEFAULT_VIDEO_DURATION),
    0,
  );

  if (totalTopics === 0) {
    return Math.max(2, videos.length); // fallback: 1 lesson per video
  }

  // Target ~10 min content per lesson (matches clip-distributor sweet spot of 5-15 min)
  const TARGET_LESSON_SECONDS = 10 * 60;
  const durationBased = Math.round(totalDurationSec / TARGET_LESSON_SECONDS);
  const topicBased = totalTopics;

  // Weight duration 2:1 vs topics — topics inform clip structure within lessons,
  // but total content duration is the primary signal for lesson count.
  const blended = Math.round((2 * durationBased + topicBased) / 3);

  // Hard ceiling: each lesson must have at least 3 min of real content.
  // Without this, topic-dense short content produces absurdly short lessons.
  const MIN_CONTENT_PER_LESSON_SEC = 3 * 60;
  const contentCeiling = Math.max(2, Math.floor(totalDurationSec / MIN_CONTENT_PER_LESSON_SEC));

  return Math.max(2, Math.min(blended, contentCeiling, MAX_WEEKS));
}
