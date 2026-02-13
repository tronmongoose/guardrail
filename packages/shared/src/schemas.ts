import { z } from "zod";

// --- Enums ---

export const ActionTypeSchema = z.enum(["watch", "read", "do", "reflect"]);

export const PacingModeSchema = z.enum([
  "drip_by_week",      // Weekly release: content unlocks on a time-based schedule
  "unlock_on_complete", // Staged: next session/week unlocks after completing the current one
]);

// --- Action ---

export const ActionSchema = z.object({
  id: z.string().optional(), // set by DB on persist
  title: z.string().min(1).max(200),
  type: ActionTypeSchema,
  instructions: z.string().max(2000).optional(),
  reflectionPrompt: z.string().max(1000).optional(),
  youtubeVideoId: z.string().optional(), // references YouTubeVideo
  orderIndex: z.number().int().min(0),
});

// --- Session ---

export const SessionSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  summary: z.string().max(500).optional(),
  keyTakeaways: z.array(z.string().max(200)).max(5).optional(), // 2-3 key takeaway bullets
  orderIndex: z.number().int().min(0),
  actions: z.array(ActionSchema).min(1),
});

// --- Week ---

export const WeekSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  summary: z.string().max(500).optional(),
  weekNumber: z.number().int().min(1),
  sessions: z.array(SessionSchema).min(1),
});

// --- Program Draft JSON (full structure) ---

export const ProgramDraftSchema = z.object({
  programId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  pacingMode: PacingModeSchema,
  durationWeeks: z.number().int().min(1).max(52),
  weeks: z.array(WeekSchema).min(1),
});

// --- YouTube URL parsing ---

export const YouTubeUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => {
      try {
        const u = new URL(url);
        return (
          (u.hostname === "www.youtube.com" || u.hostname === "youtube.com") &&
          u.searchParams.has("v")
        ) || (u.hostname === "youtu.be" && u.pathname.length > 1);
      } catch {
        return false;
      }
    },
    { message: "Must be a valid YouTube URL" }
  );

// --- Cluster result (used between AI stages) ---

export const ClusterGroupSchema = z.object({
  clusterId: z.number().int().min(0),
  label: z.string(),
  videoIds: z.array(z.string()),
  summary: z.string().optional(),
});

export const ClusterResultSchema = z.object({
  programId: z.string(),
  clusters: z.array(ClusterGroupSchema),
});

// --- Program Status ---

export const ProgramStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);

// --- Program List Item (for /api/programs response) ---

export const ProgramListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string().nullable(),
  status: ProgramStatusSchema,
  published: z.boolean(),
  durationWeeks: z.number().int(),
  priceInCents: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  _count: z.object({
    videos: z.number().int(),
    weeks: z.number().int(),
  }),
});

export const ProgramListResponseSchema = z.array(ProgramListItemSchema);
