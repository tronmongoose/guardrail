"use client";

interface DurationSelectorProps {
  value: number;
  onChange: (weeks: number) => void;
}

// MVP: Only 6, 8, 12 weeks
const DURATION_PRESETS = [
  { weeks: 6, label: "6 weeks", description: "Standard" },
  { weeks: 8, label: "8 weeks", description: "Deep dive" },
  { weeks: 12, label: "12 weeks", description: "Comprehensive" },
];

export function DurationSelector({
  value,
  onChange,
}: DurationSelectorProps) {
  return (
    <div className="space-y-4">
      {/* Preset buttons */}
      <div className="grid grid-cols-3 gap-3">
        {DURATION_PRESETS.map((preset) => (
          <button
            key={preset.weeks}
            type="button"
            onClick={() => onChange(preset.weeks)}
            className={`
              py-4 px-4 rounded-xl border text-center transition-all
              ${
                value === preset.weeks
                  ? "bg-neon-cyan/20 border-neon-cyan text-neon-cyan shadow-lg shadow-neon-cyan/20"
                  : "bg-surface-card border-surface-border text-gray-400 hover:border-neon-cyan/50 hover:text-gray-300"
              }
            `}
          >
            <div className="text-2xl font-bold">{preset.weeks}</div>
            <div className="text-sm opacity-70">weeks</div>
            <div className="text-xs mt-1 opacity-50">{preset.description}</div>
          </button>
        ))}
      </div>

      {/* Visual preview */}
      <div className="mt-4 p-4 bg-surface-dark rounded-lg border border-surface-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Program Timeline</span>
          <span className="text-sm font-medium text-white">
            {value} weeks
          </span>
        </div>
        <div className="h-3 bg-surface-card rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-cyan to-neon-pink rounded-full transition-all duration-300"
            style={{ width: `${(value / 12) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>6w</span>
          <span>8w</span>
          <span>12w</span>
        </div>
      </div>

      {/* Sessions estimate */}
      <div className="text-center text-sm text-gray-400">
        <span className="text-neon-cyan font-medium">{value}</span> weeks = approximately{" "}
        <span className="text-neon-pink font-medium">{value * 2}</span> to{" "}
        <span className="text-neon-pink font-medium">{value * 3}</span> sessions
      </div>
    </div>
  );
}
