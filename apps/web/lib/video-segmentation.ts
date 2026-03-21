/**
 * Virtual video segmentation — splits long videos (>10 min) into child
 * YouTubeVideo records based on Gemini topic analysis.
 *
 * No physical file splitting occurs. Child records inherit the parent's URL
 * and carry startSeconds/endSeconds bounds from Gemini topics. The generation
 * pipeline treats these children as independent content pieces.
 */

import type { PrismaClient, YouTubeVideo } from "@prisma/client";
import type { VideoTopic } from "@guide-rail/shared";

const THRESHOLD_SECONDS = 600; // 10 minutes
const MIN_SEGMENT_SECONDS = 60; // merge topics shorter than this into neighbour
const MAX_SEGMENTS = 8;

export interface SegmentSpec {
  label: string;
  startSeconds: number;
  endSeconds: number;
  segmentIndex: number;
}

export function shouldSegment(durationSeconds: number): boolean {
  return durationSeconds > THRESHOLD_SECONDS;
}

/**
 * Build segment specs from Gemini topics. Merges short topics, caps at MAX_SEGMENTS,
 * and clamps the last segment's endSeconds to durationSeconds.
 * Returns empty array if fewer than 2 specs survive (no split warranted).
 */
export function buildSegmentSpecs(
  topics: VideoTopic[],
  durationSeconds: number,
): SegmentSpec[] {
  if (topics.length === 0) return [];

  // Merge topics shorter than MIN_SEGMENT_SECONDS into their next neighbour
  const merged: VideoTopic[] = [];
  let pending: VideoTopic | null = null;

  for (const topic of topics) {
    const duration = topic.endSeconds - topic.startSeconds;
    if (pending !== null) {
      // Extend the pending topic to absorb this one
      pending = {
        label: pending.label,
        startSeconds: pending.startSeconds,
        endSeconds: topic.endSeconds,
        subtopics: pending.subtopics,
      };
      if (pending.endSeconds - pending.startSeconds >= MIN_SEGMENT_SECONDS) {
        merged.push(pending);
        pending = null;
      }
    } else if (duration < MIN_SEGMENT_SECONDS) {
      pending = {
        label: topic.label,
        startSeconds: topic.startSeconds,
        endSeconds: topic.endSeconds,
        subtopics: topic.subtopics,
      };
    } else {
      merged.push(topic);
    }
  }
  // Absorb any leftover pending into the last merged topic or push it as-is
  if (pending !== null) {
    if (merged.length > 0) {
      const last = merged[merged.length - 1];
      merged[merged.length - 1] = {
        label: last.label,
        startSeconds: last.startSeconds,
        endSeconds: pending.endSeconds,
        subtopics: last.subtopics,
      };
    } else {
      merged.push(pending);
    }
  }

  if (merged.length < 2) return [];

  // Cap to MAX_SEGMENTS by merging middle topics
  let result = merged;
  while (result.length > MAX_SEGMENTS) {
    // Find the shortest adjacent pair and merge them
    let minDuration = Infinity;
    let minIdx = 1;
    for (let i = 0; i < result.length - 1; i++) {
      const combined =
        result[i + 1].endSeconds - result[i].startSeconds;
      if (combined < minDuration) {
        minDuration = combined;
        minIdx = i;
      }
    }
    const combined: VideoTopic = {
      label: result[minIdx].label,
      startSeconds: result[minIdx].startSeconds,
      endSeconds: result[minIdx + 1].endSeconds,
    };
    result = [
      ...result.slice(0, minIdx),
      combined,
      ...result.slice(minIdx + 2),
    ];
  }

  // Clamp last segment endSeconds to durationSeconds
  const last = result[result.length - 1];
  if (last.endSeconds > durationSeconds) {
    result[result.length - 1] = { ...last, endSeconds: durationSeconds };
  } else if (last.endSeconds < durationSeconds) {
    // Extend last segment to cover the full video
    result[result.length - 1] = { ...last, endSeconds: durationSeconds };
  }

  return result.map((t, i) => ({
    label: t.label,
    startSeconds: t.startSeconds,
    endSeconds: t.endSeconds,
    segmentIndex: i,
  }));
}

/**
 * Create virtual child YouTubeVideo records for a long video.
 * Idempotency must be checked by the caller (check parentVideoId count first).
 */
export async function createVirtualSegments(
  prisma: PrismaClient,
  parentVideo: YouTubeVideo,
  specs: SegmentSpec[],
): Promise<void> {
  await prisma.$transaction(
    specs.map((spec) =>
      prisma.youTubeVideo.create({
        data: {
          videoId: crypto.randomUUID(),
          url: parentVideo.url,
          title: `${parentVideo.title ?? "Video"} — Part ${spec.segmentIndex + 1}: ${spec.label}`,
          authorName: parentVideo.authorName,
          thumbnailUrl: parentVideo.thumbnailUrl,
          programId: parentVideo.programId,
          parentVideoId: parentVideo.id,
          isSegment: true,
          segmentIndex: spec.segmentIndex,
          startSeconds: spec.startSeconds,
          endSeconds: spec.endSeconds,
        },
      }),
    ),
  );
  console.log(
    `[segmentation] Created ${specs.length} virtual segments for "${parentVideo.title}" (${parentVideo.id})`,
  );
}

/**
 * Convenience helper: run the full segmentation check after Gemini analysis.
 * Safe to call multiple times — skips if segments already exist.
 */
export async function maybeSegmentVideo(
  prisma: PrismaClient,
  parentVideo: YouTubeVideo,
  topics: VideoTopic[],
  durationSeconds: number,
): Promise<void> {
  if (!shouldSegment(durationSeconds) || topics.length < 2) return;

  const specs = buildSegmentSpecs(topics, durationSeconds);
  if (specs.length < 2) return;

  const existing = await prisma.youTubeVideo.count({
    where: { parentVideoId: parentVideo.id },
  });
  if (existing > 0) return; // idempotency guard

  await createVirtualSegments(prisma, parentVideo, specs);
}
