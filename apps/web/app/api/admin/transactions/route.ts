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

  const PLATFORM_FEE = 0.1;

  // Summary totals
  const totalRevenueCents = entitlements.reduce(
    (sum, e) => sum + e.program.priceInCents,
    0
  );
  const platformCutCents = Math.round(totalRevenueCents * PLATFORM_FEE);
  const creatorPayoutsCents = totalRevenueCents - platformCutCents;
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

  // Recent 50 transactions
  const recentTransactions = entitlements.slice(0, 50).map((e) => ({
    id: e.id,
    date: e.createdAt.toISOString(),
    learnerEmail: e.user.email,
    programTitle: e.program.title,
    creatorEmail: e.program.creator.email,
    creatorName: e.program.creator.name,
    amountCents: e.program.priceInCents,
    platformFeeCents: Math.round(e.program.priceInCents * PLATFORM_FEE),
    stripeSessionId: e.stripeSessionId ?? null,
  }));

  logger.info({ operation: "admin.transactions.success", userId, totalEnrollments, totalRevenueCents });

  return NextResponse.json({
    summary: {
      totalRevenueCents,
      platformCutCents,
      creatorPayoutsCents,
      totalEnrollments,
      freeEnrollments,
    },
    byProgram,
    byDay,
    recentTransactions,
  });
  } catch (err) {
    logger.error({ operation: "admin.transactions.error", userId }, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
