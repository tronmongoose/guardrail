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
 * Backend stages: preparing(2-5) → video_analysis(5-10) → embedding(10-25) → clustering(25-35) → analyzing(35-55) → generating(55-85) → validating → persisting
 *
 * The "generating" stage (55-85%) is a single long LLM call with no intermediate
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

  // Early-stage simulation: gentle progress during preparing/video_analysis
  const [earlySimulated, setEarlySimulated] = useState(0);
  const earlyStartRef = useRef<number | null>(null);

  // Track step completion timestamps for minimum dwell time
  const [displayedActiveIndex, setDisplayedActiveIndex] = useState(0);
  const lastStepChangeRef = useRef<number>(Date.now());

  // Simulate smooth progress during early stages (preparing + video_analysis)
  // so the bar starts moving immediately instead of sitting at 0%
  useEffect(() => {
    const isEarlyStage = (stage === "preparing" || stage === "video_analysis") && status === "PROCESSING";
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
      // Ease from 2 toward 9 over ~60 seconds (gentle crawl)
      const t = Math.min(elapsed / 60000, 1);
      const simulated = 2 + 7 * (1 - Math.pow(1 - t, 2));
      setEarlySimulated(Math.min(simulated, 9));
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
      // Ease from 55 toward 84 over ~45 seconds (slower for more theatrical feel)
      const t = Math.min(elapsed / 45000, 1);
      const simulated = 55 + 29 * (1 - Math.pow(1 - t, 2));
      setSimulatedProgress(Math.min(simulated, 84));
    }, 800);

    return () => clearInterval(interval);
  }, [stage, status]);

  const displayProgress = (stage === "preparing" || stage === "video_analysis")
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
  const stageOrder = ["preparing", "video_analysis", "embedding", "clustering", "analyzing", "generating", "validating", "persisting"];
  const currentStageIdx = stageOrder.indexOf(stage ?? "");
  const isPast = (s: string) => currentStageIdx > stageOrder.indexOf(s);

  switch (index) {
    case 0: // Watching your videos — preparing + video_analysis (0-10)
      if (stage === "preparing" || stage === "video_analysis") return "active";
      if (isPast("video_analysis")) return "completed";
      return "pending";

    case 1: // Understanding your expertise — embedding (10-25)
      if (stage === "embedding") return "active";
      if (isPast("embedding")) return "completed";
      return "pending";

    case 2: // Finding the natural structure — clustering (25-35)
      if (stage === "clustering") return "active";
      if (isPast("clustering")) return "completed";
      return "pending";

    case 3: // Extracting key insights — analyzing < 48
      if (stage === "analyzing" && displayProgress < 48) return "active";
      if ((stage === "analyzing" && displayProgress >= 48) || isPast("analyzing")) return "completed";
      return "pending";

    case 4: // Mapping the learning journey — analyzing >= 48 or early generating
      if (stage === "analyzing" && displayProgress >= 48) return "active";
      if (stage === "generating" && displayProgress < 65) return "active";
      if ((stage === "generating" && displayProgress >= 65) || isPast("generating")) return "completed";
      return "pending";

    case 5: // Building scene-based lessons — generating 65-75
      if (stage === "generating" && displayProgress >= 65 && displayProgress < 75) return "active";
      if ((stage === "generating" && displayProgress >= 75) || isPast("generating")) return "completed";
      return "pending";

    case 6: // Writing each lesson with care — generating 75-82
      if (stage === "generating" && displayProgress >= 75 && displayProgress < 82) return "active";
      if ((stage === "generating" && displayProgress >= 82) || isPast("generating")) return "completed";
      return "pending";

    case 7: // Adding the finishing touches — generating >= 82 or validating/persisting
      if (stage === "generating" && displayProgress >= 82) return "active";
      if (stage === "validating" || stage === "persisting") return "active";
      return "pending";

    default:
      return "pending";
  }
}
