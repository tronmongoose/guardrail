"use client";

interface StepBasicsProps {
  value: {
    title: string;
    description: string;
    outcomeStatement: string;
  };
  onChange: (value: Partial<StepBasicsProps["value"]>) => void;
}

export function StepBasics({ value, onChange }: StepBasicsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Program Basics</h2>
        <p className="text-gray-400 text-sm">
          Define what your program is about and the transformation you want to create.
        </p>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Program Title <span className="text-neon-pink">*</span>
        </label>
        <input
          type="text"
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g., 12-Week Strength Foundation"
          className="w-full px-4 py-3 bg-surface-dark border border-surface-border rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Description
        </label>
        <textarea
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Brief overview of what the program covers..."
          rows={3}
          className="w-full px-4 py-3 bg-surface-dark border border-surface-border rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan resize-none"
        />
      </div>

      {/* Outcome Statement */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Outcome Statement
        </label>
        <p className="text-xs text-gray-500 mb-2">
          What transformation will learners achieve? This helps the AI create better content.
        </p>
        <textarea
          value={value.outcomeStatement}
          onChange={(e) => onChange({ outcomeStatement: e.target.value })}
          placeholder="By the end of this program, learners will..."
          rows={2}
          className="w-full px-4 py-3 bg-surface-dark border border-surface-border rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan resize-none"
        />
      </div>

      {/* Tips */}
      <div className="p-4 bg-neon-cyan/5 border border-neon-cyan/20 rounded-lg">
        <h4 className="text-sm font-medium text-neon-cyan mb-2">Tips for great programs:</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Be specific about the transformation (e.g., "build 10lbs of muscle" vs "get fit")</li>
          <li>• Your title should hint at the outcome and duration</li>
          <li>• A clear outcome helps AI generate better instructions and reflections</li>
        </ul>
      </div>
    </div>
  );
}
