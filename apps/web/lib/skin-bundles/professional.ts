/**
 * Complete token bundle for the "Clean Professional" skin.
 *
 * Sleek and corporate-friendly with a blue accent on light background.
 * Values match the current professional skin in skins.ts.
 */

import { SkinId } from "@guide-rail/shared";
import type { SkinTokens } from "@guide-rail/shared";

const FONT = "'Inter', system-ui, sans-serif";

export const professionalTokens: SkinTokens = {
  id: SkinId.Professional,
  name: "Clean Professional",
  description: "Sleek and corporate-friendly",

  color: {
    background: {
      default: "#ffffff",
      elevated: "#f9fafb",
    },
    border: {
      subtle: "#e5e7eb",
    },
    text: {
      primary: "#1a1a1a",
      secondary: "#6b7280",
    },
    accent: "#2563eb",
    accentHover: "#1d4ed8",
    semantic: {
      success: "#16a34a",
      warning: "#ca8a04",
      error: "#dc2626",
      actionDo: "#ca8a04",
      actionReflect: "#7c3aed",
    },
  },

  text: {
    heading: {
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
    sm: "2px",
    md: "4px",
    lg: "4px",
  },

  shadow: {
    sm: "0 1px 2px 0 rgba(0,0,0,0.05)",
    md: "0 4px 6px -1px rgba(0,0,0,0.1)",
    lg: "0 25px 50px -12px rgba(0,0,0,0.25)",
  },

  component: {
    button: {
      primary: {
        variant: "solid",
        radius: "4px",
      },
      secondary: {
        variant: "outline",
        radius: "4px",
      },
    },
    chip: {
      background: "#2563eb20",
      text: "#2563eb",
      radius: "2px",
    },
    badge: {
      info: {
        background: "#2563eb10",
        text: "#2563eb",
      },
    },
    progress: {
      track: "#f9fafb",
      fill: "#2563eb",
      radius: "2px",
    },
    video: {
      frame: {
        radius: "4px",
        border: "1px solid #e5e7eb",
      },
    },
  },
};
