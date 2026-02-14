"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGenerationSteps } from "./useGenerationSteps";
import { GenerationSteps } from "./GenerationSteps";

interface GenerationJob {
  jobId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  stage: string | null;
  progress: number;
  error: string | null;
  completedAt: string | null;
}

interface GenerationNotificationProps {
  programId: string;
  onComplete?: () => void;
  onDismiss?: () => void;
}

export function GenerationNotification({
  programId,
  onComplete,
  onDismiss,
}: GenerationNotificationProps) {
  const router = useRouter();
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/programs/${programId}/generate-async/status`);
      if (res.ok) {
        const data = await res.json();
        setJob(data);

        if (data.status === "COMPLETED") {
          onComplete?.();
        }
      }
    } catch (err) {
      console.error("Failed to poll generation status:", err);
    }
  }, [programId, onComplete]);

  useEffect(() => {
    // Initial fetch
    pollStatus();

    // Poll every 2 seconds while processing
    const interval = setInterval(() => {
      if (job?.status === "PENDING" || job?.status === "PROCESSING" || !job) {
        pollStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pollStatus, job?.status]);

  if (dismissed || !job) return null;

  // Don't show if completed more than 10 seconds ago
  if (job.status === "COMPLETED" && job.completedAt) {
    const completedAt = new Date(job.completedAt);
    if (Date.now() - completedAt.getTime() > 10000) {
      return null;
    }
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleViewProgram = () => {
    router.push(`/programs/${programId}/edit`);
    handleDismiss();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-slide-up">
      <div
        className={`
          rounded-xl border p-4 shadow-lg backdrop-blur-sm
          ${
            job.status === "FAILED"
              ? "bg-red-950/90 border-red-500/50"
              : job.status === "COMPLETED"
              ? "bg-green-950/90 border-neon-cyan/50"
              : "bg-surface-card/95 border-surface-border"
          }
        `}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {job.status === "COMPLETED" ? (
              <div className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-neon-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : job.status === "FAILED" ? (
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-neon-pink/20 flex items-center justify-center animate-pulse">
                <svg className="w-5 h-5 text-neon-pink animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-medium text-white">
                {job.status === "COMPLETED"
                  ? "Program Ready!"
                  : job.status === "FAILED"
                  ? "Generation Failed"
                  : "Generating Program"}
              </h4>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-white transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {job.status === "FAILED" && job.error ? (
              <p className="text-xs text-red-300 mt-1 line-clamp-2">{job.error}</p>
            ) : job.status === "COMPLETED" ? (
              <p className="text-xs text-gray-400 mt-1">
                Your program has been generated and is ready to edit.
              </p>
            ) : (
              <CompactProgress stage={job.stage} progress={job.progress} status={job.status} />
            )}

            {/* Actions */}
            {job.status === "COMPLETED" && (
              <button
                onClick={handleViewProgram}
                className="mt-3 w-full px-3 py-1.5 text-xs font-medium rounded-lg bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/30 transition"
              >
                View & Edit Program
              </button>
            )}

            {job.status === "FAILED" && (
              <button
                onClick={() => {
                  setDismissed(true);
                  router.push(`/programs/${programId}/edit`);
                }}
                className="mt-3 w-full px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition"
              >
                View Details
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactProgress({ stage, progress, status }: { stage: string | null; progress: number; status: string }) {
  const stepsData = useGenerationSteps({ stage, progress, status });
  return (
    <div className="mt-1">
      <GenerationSteps
        steps={stepsData.steps}
        activeStepIndex={stepsData.activeStepIndex}
        displayProgress={stepsData.displayProgress}
        variant="compact"
      />
    </div>
  );
}
