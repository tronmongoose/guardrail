"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { WizardProgress } from "./WizardProgress";
import { StepBasics } from "./steps/StepBasics";
import { StepDuration } from "./steps/StepDuration";
import { StepContent } from "./steps/StepContent";
import { StepReview } from "./steps/StepReview";
import { useGeneration } from "@/components/generation";

export interface WizardState {
  basics: {
    title: string;
    description: string;
    outcomeStatement: string;
    targetAudience: string;
    targetTransformation: string;
  };
  duration: {
    weeks: number;
    pacingMode: "drip_by_week" | "unlock_on_complete";
  };
  content: {
    videos: Array<{
      id: string;
      videoId: string;
      title: string | null;
      thumbnailUrl: string | null;
    }>;
    artifacts: Array<{
      id?: string;
      originalFilename: string;
      fileType: string;
      extractedText?: string;
      metadata: { pageCount?: number; wordCount: number };
    }>;
  };
  vibe: {
    vibePrompt: string;
  };
  theme: {
    skinId: string;
    transitionMode: "NONE" | "SIMPLE" | "BRANDED";
  };
}

interface ProgramWizardProps {
  programId: string;
  initialState?: Partial<WizardState>;
  onComplete: () => void;
  onCancel: () => void;
}

const STEPS = [
  { label: "Basics", description: "Who & what" },
  { label: "Content", description: "Videos & files" },
  { label: "Lessons flow", description: "Program length" },
  { label: "Theme", description: "Your look & vibe" },
];

const DEFAULT_STATE: WizardState = {
  basics: {
    title: "",
    description: "",
    outcomeStatement: "",
    targetAudience: "",
    targetTransformation: "",
  },
  duration: {
    weeks: 8,
    pacingMode: "unlock_on_complete", // Default to staged progression for better completion rates
  },
  content: {
    videos: [],
    artifacts: [],
  },
  vibe: {
    vibePrompt: "",
  },
  theme: {
    skinId: "classic-minimal",
    transitionMode: "NONE" as const,
  },
};

function getStorageKey(programId: string) {
  return `wizard-state-${programId}`;
}

export function ProgramWizard({
  programId,
  initialState,
  onComplete,
  onCancel,
}: ProgramWizardProps) {
  const router = useRouter();
  const { user } = useUser();
  const { startGeneration } = useGeneration();
  const [currentStep, setCurrentStep] = useState(0);
  const [state, setState] = useState<WizardState>(() => {
    // Try to load from localStorage first
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(getStorageKey(programId));
      if (saved) {
        try {
          return { ...DEFAULT_STATE, ...JSON.parse(saved) };
        } catch {
          // Ignore parse errors
        }
      }
    }
    return { ...DEFAULT_STATE, ...initialState };
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationQueued, setGenerationQueued] = useState(false);

  // Track analysis status for uploaded videos — used for the footer badge
  const [analysisStatus, setAnalysisStatus] = useState<Record<string, boolean>>({});
  const analysisPollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for video analysis completion across all wizard steps
  useEffect(() => {
    const videoCount = state.content.videos.length;
    if (videoCount === 0) return;

    const poll = () =>
      fetch(`/api/programs/${programId}/videos`)
        .then((r) => r.ok ? r.json() : [])
        .then((data: Array<{ id: string; hasAnalysis?: boolean }>) => {
          const next: Record<string, boolean> = {};
          for (const v of data) next[v.id] = !!v.hasAnalysis;
          setAnalysisStatus(next);
          return next;
        })
        .catch(() => ({} as Record<string, boolean>));

    poll().then((ready) => {
      const ids = state.content.videos.map((v) => v.id);
      if (ids.every((id) => ready[id])) return; // All done, no need to poll
      if (analysisPollerRef.current) clearInterval(analysisPollerRef.current);
      analysisPollerRef.current = setInterval(() => {
        poll().then((latest) => {
          if (ids.every((id) => latest[id]) && analysisPollerRef.current) {
            clearInterval(analysisPollerRef.current);
            analysisPollerRef.current = null;
          }
        });
      }, 5_000);
    });

    return () => {
      if (analysisPollerRef.current) {
        clearInterval(analysisPollerRef.current);
        analysisPollerRef.current = null;
      }
    };
  }, [programId, state.content.videos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist state to localStorage (exclude large blobs to avoid quota issues)
  useEffect(() => {
    const serializable = {
      ...state,
      content: {
        ...state.content,
        // Strip extractedText (large doc content) and base64 thumbnails (client-extracted video frames)
        artifacts: state.content.artifacts.map(({ extractedText, ...rest }) => rest),
        videos: state.content.videos.map(({ thumbnailUrl, ...rest }) =>
          thumbnailUrl?.startsWith("data:") ? rest : { ...rest, thumbnailUrl }
        ),
      },
    };
    localStorage.setItem(getStorageKey(programId), JSON.stringify(serializable));
  }, [programId, state]);

  const updateState = useCallback(
    <K extends keyof WizardState>(key: K, value: Partial<WizardState[K]>) => {
      setState((prev) => ({
        ...prev,
        [key]: { ...prev[key], ...value },
      }));
    },
    []
  );

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 0: // Basics
        return (
          state.basics.title.trim().length > 0 &&
          state.basics.targetTransformation.trim().length > 0
        );
      case 1: // Content
        return state.content.videos.length > 0 || state.content.artifacts.length > 0;
      case 2: // Duration
        return state.duration.weeks >= 2;
      case 3: // Theme (optional)
        return true;
      default:
        return false;
    }
  }, [currentStep, state]);

  // Auto-select middle preset when entering the duration step if current value isn't one of the presets
  useEffect(() => {
    if (currentStep !== 2) return;
    const videoCount = state.content.videos.length;
    let presets: number[];
    if (videoCount === 0) {
      presets = [4, 8, 12];
    } else {
      const short = Math.max(2, Math.ceil(videoCount / 2));
      const med = Math.max(short + 2, videoCount);
      const long = Math.min(26, med + Math.ceil(med / 2));
      presets = [short, med, long];
    }
    if (!presets.includes(state.duration.weeks)) {
      setState((prev) => ({ ...prev, duration: { ...prev.duration, weeks: presets[1] } }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1 && canProceed()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Resolve skin fields: "auto-generate" → sentinel skinId; "custom:id" → customSkinId
      const rawSkinId = state.theme.skinId;
      const skinPatchFields: Record<string, string | null> =
        rawSkinId === "auto-generate"
          ? { skinId: "auto-generate", customSkinId: null }
          : rawSkinId.startsWith("custom:")
          ? { customSkinId: rawSkinId.replace("custom:", ""), skinId: "classic-minimal" }
          : { skinId: rawSkinId, customSkinId: null };

      // Save program details
      const patchRes = await fetch(`/api/programs/${programId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.basics.title,
          description: state.basics.description,
          outcomeStatement: state.basics.outcomeStatement,
          targetAudience: state.basics.targetAudience,
          targetTransformation: state.basics.targetTransformation,
          durationWeeks: state.duration.weeks,
          pacingMode: state.duration.pacingMode,
          vibePrompt: state.vibe.vibePrompt,
          ...skinPatchFields,
          transitionMode: state.theme.transitionMode,
        }),
      });

      if (!patchRes.ok) {
        throw new Error("Failed to save program details");
      }

      // Save artifacts
      for (const artifact of state.content.artifacts) {
        if (!artifact.id) {
          await fetch(`/api/programs/${programId}/artifacts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(artifact),
          });
        }
      }

      // Start async generation (returns immediately)
      const genRes = await fetch(`/api/programs/${programId}/generate-async`, {
        method: "POST",
      });

      if (!genRes.ok) {
        const error = await genRes.json();
        throw new Error(error.detail || error.error || "Failed to start generation");
      }

      // Clear wizard state from localStorage
      localStorage.removeItem(getStorageKey(programId));

      // Register with notification system (toast still fires if they stay or navigate back)
      startGeneration(programId);

      // Show "we'll email you" confirmation, then redirect to dashboard after 2s
      setGenerationQueued(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2500);
    } catch (error) {
      console.error("Generation error:", error);
      alert(`Generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsGenerating(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <StepBasics
            value={state.basics}
            onChange={(v) => updateState("basics", v)}
          />
        );
      case 1:
        return (
          <StepContent
            programId={programId}
            videos={state.content.videos}
            artifacts={state.content.artifacts}
            onVideosChange={(videos) =>
              updateState("content", { videos })
            }
            onArtifactsChange={(artifacts) =>
              updateState("content", { artifacts })
            }
          />
        );
      case 2:
        return (
          <StepDuration
            weeks={state.duration.weeks}
            pacingMode={state.duration.pacingMode}
            videoCount={state.content.videos.length}
            onWeeksChange={(weeks) => updateState("duration", { weeks })}
            onPacingModeChange={(pacingMode) => updateState("duration", { pacingMode })}
          />
        );
      case 3:
        return (
          <StepReview
            state={state}
            programId={programId}
            skinId={state.theme.skinId}
            onSkinChange={(skinId) => updateState("theme", { skinId })}
            onGenerateSkin={async () => {
              const res = await fetch(`/api/programs/${programId}/skin`, { method: "POST" });
              if (!res.ok) return null;
              const data = await res.json();
              if (!data.customSkinId) return null;
              const newId = `custom:${data.customSkinId}`;
              updateState("theme", { skinId: newId });
              return newId;
            }}
            transitionMode={state.theme.transitionMode}
            onTransitionModeChange={(transitionMode) => updateState("theme", { transitionMode })}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-surface-dark">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Create Program</h1>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Progress */}
        <WizardProgress
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
        />

        {/* Step content */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-6 mb-6">
          {renderStep()}
        </div>

        {/* Analysis progress badge — visible on steps 1-3 while any video lacks analysis */}
        {currentStep >= 1 && state.content.videos.length > 0 && (() => {
          const ids = state.content.videos.map((v) => v.id);
          const doneCount = ids.filter((id) => analysisStatus[id]).length;
          const allDone = doneCount === ids.length;
          if (allDone) return null; // Hide once all done
          return (
            <div className="flex items-center gap-2 mb-4 px-1">
              <svg className="w-3.5 h-3.5 text-amber-400 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-xs text-amber-400">
                AI analyzing your videos… {doneCount} of {ids.length} done.{" "}
                <span className="text-gray-500">Waiting a moment before generating gives faster results.</span>
              </span>
            </div>
          );
        })()}

        {/* "Generation queued" confirmation — shown briefly before redirect */}
        {generationQueued && (
          <div className="mb-4 p-4 bg-neon-cyan/10 border border-neon-cyan/30 rounded-xl">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-neon-cyan flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-white">Generating in the background!</p>
                <p className="text-xs text-gray-400 mt-1">
                  {user?.primaryEmailAddress?.emailAddress
                    ? <>We&apos;ll email <span className="text-gray-300">{user.primaryEmailAddress.emailAddress}</span> when your program is ready.</>
                    : "We'll email you when your program is ready."}
                </p>
                <p className="text-xs text-gray-500 mt-2">Redirecting to your dashboard…</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0 || generationQueued}
            className={`
              px-6 py-2.5 rounded-lg border transition
              ${
                currentStep === 0 || generationQueued
                  ? "border-surface-border text-gray-600 cursor-not-allowed"
                  : "border-surface-border text-gray-300 hover:border-neon-cyan hover:text-neon-cyan"
              }
            `}
          >
            Back
          </button>

          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`
                px-6 py-2.5 rounded-lg font-medium transition
                ${
                  canProceed()
                    ? "btn-neon"
                    : "bg-surface-card border border-surface-border text-gray-500 cursor-not-allowed"
                }
              `}
            >
              Next
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
