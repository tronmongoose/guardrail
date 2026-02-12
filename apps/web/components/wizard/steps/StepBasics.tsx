"use client";

interface StepBasicsProps {
  value: {
    title: string;
    description: string;
    outcomeStatement: string;
    targetAudience: string;
    targetTransformation: string;
  };
  onChange: (value: Partial<StepBasicsProps["value"]>) => void;
}

export function StepBasics({ value, onChange }: StepBasicsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Program Basics</h2>
        <p className="text-gray-400 text-sm">
          Define what your program is about and who it&apos;s for.
        </p>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Program Name <span className="text-neon-pink">*</span>
        </label>
        <input
          type="text"
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g., 12-Week Strength Foundation"
          className="w-full px-4 py-3 bg-surface-dark border border-surface-border rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
        />
      </div>

      {/* Target Audience */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Who is this for?
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Describe your ideal learner - their background, skill level, and industry.
        </p>
        <textarea
          value={value.targetAudience}
          onChange={(e) => onChange({ targetAudience: e.target.value })}
          placeholder="e.g., beginner fitness creators looking to build their first online program, B2B SaaS SDRs who want to improve cold outreach"
          rows={2}
          className="w-full px-4 py-3 bg-surface-dark border border-surface-border rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan resize-none"
        />
      </div>

      {/* Target Transformation */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Target Transformation <span className="text-neon-pink">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          What specific outcome will learners achieve? This drives your entire program.
        </p>
        <textarea
          value={value.targetTransformation}
          onChange={(e) => onChange({ targetTransformation: e.target.value })}
          placeholder="e.g., Build a consistent workout habit and gain 10lbs of lean muscle in 12 weeks"
          rows={2}
          className="w-full px-4 py-3 bg-surface-dark border border-surface-border rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan resize-none"
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
          placeholder="Brief overview of what the program covers (shown on sales page)..."
          rows={3}
          className="w-full px-4 py-3 bg-surface-dark border border-surface-border rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan resize-none"
        />
      </div>

      {/* Outcome Statement (optional, for backwards compatibility) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Outcome Statement <span className="text-gray-500">(optional)</span>
        </label>
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
          <li>• Be specific about your audience (their pain points, goals, current skill level)</li>
          <li>• Make the transformation measurable (e.g., &quot;10lbs of muscle&quot; vs &quot;get fit&quot;)</li>
          <li>• The clearer your transformation, the better AI can structure your content</li>
        </ul>
      </div>
    </div>
  );
}
