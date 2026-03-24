"use client";

import { useEffect, useRef } from "react";

interface BrandedTransitionScreenProps {
  variant: "intro" | "outro";
  sessionTitle: string;
  keyTakeaways: string[];
  onComplete: () => void;
  autoAdvanceMs?: number;
}

export function BrandedTransitionScreen({
  variant,
  sessionTitle,
  keyTakeaways,
  onComplete,
  autoAdvanceMs = 3500,
}: BrandedTransitionScreenProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (autoAdvanceMs <= 0) return;
    timerRef.current = setTimeout(onComplete, autoAdvanceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onComplete, autoAdvanceMs]);

  function handleClick() {
    if (timerRef.current) clearTimeout(timerRef.current);
    onComplete();
  }

  const firstTakeaway = keyTakeaways[0] ?? null;

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center cursor-pointer select-none"
      style={{
        background: "var(--token-color-bg-gradient, var(--token-color-bg-default, #0a0a0a))",
        borderTop: "3px solid var(--token-color-accent, #00e5ff)",
        animation: "branded-enter 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
      }}
      onClick={handleClick}
      role="dialog"
      aria-modal="true"
      aria-label={variant === "intro" ? "Lesson introduction" : "Lesson summary"}
    >
      <style>{`
        @keyframes branded-enter {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes branded-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
      `}</style>

      <div className="w-full max-w-lg px-8 text-center">
        {variant === "intro" ? (
          <>
            {/* Eyebrow */}
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ color: "var(--token-color-accent, #00e5ff)", fontFamily: "var(--token-text-label-sm-font, inherit)" }}
            >
              Now Playing
            </p>

            {/* Accent divider */}
            <div
              className="mx-auto mb-4 h-px w-16"
              style={{ backgroundColor: "var(--token-color-accent, #00e5ff)", opacity: 0.4 }}
            />

            {/* Session title */}
            <h1
              className="mb-3"
              style={{
                color: "var(--token-color-text-primary, #ffffff)",
                fontFamily: "var(--token-text-heading-xl-font, inherit)",
                fontSize: "var(--token-text-heading-xl-size, 2rem)",
                fontWeight: "var(--token-text-heading-xl-weight, 700)",
                lineHeight: "var(--token-text-heading-xl-line-height, 1.15)",
              }}
            >
              {sessionTitle}
            </h1>

            {/* Subtitle from first takeaway */}
            {firstTakeaway && (
              <p
                className="mb-8 leading-snug"
                style={{
                  color: "var(--token-color-text-secondary, rgba(255,255,255,0.6))",
                  fontFamily: "var(--token-text-body-md-font, inherit)",
                  fontSize: "var(--token-text-body-md-size, 1rem)",
                }}
              >
                {firstTakeaway}
              </p>
            )}

            {/* Tap hint */}
            <p
              className="text-xs tracking-wide"
              style={{
                color: "var(--token-color-text-secondary, rgba(255,255,255,0.4))",
                animation: "branded-pulse 2s ease-in-out infinite",
              }}
            >
              Tap to start
            </p>
          </>
        ) : (
          <>
            {/* Eyebrow */}
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ color: "var(--token-color-accent, #00e5ff)", fontFamily: "var(--token-text-label-sm-font, inherit)" }}
            >
              Lesson Complete
            </p>

            {/* Accent divider */}
            <div
              className="mx-auto mb-4 h-px w-16"
              style={{ backgroundColor: "var(--token-color-accent, #00e5ff)", opacity: 0.4 }}
            />

            {/* Session title */}
            <h1
              className="mb-5"
              style={{
                color: "var(--token-color-text-primary, #ffffff)",
                fontFamily: "var(--token-text-heading-xl-font, inherit)",
                fontSize: "var(--token-text-heading-xl-size, 2rem)",
                fontWeight: "var(--token-text-heading-xl-weight, 700)",
                lineHeight: "var(--token-text-heading-xl-line-height, 1.15)",
              }}
            >
              {sessionTitle}
            </h1>

            {/* Key takeaways */}
            {keyTakeaways.length > 0 && (
              <ul className="text-left space-y-2 mb-8 mx-auto max-w-sm">
                {keyTakeaways.map((t, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: "var(--token-color-accent, #00e5ff)" }}
                    />
                    <span
                      style={{
                        color: "var(--token-color-text-secondary, rgba(255,255,255,0.7))",
                        fontFamily: "var(--token-text-body-md-font, inherit)",
                        fontSize: "var(--token-text-body-md-size, 1rem)",
                      }}
                    >
                      {t}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Tap hint */}
            <p
              className="text-xs tracking-wide"
              style={{
                color: "var(--token-color-text-secondary, rgba(255,255,255,0.4))",
                animation: "branded-pulse 2s ease-in-out infinite",
              }}
            >
              Tap to continue
            </p>
          </>
        )}
      </div>
    </div>
  );
}
