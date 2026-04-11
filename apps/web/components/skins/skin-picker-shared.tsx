"use client";

import { useState, useEffect, useCallback } from "react";
import { getSkinTokens } from "@/lib/skin-bundles/registry";
import type { SkinTokens } from "@guide-rail/shared";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CustomSkinEntry {
  id: string;
  name: string;
  tokens: SkinTokens;
}

// ── Per-skin themed SVG icon paths (24x24 viewBox, stroke-based) ─────────────

export const SKIN_ICONS: Record<string, string> = {
  // CLASSIC
  "classic-minimal":   "M4 6h16M4 11h16M4 16h10",
  "classic-studio":    "M3 5h18v12H3z M9 17v2m6-2v2M7 19h10",
  "classic-playful":   "M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z",
  "classic-bold":      "M4 5h16v4H4z M4 15h16v4H4z M7 9v6",
  "classic-elegant":   "M12 2l6 9-6 11-6-11z M6 11h12",
  // CREATIVE
  "creative-retro":    "M4 5h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 11h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z",
  "creative-chalkboard": "M2 4h20v14H2z M8 22l4-4 4 4",
  "creative-sheet-music": "M9 19V6l12-3v13M9 19c0 1.1-1.34 2-3 2s-3-.9-3-2 1.34-2 3-2 3 .9 3 2zm12-3c0 1.1-1.34 2-3 2s-3-.9-3-2 1.34-2 3-2 3 .9 3 2zM9 10l12-3",
  "creative-literary": "M4 19.5A2.5 2.5 0 016.5 17H20M4 4h16v13H6.5A2.5 2.5 0 014 19.5zM8 9h8M8 13h5",
  "creative-code":     "M7 8l-4 4 4 4M17 8l4 4-4 4M14 4l-4 16",
  "creative-esports":  "M6 11h2M10 8v6M16 8v6M18 11h-2M8 3h8l3 6-3 10H8L5 9z",
  // LIFESTYLE
  "lifestyle-glam":    "M12 3a6 6 0 00-6 6c0 4 6 12 6 12s6-8 6-12a6 6 0 00-6-6zm0 7a1 1 0 110-2 1 1 0 010 2z",
  "lifestyle-wanderlust": "M12 2a10 10 0 100 20A10 10 0 0012 2zm0 0v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07",
  "lifestyle-graffiti": "M17 3a2.85 2.83 0 014 4L7.5 20.5 2 22l1.5-5.5z M15 5l4 4",
  "lifestyle-zen":     "M12 22a10 10 0 110-20 10 10 0 010 20zM7 12c0-2.76 2.24-5 5-5m5 5c0 2.76-2.24 5-5 5",
  "lifestyle-science": "M9 2h6l2 8H7z M7 10c0 5 2 8 5 12 3-4 5-7 5-12",
  "lifestyle-podcast": "M12 2a3 3 0 013 3v7a3 3 0 01-6 0V5a3 3 0 013-3zM19 10v2a7 7 0 01-14 0v-2M12 19v3M9 22h6",
  // ACTIVITY
  "activity-hologram": "M12 2l10 6v8l-10 6L2 16V8z M12 2v20M2 8l10 6 10-6",
  "activity-workshop": "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  "activity-culinary": "M8 3h8v3H8z M5 6h14v9a4 4 0 01-4 4H9a4 4 0 01-4-4V6z M2 9h3m16 0h3 M12 10v5",
  "activity-sports":   "M12 2a10 10 0 100 20A10 10 0 0012 2zM4.93 7.93l14.14 14.14M19.07 7.93L4.93 22.07M2 12h20M12 2v20",
  "activity-kids":     "M12 2a10 10 0 100 20A10 10 0 0012 2zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01",
  "activity-fashion":  "M16 2l3 4H5l3-4h8z M5 6h14l-2 14H7z M9 10h6",
  // ENTERTAINMENT
  "entertainment-film-noir": "M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z",
  "entertainment-festival":  "M12 1l2.27 6.97H22l-6.18 4.5 2.36 7.27L12 15.5l-6.18 4.24 2.36-7.27L2 7.97h7.73z",
  // MUSIC
  "music-soundwave":  "M2 12h2m2-5v10m2-8v6m2-9v12m2-7v2m2-6v10m2-8v6m2-5v4m2-2v0",
  "music-backstage":  "M9 18V5l12-2v13M6 21a3 3 0 100-6 3 3 0 000 6zm12-2a3 3 0 100-6 3 3 0 000 6z",
  "music-dancefloor": "M12 2a10 10 0 100 20A10 10 0 0012 2zm0 0v20M2 12h20M6.34 6.34l11.32 11.32M17.66 6.34L6.34 17.66",
  // MEDIA
  "media-hero":    "M3 5h18v14H3z M7 2l5 3 5-3M7 22l5-3 5 3",
  "media-film":    "M15 10l4.55-2.28A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.9L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  "media-lens":    "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zm10 4a3 3 0 11-6 0 3 3 0 016 0z",
  "media-pulse":   "M22 12h-4l-3 9L9 3l-3 9H2",
  // PROFESSIONAL
  "pro-mindspace":      "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  "cosmic-studio":      "M12 12m-4 0a4 4 0 108 0 4 4 0 10-8 0M12 2v2m0 16v2M2 12h2m16 0h2m-3.51-6.49l-1.42 1.42M6.93 17.07l-1.42 1.42M20.49 17.51l-1.42-1.42M6.93 6.93L5.51 5.51",
  "pro-atelier":        "M3 17V7l9-5 9 5v10l-9 5-9-5z M12 2v20M3 7l9 5 9-5",
  "pro-startup":        "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2 2.9-2.5 4-3.5C15 14 17.5 12 19 11.5c1.5-.5 3.5-1 4-2-.5-1-2.5-3-4-3.5-1.5-.5-4 0-6 1C11 8 10.5 11 9.5 12c-1 1-2.4 3.2-5 4.5z M14 4s0 2-3 4-4 5-4 5",
  "pro-wellness":       "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  "pro-home-gym":       "M6 7h3v10H6z M15 7h3v10h-3z M9 11h6v2H9z",
  "pro-creator":        "M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z",
  "pro-luxury":         "M12 2l2.5 5.5 6 .5-4.5 4 1 6-5-3-5 3 1-6-4.5-4 6-.5z",
  "pro-street-fitness": "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  "pro-mind-map":       "M12 12a2 2 0 100-4 2 2 0 000 4zM12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  "pro-book-nook":      "M4 19.5A2.5 2.5 0 016.5 17H20M4 4h16v13H6.5A2.5 2.5 0 014 19.5zM9 9h6M9 13h4",
  "pro-adventure":      "M3 17L9 5l3 7 2-3 4 8H3z M17 9l2-4",
  "ai-command-center":  "M4 6h16v2H4zM4 11h16v2H4zM4 16h8v2H4z M15 16l2 2 4-4",
};

// ── Themed skin icon (accent-colored SVG on skin background) ─────────────────

export function SkinIcon({ skinId }: { skinId: string }) {
  const tokens = getSkinTokens(skinId);
  const bg = tokens.color.background.default;
  const accent = tokens.color.accent.primary;
  const iconPath = SKIN_ICONS[skinId];
  return (
    <div
      className="flex-shrink-0 w-8 h-8 rounded-md overflow-hidden flex items-center justify-center"
      style={{
        backgroundColor: bg,
        border: `1.5px solid ${accent}55`,
      }}
    >
      {iconPath ? (
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke={accent}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={iconPath} />
        </svg>
      ) : (
        <div
          className="w-4 h-4 rounded-sm"
          style={{ backgroundColor: accent }}
        />
      )}
    </div>
  );
}

// ── Category icon SVG ────────────────────────────────────────────────────────

export function CategoryIcon({ path, size = 14 }: { path: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0"
    >
      <path d={path} />
    </svg>
  );
}

// ── Custom skins hook ────────────────────────────────────────────────────────

export function useCustomSkins() {
  const [customSkins, setCustomSkins] = useState<CustomSkinEntry[]>([]);

  const reload = useCallback(() => {
    fetch("/api/skins/custom")
      .then((r) => r.json())
      .then((data: CustomSkinEntry[]) => setCustomSkins(data))
      .catch(() => {});
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { customSkins, reloadCustomSkins: reload };
}
