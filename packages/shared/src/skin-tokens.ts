import { z } from "zod";

// ---------------------------------------------------------------------------
// Skin ID
// ---------------------------------------------------------------------------

/**
 * Canonical skin identifiers. Must match database `Program.skinId` values.
 * Extend this object when adding new skins.
 */
export const SkinId = {
  Default: "default",
  Professional: "professional",
  Warm: "warm",
  Minimal: "minimal",
} as const;

export type SkinId = (typeof SkinId)[keyof typeof SkinId];

export const SkinIdSchema = z.enum(["default", "professional", "warm", "minimal"]);

// ---------------------------------------------------------------------------
// Color Tokens
// ---------------------------------------------------------------------------

export interface ColorTokens {
  background: {
    /** Main page/canvas background */
    default: string;
    /** Cards, headers, secondary surfaces */
    elevated: string;
  };
  border: {
    /** Default borders, dividers */
    subtle: string;
  };
  text: {
    /** Headings, body copy */
    primary: string;
    /** Captions, helper text */
    secondary: string;
  };
  /** Brand accent (CTA, links, active states) */
  accent: string;
  /** Accent on hover/press */
  accentHover: string;
  /** Semantic colors for status and action types */
  semantic: {
    success: string;
    warning: string;
    error: string;
    /** DO action type color */
    actionDo: string;
    /** REFLECT action type color */
    actionReflect: string;
  };
}

// ---------------------------------------------------------------------------
// Typography Tokens
// ---------------------------------------------------------------------------

export interface TypographyStyle {
  /** CSS font-family value */
  font: string;
  /** CSS font-size, e.g. "1.875rem" */
  size: string;
  /** CSS font-weight, e.g. "700" */
  weight: string;
  /** CSS line-height, e.g. "1.2" */
  lineHeight: string;
}

export interface TypographyTokens {
  heading: {
    xl: TypographyStyle;
    lg: TypographyStyle;
    md: TypographyStyle;
  };
  body: {
    md: TypographyStyle;
    sm: TypographyStyle;
  };
  label: {
    sm: TypographyStyle;
  };
}

// ---------------------------------------------------------------------------
// Radius & Shadow Tokens
// ---------------------------------------------------------------------------

export interface RadiusTokens {
  /** Small: checkboxes, badges (e.g. "4px") */
  sm: string;
  /** Medium: cards, inputs (e.g. "8px") */
  md: string;
  /** Large: modals, hero sections (e.g. "16px") */
  lg: string;
}

export interface ShadowTokens {
  sm: string;
  md: string;
  lg: string;
}

// ---------------------------------------------------------------------------
// Component Tokens
// ---------------------------------------------------------------------------

export interface ButtonTokens {
  /** Visual style strategy */
  variant: "gradient" | "solid" | "soft" | "outline";
  /** Border radius for buttons */
  radius: string;
}

export interface ChipTokens {
  background: string;
  text: string;
  radius: string;
}

export interface BadgeTokens {
  info: {
    background: string;
    text: string;
  };
}

export interface ProgressTokens {
  /** Track (unfilled) background */
  track: string;
  /** Fill color */
  fill: string;
  radius: string;
}

export interface VideoFrameTokens {
  /** Border radius for video containers */
  radius: string;
  /** Border treatment, e.g. "1px solid #e4e4e7" */
  border: string;
}

export interface ComponentTokens {
  button: {
    primary: ButtonTokens;
    secondary: ButtonTokens;
  };
  chip: ChipTokens;
  badge: BadgeTokens;
  progress: ProgressTokens;
  video: {
    frame: VideoFrameTokens;
  };
}

// ---------------------------------------------------------------------------
// Top-level SkinTokens
// ---------------------------------------------------------------------------

/**
 * Complete design token bundle for a skin.
 * This is the shape that Figma MCP + Claude must produce per skin.
 */
export interface SkinTokens {
  /** Must match a SkinId value */
  id: SkinId;
  /** Human-readable name */
  name: string;
  /** Short description for SkinPicker UI */
  description: string;

  color: ColorTokens;
  text: TypographyTokens;
  radius: RadiusTokens;
  shadow: ShadowTokens;
  component: ComponentTokens;
}

// ---------------------------------------------------------------------------
// Zod Schemas (for runtime validation of MCP/Claude exports)
// ---------------------------------------------------------------------------

const ButtonVariantSchema = z.enum(["gradient", "solid", "soft", "outline"]);

const TypographyStyleSchema = z.object({
  font: z.string(),
  size: z.string(),
  weight: z.string(),
  lineHeight: z.string(),
});

export const SkinTokensSchema = z.object({
  id: SkinIdSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(300),

  color: z.object({
    background: z.object({
      default: z.string(),
      elevated: z.string(),
    }),
    border: z.object({
      subtle: z.string(),
    }),
    text: z.object({
      primary: z.string(),
      secondary: z.string(),
    }),
    accent: z.string(),
    accentHover: z.string(),
    semantic: z.object({
      success: z.string(),
      warning: z.string(),
      error: z.string(),
      actionDo: z.string(),
      actionReflect: z.string(),
    }),
  }),

  text: z.object({
    heading: z.object({
      xl: TypographyStyleSchema,
      lg: TypographyStyleSchema,
      md: TypographyStyleSchema,
    }),
    body: z.object({
      md: TypographyStyleSchema,
      sm: TypographyStyleSchema,
    }),
    label: z.object({
      sm: TypographyStyleSchema,
    }),
  }),

  radius: z.object({
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
  }),

  shadow: z.object({
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
  }),

  component: z.object({
    button: z.object({
      primary: z.object({
        variant: ButtonVariantSchema,
        radius: z.string(),
      }),
      secondary: z.object({
        variant: ButtonVariantSchema,
        radius: z.string(),
      }),
    }),
    chip: z.object({
      background: z.string(),
      text: z.string(),
      radius: z.string(),
    }),
    badge: z.object({
      info: z.object({
        background: z.string(),
        text: z.string(),
      }),
    }),
    progress: z.object({
      track: z.string(),
      fill: z.string(),
      radius: z.string(),
    }),
    video: z.object({
      frame: z.object({
        radius: z.string(),
        border: z.string(),
      }),
    }),
  }),
});
