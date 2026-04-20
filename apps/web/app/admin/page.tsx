"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Spinner } from "@/components/ui/spinner";

interface Transaction {
  id: string;
  date: string;
  learnerEmail: string;
  programTitle: string;
  creatorEmail: string;
  creatorName: string | null;
  amountCents: number;
  stripeSessionId: string | null;
}

interface ProgramStat {
  id: string;
  title: string;
  enrollments: number;
  revenueCents: number;
}

interface CreatorStat {
  email: string;
  name: string | null;
  enrollments: number;
  grossRevenueCents: number;
}

interface DayStat {
  date: string;
  count: number;
}

interface AdminData {
  summary: {
    journeylineRevenueCents: number;
    publishedProgramCount: number;
    journeylineFeeCentsPerProgram: number;
    creatorRevenueCents: number;
    totalEnrollments: number;
    freeEnrollments: number;
  };
  byProgram: ProgramStat[];
  byCreator: CreatorStat[];
  byDay: DayStat[];
  recentTransactions: Transaction[];
}

function formatUSD(cents: number) {
  if (cents === 0) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminPage() {
  const router = useRouter();
  const { isLoaded } = useUser();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    fetch("/api/admin/transactions")
      .then(async (res) => {
        if (res.status === 403) {
          router.replace("/dashboard");
          return;
        }
        if (!res.ok) throw new Error("Failed to load");
        setData(await res.json());
      })
      .catch(() => setError("Failed to load admin data."))
      .finally(() => setLoading(false));
  }, [isLoaded, router]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { summary, byProgram, byCreator, byDay, recentTransactions } = data;
  const maxDayCount = Math.max(...byDay.map((d) => d.count), 1);

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f" }}>
      {/* Header */}
      <nav className="flex items-center justify-between px-6 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-xl font-bold tracking-tight text-white hover:text-teal-400 transition"
          >
            ←
          </button>
          <div className="h-6 w-px bg-gray-700" />
          <span className="text-base font-semibold text-white">Admin</span>
          <span className="text-xs px-2 py-1 rounded-full bg-pink-900/40 text-pink-400 font-medium">
            Internal
          </span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "JourneyLine Revenue",
              value: formatUSD(summary.journeylineRevenueCents),
              sub: `${summary.publishedProgramCount} published × ${formatUSD(summary.journeylineFeeCentsPerProgram)}`,
            },
            {
              label: "Creator Revenue",
              value: formatUSD(summary.creatorRevenueCents),
              sub: "paid by learners to creators (100%)",
            },
            {
              label: "Total Enrollments",
              value: summary.totalEnrollments.toLocaleString(),
              sub: `${summary.freeEnrollments} free`,
            },
            {
              label: "Paid Enrollments",
              value: (summary.totalEnrollments - summary.freeEnrollments).toLocaleString(),
              sub: "with payment",
            },
          ].map((card) => (
            <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-xs text-gray-600 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Enrollments by day (last 30 days) */}
        {byDay.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Enrollments — last 30 days
            </h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-end gap-1 h-24">
                {byDay.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full rounded-t bg-teal-500/60 group-hover:bg-teal-400 transition"
                      style={{ height: `${Math.round((d.count / maxDayCount) * 88)}px` }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 whitespace-nowrap bg-gray-800 text-xs text-white px-2 py-1 rounded">
                      {d.date}: {d.count}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-600">{byDay[0]?.date}</span>
                <span className="text-xs text-gray-600">{byDay[byDay.length - 1]?.date}</span>
              </div>
            </div>
          </div>
        )}

        {/* Programs table */}
        {byProgram.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              By program
            </h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Program</th>
                    <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Enrollments</th>
                    <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Creator revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {byProgram.map((p, i) => (
                    <tr key={p.id} className={i !== byProgram.length - 1 ? "border-b border-gray-800/50" : ""}>
                      <td className="px-4 py-3 text-white font-medium truncate max-w-xs">{p.title}</td>
                      <td className="px-4 py-3 text-gray-300 text-right">{p.enrollments}</td>
                      <td className="px-4 py-3 text-teal-400 text-right font-mono">{formatUSD(p.revenueCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Creators table */}
        {byCreator.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              By creator
            </h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Creator</th>
                    <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Enrollments</th>
                    <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Revenue earned</th>
                  </tr>
                </thead>
                <tbody>
                  {byCreator.map((c, i) => (
                    <tr key={c.email} className={i !== byCreator.length - 1 ? "border-b border-gray-800/50" : ""}>
                      <td className="px-4 py-3 text-white font-medium truncate max-w-xs">
                        {c.name ?? c.email}
                        {c.name && (
                          <span className="block text-xs text-gray-500 font-normal truncate">{c.email}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-right">{c.enrollments}</td>
                      <td className="px-4 py-3 text-teal-400 text-right font-mono">{formatUSD(c.grossRevenueCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent transactions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Recent transactions
          </h2>
          {recentTransactions.length === 0 ? (
            <p className="text-gray-600 text-sm">No transactions yet.</p>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Date</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Program</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Learner</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Creator</th>
                    <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Amount</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Stripe session</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((t, i) => (
                    <tr key={t.id} className={i !== recentTransactions.length - 1 ? "border-b border-gray-800/50" : ""}>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDate(t.date)}</td>
                      <td className="px-4 py-3 text-white font-medium truncate max-w-[160px]">{t.programTitle}</td>
                      <td className="px-4 py-3 text-gray-400 truncate max-w-[160px]">{t.learnerEmail}</td>
                      <td className="px-4 py-3 text-gray-400 truncate max-w-[140px]">{t.creatorName ?? t.creatorEmail}</td>
                      <td className="px-4 py-3 text-right font-mono text-teal-400">
                        {t.amountCents === 0 ? <span className="text-gray-600">Free</span> : formatUSD(t.amountCents)}
                      </td>
                      <td className="px-4 py-3">
                        {t.stripeSessionId ? (
                          <code className="text-xs text-gray-600 font-mono truncate block max-w-[120px]">
                            {t.stripeSessionId.slice(0, 24)}…
                          </code>
                        ) : (
                          <span className="text-gray-700 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
