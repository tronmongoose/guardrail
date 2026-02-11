"use client";

import { useState, useEffect, useCallback } from "react";
import { WizardProgress } from "./WizardProgress";
import { StepBasics } from "./steps/StepBasics";
import { StepDuration } from "./steps/StepDuration";
import { StepContent } from "./steps/StepContent";
import { StepInfluencers } from "./steps/StepInfluencers";
import { StepReview } from "./steps/StepReview";

export interface WizardState {
  basics: {
    title: string;
    description: string;
    outcomeStatement: string;
  };
  duration: {
    weeks: number;
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
      extractedText: string;
      metadata: { pageCount?: number; wordCount: number };
    }>;
  };
  influencers: {
    selectedIds: string[];
  };
}

interface ProgramWizardProps {
  programId: string;
  initialState?: Partial<WizardState>;
  onComplete: () => void;
  onCancel: () => void;
}

const STEPS = [
  { label: "Basics", description: "Title & outcome" },
  { label: "Duration", description: "Program length" },
  { label: "Content", description: "Videos & files" },
  { label: "Style", description: "Influencer style" },
  { label: "Review", description: "Generate" },
];

const DEFAULT_STATE: WizardState = {
  basics: {
    title: "",
    description: "",
    outcomeStatement: "",
  },
  duration: {
    weeks: 8,
  },
  content: {
    videos: [],
    artifacts: [],
  },
  influencers: {
    selectedIds: [],
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

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(getStorageKey(programId), JSON.stringify(state));
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
        return state.basics.title.trim().length > 0;
      case 1: // Duration
        return state.duration.weeks >= 1 && state.duration.weeks <= 52;
      case 2: // Content
        return state.content.videos.length > 0 || state.content.artifacts.length > 0;
      case 3: // Influencers (optional)
        return true;
      case 4: // Review
        return true;
      default:
        return false;
    }
  }, [currentStep, state]);

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
      // Save program details
      await fetch(`/api/programs/${programId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.basics.title,
          description: state.basics.description,
          outcomeStatement: state.basics.outcomeStatement,
          durationWeeks: state.duration.weeks,
          styleInfluencers: state.influencers.selectedIds,
        }),
      });

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

      // Run auto-structure
      await fetch(`/api/programs/${programId}/auto-structure`, {
        method: "POST",
      });

      // Generate program
      const genRes = await fetch(`/api/programs/${programId}/generate`, {
        method: "POST",
      });

      if (!genRes.ok) {
        const error = await genRes.json();
        throw new Error(error.detail || error.error || "Generation failed");
      }

      // Clear wizard state from localStorage
      localStorage.removeItem(getStorageKey(programId));

      onComplete();
    } catch (error) {
      console.error("Generation error:", error);
      alert(`Generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
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
          <StepDuration
            value={state.duration.weeks}
            onChange={(weeks) => updateState("duration", { weeks })}
          />
        );
      case 2:
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
      case 3:
        return (
          <StepInfluencers
            selectedIds={state.influencers.selectedIds}
            onChange={(selectedIds) =>
              updateState("influencers", { selectedIds })
            }
          />
        );
      case 4:
        return (
          <StepReview
            state={state}
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

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`
              px-6 py-2.5 rounded-lg border transition
              ${
                currentStep === 0
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
