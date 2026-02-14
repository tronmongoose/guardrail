"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { useGeneration } from "@/components/generation";

/**
 * First Program Creation Flow
 *
 * This is the entry point for new users. It combines:
 * 1. Quick profile setup (just name, pulled from Clerk)
 * 2. Program basics (title, audience, transformation)
 * 3. Content (videos)
 * 4. Duration & pacing
 * 5. Vibe/style
 * 6. Generate
 *
 * Replaces the old onboarding → dashboard → new program flow.
 */

interface Video {
  id: string;
  videoId: string;
  title: string | null;
  thumbnailUrl: string | null;
}

type Step = "welcome" | "program" | "videos" | "structure" | "generate";

const STEPS: { key: Step; label: string }[] = [
  { key: "welcome", label: "You" },
  { key: "program", label: "Program" },
  { key: "videos", label: "Content" },
  { key: "structure", label: "Structure" },
  { key: "generate", label: "Generate" },
];

export default function NewProgramPage() {
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const { startGeneration } = useGeneration();

  const [step, setStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [programTitle, setProgramTitle] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [targetTransformation, setTargetTransformation] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [addingVideo, setAddingVideo] = useState(false);
  const [videoAddStage, setVideoAddStage] = useState<"idle" | "fetching" | "transcript" | "ready">("idle");
  const [durationWeeks, setDurationWeeks] = useState(8);
  const [pacingMode, setPacingMode] = useState<"unlock_on_complete" | "drip_by_week">("unlock_on_complete");
  const [vibePrompt, setVibePrompt] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    if (!clerkUser) {
      router.push("/");
      return;
    }

    // Check if user already has programs - if so, redirect to dashboard
    Promise.all([
      fetch("/api/user/onboarding").then(r => r.json()),
      fetch("/api/programs").then(r => r.json()),
    ]).then(([userData, programs]) => {
      // Pre-fill name from Clerk or existing user data
      setName(userData.name || clerkUser.fullName || "");

      // If they have programs, send to dashboard
      if (Array.isArray(programs) && programs.length > 0) {
        router.push("/dashboard");
        return;
      }

      setLoading(false);
    }).catch(() => {
      setName(clerkUser.fullName || "");
      setLoading(false);
    });
  }, [isLoaded, clerkUser, router]);

  const currentStepIndex = STEPS.findIndex(s => s.key === step);

  const canProceed = useCallback((): boolean => {
    switch (step) {
      case "welcome":
        return name.trim().length > 0;
      case "program":
        return programTitle.trim().length > 0 && targetTransformation.trim().length > 0;
      case "videos":
        return videos.length > 0;
      case "structure":
        return true;
      case "generate":
        return true;
      default:
        return false;
    }
  }, [step, name, programTitle, targetTransformation, videos.length]);

  const handleNext = async () => {
    setError(null);

    if (step === "welcome") {
      // Save user profile and create program
      setSaving(true);
      try {
        // Update user profile
        await fetch("/api/user/onboarding", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        });

        // Create program
        const res = await fetch("/api/programs/create", { method: "POST" });
        if (!res.ok) throw new Error("Failed to create program");
        const program = await res.json();
        setProgramId(program.id);

        setStep("program");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (step === "program") {
      setStep("videos");
      return;
    }

    if (step === "videos") {
      setStep("structure");
      return;
    }

    if (step === "structure") {
      setStep("generate");
      return;
    }
  };

  const handleBack = () => {
    setError(null);
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(STEPS[prevIndex].key);
    }
  };

  const handleAddVideo = async () => {
    if (!videoUrl.trim() || !programId) return;

    setAddingVideo(true);
    setVideoAddStage("fetching");
    setError(null);

    // Simulate transcript extraction stage after a short delay
    const transcriptTimer = setTimeout(() => setVideoAddStage("transcript"), 1200);

    try {
      const res = await fetch(`/api/programs/${programId}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add video");
      }

      const video = await res.json();

      clearTimeout(transcriptTimer);
      setVideoAddStage("ready");

      // Hold "ready" state briefly for visual satisfaction
      await new Promise(resolve => setTimeout(resolve, 600));

      setVideos(prev => [...prev, video]);
      setVideoUrl("");
    } catch (err) {
      clearTimeout(transcriptTimer);
      setError(err instanceof Error ? err.message : "Failed to add video");
    } finally {
      setAddingVideo(false);
      setVideoAddStage("idle");
    }
  };

  const handleRemoveVideo = async (videoId: string) => {
    if (!programId) return;

    try {
      await fetch(`/api/programs/${programId}/videos?videoId=${videoId}`, {
        method: "DELETE",
      });
      setVideos(prev => prev.filter(v => v.id !== videoId));
    } catch {
      // Silently fail, video still in list
    }
  };

  const handleGenerate = async () => {
    if (!programId) return;

    setSaving(true);
    setError(null);

    try {
      // Save program details
      const patchRes = await fetch(`/api/programs/${programId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: programTitle,
          targetAudience,
          targetTransformation,
          durationWeeks,
          pacingMode,
          vibePrompt,
        }),
      });

      if (!patchRes.ok) throw new Error("Failed to save program");

      // Mark onboarding complete
      await fetch("/api/user/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          onboardingComplete: true,
        }),
      });

      // Start async generation
      const genRes = await fetch(`/api/programs/${programId}/generate-async`, {
        method: "POST",
      });

      if (!genRes.ok) {
        const error = await genRes.json();
        throw new Error(error.detail || error.error || "Failed to start generation");
      }

      // Track generation
      startGeneration(programId);

      // Go directly to edit page so user sees their program being built
      router.push(`/programs/${programId}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
    <div className="min-h-screen gradient-bg-radial grid-bg">
      {/* Header */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-border/50 backdrop-blur-sm">
        <Link href="/" className="text-xl font-bold tracking-tight neon-text-cyan text-neon-cyan">
          GuideRail
        </Link>
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`hidden sm:flex items-center gap-2 ${i > 0 ? "ml-2" : ""}`}
            >
              {i > 0 && <div className="w-8 h-px bg-surface-border" />}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  s.key === step
                    ? "bg-neon-cyan text-surface-dark"
                    : i < currentStepIndex
                    ? "bg-neon-cyan/30 text-neon-cyan"
                    : "bg-surface-border text-gray-500"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-xs ${
                  s.key === step ? "text-white" : "text-gray-500"
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </nav>

      <main className="max-w-xl mx-auto px-4 py-12">
        {/* Step: Welcome */}
        {step === "welcome" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-2">
                Let's build your first program
              </h1>
              <p className="text-gray-400">
                Transform your videos into a structured learning experience
              </p>
            </div>

            <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-400">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="How should learners know you?"
                  className="w-full mt-1 px-3 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
                  autoFocus
                />
              </div>
            </div>
          </div>
        )}

        {/* Step: Program */}
        {step === "program" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-2">
                Define your program
              </h1>
              <p className="text-gray-400">
                What will learners achieve?
              </p>
            </div>

            <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-400">Program title</label>
                <input
                  type="text"
                  value={programTitle}
                  onChange={(e) => setProgramTitle(e.target.value)}
                  placeholder="e.g., 'Master Video Editing in 8 Weeks'"
                  className="w-full mt-1 px-3 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">Who is this for?</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g., 'Beginner content creators'"
                  className="w-full mt-1 px-3 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">The transformation</label>
                <textarea
                  value={targetTransformation}
                  onChange={(e) => setTargetTransformation(e.target.value)}
                  placeholder="What will they be able to do after completing your program?"
                  rows={3}
                  className="w-full mt-1 px-3 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Be specific: "Edit professional YouTube videos in under 2 hours"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step: Videos */}
        {step === "videos" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-2">
                Add your content
              </h1>
              <p className="text-gray-400">
                Paste YouTube URLs - we'll structure them into a curriculum
              </p>
            </div>

            <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="flex-1 px-3 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
                  onKeyDown={(e) => e.key === "Enter" && handleAddVideo()}
                />
                <button
                  onClick={handleAddVideo}
                  disabled={addingVideo || !videoUrl.trim()}
                  className="px-4 py-2.5 bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan rounded-lg text-sm font-medium hover:bg-neon-cyan/20 transition disabled:opacity-50"
                >
                  {addingVideo ? <Spinner size="sm" /> : "Add"}
                </button>
              </div>

              {addingVideo && (
                <div className="flex items-center gap-2 text-xs" aria-live="polite">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    videoAddStage === "ready" ? "bg-neon-cyan" : "bg-neon-pink animate-pulse"
                  }`} />
                  {videoAddStage === "fetching" && <span className="text-gray-400">Fetching video info...</span>}
                  {videoAddStage === "transcript" && <span className="text-gray-400">Extracting transcript...</span>}
                  {videoAddStage === "ready" && <span className="text-neon-cyan">Content ready</span>}
                </div>
              )}

              {videos.length > 0 ? (
                <div className="space-y-2">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      className="flex items-center gap-3 p-3 bg-surface-dark rounded-lg border border-surface-border"
                    >
                      {video.thumbnailUrl && (
                        <img
                          src={video.thumbnailUrl}
                          alt=""
                          className="w-16 h-9 object-cover rounded"
                        />
                      )}
                      <span className="flex-1 text-sm text-white truncate">
                        {video.title || video.videoId}
                      </span>
                      <button
                        onClick={() => handleRemoveVideo(video.id)}
                        className="text-gray-500 hover:text-red-400 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Add at least one video to continue</p>
                </div>
              )}

              <p className="text-xs text-gray-500">
                {videos.length} video{videos.length !== 1 ? "s" : ""} added
              </p>
            </div>
          </div>
        )}

        {/* Step: Structure */}
        {step === "structure" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-2">
                Program structure
              </h1>
              <p className="text-gray-400">
                How should learners progress?
              </p>
            </div>

            <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-6">
              {/* Duration */}
              <div>
                <label className="text-sm text-gray-400 mb-3 block">Duration</label>
                <div className="grid grid-cols-3 gap-3">
                  {[6, 8, 12].map((weeks) => (
                    <button
                      key={weeks}
                      onClick={() => setDurationWeeks(weeks)}
                      className={`p-4 rounded-lg border text-center transition ${
                        durationWeeks === weeks
                          ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan"
                          : "border-surface-border bg-surface-dark text-gray-300 hover:border-gray-500"
                      }`}
                    >
                      <span className="text-2xl font-bold">{weeks}</span>
                      <span className="text-sm block mt-1">weeks</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pacing */}
              <div>
                <label className="text-sm text-gray-400 mb-3 block">Progression style</label>
                <div className="space-y-2">
                  <button
                    onClick={() => setPacingMode("unlock_on_complete")}
                    className={`w-full p-4 rounded-lg border text-left transition ${
                      pacingMode === "unlock_on_complete"
                        ? "border-neon-cyan bg-neon-cyan/10"
                        : "border-surface-border bg-surface-dark hover:border-gray-500"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${pacingMode === "unlock_on_complete" ? "text-neon-cyan" : "text-white"}`}>
                        Self-paced
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-neon-pink/10 text-neon-pink border border-neon-pink/30">
                        Recommended
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      Next lesson unlocks when learner completes the current one
                    </p>
                  </button>
                  <button
                    onClick={() => setPacingMode("drip_by_week")}
                    className={`w-full p-4 rounded-lg border text-left transition ${
                      pacingMode === "drip_by_week"
                        ? "border-neon-cyan bg-neon-cyan/10"
                        : "border-surface-border bg-surface-dark hover:border-gray-500"
                    }`}
                  >
                    <span className={`font-medium ${pacingMode === "drip_by_week" ? "text-neon-cyan" : "text-white"}`}>
                      Weekly release
                    </span>
                    <p className="text-sm text-gray-400 mt-1">
                      New content unlocks each week on a schedule
                    </p>
                  </button>
                </div>
              </div>

              {/* Vibe */}
              <div>
                <label className="text-sm text-gray-400">Style guidance (optional)</label>
                <textarea
                  value={vibePrompt}
                  onChange={(e) => setVibePrompt(e.target.value)}
                  placeholder="How should the AI write? e.g., 'Casual and encouraging' or 'Professional and structured'"
                  rows={2}
                  className="w-full mt-1 px-3 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step: Generate */}
        {step === "generate" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-2">
                Ready to generate
              </h1>
              <p className="text-gray-400">
                AI will structure your videos into a week-by-week curriculum
              </p>
            </div>

            <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Program</span>
                  <p className="text-white font-medium truncate">{programTitle}</p>
                </div>
                <div>
                  <span className="text-gray-500">Duration</span>
                  <p className="text-white font-medium">{durationWeeks} weeks</p>
                </div>
                <div>
                  <span className="text-gray-500">Videos</span>
                  <p className="text-white font-medium">{videos.length} video{videos.length !== 1 ? "s" : ""}</p>
                </div>
                <div>
                  <span className="text-gray-500">Pacing</span>
                  <p className="text-white font-medium">
                    {pacingMode === "unlock_on_complete" ? "Self-paced" : "Weekly"}
                  </p>
                </div>
              </div>

              <div className="border-t border-surface-border pt-4">
                <p className="text-xs text-gray-500">
                  Generation takes a few seconds. You can edit everything after.
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={saving}
              className="w-full btn-neon py-4 rounded-xl text-surface-dark font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Spinner size="sm" />
                  Creating your program...
                </>
              ) : (
                "Generate Program"
              )}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Navigation */}
        {step !== "generate" && (
          <div className="flex justify-between mt-8">
            {step !== "welcome" ? (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed() || saving}
              className="btn-neon px-6 py-2.5 rounded-lg text-surface-dark text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Spinner size="sm" />
                  Saving...
                </>
              ) : (
                "Continue →"
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
