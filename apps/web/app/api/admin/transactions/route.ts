import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

function getAdminIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

export async function GET() {
  const { userId } = await auth();
  if (!userId || !getAdminIds().has(userId)) {
    logger.warn({ operation: "admin.transactions.forbidden", userId: userId ?? "unauthenticated" });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  logger.info({ operation: "admin.transactions.request", userId });

  try {
  // All ACTIVE entitlements with program + learner info
  const entitlements = await prisma.entitlement.findMany({
    where: { status: "ACTIVE" },
    include: {
      program: {
        select: {
          id: true,
          title: true,
          priceInCents: true,
          creator: { select: { email: true, name: true } },
        },
      },
      user: { select: { email: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // JourneyLine business model: $99 one-time fee per published program.
  // Creators keep 100% of what their audience pays them.
  const JOURNEYLINE_FEE_CENTS_PER_PROGRAM = 9900;

  // Count published programs as a proxy for paid platform fees
  // (until the $99 Stripe checkout is wired and a dedicated paid flag exists).
  const publishedProgramCount = await prisma.program.count({
    where: { published: true },
  });
  const journeylineRevenueCents =
    publishedProgramCount * JOURNEYLINE_FEE_CENTS_PER_PROGRAM;

  // Creator revenue = gross learner payments (all of it goes to creators).
  const creatorRevenueCents = entitlements.reduce(
    (sum, e) => sum + e.program.priceInCents,
    0
  );
  const totalEnrollments = entitlements.length;
  const freeEnrollments = entitlements.filter(
    (e) => e.program.priceInCents === 0
  ).length;

  // Enrollments per program
  const programMap = new Map<
    string,
    { title: string; enrollments: number; revenueCents: number }
  >();
  for (const e of entitlements) {
    const existing = programMap.get(e.programId) ?? {
      title: e.program.title,
      enrollments: 0,
      revenueCents: 0,
    };
    existing.enrollments += 1;
    existing.revenueCents += e.program.priceInCents;
    programMap.set(e.programId, existing);
  }
  const byProgram = Array.from(programMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.revenueCents - a.revenueCents);

  // Revenue per creator
  const creatorMap = new Map<
    string,
    {
      email: string;
      name: string | null;
      enrollments: number;
      grossRevenueCents: number;
    }
  >();
  for (const e of entitlements) {
    const key = e.program.creator.email;
    const existing = creatorMap.get(key) ?? {
      email: e.program.creator.email,
      name: e.program.creator.name,
      enrollments: 0,
      grossRevenueCents: 0,
    };
    existing.enrollments += 1;
    existing.grossRevenueCents += e.program.priceInCents;
    creatorMap.set(key, existing);
  }
  const byCreator = Array.from(creatorMap.values())
    .map((c) => ({
      email: c.email,
      name: c.name,
      enrollments: c.enrollments,
      grossRevenueCents: c.grossRevenueCents,
    }))
    .sort((a, b) => b.grossRevenueCents - a.grossRevenueCents);

  // Enrollments by day (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dayMap = new Map<string, number>();
  for (const e of entitlements) {
    if (e.createdAt < thirtyDaysAgo) continue;
    const day = e.createdAt.toISOString().slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const byDay = Array.from(dayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Recent 50 transactions (learner → creator payments)
  const recentTransactions = entitlements.slice(0, 50).map((e) => ({
    id: e.id,
    date: e.createdAt.toISOString(),
    learnerEmail: e.user.email,
    programTitle: e.program.title,
    creatorEmail: e.program.creator.email,
    creatorName: e.program.creator.name,
    amountCents: e.program.priceInCents,
    stripeSessionId: e.stripeSessionId ?? null,
  }));

  logger.info({ operation: "admin.transactions.success", userId, totalEnrollments, creatorRevenueCents, journeylineRevenueCents });

  return NextResponse.json({
    summary: {
      journeylineRevenueCents,
      publishedProgramCount,
      journeylineFeeCentsPerProgram: JOURNEYLINE_FEE_CENTS_PER_PROGRAM,
      creatorRevenueCents,
      totalEnrollments,
      freeEnrollments,
    },
    byProgram,
    byCreator,
    byDay,
    recentTransactions,
  });
  } catch (err) {
    logger.error({ operation: "admin.transactions.error", userId }, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
