import type { RadiusTokens, ShadowTokens, TypographyTokens } from "./skin-tokens";

export type RadiusPresetId = "sharp" | "soft" | "pillow";
export type ShadowPresetId = "flat" | "soft" | "lifted";
export type FontPresetId = "modern" | "warm" | "rounded";

export interface RadiusPreset {
  id: RadiusPresetId;
  label: string;
  values: RadiusTokens;
}

export interface ShadowPreset {
  id: ShadowPresetId;
  label: string;
  values: ShadowTokens;
}

export const RADIUS_PRESETS: RadiusPreset[] = [
  { id: "sharp",  label: "Sharp",  values: { sm: "4px",  md: "6px",  lg: "8px"  } },
  { id: "soft",   label: "Soft",   values: { sm: "8px",  md: "12px", lg: "16px" } },
  { id: "pillow", label: "Pillow", values: { sm: "14px", md: "20px", lg: "28px" } },
];

export interface FontPreset {
  id: FontPresetId;
  label: string;
  /** Short hint shown under the label — one or two words. */
  sample: string;
  heading: { family: string };
  body: { family: string };
  label_: { family: string };
}

/** Font families reference CSS variables set by next/font in the root layout.
 *  See apps/web/app/layout.tsx — Space Grotesk / Inter / Fraunces / Nunito /
 *  Quicksand are all self-hosted and exposed as `--font-*` variables. */
export const FONT_PRESETS: FontPreset[] = [
  {
    id: "modern",
    label: "Modern",
    sample: "Space Grotesk · Inter",
    heading: { family: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" },
    body:    { family: "var(--font-inter), 'Inter', system-ui, sans-serif" },
    label_:  { family: "var(--font-inter), 'Inter', system-ui, sans-serif" },
  },
  {
    id: "warm",
    label: "Warm",
    sample: "Fraunces · Nunito",
    heading: { family: "var(--font-fraunces), 'Fraunces', Georgia, serif" },
    body:    { family: "var(--font-nunito), 'Nunito', system-ui, sans-serif" },
    label_:  { family: "var(--font-nunito), 'Nunito', system-ui, sans-serif" },
  },
  {
    id: "rounded",
    label: "Rounded",
    sample: "Quicksand",
    heading: { family: "var(--font-quicksand), 'Quicksand', system-ui, sans-serif" },
    body:    { family: "var(--font-quicksand), 'Quicksand', system-ui, sans-serif" },
    label_:  { family: "var(--font-quicksand), 'Quicksand', system-ui, sans-serif" },
  },
];

/** Mutate a TypographyTokens object in place so that every text style uses the
 *  preset's font family. Keeps sizes, weights, and line-heights intact. */
export function applyFontPreset(text: TypographyTokens, preset: FontPreset): void {
  text.heading.display.font = preset.heading.family;
  text.heading.xl.font      = preset.heading.family;
  text.heading.lg.font      = preset.heading.family;
  text.heading.md.font      = preset.heading.family;
  text.body.md.font         = preset.body.family;
  text.body.sm.font         = preset.body.family;
  text.label.sm.font        = preset.label_.family;
}

export const SHADOW_PRESETS: ShadowPreset[] = [
  {
    id: "flat",
    label: "Flat",
    values: {
      sm: "none",
      md: "none",
      lg: "0px 1px 2px 0px rgba(0,0,0,0.04)",
    },
  },
  {
    id: "soft",
    label: "Soft",
    values: {
      sm: "0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px 0px rgba(0,0,0,0.1)",
      md: "0px 4px 6px -4px rgba(0,0,0,0.1), 0px 10px 15px -3px rgba(0,0,0,0.1)",
      lg: "0px 8px 10px -6px rgba(0,0,0,0.1), 0px 20px 25px -5px rgba(0,0,0,0.1)",
    },
  },
  {
    id: "lifted",
    label: "Lifted",
    values: {
      sm: "0px 2px 4px -1px rgba(0,0,0,0.12), 0px 2px 6px 0px rgba(0,0,0,0.12)",
      md: "0px 8px 14px -6px rgba(0,0,0,0.16), 0px 18px 28px -6px rgba(0,0,0,0.16)",
      lg: "0px 16px 24px -8px rgba(0,0,0,0.22), 0px 32px 48px -12px rgba(0,0,0,0.22)",
    },
  },
];
