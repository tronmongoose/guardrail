/**
 * Complete token bundle for the "Cosmic Studio" skin.
 *
 * Space exploration — deep purple cosmos with magenta-to-pink gradient accents.
 */

import { SkinId } from "@guide-rail/shared";
import type { SkinTokens } from "@guide-rail/shared";

const FONT = "'Inter', system-ui, sans-serif";

export const cosmicStudioTokens: SkinTokens = {
  id: SkinId.CosmicStudio,
  name: "Cosmic Studio",
  description: "Space exploration — deep purple cosmos with magenta-to-pink gradient accents",

  color: {
    background: {
      default: "#1A0A2E",
      elevated: "#2D1B4E",
      hero: "#160826",
      surface: "#231040",
    },
    border: { subtle: "#2D1B4E" },
    text: {
      primary: "#FFFFFF",
      secondary: "#C4A8E0",
    },
    accent: { primary: "#C84FD8", secondary: "#F06292" },
    accentHover: "#D966E8",
    semantic: {
      success: "#4CAF7D",
      warning: "#eab308",
      error: "#ef4444",
      actionDo: "#C84FD8",
      actionReflect: "#9B59D0",
    },
  },

  text: {
    heading: {
      // JSON heading.display → display (72px)
      display: { font: FONT, size: "72px", weight: "700", lineHeight: "1.1" },
      // JSON heading.lg (48px) → xl slot
      xl: { font: FONT, size: "48px", weight: "700", lineHeight: "1.15" },
      // JSON heading.md (32px) → lg slot
      lg: { font: FONT, size: "32px", weight: "600", lineHeight: "1.2" },
      // JSON heading.sm (20px) → md slot
      md: { font: FONT, size: "20px", weight: "600", lineHeight: "1.3" },
    },
    body: {
      md: { font: FONT, size: "16px", weight: "400", lineHeight: "1.6" },
      sm: { font: FONT, size: "14px", weight: "400", lineHeight: "1.5" },
    },
    label: {
      sm: { font: FONT, size: "11px", weight: "600", lineHeight: "1.4" },
    },
  },

  radius: { sm: "4px", md: "8px", lg: "12px" },

  shadow: {
    sm: "0 0 12px rgba(200, 79, 216, 0.15)",
    md: "0 0 24px rgba(200, 79, 216, 0.25)",
    lg: "0 0 48px rgba(200, 79, 216, 0.35)",
  },

  motion: {
    transition: { duration: "300ms", easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
  },

  component: {
    button: {
      // Full gradient: linear-gradient(135deg, #9B3BC8 0%, #E040FB 50%, #F06292 100%)
      // Applied by components reading color.accent.primary/secondary
      primary: { variant: "gradient", radius: "8px" },
      secondary: { variant: "outline", radius: "8px" },
    },
    card: {
      radius: "12px",
      shadow: "0 0 24px rgba(200, 79, 216, 0.15)",
      border: "1px solid #3D1F5E",
    },
    chip: { background: "#3D1F5E", text: "#C4A8E0", radius: "9999px" },
    badge: { info: { background: "#2D1B4E", text: "#C84FD8" } },
    progress: {
      track: "#2D1B4E",
      // Gradient fill — interface fill: string accepts CSS gradient strings
      fill: "linear-gradient(90deg, #9B3BC8 0%, #F06292 100%)",
      radius: "9999px",
    },
    video: { frame: { radius: "8px", border: "1px solid #3D1F5E" } },
    viewer: {
      chapterRail: {
        background: "#1A0A2E",
        activeChapter: "rgba(200, 79, 216, 0.1)",
        // Mapped from activeRowBorder (#F06292) — closest available field
        divider: "#F06292",
      },
      overlay: {
        titleCard: { background: "rgba(26, 10, 46, 0.95)", text: "#FFFFFF" },
        transition: { style: "FADE", durationMs: 500 },
      },
      controlsTint: "#C84FD8",
    },
  },
};
