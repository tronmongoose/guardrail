/**
 * Complete token bundle for the "Dark Neon" skin (default).
 *
 * Bold and modern with vibrant neon accents on a dark background.
 * Values match the current default skin in skins.ts.
 */

import { SkinId } from "@guide-rail/shared";
import type { SkinTokens } from "@guide-rail/shared";

const FONT = "'Inter', system-ui, sans-serif";

export const defaultTokens: SkinTokens = {
  id: SkinId.Default,
  name: "Dark Neon",
  description: "Bold and modern with vibrant accents",

  color: {
    background: {
      default: "#0a0a0f",
      elevated: "#111118",
      hero: "#0a0a0f",
      surface: "#111118",
    },
    border: {
      subtle: "#1f2937",
    },
    text: {
      primary: "#ffffff",
      secondary: "#9ca3af",
    },
    accent: { primary: "#00fff0", secondary: "#00ccc0" },
    accentHover: "#00ccc0",
    semantic: {
      success: "#22c55e",
      warning: "#eab308",
      error: "#ef4444",
      actionDo: "#eab308",
      actionReflect: "#ec4899",
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
    sm: "0 1px 2px 0 rgba(0,0,0,0.3)",
    md: "none",
    lg: "0 25px 50px -12px rgba(0,0,0,0.5)",
  },

  motion: {
    transition: { duration: "300ms", easing: "ease-out" },
  },

  component: {
    button: {
      primary: {
        variant: "gradient",
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
      border: "1px solid #1f2937",
    },
    chip: {
      background: "#00fff020",
      text: "#00fff0",
      radius: "9999px",
    },
    badge: {
      info: {
        background: "#00fff010",
        text: "#00fff0",
      },
    },
    progress: {
      track: "#111118",
      fill: "#00fff0",
      radius: "4px",
    },
    video: {
      frame: {
        radius: "16px",
        border: "1px solid #1f2937",
      },
    },
    viewer: {
      chapterRail: {
        background: "#111118",
        activeChapter: "#00fff020",
        divider: "#1f2937",
      },
      overlay: {
        titleCard: {
          background: "#0a0a0fdd",
          text: "#ffffff",
        },
        transition: {
          style: "FADE",
          durationMs: 500,
        },
      },
      controlsTint: "#00fff0",
    },
  },
};
