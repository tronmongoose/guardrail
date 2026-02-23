"use client";

import { useEffect, useState } from "react";

export type OverlayKind =
  | "TITLE_CARD"
  | "CHAPTER_TITLE"
  | "KEY_POINTS"
  | "LOWER_THIRD"
  | "CTA"
  | "OUTRO";

export type OverlayPositionType = "CENTER" | "BOTTOM" | "TOP" | "LOWER_THIRD";

export interface ContentOverlayItem {
  id: string;
  type: OverlayKind;
  content: Record<string, unknown>;
  durationMs: number;
  position: OverlayPositionType;
}

export interface ContentOverlayProps {
  overlay: ContentOverlayItem | null;
  onDismiss: (id: string) => void;
}

const POSITION_CLASSES: Record<OverlayPositionType, string> = {
  CENTER: "items-center justify-center",
  TOP: "items-center justify-start pt-12",
  BOTTOM: "items-center justify-end pb-12",
  LOWER_THIRD: "items-start justify-end pb-4 pl-4",
};

export function ContentOverlay({ overlay, onDismiss }: ContentOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!overlay) {
      setVisible(false);
      return;
    }

    // Trigger entrance animation
    const enterTimer = setTimeout(() => setVisible(true), 50);

    // Auto-dismiss after duration
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(overlay.id), 300);
    }, overlay.durationMs);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(dismissTimer);
    };
  }, [overlay, onDismiss]);

  if (!overlay) return null;

  const title = (overlay.content.title as string) ?? "";
  const subtitle = (overlay.content.subtitle as string) ?? "";
  const points = (overlay.content.points as string[]) ?? [];

  return (
    <div
      className={`absolute inset-0 z-10 flex pointer-events-none ${POSITION_CLASSES[overlay.position]}`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`max-w-lg rounded-xl px-6 py-4 transition-all duration-300 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
        style={{
          backgroundColor: "var(--token-comp-viewer-overlay-bg)",
          color: "var(--token-comp-viewer-overlay-text)",
        }}
      >
        {overlay.type === "TITLE_CARD" && (
          <>
            {title && <h2 className="text-xl font-bold mb-1">{title}</h2>}
            {subtitle && (
              <p className="text-sm opacity-80">{subtitle}</p>
            )}
          </>
        )}

        {overlay.type === "CHAPTER_TITLE" && (
          <h3 className="text-lg font-semibold">{title}</h3>
        )}

        {overlay.type === "KEY_POINTS" && (
          <div>
            {title && <h3 className="text-sm font-semibold mb-2">{title}</h3>}
            <ul className="space-y-1">
              {points.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--token-color-accent)" }} />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {overlay.type === "LOWER_THIRD" && (
          <div className="flex items-center gap-3">
            {title && <span className="text-sm font-semibold">{title}</span>}
            {subtitle && (
              <span className="text-xs opacity-70">{subtitle}</span>
            )}
          </div>
        )}

        {overlay.type === "CTA" && (
          <div className="text-center">
            {title && <p className="text-sm font-medium mb-1">{title}</p>}
            {subtitle && (
              <p className="text-xs opacity-70">{subtitle}</p>
            )}
          </div>
        )}

        {overlay.type === "OUTRO" && (
          <div className="text-center">
            {title && <h2 className="text-xl font-bold mb-1">{title}</h2>}
            {subtitle && (
              <p className="text-sm opacity-80">{subtitle}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
