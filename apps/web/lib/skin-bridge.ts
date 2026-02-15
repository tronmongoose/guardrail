/**
 * Bridge between the legacy Skin interface and the new SkinTokens system.
 *
 * Provides bidirectional conversion so existing preview components keep working
 * while new code can use the richer token set.
 */

import type { Skin } from "./skins";
import type { SkinTokens, SkinId } from "@guide-rail/shared";

/** Default typography shared across all auto-converted skins */
const DEFAULT_TYPOGRAPHY: SkinTokens["text"] = {
  heading: {
    xl: { font: "inherit", size: "1.875rem", weight: "700", lineHeight: "1.2" },
    lg: { font: "inherit", size: "1.25rem", weight: "600", lineHeight: "1.3" },
    md: { font: "inherit", size: "1rem", weight: "600", lineHeight: "1.4" },
  },
  body: {
    md: { font: "inherit", size: "1rem", weight: "400", lineHeight: "1.6" },
    sm: { font: "inherit", size: "0.875rem", weight: "400", lineHeight: "1.5" },
  },
  label: {
    sm: { font: "inherit", size: "0.75rem", weight: "500", lineHeight: "1.4" },
  },
};

/**
 * Convert a legacy Skin to a full SkinTokens bundle.
 * Fills in typography, shadows, and semantic colors with sensible defaults.
 */
export function skinToTokens(skin: Skin): SkinTokens {
  const isRounded = skin.videoFrame === "rounded";
  const radiusTokens = {
    sm: isRounded ? "4px" : "2px",
    md: isRounded ? "8px" : "4px",
    lg: isRounded ? "16px" : "4px",
  };

  return {
    id: skin.id as SkinId,
    name: skin.name,
    description: skin.description,
    color: {
      background: {
        default: skin.colors.bg,
        elevated: skin.colors.bgSecondary,
      },
      border: { subtle: skin.colors.border },
      text: {
        primary: skin.colors.text,
        secondary: skin.colors.textMuted,
      },
      accent: skin.colors.accent,
      accentHover: skin.colors.accentHover,
      semantic: {
        success: "#22c55e",
        warning: "#eab308",
        error: "#ef4444",
        actionDo: "#eab308",
        actionReflect: "#ec4899",
      },
    },
    text: DEFAULT_TYPOGRAPHY,
    radius: radiusTokens,
    shadow: {
      sm: "0 1px 2px 0 rgba(0,0,0,0.05)",
      md: skin.cardStyle === "elevated"
        ? "0 4px 6px -1px rgba(0,0,0,0.1)"
        : "none",
      lg: "0 25px 50px -12px rgba(0,0,0,0.25)",
    },
    component: {
      button: {
        primary: {
          variant: skin.buttonStyle,
          radius: isRounded ? "9999px" : radiusTokens.md,
        },
        secondary: {
          variant: "outline",
          radius: radiusTokens.md,
        },
      },
      chip: {
        background: skin.colors.accent + "20",
        text: skin.colors.accent,
        radius: isRounded ? "9999px" : radiusTokens.sm,
      },
      badge: {
        info: {
          background: skin.colors.accent + "10",
          text: skin.colors.accent,
        },
      },
      progress: {
        track: skin.colors.bgSecondary,
        fill: skin.colors.accent,
        radius: radiusTokens.sm,
      },
      video: {
        frame: {
          radius: isRounded ? radiusTokens.lg : radiusTokens.sm,
          border: `1px solid ${skin.colors.border}`,
        },
      },
    },
  };
}

/**
 * Convert SkinTokens back to legacy Skin for backward compatibility.
 * Allows new token bundles to work with existing preview components.
 */
export function tokensToSkin(tokens: SkinTokens): Skin {
  const isRounded = parseInt(tokens.component.video.frame.radius) >= 12;
  return {
    id: tokens.id,
    name: tokens.name,
    description: tokens.description,
    colors: {
      bg: tokens.color.background.default,
      bgSecondary: tokens.color.background.elevated,
      text: tokens.color.text.primary,
      textMuted: tokens.color.text.secondary,
      accent: tokens.color.accent,
      accentHover: tokens.color.accentHover,
      border: tokens.color.border.subtle,
    },
    videoFrame: isRounded ? "rounded" : "sharp",
    buttonStyle: tokens.component.button.primary.variant,
    cardStyle: tokens.shadow.md === "none" ? "flat"
      : tokens.shadow.md.includes("rgba") ? "elevated"
      : "bordered",
  };
}

/**
 * Generate CSS custom properties from SkinTokens.
 * Emits both legacy --skin-* vars and new --token-* vars for gradual migration.
 */
export function getTokenCSSVars(tokens: SkinTokens): Record<string, string> {
  return {
    // Legacy CSS var names (backward compatible with getSkinCSSVars)
    "--skin-bg": tokens.color.background.default,
    "--skin-bg-secondary": tokens.color.background.elevated,
    "--skin-text": tokens.color.text.primary,
    "--skin-text-muted": tokens.color.text.secondary,
    "--skin-accent": tokens.color.accent,
    "--skin-accent-hover": tokens.color.accentHover,
    "--skin-border": tokens.color.border.subtle,
    // New token-based CSS vars
    "--token-color-bg-default": tokens.color.background.default,
    "--token-color-bg-elevated": tokens.color.background.elevated,
    "--token-color-border-subtle": tokens.color.border.subtle,
    "--token-color-text-primary": tokens.color.text.primary,
    "--token-color-text-secondary": tokens.color.text.secondary,
    "--token-color-accent": tokens.color.accent,
    "--token-color-accent-hover": tokens.color.accentHover,
    "--token-color-semantic-success": tokens.color.semantic.success,
    "--token-color-semantic-warning": tokens.color.semantic.warning,
    "--token-color-semantic-error": tokens.color.semantic.error,
    "--token-color-semantic-action-do": tokens.color.semantic.actionDo,
    "--token-color-semantic-action-reflect": tokens.color.semantic.actionReflect,
    "--token-radius-sm": tokens.radius.sm,
    "--token-radius-md": tokens.radius.md,
    "--token-radius-lg": tokens.radius.lg,
    "--token-shadow-sm": tokens.shadow.sm,
    "--token-shadow-md": tokens.shadow.md,
    "--token-shadow-lg": tokens.shadow.lg,
  };
}
