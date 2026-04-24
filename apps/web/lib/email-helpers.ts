import { prisma } from "./prisma";
import { resolveTokens } from "./resolve-tokens";
import type { EmailBrand } from "@/emails/EmailLayout";

export interface ProgramPreview {
  title: string;
  targetTransformation: string | null;
  lessonCount: number;
  totalMinutes: number | null;
  firstLessonTitles: string[];
  heroImageUrl: string | null;
  creatorAvatarUrl: string | null;
  brand: EmailBrand;
}

/**
 * Build the data bundle a branded learner email needs: program structure
 * (lesson count, totals, first few titles), a hero thumbnail, and brand colors
 * pulled from the program's active skin.
 *
 * Returns null only if the program no longer exists.
 */
export async function getProgramPreview(programId: string): Promise<ProgramPreview | null> {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: {
      id: true,
      title: true,
      targetTransformation: true,
      creatorAvatarUrl: true,
      skinId: true,
      customSkinId: true,
      weeks: {
        orderBy: { weekNumber: "asc" },
        select: {
          title: true,
          sessions: {
            orderBy: { orderIndex: "asc" },
            select: {
              actions: {
                orderBy: { orderIndex: "asc" },
                select: {
                  type: true,
                  muxPlaybackId: true,
                  youtubeVideo: {
                    select: {
                      thumbnailUrl: true,
                      muxPlaybackId: true,
                      durationSeconds: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!program) return null;

  const tokens = await resolveTokens({
    skinId: program.skinId,
    customSkinId: program.customSkinId,
  });

  const brand: EmailBrand = {
    accent: tokens.color.accent.primary,
    accentText: pickReadableTextOn(tokens.color.accent.primary),
  };

  const firstLessonTitles = program.weeks.slice(0, 3).map((w) => w.title);

  let totalSeconds = 0;
  let heroImageUrl: string | null = null;

  for (const week of program.weeks) {
    for (const session of week.sessions) {
      for (const action of session.actions) {
        const yt = action.youtubeVideo;
        if (yt?.durationSeconds) totalSeconds += yt.durationSeconds;

        if (!heroImageUrl && action.type === "WATCH") {
          const playback = action.muxPlaybackId || yt?.muxPlaybackId;
          if (playback) {
            heroImageUrl = `https://image.mux.com/${playback}/thumbnail.jpg?width=720&fit_mode=preserve`;
          } else if (yt?.thumbnailUrl) {
            heroImageUrl = yt.thumbnailUrl;
          }
        }
      }
    }
  }

  const avatarProxy = program.creatorAvatarUrl
    ? absoluteUrl(`/api/programs/${program.id}/avatar`)
    : null;

  return {
    title: program.title,
    targetTransformation: program.targetTransformation,
    lessonCount: program.weeks.length,
    totalMinutes: totalSeconds > 0 ? Math.round(totalSeconds / 60) : null,
    firstLessonTitles,
    heroImageUrl,
    creatorAvatarUrl: avatarProxy,
    brand,
  };
}

export interface CreatorStats {
  enrollmentCount: number;
  grossEarnedCents: number;
}

/**
 * Lifetime enrollment + gross earnings for a creator. Cheap aggregate over the
 * Entitlement table joined to Program prices.
 */
export async function getCreatorLifetimeStats(creatorId: string): Promise<CreatorStats> {
  const programs = await prisma.program.findMany({
    where: { creatorId },
    select: {
      priceInCents: true,
      _count: { select: { entitlements: { where: { status: "ACTIVE" } } } },
    },
  });

  let enrollmentCount = 0;
  let grossEarnedCents = 0;
  for (const p of programs) {
    enrollmentCount += p._count.entitlements;
    grossEarnedCents += p._count.entitlements * p.priceInCents;
  }

  return { enrollmentCount, grossEarnedCents };
}

export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://app.journeyline.ai";
  return path.startsWith("http") ? path : `${base}${path}`;
}

export function formatCents(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function pickReadableTextOn(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length !== 3 && c.length !== 6) return "#ffffff";
  const expanded = c.length === 3 ? c.split("").map((ch) => ch + ch).join("") : c;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return "#ffffff";
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0f172a" : "#ffffff";
}
