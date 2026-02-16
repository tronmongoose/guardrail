"use client";

import { useState, useEffect, useRef, useMemo } from "react";

export interface GenerationStep {
  key: string;
  label: string;
  subtitle: string;
  status: "pending" | "active" | "completed";
}

const STEP_DEFINITIONS = [
  { key: "analyzing", label: "Reading through your content", subtitle: "Carefully reviewing every piece of material you've shared" },
  { key: "topics", label: "Discovering your key themes", subtitle: "Finding the concepts that make your expertise unique" },
  { key: "progression", label: "Mapping the learning journey", subtitle: "Designing the path from beginner to mastery" },
  { key: "clustering", label: "Finding the natural structure", subtitle: "Organizing ideas into a sequence that clicks" },
  { key: "digesting", label: "Understanding your teaching style", subtitle: "Capturing the voice and approach that makes you, you" },
  { key: "weeks", label: "Designing your weekly rhythm", subtitle: "Building a pace that keeps learners engaged without overwhelm" },
  { key: "sessions", label: "Writing each lesson with care", subtitle: "Crafting sessions that transform knowledge into action" },
  { key: "actions", label: "Adding the finishing touches", subtitle: "Polishing every detail so your program shines" },
] as const;

interface UseGenerationStepsInput {
  stage: string | null;
  progress: number;
  status: string;
}

interface UseGenerationStepsResult {
  steps: GenerationStep[];
  activeStepIndex: number;
  displayProgress: number;
}

/**
 * Maps backend generation {stage, progress} to 8 rich frontend steps.
 *
 * Backend stages: embedding(5-25) → clustering(25-35) → analyzing(35-60) → generating(60-85) → validating → persisting
 *
 * The "generating" stage (60-85%) is a single long LLM call with no intermediate
 * updates. This hook simulates smooth sub-step progression client-side using a
 * logarithmic timer, so steps 6-8 animate naturally.
 *
 * Each step dwells for a minimum of 2.5s before transitioning, so the experience
 * feels deliberate rather than rushed.
 */
export function useGenerationSteps(input: UseGenerationStepsInput): UseGenerationStepsResult {
  const { stage, progress, status } = input;

  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const generatingStartRef = useRef<number | null>(null);

  // Track step completion timestamps for minimum dwell time
  const [displayedActiveIndex, setDisplayedActiveIndex] = useState(0);
  const lastStepChangeRef = useRef<number>(Date.now());

  // Simulate smooth progress during the "generating" stage
  useEffect(() => {
    if (stage !== "generating" || status !== "PROCESSING") {
      generatingStartRef.current = null;
      setSimulatedProgress(0);
      return;
    }

    if (!generatingStartRef.current) {
      generatingStartRef.current = Date.now();
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - (generatingStartRef.current || Date.now());
      // Ease from 60 toward 84 over ~45 seconds (slower for more theatrical feel)
      const t = Math.min(elapsed / 45000, 1);
      const simulated = 60 + 24 * (1 - Math.pow(1 - t, 2));
      setSimulatedProgress(Math.min(simulated, 84));
    }, 800);

    return () => clearInterval(interval);
  }, [stage, status]);

  const displayProgress = stage === "generating"
    ? Math.max(progress, simulatedProgress)
    : progress;

  const rawSteps = useMemo((): GenerationStep[] => {
    return STEP_DEFINITIONS.map((def, i) => ({
      ...def,
      status: computeStepStatus(i, stage, displayProgress),
    }));
  }, [stage, displayProgress]);

  const rawActiveIndex = rawSteps.findIndex((s) => s.status === "active");

  // Enforce minimum 2.5s dwell per step
  useEffect(() => {
    const targetIndex = Math.max(rawActiveIndex, 0);
    if (targetIndex > displayedActiveIndex) {
      const elapsed = Date.now() - lastStepChangeRef.current;
      const minDwell = 2500;
      if (elapsed >= minDwell) {
        setDisplayedActiveIndex(targetIndex);
        lastStepChangeRef.current = Date.now();
      } else {
        const timer = setTimeout(() => {
          setDisplayedActiveIndex(targetIndex);
          lastStepChangeRef.current = Date.now();
        }, minDwell - elapsed);
        return () => clearTimeout(timer);
      }
    }
  }, [rawActiveIndex, displayedActiveIndex]);

  // Apply dwell-adjusted statuses
  const steps = useMemo((): GenerationStep[] => {
    return rawSteps.map((step, i) => {
      if (i < displayedActiveIndex) return { ...step, status: "completed" as const };
      if (i === displayedActiveIndex && rawActiveIndex >= displayedActiveIndex) return { ...step, status: "active" as const };
      if (i > displayedActiveIndex) return { ...step, status: "pending" as const };
      return step;
    });
  }, [rawSteps, displayedActiveIndex, rawActiveIndex]);

  return {
    steps,
    activeStepIndex: displayedActiveIndex,
    displayProgress,
  };
}

function computeStepStatus(
  index: number,
  stage: string | null,
  displayProgress: number,
): "pending" | "active" | "completed" {
  // After completion, everything is done
  if (stage === "complete") return "completed";

  // Helper: stage ordering for "is past" checks
  const stageOrder = ["embedding", "clustering", "analyzing", "generating", "validating", "persisting"];
  const currentStageIdx = stageOrder.indexOf(stage ?? "");
  const isPast = (s: string) => currentStageIdx > stageOrder.indexOf(s);

  switch (index) {
    case 0: // Reading through your content — embedding < 20
      if (stage === "embedding" && displayProgress < 20) return "active";
      if ((stage === "embedding" && displayProgress >= 20) || isPast("embedding")) return "completed";
      return "pending";

    case 1: // Discovering your key themes — embedding >= 20 or clustering < 30
      if (stage === "embedding" && displayProgress >= 20) return "active";
      if (stage === "clustering" && displayProgress < 30) return "active";
      if ((stage === "clustering" && displayProgress >= 30) || isPast("clustering")) return "completed";
      return "pending";

    case 2: // Mapping the learning journey — clustering 30-33
      if (stage === "clustering" && displayProgress >= 30 && displayProgress < 33) return "active";
      if ((stage === "clustering" && displayProgress >= 33) || isPast("clustering")) return "completed";
      return "pending";

    case 3: // Finding the natural structure — clustering >= 33 or early analyzing
      if (stage === "clustering" && displayProgress >= 33) return "active";
      if (stage === "analyzing" && displayProgress < 40) return "active";
      if ((stage === "analyzing" && displayProgress >= 40) || isPast("analyzing")) return "completed";
      return "pending";

    case 4: // Understanding your teaching style — analyzing >= 40
      if (stage === "analyzing" && displayProgress >= 40) return "active";
      if (isPast("analyzing")) return "completed";
      return "pending";

    case 5: // Designing your weekly rhythm — generating < 72
      if (stage === "generating" && displayProgress < 72) return "active";
      if ((stage === "generating" && displayProgress >= 72) || isPast("generating")) return "completed";
      return "pending";

    case 6: // Writing each lesson with care — generating 72-80
      if (stage === "generating" && displayProgress >= 72 && displayProgress < 80) return "active";
      if ((stage === "generating" && displayProgress >= 80) || isPast("generating")) return "completed";
      return "pending";

    case 7: // Adding the finishing touches — generating >= 80 or validating/persisting
      if (stage === "generating" && displayProgress >= 80) return "active";
      if (stage === "validating" || stage === "persisting") return "active";
      return "pending";

    default:
      return "pending";
  }
}
