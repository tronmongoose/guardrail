/**
 * Skin definitions for the learner experience.
 * Each skin defines colors, styles, and visual treatment.
 */

export interface Skin {
  id: string;
  name: string;
  description: string;
  colors: {
    bg: string;
    bgSecondary: string;
    text: string;
    textMuted: string;
    accent: string;
    accentHover: string;
    border: string;
  };
  videoFrame: "rounded" | "sharp";
  buttonStyle: "gradient" | "solid" | "soft" | "outline";
  cardStyle: "elevated" | "flat" | "bordered";
}

export const SKINS: Record<string, Skin> = {
  default: {
    id: "default",
    name: "Dark Neon",
    description: "Bold and modern with vibrant accents",
    colors: {
      bg: "#0a0a0f",
      bgSecondary: "#111118",
      text: "#ffffff",
      textMuted: "#9ca3af",
      accent: "#00fff0",
      accentHover: "#00ccc0",
      border: "#1f2937",
    },
    videoFrame: "rounded",
    buttonStyle: "gradient",
    cardStyle: "bordered",
  },
  professional: {
    id: "professional",
    name: "Clean Professional",
    description: "Sleek and corporate-friendly",
    colors: {
      bg: "#ffffff",
      bgSecondary: "#f9fafb",
      text: "#1a1a1a",
      textMuted: "#6b7280",
      accent: "#2563eb",
      accentHover: "#1d4ed8",
      border: "#e5e7eb",
    },
    videoFrame: "sharp",
    buttonStyle: "solid",
    cardStyle: "elevated",
  },
  warm: {
    id: "warm",
    name: "Warm & Friendly",
    description: "Inviting and approachable",
    colors: {
      bg: "#fef7ed",
      bgSecondary: "#fff7ed",
      text: "#451a03",
      textMuted: "#78350f",
      accent: "#ea580c",
      accentHover: "#c2410c",
      border: "#fed7aa",
    },
    videoFrame: "rounded",
    buttonStyle: "soft",
    cardStyle: "flat",
  },
  minimal: {
    id: "minimal",
    name: "Minimal Zen",
    description: "Clean and distraction-free",
    colors: {
      bg: "#fafafa",
      bgSecondary: "#f4f4f5",
      text: "#171717",
      textMuted: "#71717a",
      accent: "#525252",
      accentHover: "#3f3f46",
      border: "#e4e4e7",
    },
    videoFrame: "sharp",
    buttonStyle: "outline",
    cardStyle: "flat",
  },
};

export const SKIN_IDS = Object.keys(SKINS) as (keyof typeof SKINS)[];

export function getSkin(skinId: string): Skin {
  return SKINS[skinId] || SKINS.default;
}

/**
 * Generate CSS custom properties for a skin
 */
export function getSkinCSSVars(skin: Skin): Record<string, string> {
  return {
    "--skin-bg": skin.colors.bg,
    "--skin-bg-secondary": skin.colors.bgSecondary,
    "--skin-text": skin.colors.text,
    "--skin-text-muted": skin.colors.textMuted,
    "--skin-accent": skin.colors.accent,
    "--skin-accent-hover": skin.colors.accentHover,
    "--skin-border": skin.colors.border,
  };
}
