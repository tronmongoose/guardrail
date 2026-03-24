"use client";

export type TransitionMode = "NONE" | "SIMPLE" | "BRANDED";

interface TransitionStylePickerProps {
  value: TransitionMode;
  onChange: (mode: TransitionMode) => void;
}

const OPTIONS: {
  mode: TransitionMode;
  title: string;
  description: string;
  recommended?: boolean;
  icon: React.ReactNode;
}[] = [
  {
    mode: "NONE",
    title: "No Transitions",
    description: "Jump straight into the content.",
    icon: (
      <svg viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-8">
        <rect x="1" y="1" width="46" height="30" rx="3" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
        <polygon points="18,10 18,22 30,16" fill="currentColor" fillOpacity="0.5" />
      </svg>
    ),
  },
  {
    mode: "SIMPLE",
    title: "Simple",
    description: "Clean play and next-lesson buttons.",
    icon: (
      <svg viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-8">
        <rect x="1" y="1" width="46" height="30" rx="3" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
        <rect x="14" y="12" width="20" height="8" rx="4" fill="currentColor" fillOpacity="0.4" />
        <polygon points="21,14 21,18 26,16" fill="currentColor" fillOpacity="0.9" />
        <text x="28" y="17.5" fontSize="5" fill="currentColor" fillOpacity="0.7" fontFamily="sans-serif">Play</text>
      </svg>
    ),
  },
  {
    mode: "BRANDED",
    title: "Branded",
    description: "Cinematic title cards matched to your theme.",
    recommended: true,
    icon: (
      <svg viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-8">
        <rect x="1" y="1" width="46" height="30" rx="3" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" />
        <rect x="6" y="5" width="36" height="2.5" rx="1" fill="currentColor" fillOpacity="0.15" />
        <rect x="10" y="13" width="28" height="3.5" rx="1" fill="currentColor" fillOpacity="0.8" />
        <rect x="15" y="19" width="18" height="2" rx="1" fill="currentColor" fillOpacity="0.4" />
        <rect x="1" y="1" width="3" height="30" rx="1.5 0 0 1.5" fill="currentColor" fillOpacity="0.6" />
      </svg>
    ),
  },
];

export function TransitionStylePicker({ value, onChange }: TransitionStylePickerProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-white">Lesson Transitions</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          How should each lesson open and close for your learners?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {OPTIONS.map(({ mode, title, description, recommended, icon }) => {
          const selected = value === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onChange(mode)}
              className={`
                relative flex flex-col items-start gap-3 p-4 rounded-xl border text-left
                transition-all duration-150
                ${selected
                  ? "border-neon-yellow bg-neon-yellow/8 ring-1 ring-neon-yellow/50"
                  : "border-surface-border bg-surface-card hover:border-gray-500 hover:bg-surface-dark"
                }
              `}
            >
              {recommended && (
                <span className="absolute top-3 right-3 px-1.5 py-0.5 bg-neon-yellow/20 text-neon-yellow text-[10px] font-medium rounded">
                  Recommended
                </span>
              )}

              <div className={selected ? "text-neon-yellow" : "text-gray-400"}>
                {icon}
              </div>

              <div>
                <p className={`text-sm font-semibold ${selected ? "text-white" : "text-gray-300"}`}>
                  {title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">{description}</p>
              </div>

              {selected && (
                <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-neon-yellow" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
