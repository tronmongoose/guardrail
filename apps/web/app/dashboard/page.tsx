"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import type { ProgramListItem } from "@guide-rail/shared";

interface GenerationJob {
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  stage: string | null;
  progress: number;
}

interface ProgramWithGeneration extends ProgramListItem {
  generationJob?: GenerationJob | null;
}

interface StripeConnectStatus {
  connected: boolean;
  status: string | null;
  onboardingComplete: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function DashboardPage() {
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const [programs, setPrograms] = useState<ProgramWithGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!clerkUser) {
      router.push("/");
      return;
    }

    // Check if onboarding is complete
    fetch("/api/user/onboarding")
      .then((res) => res.json())
      .then((data) => {
        if (!data.onboardingComplete) {
          router.push("/onboarding");
          return null;
        }
        return Promise.all([
          fetch("/api/programs"),
          fetch("/api/stripe/connect"),
        ]);
      })
      .then(async (responses) => {
        if (!responses) return;
        const [programsRes, stripeRes] = responses;

        if (!programsRes.ok) throw new Error("Failed to load programs");
        const programsData = await programsRes.json();
        setPrograms(programsData);

        if (stripeRes.ok) {
          const stripeData = await stripeRes.json();
          setStripeStatus(stripeData);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isLoaded, clerkUser, router]);

  const handleCreateProgram = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/programs/create", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create program");
      }
      const program = await res.json();
      router.push(`/programs/${program.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create program");
      setCreating(false);
    }
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Build detailed error message
        let errorMsg = data.error || "Failed to start Stripe onboarding";
        if (data.code) {
          errorMsg += ` (${data.code})`;
        }
        if (data.hint) {
          errorMsg += `. ${data.hint}`;
        }
        throw new Error(errorMsg);
      }
      // Redirect to Stripe onboarding
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect Stripe");
      setConnectingStripe(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen gradient-bg-radial grid-bg flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg-radial grid-bg">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-border/50 backdrop-blur-sm">
        <Link href="/" className="text-xl font-bold tracking-tight neon-text-cyan text-neon-cyan">
          GuideRail
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="hidden sm:block text-sm text-gray-400 truncate max-w-[150px]">
            {clerkUser?.fullName ?? clerkUser?.primaryEmailAddress?.emailAddress}
          </span>
          <UserButton />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Stripe Connect Card */}
        <div className="mb-8 bg-surface-card border border-surface-border rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-[#635BFF]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                </svg>
                <h3 className="font-semibold text-white">Payouts</h3>
                {stripeStatus?.onboardingComplete ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30">
                    Connected
                  </span>
                ) : stripeStatus?.connected ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-neon-yellow/10 text-neon-yellow border border-neon-yellow/30">
                    Pending
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/30">
                    Not connected
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">
                {stripeStatus?.onboardingComplete
                  ? "Your Stripe account is connected. You'll receive payouts for paid programs."
                  : stripeStatus?.connected
                  ? "Complete your Stripe setup to start receiving payouts."
                  : "Connect Stripe to receive payouts when learners purchase your programs."}
              </p>
            </div>
            {!stripeStatus?.onboardingComplete && (
              <button
                onClick={handleConnectStripe}
                disabled={connectingStripe}
                className="flex-shrink-0 px-4 py-2 bg-[#635BFF] text-white text-sm font-medium rounded-lg hover:bg-[#5851ea] transition disabled:opacity-50"
              >
                {connectingStripe
                  ? "Connecting..."
                  : stripeStatus?.connected
                  ? "Complete Setup"
                  : "Connect Stripe"}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Your Programs</h1>
          <button
            onClick={handleCreateProgram}
            disabled={creating}
            className="btn-neon px-5 py-2.5 rounded-xl text-surface-dark text-sm font-semibold disabled:opacity-50"
          >
            {creating ? "Creating..." : "+ New Program"}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {programs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
              <svg className="w-10 h-10 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Create your first program</h2>
            <p className="text-gray-400 mb-6 max-w-sm mx-auto">
              Transform your video content into a structured learning experience with AI-powered curriculum design.
            </p>
            <button
              onClick={handleCreateProgram}
              disabled={creating}
              className="btn-neon px-8 py-3 rounded-xl text-surface-dark font-semibold disabled:opacity-50"
            >
              {creating ? "Creating..." : "Get Started"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {programs.map((p) => {
              const timeAgo = getTimeAgo(new Date(p.updatedAt));
              const isGenerating = p.generationJob?.status === "PENDING" || p.generationJob?.status === "PROCESSING";
              const generationFailed = p.generationJob?.status === "FAILED";

              return (
                <Link
                  key={p.id}
                  href={`/programs/${p.id}/edit`}
                  className="block bg-surface-card border border-surface-border rounded-xl p-5 hover:border-neon-cyan/40 transition-all hover:-translate-y-0.5 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="font-semibold text-white truncate">{p.title}</h2>
                        {isGenerating ? (
                          <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium bg-neon-pink/10 text-neon-pink border border-neon-pink/30 flex items-center gap-1">
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Generating {p.generationJob?.progress}%
                          </span>
                        ) : generationFailed ? (
                          <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                            Generation Failed
                          </span>
                        ) : (
                          <span
                            className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                              p.published
                                ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30"
                                : "bg-gray-500/10 text-gray-400 border border-gray-500/30"
                            }`}
                          >
                            {p.published ? "Published" : "Draft"}
                          </span>
                        )}
                        {p.priceInCents > 0 && (
                          <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium bg-neon-pink/10 text-neon-pink border border-neon-pink/30">
                            {formatPrice(p.priceInCents)}
                          </span>
                        )}
                      </div>
                      {isGenerating && (
                        <div className="mb-2 h-1 bg-surface-dark rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-neon-cyan to-neon-pink transition-all"
                            style={{ width: `${p.generationJob?.progress || 0}%` }}
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {p.durationWeeks} weeks
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          {p._count.videos} video{p._count.videos !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          {p._count.weeks} week{p._count.weeks !== 1 ? "s" : ""} built
                        </span>
                        <span className="text-gray-600">·</span>
                        <span>{timeAgo}</span>
                      </div>
                    </div>
                    <span className="text-gray-600 group-hover:text-neon-cyan transition">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
