"use client";

interface SimpleTransitionScreenProps {
  variant: "intro" | "outro";
  sessionTitle: string;
  onComplete: () => void;
}

export function SimpleTransitionScreen({
  variant,
  sessionTitle,
  onComplete,
}: SimpleTransitionScreenProps) {
  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center"
      style={{ backgroundColor: "var(--token-color-bg-elevated, #1a1a1a)" }}
      role="dialog"
      aria-modal="true"
      aria-label={variant === "intro" ? "Ready to start lesson" : "Lesson complete"}
    >
      <div className="w-full max-w-md px-8 text-center space-y-6">
        {/* Session title */}
        <h2
          className="text-xl font-semibold leading-snug"
          style={{ color: "var(--token-color-text-primary, #ffffff)" }}
        >
          {sessionTitle}
        </h2>

        {/* CTA button */}
        <button
          onClick={onComplete}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 active:opacity-75"
          style={{
            backgroundColor: "var(--token-color-accent, #00e5ff)",
            color: "var(--token-color-bg-default, #000000)",
          }}
        >
          {variant === "intro" ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
              Play Lesson
            </>
          ) : (
            <>
              Next Lesson
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
