"use client";

import type { WizardState } from "../ProgramWizard";

interface StepReviewProps {
  state: WizardState;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function StepReview({ state, isGenerating, onGenerate }: StepReviewProps) {
  const totalContent = state.content.videos.length + state.content.artifacts.length;
  const totalWords = state.content.artifacts.reduce(
    (sum, a) => sum + (a.metadata.wordCount || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Review & Generate</h2>
        <p className="text-gray-400 text-sm">
          Review your program details before generating the structure.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basics */}
        <div className="p-4 bg-surface-dark rounded-lg border border-surface-border">
          <h3 className="text-sm font-medium text-neon-cyan mb-3">Program Basics</h3>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500">Title</label>
              <p className="text-white">{state.basics.title || "Untitled"}</p>
            </div>
            {state.basics.description && (
              <div>
                <label className="text-xs text-gray-500">Description</label>
                <p className="text-sm text-gray-300 line-clamp-2">{state.basics.description}</p>
              </div>
            )}
            {state.basics.outcomeStatement && (
              <div>
                <label className="text-xs text-gray-500">Outcome</label>
                <p className="text-sm text-gray-300 line-clamp-2">{state.basics.outcomeStatement}</p>
              </div>
            )}
          </div>
        </div>

        {/* Duration */}
        <div className="p-4 bg-surface-dark rounded-lg border border-surface-border">
          <h3 className="text-sm font-medium text-neon-cyan mb-3">Duration</h3>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-white">{state.duration.weeks}</div>
            <div>
              <p className="text-white">weeks</p>
              <p className="text-xs text-gray-500">
                ~{Math.ceil(state.duration.weeks / 4)} month{Math.ceil(state.duration.weeks / 4) > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 bg-surface-dark rounded-lg border border-surface-border">
          <h3 className="text-sm font-medium text-neon-cyan mb-3">Content</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Videos</span>
              <span className="text-white">{state.content.videos.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Documents</span>
              <span className="text-white">{state.content.artifacts.length}</span>
            </div>
            {totalWords > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Extracted words</span>
                <span className="text-white">{totalWords.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Style */}
        <div className="p-4 bg-surface-dark rounded-lg border border-surface-border">
          <h3 className="text-sm font-medium text-neon-cyan mb-3">Style Influences</h3>
          {state.influencers.selectedIds.length > 0 ? (
            <p className="text-white">
              {state.influencers.selectedIds.length} influencer{state.influencers.selectedIds.length > 1 ? "s" : ""} selected
            </p>
          ) : (
            <p className="text-gray-400">Using default AI style</p>
          )}
        </div>
      </div>

      {/* Warnings */}
      {totalContent === 0 && (
        <div className="p-4 bg-neon-yellow/10 border border-neon-yellow/30 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-neon-yellow flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-neon-yellow">No content added</p>
              <p className="text-xs text-gray-400 mt-1">
                Add at least one video or document to generate a program structure.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Generate button */}
      <div className="pt-4">
        <button
          onClick={onGenerate}
          disabled={isGenerating || totalContent === 0}
          className={`
            w-full py-4 rounded-xl font-semibold text-lg transition-all
            ${isGenerating || totalContent === 0
              ? "bg-surface-card border border-surface-border text-gray-500 cursor-not-allowed"
              : "btn-neon"
            }
          `}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating your program...
            </span>
          ) : (
            "Generate Program Structure"
          )}
        </button>
        <p className="text-center text-xs text-gray-500 mt-3">
          This will analyze your content and create a complete program structure with weeks, sessions, and actions.
        </p>
      </div>
    </div>
  );
}
