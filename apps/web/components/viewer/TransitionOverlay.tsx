"use client";

import { useEffect, useState } from "react";

export type TransitionStyle = "NONE" | "FADE" | "CROSSFADE" | "SLIDE_LEFT";

export interface TransitionOverlayProps {
  active: boolean;
  style: TransitionStyle;
  durationMs: number;
  onComplete: () => void;
}

export function TransitionOverlay({
  active,
  style,
  durationMs,
  onComplete,
}: TransitionOverlayProps) {
  const [phase, setPhase] = useState<"idle" | "in" | "out">("idle");

  useEffect(() => {
    if (!active || style === "NONE") {
      if (active) onComplete();
      return;
    }

    setPhase("in");
    const halfDuration = durationMs / 2;

    const inTimer = setTimeout(() => {
      setPhase("out");
    }, halfDuration);

    const outTimer = setTimeout(() => {
      setPhase("idle");
      onComplete();
    }, durationMs);

    return () => {
      clearTimeout(inTimer);
      clearTimeout(outTimer);
    };
  }, [active, style, durationMs, onComplete]);

  if (!active || phase === "idle" || style === "NONE") return null;

  const animationClass =
    style === "FADE" || style === "CROSSFADE"
      ? phase === "in"
        ? "viewer-fade-in"
        : "viewer-fade-out"
      : style === "SLIDE_LEFT"
        ? phase === "in"
          ? "viewer-slide-in"
          : "viewer-slide-out"
        : "";

  return (
    <div
      className={`absolute inset-0 z-20 ${animationClass}`}
      style={{
        backgroundColor: "var(--token-comp-viewer-overlay-bg)",
        animationDuration: `${durationMs / 2}ms`,
      }}
      role="status"
      aria-live="polite"
      aria-label="Loading next chapter"
    />
  );
}
