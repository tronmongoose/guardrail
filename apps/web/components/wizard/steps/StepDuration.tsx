"use client";

import { DurationSelector } from "@/components/duration/DurationSelector";

interface StepDurationProps {
  value: number;
  onChange: (weeks: number) => void;
}

export function StepDuration({ value, onChange }: StepDurationProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Program Duration</h2>
        <p className="text-gray-400 text-sm">
          How long should your program run? Choose a preset or set a custom duration.
        </p>
      </div>

      <DurationSelector value={value} onChange={onChange} />

      {/* Duration guidance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="p-4 bg-surface-dark rounded-lg border border-surface-border">
          <h4 className="text-sm font-medium text-neon-cyan mb-2">Shorter Programs (4-6 weeks)</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Best for focused skills or quick wins</li>
            <li>• Higher completion rates</li>
            <li>• Good for beginners</li>
          </ul>
        </div>
        <div className="p-4 bg-surface-dark rounded-lg border border-surface-border">
          <h4 className="text-sm font-medium text-neon-pink mb-2">Longer Programs (12-24 weeks)</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Best for comprehensive transformations</li>
            <li>• Allows for habit building</li>
            <li>• Higher perceived value</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
