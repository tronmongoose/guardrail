"use client";

import { useState, useEffect, useRef, useMemo } from "react";

export interface GenerationStep {
  key: string;
  label: string;
  status: "pending" | "active" | "completed";
}

const STEP_DEFINITIONS = [
  { key: "analyzing", label: "Analyzing content" },
  { key: "topics", label: "Extracting topics" },
  { key: "progression", label: "Detecting skill progression" },
  { key: "clustering", label: "Clustering themes" },
  { key: "digesting", label: "Analyzing content" },
  { key: "weeks", label: "Building weeks" },
  { key: "sessions", label: "Crafting sessions" },
  { key: "actions", label: "Designing actions" },
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
 */
export function useGenerationSteps(input: UseGenerationStepsInput): UseGenerationStepsResult {
  const { stage, progress, status } = input;

  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const generatingStartRef = useRef<number | null>(null);

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
      // Ease from 60 toward 84 over ~30 seconds (logarithmic curve slows near end)
      const t = Math.min(elapsed / 30000, 1);
      const simulated = 60 + 24 * (1 - Math.pow(1 - t, 2));
      setSimulatedProgress(Math.min(simulated, 84));
    }, 800);

    return () => clearInterval(interval);
  }, [stage, status]);

  const displayProgress = stage === "generating"
    ? Math.max(progress, simulatedProgress)
    : progress;

  const steps = useMemo((): GenerationStep[] => {
    return STEP_DEFINITIONS.map((def, i) => ({
      ...def,
      status: computeStepStatus(i, stage, displayProgress),
    }));
  }, [stage, displayProgress]);

  const activeStepIndex = steps.findIndex((s) => s.status === "active");

  return {
    steps,
    activeStepIndex: Math.max(activeStepIndex, 0),
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
    case 0: // Analyzing content — embedding < 20
      if (stage === "embedding" && displayProgress < 20) return "active";
      if ((stage === "embedding" && displayProgress >= 20) || isPast("embedding")) return "completed";
      return "pending";

    case 1: // Extracting topics — embedding >= 20 or clustering < 30
      if (stage === "embedding" && displayProgress >= 20) return "active";
      if (stage === "clustering" && displayProgress < 30) return "active";
      if ((stage === "clustering" && displayProgress >= 30) || isPast("clustering")) return "completed";
      return "pending";

    case 2: // Detecting skill progression — clustering 30-33
      if (stage === "clustering" && displayProgress >= 30 && displayProgress < 33) return "active";
      if ((stage === "clustering" && displayProgress >= 33) || isPast("clustering")) return "completed";
      return "pending";

    case 3: // Clustering themes — clustering >= 33 or early analyzing
      if (stage === "clustering" && displayProgress >= 33) return "active";
      if (stage === "analyzing" && displayProgress < 40) return "active";
      if ((stage === "analyzing" && displayProgress >= 40) || isPast("analyzing")) return "completed";
      return "pending";

    case 4: // Digesting video content — analyzing >= 40
      if (stage === "analyzing" && displayProgress >= 40) return "active";
      if (isPast("analyzing")) return "completed";
      return "pending";

    case 5: // Building weeks — generating < 72
      if (stage === "generating" && displayProgress < 72) return "active";
      if ((stage === "generating" && displayProgress >= 72) || isPast("generating")) return "completed";
      return "pending";

    case 6: // Crafting sessions — generating 72-80
      if (stage === "generating" && displayProgress >= 72 && displayProgress < 80) return "active";
      if ((stage === "generating" && displayProgress >= 80) || isPast("generating")) return "completed";
      return "pending";

    case 7: // Designing actions — generating >= 80 or validating/persisting
      if (stage === "generating" && displayProgress >= 80) return "active";
      if (stage === "validating" || stage === "persisting") return "active";
      return "pending";

    default:
      return "pending";
  }
}
