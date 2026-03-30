"use client";

import { SkinPicker } from "@/components/skins/SkinPicker";
import type { WizardState } from "../ProgramWizard";

interface StepReviewProps {
  state: WizardState;
  programId: string;
  skinId: string;
  onSkinChange: (skinId: string) => void;
  onGenerateSkin: () => Promise<string | null>;
}

export function StepReview({ state, programId, skinId, onSkinChange, onGenerateSkin }: StepReviewProps) {
  const firstThumbnail = state.content.videos[0]?.thumbnailUrl ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Choose Your Theme</h2>
        <p className="text-gray-400 text-sm">
          Pick a look for your program page. You can change it anytime after launch.
        </p>
      </div>

      {/* Compact summary strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-sm">
        <span className="text-white font-medium truncate max-w-[200px]">
          {state.basics.title || "Untitled"}
        </span>
        <span className="text-gray-500">·</span>
        <span className="text-gray-400">{state.duration.weeks}w program</span>
        <span className="text-gray-500">·</span>
        <span className="text-gray-400">
          {state.content.videos.length} video{state.content.videos.length !== 1 ? "s" : ""}
          {state.content.artifacts.length > 0 && `, ${state.content.artifacts.length} doc${state.content.artifacts.length !== 1 ? "s" : ""}`}
        </span>
        {state.vibe.vibePrompt && (
          <>
            <span className="text-gray-500">·</span>
            <span className="text-gray-400 italic truncate max-w-[180px]">{state.vibe.vibePrompt}</span>
          </>
        )}
      </div>

      {/* Skin picker — hero feature */}
      <SkinPicker value={skinId} onChange={onSkinChange} thumbnailUrl={firstThumbnail} onGenerateSkin={onGenerateSkin} />
    </div>
  );
}
