"use client";

interface StepVibeProps {
  value: string;
  onChange: (value: string) => void;
}

const EXAMPLE_PROMPTS = [
  {
    label: "Casual & Encouraging",
    text: "Keep it casual and encouraging, like talking to a friend who's just getting started. Use simple language and celebrate small wins.",
  },
  {
    label: "Professional & Structured",
    text: "Professional and structured with clear action items. Each session should feel like a focused workshop with specific outcomes.",
  },
  {
    label: "High Energy",
    text: "High energy, fast-paced, no fluff. Get straight to the point and keep momentum high. Challenge learners to push their limits.",
  },
  {
    label: "Deep & Thoughtful",
    text: "Thoughtful and reflective. Give learners time to process each concept deeply. Include moments for self-reflection and journaling.",
  },
];

export function StepVibe({ value, onChange }: StepVibeProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Set the Vibe</h2>
        <p className="text-gray-400 text-sm">
          Describe the tone, pacing, and energy you want for your program. This guides how the AI writes session titles, descriptions, and takeaways.
        </p>
      </div>

      {/* Main textarea */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Your Vision <span className="text-gray-500">(optional but recommended)</span>
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe the vibe, pacing, and structure you want (tone, energy level, level of detail, any constraints)..."
          rows={5}
          className="w-full px-4 py-3 bg-surface-dark border border-surface-border rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan resize-none"
        />
        <p className="text-xs text-gray-500 mt-2">
          {value.length}/500 characters
        </p>
      </div>

      {/* Example prompts */}
      <div>
        <p className="text-sm font-medium text-gray-300 mb-3">
          Or try one of these:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example.label}
              onClick={() => onChange(example.text)}
              className={`
                text-left p-4 rounded-lg border transition
                ${
                  value === example.text
                    ? "bg-neon-cyan/10 border-neon-cyan text-white"
                    : "bg-surface-dark border-surface-border text-gray-300 hover:border-neon-cyan/50"
                }
              `}
            >
              <div className="font-medium text-sm mb-1">{example.label}</div>
              <div className="text-xs text-gray-400 line-clamp-2">
                {example.text}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="p-4 bg-neon-pink/5 border border-neon-pink/20 rounded-lg">
        <h4 className="text-sm font-medium text-neon-pink mb-2">What makes a good vibe prompt?</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Describe the energy level (calm, intense, playful, serious)</li>
          <li>• Mention your teaching style (hands-on, theoretical, storytelling)</li>
          <li>• Include any constraints (e.g., &quot;no jargon&quot;, &quot;keep sessions under 20 min&quot;)</li>
          <li>• Think about your audience&apos;s expectations</li>
        </ul>
      </div>
    </div>
  );
}
