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

/**
 * Maps backend generation {stage, progress} to 8 rich frontend steps.
 *
 * Backend stages: preparing(2-5) → fetching_transcripts(5-25) → analyzing(25-45) → generating(45-85) → validating → persisting
 *
 * The "generating" stage (45-85%) is a single long LLM call with no intermediate
 * updates. This hook simulates smooth sub-step progression client-side using a
 * logarithmic timer, so steps 5-8 animate naturally.
 *
 * Each step dwells for a minimum of 2.5s before transitioning, so the experience
 * feels deliberate rather than rushed.
 */
export function useGenerationSteps(input: UseGenerationStepsInput): UseGenerationStepsResult {
  const { stage, progress, status } = input;

  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const generatingStartRef = useRef<number | null>(null);

  // Early-stage simulation: gentle progress during preparing/video_analysis
  const [earlySimulated, setEarlySimulated] = useState(0);
  const earlyStartRef = useRef<number | null>(null);

  // Track step completion timestamps for minimum dwell time
  const [displayedActiveIndex, setDisplayedActiveIndex] = useState(0);
  const lastStepChangeRef = useRef<number>(Date.now());

  // Simulate smooth progress during early stages (preparing + fetching_transcripts)
  // so the bar starts moving immediately instead of sitting at 0%
  useEffect(() => {
    const isEarlyStage = (stage === "preparing" || stage === "fetching_transcripts") && status === "PROCESSING";
    if (!isEarlyStage) {
      earlyStartRef.current = null;
      setEarlySimulated(0);
      return;
    }

    if (!earlyStartRef.current) {
      earlyStartRef.current = Date.now();
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - (earlyStartRef.current || Date.now());
      // Ease from 2 toward 20 over ~60 seconds (gentle crawl through transcript fetch)
      const t = Math.min(elapsed / 60000, 1);
      const simulated = 2 + 18 * (1 - Math.pow(1 - t, 2));
      setEarlySimulated(Math.min(simulated, 20));
    }, 800);

    return () => clearInterval(interval);
  }, [stage, status]);

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
      // Ease from 45 toward 84 over ~45 seconds (slower for more theatrical feel)
      const t = Math.min(elapsed / 45000, 1);
      const simulated = 45 + 39 * (1 - Math.pow(1 - t, 2));
      setSimulatedProgress(Math.min(simulated, 84));
    }, 800);

    return () => clearInterval(interval);
  }, [stage, status]);

  const displayProgress = (stage === "preparing" || stage === "fetching_transcripts")
    ? Math.max(progress, earlySimulated)
    : stage === "generating"
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
