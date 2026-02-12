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
          How long should your program run? Choose from these proven durations.
        </p>
      </div>

      <DurationSelector value={value} onChange={onChange} />

      {/* Duration guidance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="p-4 bg-surface-dark rounded-lg border border-surface-border">
          <h4 className="text-sm font-medium text-neon-cyan mb-2">6 Weeks</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Best for focused skills</li>
            <li>• Higher completion rates</li>
            <li>• Quick wins mindset</li>
          </ul>
        </div>
        <div className="p-4 bg-surface-dark rounded-lg border border-surface-border">
          <h4 className="text-sm font-medium text-neon-yellow mb-2">8 Weeks</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Balanced depth</li>
            <li>• Room for practice</li>
            <li>• Popular choice</li>
          </ul>
        </div>
        <div className="p-4 bg-surface-dark rounded-lg border border-surface-border">
          <h4 className="text-sm font-medium text-neon-pink mb-2">12 Weeks</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Comprehensive journey</li>
            <li>• Habit formation time</li>
            <li>• Higher perceived value</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
