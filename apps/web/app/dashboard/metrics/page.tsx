import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

const ALLOWED_EMAILS = ["info@skillguide.net"];

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export default async function MetricsPage() {
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (!email || !ALLOWED_EMAILS.includes(email)) {
    redirect("/dashboard");
  }

  // ── Queries ──────────────────────────────────────────────

  const [
    totalCreators,
    creatorsWithPublished,
    totalPrograms,
    publishedPrograms,
    totalEntitlements,
    creators,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CREATOR" } }),
    prisma.user.count({
      where: {
        role: "CREATOR",
        programs: { some: { published: true } },
      },
    }),
    prisma.program.count(),
    prisma.program.count({ where: { published: true } }),
    prisma.entitlement.count({ where: { status: "ACTIVE" } }),
    prisma.user.findMany({
      where: { role: "CREATOR" },
      include: {
        programs: {
          select: {
            id: true,
            published: true,
            priceInCents: true,
            entitlements: {
              where: { status: "ACTIVE" },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Compute per-creator stats
  const creatorRows = creators.map((c) => {
    const programsCreated = c.programs.length;
    const programsPublished = c.programs.filter((p) => p.published).length;
    const learnersEnrolled = c.programs.reduce(
      (sum, p) => sum + p.entitlements.length,
      0
    );
    const revenueCents = c.programs.reduce(
      (sum, p) => sum + p.priceInCents * p.entitlements.length,
      0
    );
    const activated = programsPublished > 0;

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      programsCreated,
      programsPublished,
      learnersEnrolled,
      revenueCents,
      activated,
      createdAt: c.createdAt,
    };
  });

  // Total revenue across all creators
  const totalRevenueCents = creatorRows.reduce(
    (sum, c) => sum + c.revenueCents,
    0
  );
  const activationRate =
    totalCreators > 0 ? (creatorsWithPublished / totalCreators) * 100 : 0;

  // ── Summary cards ────────────────────────────────────────

  const stats = [
    { label: "Total Creators", value: String(totalCreators) },
    { label: "Activation Rate", value: formatPercent(activationRate) },
    { label: "Programs Created", value: String(totalPrograms) },
    { label: "Programs Published", value: String(publishedPrograms) },
    { label: "Learners Enrolled", value: String(totalEntitlements) },
    { label: "Total Revenue", value: formatCurrency(totalRevenueCents) },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0a0a0f" }}>
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-5 py-4 border-b border-white/10"
        style={{ backgroundColor: "#0a0a0f" }}
      >
        <Link href="/" className="text-xl font-bold tracking-tight text-white">
          Journeyline
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-white transition"
          >
            Dashboard
          </Link>
          <span className="text-xs px-2 py-1 rounded-full bg-purple-900/40 text-purple-400 font-medium">
            Metrics
          </span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-semibold text-white">
          Platform Metrics
        </h1>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl px-4 py-4"
              style={{
                backgroundColor: "#111118",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p className="text-xl font-semibold text-neon-cyan leading-none mb-1">
                {stat.value}
              </p>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Creator Table ── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "#111118",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="text-sm font-semibold text-white">
              Creators ({creatorRows.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Creator
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">
                    Created
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">
                    Published
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">
                    Learners
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">
                    Revenue
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-center">
                    Activated
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {creatorRows.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white font-medium truncate max-w-[200px]">
                          {c.name || "—"}
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">
                          {c.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-right tabular-nums">
                      {c.programsCreated}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-right tabular-nums">
                      {c.programsPublished}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-right tabular-nums">
                      {c.learnersEnrolled}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-right tabular-nums">
                      {formatCurrency(c.revenueCents)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.activated ? (
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/10 font-medium">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-right whitespace-nowrap text-xs">
                      {formatDate(c.createdAt)}
                    </td>
                  </tr>
                ))}
                {creatorRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No creators yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
