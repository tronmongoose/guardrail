"use client";

import { useState } from "react";

interface DurationSelectorProps {
  value: number;
  onChange: (weeks: number) => void;
  min?: number;
  max?: number;
}

const DURATION_PRESETS = [
  { weeks: 4, label: "4 weeks", description: "Quick sprint" },
  { weeks: 6, label: "6 weeks", description: "Standard" },
  { weeks: 8, label: "8 weeks", description: "Deep dive" },
  { weeks: 12, label: "12 weeks", description: "Comprehensive" },
  { weeks: 24, label: "24 weeks", description: "Mastery" },
];

export function DurationSelector({
  value,
  onChange,
  min = 1,
  max = 52,
}: DurationSelectorProps) {
  const [isCustom, setIsCustom] = useState(
    !DURATION_PRESETS.some((p) => p.weeks === value)
  );
  const [customValue, setCustomValue] = useState(value.toString());

  const handlePresetClick = (weeks: number) => {
    setIsCustom(false);
    onChange(weeks);
  };

  const handleCustomToggle = () => {
    setIsCustom(true);
    setCustomValue(value.toString());
  };

  const handleCustomChange = (val: string) => {
    setCustomValue(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(num);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10);
    setCustomValue(num.toString());
    onChange(num);
  };

  return (
    <div className="space-y-4">
      {/* Preset buttons */}
      <div className="grid grid-cols-5 gap-2">
        {DURATION_PRESETS.map((preset) => (
          <button
            key={preset.weeks}
            type="button"
            onClick={() => handlePresetClick(preset.weeks)}
            className={`
              py-3 px-2 rounded-lg border text-center transition-all
              ${
                !isCustom && value === preset.weeks
                  ? "bg-neon-cyan/20 border-neon-cyan text-neon-cyan"
                  : "bg-surface-card border-surface-border text-gray-400 hover:border-neon-cyan/50 hover:text-gray-300"
              }
            `}
          >
            <div className="text-lg font-semibold">{preset.weeks}</div>
            <div className="text-xs opacity-70">{preset.description}</div>
          </button>
        ))}
      </div>

      {/* Custom option */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleCustomToggle}
          className={`
            px-4 py-2 rounded-lg border text-sm transition-all
            ${
              isCustom
                ? "bg-neon-pink/20 border-neon-pink text-neon-pink"
                : "bg-surface-card border-surface-border text-gray-400 hover:border-neon-pink/50"
            }
          `}
        >
          Custom
        </button>

        {isCustom && (
          <div className="flex-1 flex items-center gap-4">
            <input
              type="number"
              value={customValue}
              onChange={(e) => handleCustomChange(e.target.value)}
              min={min}
              max={max}
              className="w-20 px-3 py-2 bg-surface-dark border border-surface-border rounded-lg text-white text-center focus:outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink"
            />
            <span className="text-gray-400 text-sm">weeks</span>
            <input
              type="range"
              min={min}
              max={max}
              value={value}
              onChange={handleSliderChange}
              className="flex-1 h-2 bg-surface-dark rounded-lg appearance-none cursor-pointer accent-neon-pink"
            />
          </div>
        )}
      </div>

      {/* Visual preview */}
      <div className="mt-4 p-4 bg-surface-dark rounded-lg border border-surface-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Program Timeline</span>
          <span className="text-sm font-medium text-white">
            {value} week{value !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="h-3 bg-surface-card rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-cyan to-neon-pink rounded-full transition-all duration-300"
            style={{ width: `${(value / max) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>{min}w</span>
          <span>{Math.round(max / 2)}w</span>
          <span>{max}w</span>
        </div>
      </div>
    </div>
  );
}
