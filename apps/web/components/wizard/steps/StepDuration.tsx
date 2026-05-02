"use client";

import { useEffect, useRef } from "react";
import { DurationSelector } from "@/components/duration/DurationSelector";
import { computeSmartPresets, computeLessonCountFromTopics } from "@guide-rail/ai";
import type { VideoInfo } from "@guide-rail/ai";

interface StepDurationProps {
  weeks: number;
  videos: VideoInfo[];
  aiStructured: boolean;
  onWeeksChange: (weeks: number) => void;
  onAiStructuredChange: (v: boolean) => void;
}

export function StepDuration({
  weeks,
  videos,
  aiStructured,
  onWeeksChange,
  onAiStructuredChange,
}: StepDurationProps) {
  const videoCount = videos.length;
  const presets = computeSmartPresets(videoCount, videos);

  const totalDuration = videos.reduce((sum, v) => sum + (v.durationSeconds ?? 0), 0);
  const hasDuration = totalDuration > 0;
  const totalMin = Math.round(totalDuration / 60);

  // AI readiness: all videos must have topic data
  const analyzedCount = videos.filter((v) => (v.topicCount ?? 0) > 0).length;
  const totalTopics = videos.reduce((sum, v) => sum + (v.topicCount ?? 0), 0);
  const allAnalyzed = videoCount > 0 && analyzedCount === videoCount;

  // Auto-set weeks from topic analysis when AI mode is active.
  // Before all videos are analyzed, use video count as a sensible fallback
  // so the wizard never saves the stale default of 8.
  const prevAiWeeks = useRef<number | null>(null);
  useEffect(() => {
    if (!aiStructured) return;
    const target = allAnalyzed
      ? computeLessonCountFromTopics(videos)
      : Math.max(2, videoCount);
    if (target !== prevAiWeeks.current) {
      prevAiWeeks.current = target;
      onWeeksChange(target);
    }
  }, [aiStructured, allAnalyzed, videos, videoCount, onWeeksChange]);

  return (
    <div className="space-y-8">
      {/* Structure Mode Toggle */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Program Structure</h2>
        <p className="text-gray-400 text-sm mb-4">
          How should we determine your program structure?
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Let AI Decide — default, left position */}
          <button
            type="button"
            onClick={() => onAiStructuredChange(true)}
            className={`
              p-4 rounded-xl border text-left transition-all
              ${aiStructured
                ? "border-neon-pink bg-neon-pink/10"
                : "border-surface-border bg-surface-dark hover:border-gray-500"
              }
            `}
          >
            <div className="flex items-start gap-3">
              <div
                className={`
                  flex-shrink-0 p-2 rounded-lg
                  ${aiStructured ? "bg-neon-pink/20 text-neon-pink" : "bg-surface-card text-gray-400"}
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium ${aiStructured ? "text-neon-pink" : "text-white"}`}>
                  Let AI decide
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  AI analyzes your video topics to find the ideal structure
                </p>
              </div>
            </div>
          </button>

          {/* Quick Setup */}
          <button
            type="button"
            onClick={() => onAiStructuredChange(false)}
            className={`
              p-4 rounded-xl border text-left transition-all
              ${!aiStructured
                ? "border-neon-cyan bg-neon-cyan/10"
                : "border-surface-border bg-surface-dark hover:border-gray-500"
              }
            `}
          >
            <div className="flex items-start gap-3">
              <div
                className={`
                  flex-shrink-0 p-2 rounded-lg
                  ${!aiStructured ? "bg-neon-cyan/20 text-neon-cyan" : "bg-surface-card text-gray-400"}
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium ${!aiStructured ? "text-neon-cyan" : "text-white"}`}>
                  Quick setup
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Choose your program length from presets
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Conditional content based on structure mode */}
      {!aiStructured ? (
        /* ─── Quick Setup Path: show preset picker ─── */
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Program Length</h2>
          <p className="text-gray-400 text-sm mb-4">
            {videoCount > 0
              ? hasDuration
                ? `Based on your ${videoCount} video${videoCount === 1 ? "" : "s"} (${totalMin} min total) \u2014 pick the pace that fits.`
                : `Based on your ${videoCount} video${videoCount === 1 ? "" : "s"} \u2014 analyzing durations\u2026`
              : "You haven't added videos yet. You can adjust this after adding content."}
          </p>

          <DurationSelector
            value={weeks}
            onChange={onWeeksChange}
            pacingMode="unlock_on_complete"
            presets={presets}
          />
        </div>
      ) : allAnalyzed ? (
        /* ─── AI Decide Path: Ready ─── */
        <div className="p-6 rounded-xl border border-neon-pink/30 bg-neon-pink/5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span className="text-sm font-medium text-neon-pink">AI Analysis Complete</span>
          </div>

          <p className="text-gray-400 text-sm mb-5">
            Found <span className="text-white font-medium">{totalTopics} topic{totalTopics === 1 ? "" : "s"}</span> across
            your <span className="text-white font-medium">{videoCount} video{videoCount === 1 ? "" : "s"}</span>
          </p>

          <div className="flex items-center justify-center mb-5">
            <div className="text-center px-8 py-4 rounded-xl bg-surface-dark border border-neon-pink/20">
              <div className="text-3xl font-bold text-white">{weeks}</div>
              <div className="text-sm text-gray-400 mt-1">lessons</div>
              {hasDuration && (
                <div className="text-xs text-gray-500 mt-1">
                  ~{Math.round(totalDuration / weeks / 60)} min per lesson
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <span
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 px-3 py-1.5 rounded-lg bg-surface-dark border border-surface-border cursor-not-allowed"
              title="Coming soon"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit structure
              <span className="text-[10px] text-gray-600">(coming soon)</span>
            </span>
          </div>
        </div>
      ) : (
        /* ─── AI Decide Path: Pending (analysis still running in background) ─── */
        <div className="p-6 rounded-xl border border-neon-pink/30 bg-neon-pink/5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span className="text-sm font-medium text-neon-pink">AI will tailor your structure</span>
          </div>

          <p className="text-gray-400 text-sm mb-5">
            We&apos;ll analyze your <span className="text-white font-medium">{videoCount} video{videoCount === 1 ? "" : "s"}</span> when you generate and find the ideal lesson count.
          </p>

          <div className="flex items-center justify-center">
            <div className="text-center px-8 py-4 rounded-xl bg-surface-dark border border-neon-pink/20">
              <div className="text-3xl font-bold text-white">~{weeks}</div>
              <div className="text-sm text-gray-400 mt-1">lessons (estimated)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
