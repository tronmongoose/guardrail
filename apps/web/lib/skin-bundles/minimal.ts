/**
 * Complete token bundle for the "Minimal Zen" skin.
 *
 * This is the reference implementation showing the full SkinTokens shape.
 * Values match the current Minimal skin in skins.ts and the Figma Minimal design.
 */

import { SkinId } from "@guide-rail/shared";
import type { SkinTokens } from "@guide-rail/shared";

const FONT = "'Inter', system-ui, sans-serif";

export const minimalTokens: SkinTokens = {
  id: SkinId.Minimal,
  name: "Minimal Zen",
  description: "Clean and distraction-free",

  color: {
    background: {
      default: "#fafafa",
      elevated: "#f4f4f5",
    },
    border: {
      subtle: "#e4e4e7",
    },
    text: {
      primary: "#171717",
      secondary: "#71717a",
    },
    accent: "#525252",
    accentHover: "#3f3f46",
    semantic: {
      success: "#16a34a",
      warning: "#ca8a04",
      error: "#dc2626",
      actionDo: "#ca8a04",
      actionReflect: "#a855f7",
    },
  },

  text: {
    heading: {
      xl: { font: FONT, size: "1.875rem", weight: "600", lineHeight: "1.2" },
      lg: { font: FONT, size: "1.25rem", weight: "600", lineHeight: "1.3" },
      md: { font: FONT, size: "1rem", weight: "500", lineHeight: "1.4" },
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
    sm: "none",
    md: "none",
    lg: "0 25px 50px -12px rgba(0,0,0,0.25)",
  },

  component: {
    button: {
      primary: {
        variant: "outline",
        radius: "4px",
      },
      secondary: {
        variant: "outline",
        radius: "4px",
      },
    },
    chip: {
      background: "#52525220",
      text: "#525252",
      radius: "2px",
    },
    badge: {
      info: {
        background: "#52525210",
        text: "#525252",
      },
    },
    progress: {
      track: "#f4f4f5",
      fill: "#525252",
      radius: "2px",
    },
    video: {
      frame: {
        radius: "4px",
        border: "1px solid #e4e4e7",
      },
    },
  },
};
