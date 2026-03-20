/**
 * Complete token bundle for the "Warm & Friendly" skin.
 *
 * Inviting and approachable with an orange accent on a warm background.
 * Values match the current warm skin in skins.ts.
 */

import { SkinId } from "@guide-rail/shared";
import type { SkinTokens } from "@guide-rail/shared";

const FONT = "'Inter', system-ui, sans-serif";

export const warmTokens: SkinTokens = {
  id: SkinId.Warm,
  name: "Warm & Friendly",
  description: "Inviting and approachable",

  color: {
    background: {
      default: "#fef7ed",
      elevated: "#fff7ed",
      hero: "#fef7ed",
      surface: "#fff7ed",
    },
    border: {
      subtle: "#fed7aa",
    },
    text: {
      primary: "#451a03",
      secondary: "#78350f",
    },
    accent: { primary: "#ea580c", secondary: "#c2410c" },
    accentHover: "#c2410c",
    semantic: {
      success: "#16a34a",
      warning: "#ca8a04",
      error: "#dc2626",
      actionDo: "#ca8a04",
      actionReflect: "#c026d3",
    },
  },

  text: {
    heading: {
      display: { font: FONT, size: "2.25rem", weight: "700", lineHeight: "1.1" },
      xl: { font: FONT, size: "1.875rem", weight: "700", lineHeight: "1.2" },
      lg: { font: FONT, size: "1.25rem", weight: "600", lineHeight: "1.3" },
      md: { font: FONT, size: "1rem", weight: "600", lineHeight: "1.4" },
    },
    body: {
      md: { font: FONT, size: "1rem", weight: "400", lineHeight: "1.6" },
      sm: { font: FONT, size: "0.875rem", weight: "400", lineHeight: "1.5" },
    },
    label: {
      sm: { font: FONT, size: "0.75rem", weight: "500", lineHeight: "1.4" },
    },
  },

  radius: {
    sm: "4px",
    md: "8px",
    lg: "16px",
  },

  shadow: {
    sm: "0 1px 2px 0 rgba(0,0,0,0.05)",
    md: "none",
    lg: "0 25px 50px -12px rgba(0,0,0,0.25)",
  },

  motion: {
    transition: { duration: "300ms", easing: "ease-out" },
  },

  component: {
    button: {
      primary: {
        variant: "soft",
        radius: "9999px",
      },
      secondary: {
        variant: "outline",
        radius: "8px",
      },
    },
    card: {
      radius: "16px",
      shadow: "none",
      border: "1px solid #fed7aa",
    },
    chip: {
      background: "#ea580c20",
      text: "#ea580c",
      radius: "9999px",
    },
    badge: {
      info: {
        background: "#ea580c10",
        text: "#ea580c",
      },
    },
    progress: {
      track: "#fff7ed",
      fill: "#ea580c",
      radius: "4px",
    },
    video: {
      frame: {
        radius: "16px",
        border: "1px solid #fed7aa",
      },
    },
    viewer: {
      chapterRail: {
        background: "#fff7ed",
        activeChapter: "#ea580c15",
        divider: "#fed7aa",
      },
      overlay: {
        titleCard: {
          background: "#fef7edee",
          text: "#451a03",
        },
        transition: {
          style: "FADE",
          durationMs: 500,
        },
      },
      controlsTint: "#ea580c",
    },
  },
};
