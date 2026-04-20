"use client";

import { useState, useEffect, useRef, useMemo } from "react";

export interface GenerationStep {
  key: string;
  label: string;
  subtitle: string;
  status: "pending" | "active" | "completed";
}

const STEP_DEFINITIONS = [
  { key: "watching", label: "Watching your videos", subtitle: "AI is analyzing every frame and word of your content" },
  { key: "analyzing", label: "Understanding your expertise", subtitle: "Identifying the concepts that make your teaching unique" },
  { key: "clustering", label: "Finding the natural structure", subtitle: "Organizing ideas into a sequence that clicks" },
  { key: "digesting", label: "Extracting key insights", subtitle: "Pulling out the moments that matter most" },
  { key: "mapping", label: "Mapping the learning journey", subtitle: "Designing the path from beginner to mastery" },
  { key: "scenes", label: "Building scene-based lessons", subtitle: "Curating video clips, transitions, and overlays" },
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

// Per-stage ceiling for the simulated progress value. The simulation is clamped
// to the ceiling of the CURRENT stage so it never overruns reality. Real backend
// progress always wins if it's higher than the simulated value.
const STAGE_CEILING: Record<string, number> = {
  queued: 3,
  preparing: 6,
  fetching_transcripts: 24,
  analyzing: 44,
  generating: 84,
  validating: 89,
  persisting: 95,
  generating_skin: 97,
  complete: 100,
};

// Expected total runtime used to shape the easing curve. Actual jobs may finish
// faster (real progress pulls the bar forward) or slower (simulation asymptotes
// at the current stage ceiling until the backend advances).
const EXPECTED_TOTAL_MS = 4 * 60 * 1000;

/**
 * Maps backend generation {stage, progress} to 8 rich frontend steps.
 *
 * Backend stages: preparing(2-5) → fetching_transcripts(5-25) → analyzing(25-45)
 *   → generating(45-85) → validating(85) → persisting(90) → complete(100)
 *
 * A single continuous, time-driven simulation drives the bar so it moves
 * evenly even when the backend is stuck inside a long-running stage (Gemini
 * analysis, the LLM extraction call, the generation LLM call). The simulation
 * is clamped to the current stage's ceiling so it can't outrun reality, and
 * the real backend progress acts as a floor so we can never fall behind.
 */
export function useGenerationSteps(input: UseGenerationStepsInput): UseGenerationStepsResult {
  const { stage, progress, status } = input;

  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const simulationStartRef = useRef<number | null>(null);

  // Track step completion timestamps for minimum dwell time
  const [displayedActiveIndex, setDisplayedActiveIndex] = useState(0);
  const lastStepChangeRef = useRef<number>(Date.now());

  // Single continuous simulation — ticks the bar forward on wall-clock time so
  // long stages (Gemini analysis, LLM extraction, generation) still feel alive.
  useEffect(() => {
    if (status !== "PROCESSING") {
      simulationStartRef.current = null;
      setSimulatedProgress(0);
      return;
    }

    if (!simulationStartRef.current) {
      simulationStartRef.current = Date.now();
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - (simulationStartRef.current || Date.now());
      const t = Math.min(elapsed / EXPECTED_TOTAL_MS, 1);
      // Ease out toward 95 over the expected duration. Clamping to the stage
      // ceiling happens at render time, not here — that way when a stage flips,
      // the simulation already has momentum to carry through the new range.
      const simulated = 95 * (1 - Math.pow(1 - t, 1.5));
      setSimulatedProgress(simulated);
    }, 400);

    return () => clearInterval(interval);
  }, [status]);

  const stageCeiling = STAGE_CEILING[stage ?? "queued"] ?? 95;
  const displayProgress = stage === "complete"
    ? 100
    : Math.max(progress, Math.min(simulatedProgress, stageCeiling));

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
  const stageOrder = ["preparing", "fetching_transcripts", "analyzing", "generating", "validating", "persisting"];
  const currentStageIdx = stageOrder.indexOf(stage ?? "");
  const isPast = (s: string) => currentStageIdx > stageOrder.indexOf(s);

  switch (index) {
    case 0: // Watching your videos — preparing + fetching_transcripts < 15%
      if (stage === "preparing" || (stage === "fetching_transcripts" && displayProgress < 15)) return "active";
      if (isPast("preparing") && displayProgress >= 15) return "completed";
      return isPast("fetching_transcripts") ? "completed" : "pending";

    case 1: // Understanding your expertise — fetching_transcripts >= 15%
      if (stage === "fetching_transcripts" && displayProgress >= 15) return "active";
      if (isPast("fetching_transcripts")) return "completed";
      return "pending";

    case 2: // Finding the natural structure — analyzing < 35%
      if (stage === "analyzing" && displayProgress < 35) return "active";
      if ((stage === "analyzing" && displayProgress >= 35) || isPast("analyzing")) return "completed";
      return "pending";

    case 3: // Extracting key insights — analyzing >= 35%
      if (stage === "analyzing" && displayProgress >= 35) return "active";
      if (isPast("analyzing")) return "completed";
      return "pending";

    case 4: // Mapping the learning journey — generating < 60%
      if (stage === "generating" && displayProgress < 60) return "active";
      if ((stage === "generating" && displayProgress >= 60) || isPast("generating")) return "completed";
      return "pending";

    case 5: // Building scene-based lessons — generating 60-72%
      if (stage === "generating" && displayProgress >= 60 && displayProgress < 72) return "active";
      if ((stage === "generating" && displayProgress >= 72) || isPast("generating")) return "completed";
      return "pending";

    case 6: // Writing each lesson with care — generating 72-82%
      if (stage === "generating" && displayProgress >= 72 && displayProgress < 82) return "active";
      if ((stage === "generating" && displayProgress >= 82) || isPast("generating")) return "completed";
      return "pending";

    case 7: // Adding the finishing touches — generating >= 82% or validating/persisting
      if (stage === "generating" && displayProgress >= 82) return "active";
      if (stage === "validating" || stage === "persisting") return "active";
      return "pending";

    default:
      return "pending";
  }
}
