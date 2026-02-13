"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Spinner } from "@/components/ui/spinner";

// Motivational stats for V1 (social proof)
const PLATFORM_STATS = {
  totalLearners: "2,847",
  totalRevenue: "$127,450",
  avgCompletion: "78%",
};

const NICHE_OPTIONS = [
  "Fitness & Health",
  "Business & Entrepreneurship",
  "Personal Development",
  "Creative Arts",
  "Technology & Coding",
  "Marketing & Sales",
  "Finance & Investing",
  "Language Learning",
  "Music & Audio",
  "Other",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [niche, setNiche] = useState("");
  const [customNiche, setCustomNiche] = useState("");
  const [outcomeTarget, setOutcomeTarget] = useState("");
  const [enhancing, setEnhancing] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!clerkUser) {
      router.push("/");
      return;
    }

    // Load existing onboarding data
    fetch("/api/user/onboarding")
      .then((res) => res.json())
      .then((data) => {
        if (data.onboardingComplete) {
          router.push("/dashboard");
          return;
        }
        setName(data.name || clerkUser.fullName || "");
        setBio(data.bio || "");
        setNiche(data.niche || "");
        setOutcomeTarget(data.outcomeTarget || "");
      })
      .catch(() => {
        setName(clerkUser.fullName || "");
      })
      .finally(() => setLoading(false));
  }, [isLoaded, clerkUser, router]);

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (step === 2 && !niche && !customNiche.trim()) {
      setError("Please select or enter your niche");
      return;
    }
    setError(null);
    setStep(step + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleEnhance = async () => {
    if (!outcomeTarget.trim() || outcomeTarget.length < 10) {
      setError("Please write at least 10 characters before using AI Assist");
      return;
    }

    setEnhancing(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: outcomeTarget, type: "transformation" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to enhance");
      }

      const { enhanced } = await res.json();
      setOutcomeTarget(enhanced);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enhance text");
    } finally {
      setEnhancing(false);
    }
  };

  const handleComplete = async () => {
    if (!outcomeTarget.trim()) {
      setError("Please describe the transformation you help learners achieve");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/user/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim() || null,
          niche: niche === "Other" ? customNiche.trim() : niche,
          outcomeTarget: outcomeTarget.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save");
      }

      router.push("/dashboard");
    } catch {
      setError("Failed to complete onboarding. Please try again.");
      setSaving(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen gradient-bg-radial grid-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg-radial grid-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-colors ${
                s === step
                  ? "bg-neon-cyan"
                  : s < step
                  ? "bg-neon-cyan/50"
                  : "bg-surface-border"
              }`}
            />
          ))}
        </div>

        <div className="bg-surface-card border border-surface-border rounded-xl p-6">
          {/* Step 1: About You */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Welcome to GuideRail</h2>
                <p className="text-sm text-gray-400">Let&apos;s set up your creator profile</p>
              </div>

              <div>
                <label className="text-sm text-gray-400">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full mt-1 px-3 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">Short bio (optional)</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell learners a bit about yourself..."
                  rows={3}
                  maxLength={500}
                  className="w-full mt-1 px-3 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">{bio.length}/500</p>
              </div>
            </div>
          )}

          {/* Step 2: Your Niche */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Your Niche</h2>
                <p className="text-sm text-gray-400">What area do you teach?</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {NICHE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setNiche(option);
                      if (option !== "Other") setCustomNiche("");
                    }}
                    className={`px-3 py-2 rounded-lg text-sm text-left transition ${
                      niche === option
                        ? "bg-neon-cyan/20 border-neon-cyan text-neon-cyan border"
                        : "bg-surface-dark border border-surface-border text-gray-300 hover:border-gray-500"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {niche === "Other" && (
                <div>
                  <label className="text-sm text-gray-400">Your niche</label>
                  <input
                    type="text"
                    value={customNiche}
                    onChange={(e) => setCustomNiche(e.target.value)}
                    placeholder="e.g., Pottery, Chess, Gardening..."
                    className="w-full mt-1 px-3 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Transformation */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">The Transformation</h2>
                <p className="text-sm text-gray-400">What outcome do you help learners achieve?</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-gray-400">Outcome statement</label>
                  <button
                    type="button"
                    onClick={handleEnhance}
                    disabled={enhancing || outcomeTarget.length < 10}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-neon-pink/10 text-neon-pink border border-neon-pink/30 hover:bg-neon-pink/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {enhancing ? (
                      <>
                        <Spinner size="sm" color="pink" />
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        AI Assist
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={outcomeTarget}
                  onChange={(e) => setOutcomeTarget(e.target.value)}
                  placeholder="I help people go from [current state] to [desired outcome]..."
                  rows={4}
                  maxLength={500}
                  className="w-full px-3 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">{outcomeTarget.length}/500</p>
              </div>

              <div className="bg-surface-dark border border-surface-border rounded-lg p-3">
                <p className="text-xs text-gray-400">
                  <span className="text-neon-cyan">Tip:</span> Be specific! Instead of &quot;I help people get fit,&quot;
                  try &quot;I help busy professionals build a sustainable workout habit in just 20 minutes a day.&quot;
                </p>
              </div>

              {/* Motivational stats card */}
              <div className="bg-gradient-to-r from-neon-cyan/5 via-neon-pink/5 to-neon-yellow/5 border border-surface-border rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-3 text-center">Creators on GuideRail are seeing results</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-neon-cyan">{PLATFORM_STATS.totalLearners}</p>
                    <p className="text-xs text-gray-500">Total Learners</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-neon-pink">{PLATFORM_STATS.totalRevenue}</p>
                    <p className="text-xs text-gray-500">Revenue Earned</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-neon-yellow">{PLATFORM_STATS.avgCompletion}</p>
                    <p className="text-xs text-gray-500">Completion Rate</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6">
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                onClick={handleNext}
                className="btn-neon px-5 py-2.5 rounded-lg text-surface-dark text-sm font-semibold"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={saving}
                className="btn-neon px-5 py-2.5 rounded-lg text-surface-dark text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Spinner size="sm" color="pink" />
                    Saving...
                  </>
                ) : (
                  "Complete Setup"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
