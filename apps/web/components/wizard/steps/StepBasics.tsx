"use client";

import { AiAssistButton } from "@/components/ui/AiAssistButton";

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
  const aiContext = [value.title, value.targetTransformation].filter(Boolean).join(" — ");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Program Basics</h2>
        <p className="text-gray-400 text-sm">
          Your answers shape everything the AI builds — week titles, lesson names, review steps, and reflection prompts. Don&apos;t overthink it: even a rough idea gives the AI something to work with, and you can edit everything after.
        </p>
      </div>

      {/* AI context callout */}
      <div className="p-4 bg-surface-dark border border-surface-border rounded-lg">
        <p className="text-xs font-medium text-gray-300 mb-2">From your answers, AI will create:</p>
        <ul className="text-xs text-gray-400 space-y-1 mb-3">
          <li>· Week and session headlines</li>
          <li>· Guided lessons and key watchpoints</li>
          <li>· Review steps and action prompts</li>
          <li>· Reflection questions for your learners</li>
        </ul>
        <p className="text-xs text-gray-500">
          See the{" "}
          <span className="inline-flex items-center gap-0.5 text-neon-cyan">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 4l5 5L8 21l-5-2 2-5L15 4Z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 3l1.5 1.5M3 6h1M6 3v1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            wand icon
          </span>{" "}
          next to any field? That&apos;s AI assist — tap it to help flesh out your answer.
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
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">
            Who is this for?
          </label>
          <AiAssistButton
            value={value.targetAudience}
            type="target_audience"
            context={aiContext}
            onEnhance={(enhanced) => onChange({ targetAudience: enhanced })}
          />
        </div>
        <p className="text-xs text-gray-500 mb-2">
          A quick sketch of who this is for — their background, skill level, and what they&apos;re trying to solve. This helps the AI pitch lessons at the right level.
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
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">
            Target Transformation <span className="text-neon-pink">*</span>
          </label>
          <AiAssistButton
            value={value.targetTransformation}
            type="transformation"
            context={aiContext}
            onEnhance={(enhanced) => onChange({ targetTransformation: enhanced })}
          />
        </div>
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
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">
            Description
          </label>
          <AiAssistButton
            value={value.description}
            type="description"
            context={aiContext}
            onEnhance={(enhanced) => onChange({ description: enhanced })}
          />
        </div>
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
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">
            Outcome Statement <span className="text-gray-500">(optional)</span>
          </label>
          <AiAssistButton
            value={value.outcomeStatement}
            type="outcome"
            context={aiContext}
            onEnhance={(enhanced) => onChange({ outcomeStatement: enhanced })}
          />
        </div>
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
        <h4 className="text-sm font-medium text-neon-cyan mb-2">What helps the AI the most:</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• A specific audience (e.g., &quot;beginner runners&quot; beats &quot;fitness people&quot;)</li>
          <li>• A measurable transformation (e.g., &quot;run a 5K in 8 weeks&quot; beats &quot;get fit&quot;)</li>
          <li>• Anything is better than nothing — you can refine it all after generation</li>
        </ul>
      </div>
    </div>
  );
}
