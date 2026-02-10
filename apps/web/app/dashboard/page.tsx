"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

interface Program {
  id: string;
  title: string;
  durationWeeks: number;
  published: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        return fetch("/api/programs");
      })
      .then((res) => {
        if (!res) return;
        if (!res.ok) throw new Error("Failed to load programs");
        return res.json();
      })
      .then((data) => {
        if (data) setPrograms(data);
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
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-card border border-surface-border flex items-center justify-center">
              <span className="text-2xl">📚</span>
            </div>
            <p className="text-lg text-gray-300">No programs yet</p>
            <p className="text-sm text-gray-500 mt-1">Create your first guided program</p>
          </div>
        ) : (
          <div className="space-y-3">
            {programs.map((p) => (
              <Link
                key={p.id}
                href={`/programs/${p.id}/edit`}
                className="block bg-surface-card border border-surface-border rounded-xl p-5 hover:border-neon-cyan/40 transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-white">{p.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {p.durationWeeks} weeks ·
                      <span className={p.published ? "text-neon-cyan ml-1" : "text-gray-400 ml-1"}>
                        {p.published ? "Published" : "Draft"}
                      </span>
                    </p>
                  </div>
                  <span className="text-neon-cyan">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
