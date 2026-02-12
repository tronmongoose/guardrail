"use client";

import { SKINS, SKIN_IDS, type Skin } from "@/lib/skins";

interface SkinPickerProps {
  value: string;
  onChange: (skinId: string) => void;
}

function SkinPreviewCard({
  skin,
  isSelected,
  onClick,
}: {
  skin: Skin;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative p-1 rounded-xl transition-all
        ${isSelected
          ? "ring-2 ring-neon-cyan ring-offset-2 ring-offset-surface-dark"
          : "hover:ring-2 hover:ring-gray-500 hover:ring-offset-2 hover:ring-offset-surface-dark"
        }
      `}
    >
      {/* Mini preview */}
      <div
        className="w-full aspect-video rounded-lg overflow-hidden"
        style={{ backgroundColor: skin.colors.bg }}
      >
        {/* Header bar */}
        <div
          className="h-3 flex items-center px-2 gap-1"
          style={{ backgroundColor: skin.colors.bgSecondary }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: skin.colors.accent }}
          />
          <div
            className="flex-1 h-1 rounded"
            style={{ backgroundColor: skin.colors.border }}
          />
        </div>

        {/* Content area */}
        <div className="p-2 space-y-1.5">
          {/* Title */}
          <div
            className="h-2 w-3/4 rounded"
            style={{ backgroundColor: skin.colors.text, opacity: 0.2 }}
          />

          {/* Video placeholder */}
          <div
            className={`h-8 ${skin.videoFrame === "rounded" ? "rounded" : ""}`}
            style={{ backgroundColor: skin.colors.bgSecondary }}
          />

          {/* Button */}
          <div
            className={`h-2.5 w-1/2 mx-auto ${skin.videoFrame === "rounded" ? "rounded" : ""}`}
            style={{ backgroundColor: skin.colors.accent }}
          />
        </div>
      </div>

      {/* Label */}
      <div className="mt-2 text-center">
        <p className={`text-xs font-medium ${isSelected ? "text-neon-cyan" : "text-white"}`}>
          {skin.name}
        </p>
        <p className="text-[10px] text-gray-500 mt-0.5">{skin.description}</p>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-neon-cyan rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-surface-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
}

export function SkinPicker({ value, onChange }: SkinPickerProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">Theme</label>
        <span className="text-xs text-gray-500">How learners will see your program</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SKIN_IDS.map((skinId) => (
          <SkinPreviewCard
            key={skinId}
            skin={SKINS[skinId]}
            isSelected={value === skinId}
            onClick={() => onChange(skinId)}
          />
        ))}
      </div>
    </div>
  );
}
