/**
 * Per-skin decoration configs — background patterns, floating shapes, heading effects.
 *
 * Decorations are art direction, NOT design tokens. They live here in the web app layer,
 * completely separate from SkinTokens in the shared package.
 *
 * Resolution: category default → merged with per-skin override (if any).
 */

import type { CSSProperties } from "react";
import { getSkinCatalogEntry } from "./skin-bundles/catalog";
import type { PatternType } from "./decoration-patterns";
import type { SkinTokens } from "@guide-rail/shared";

// ── Types ────────────────────────────────────────────────────────────────────

export interface FloatingElement {
  shape: "circle" | "diamond" | "square" | "ring" | "emoji";
  size: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  /** Resolved at render time from skin tokens. Use "white" for light shapes on dark/saturated backgrounds. */
  color: "accent" | "accent-secondary" | "text-primary" | "text-secondary" | "white";
  opacity: number;
  animation?: "float" | "float-slow" | "float-reverse" | "pulse-gentle" | "drift" | "wander";
  animationDelay?: string;
  /** The emoji/text character to render. Required when shape is "emoji". */
  emoji?: string;
}

export interface BackgroundPatternConfig {
  type: PatternType;
  /** Which token color to extract. Resolved to hex at render time. */
  colorKey: "accent" | "accent-secondary" | "text-primary" | "border";
  opacity: number;
  spacing?: number;
  size?: number;
}

export interface HeadingEffect {
  type: "gradient" | "glow" | "shadow-3d" | "outline" | "none";
  /** For gradient: uses accent + accent-secondary from tokens. Custom gradient string overrides. */
  gradientOverride?: string;
  /** For glow: text-shadow using accent color. Custom override. */
  glowShadowOverride?: string;
  /** For shadow-3d: text-shadow stack */
  shadow3dOverride?: string;
  /** For outline */
  strokeWidth?: string;
  strokeColorKey?: "accent" | "accent-secondary" | "text-primary";
}

export interface SkinDecorationConfig {
  backgroundPattern?: BackgroundPatternConfig;
  floatingElements: FloatingElement[];
  headingEffect: HeadingEffect;
  /** If true, skip automatic light/dark adaptation — values are hand-tuned */
  skipAdaptation?: boolean;
}

// ── Heading effect → CSS style ───────────────────────────────────────────────

export function getHeadingEffectStyle(
  effect: HeadingEffect,
  tokens: SkinTokens
): CSSProperties {
  const accent = tokens.color.accent.primary;
  const accentSec = tokens.color.accent.secondary;

  switch (effect.type) {
    case "gradient":
      return {
        background: effect.gradientOverride ?? `linear-gradient(135deg, ${accent}, ${accentSec})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      };
    case "glow":
      return {
        textShadow:
          effect.glowShadowOverride ??
          `0 0 20px ${accent}66, 0 0 40px ${accent}33, 0 0 60px ${accent}1a`,
      };
    case "shadow-3d":
      return {
        textShadow:
          effect.shadow3dOverride ??
          `2px 2px 0 ${accent}40, 4px 4px 0 ${accent}20, 6px 6px 0 ${accent}10`,
      };
    case "outline": {
      const strokeColor = effect.strokeColorKey
        ? resolveColorKey(effect.strokeColorKey, tokens)
        : accent;
      return {
        WebkitTextStroke: `${effect.strokeWidth ?? "1px"} ${strokeColor}`,
        color: "transparent",
      };
    }
    case "none":
    default:
      return {};
  }
}

/** Resolve a color key to a hex value from tokens */
export function resolveColorKey(
  key: "accent" | "accent-secondary" | "text-primary" | "border",
  tokens: SkinTokens
): string {
  switch (key) {
    case "accent":
      return tokens.color.accent.primary;
    case "accent-secondary":
      return tokens.color.accent.secondary;
    case "text-primary":
      return tokens.color.text.primary;
    case "border":
      return tokens.color.border.subtle;
    default:
      return tokens.color.accent.primary;
  }
}

/** Perceived brightness of a hex color (0-255) */
function getLuminance(hex: string): number {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114;
}

/** Extract first hex color from a CSS gradient string */
function extractGradientColor(gradient: string): string | null {
  const match = gradient.match(/#[0-9A-Fa-f]{6}/);
  return match ? match[0] : null;
}

/** Check if the VISIBLE background is light — considers gradient override */
function isLightBackground(tokens: SkinTokens): boolean {
  // If there's a gradient, that's what the user sees — check its dominant color
  const gradient = tokens.color.background.gradient;
  if (gradient) {
    const gradColor = extractGradientColor(gradient);
    if (gradColor) return getLuminance(gradColor) > 140;
  }
  return getLuminance(tokens.color.background.default) > 140;
}

/**
 * Adapt decorations for light backgrounds:
 * - convert all solid shapes to rings (outlines only — no solid fills on light bg)
 * - dramatically reduce opacity
 * - skip glow heading effects
 */
function adaptForLightBg(config: SkinDecorationConfig): SkinDecorationConfig {
  return {
    backgroundPattern: config.backgroundPattern
      ? { ...config.backgroundPattern, opacity: config.backgroundPattern.opacity * 0.3 }
      : undefined,
    floatingElements: config.floatingElements.map((el) => ({
      ...el,
      shape: el.shape === "emoji" ? "emoji" as const : "ring" as const,
      opacity: el.shape === "emoji" ? el.opacity * 0.4 : el.opacity * 0.25,
      size: Math.round(el.size * 0.8),
    })),
    headingEffect: config.headingEffect.type === "glow"
      ? { type: "gradient" as const }
      : config.headingEffect,
  };
}

/** Dark backgrounds keep decorations as-is — the base values are already tuned. */
function adaptForDarkBg(config: SkinDecorationConfig): SkinDecorationConfig {
  return config;
}

// ── Category defaults ────────────────────────────────────────────────────────

const CATEGORY_DECORATIONS: Record<string, SkinDecorationConfig> = {
  classic: {
    backgroundPattern: { type: "dots", colorKey: "accent", opacity: 0.08, spacing: 28, size: 1.5 },
    floatingElements: [
      // Above creator label (top-left whitespace)
      { shape: "emoji", emoji: "✦", size: 28, top: "2%", left: "8%", color: "accent", opacity: 0.25, animation: "wander", animationDelay: "0s" },
      // Column gap between text and video
      { shape: "emoji", emoji: "✦", size: 36, top: "10%", left: "47%", color: "accent", opacity: 0.3, animation: "float-slow", animationDelay: "1s" },
      { shape: "emoji", emoji: "✦", size: 24, top: "22%", left: "50%", color: "accent-secondary", opacity: 0.25, animation: "wander", animationDelay: "3s" },
      // Below hero (between enroll btn and stats)
      { shape: "emoji", emoji: "✦", size: 28, top: "36%", left: "15%", color: "accent-secondary", opacity: 0.22, animation: "drift", animationDelay: "2s" },
      { shape: "emoji", emoji: "✦", size: 24, top: "38%", right: "15%", color: "accent", opacity: 0.2, animation: "float-reverse", animationDelay: "4s" },
      // Around divider / lower section
      { shape: "emoji", emoji: "✦", size: 20, top: "52%", left: "48%", color: "accent-secondary", opacity: 0.18, animation: "float-slow", animationDelay: "5s" },
    ],
    headingEffect: { type: "none" },
  },

  creative: {
    backgroundPattern: { type: "dots", colorKey: "accent", opacity: 0.1, spacing: 32, size: 2 },
    floatingElements: [
      // Above creator label
      { shape: "emoji", emoji: "✨", size: 32, top: "1%", left: "10%", color: "accent", opacity: 0.35, animation: "wander", animationDelay: "0s" },
      // Column gap
      { shape: "emoji", emoji: "✨", size: 40, top: "8%", left: "46%", color: "accent", opacity: 0.4, animation: "float-slow", animationDelay: "0.5s" },
      { shape: "emoji", emoji: "✨", size: 28, top: "20%", left: "50%", color: "accent-secondary", opacity: 0.3, animation: "wander", animationDelay: "2s" },
      // Below hero
      { shape: "emoji", emoji: "✨", size: 32, top: "35%", left: "12%", color: "accent-secondary", opacity: 0.3, animation: "float", animationDelay: "1.5s" },
      { shape: "emoji", emoji: "✨", size: 28, top: "37%", right: "12%", color: "accent", opacity: 0.28, animation: "float-reverse", animationDelay: "3s" },
      // Around divider
      { shape: "emoji", emoji: "✨", size: 24, top: "50%", left: "46%", color: "accent", opacity: 0.22, animation: "drift", animationDelay: "4s" },
      // Lower section gaps
      { shape: "emoji", emoji: "✨", size: 20, top: "65%", left: "48%", color: "accent-secondary", opacity: 0.2, animation: "float-slow", animationDelay: "5s" },
    ],
    headingEffect: { type: "gradient" },
  },

  lifestyle: {
    floatingElements: [
      // Above creator label
      { shape: "emoji", emoji: "🌿", size: 32, top: "1%", left: "12%", color: "accent", opacity: 0.3, animation: "wander", animationDelay: "0s" },
      // Column gap
      { shape: "emoji", emoji: "🌿", size: 40, top: "8%", left: "46%", color: "accent", opacity: 0.35, animation: "float-slow", animationDelay: "1s" },
      { shape: "emoji", emoji: "🌿", size: 28, top: "22%", left: "49%", color: "accent-secondary", opacity: 0.28, animation: "wander", animationDelay: "3s" },
      // Below hero
      { shape: "emoji", emoji: "🌿", size: 30, top: "36%", left: "18%", color: "accent-secondary", opacity: 0.25, animation: "drift", animationDelay: "2s" },
      { shape: "emoji", emoji: "🌿", size: 26, top: "38%", right: "18%", color: "accent", opacity: 0.22, animation: "float-reverse", animationDelay: "4s" },
      // Around divider
      { shape: "emoji", emoji: "🌿", size: 24, top: "52%", left: "47%", color: "accent", opacity: 0.2, animation: "float-slow", animationDelay: "5s" },
    ],
    headingEffect: { type: "gradient" },
  },

  activity: {
    backgroundPattern: { type: "diagonal-lines", colorKey: "accent", opacity: 0.08, spacing: 14, size: 1 },
    floatingElements: [
      // Above creator label
      { shape: "emoji", emoji: "⚡", size: 32, top: "1%", left: "10%", color: "accent", opacity: 0.35, animation: "wander", animationDelay: "0s" },
      // Column gap
      { shape: "emoji", emoji: "⚡", size: 42, top: "7%", left: "45%", color: "accent", opacity: 0.4, animation: "float", animationDelay: "0.5s" },
      { shape: "emoji", emoji: "⚡", size: 30, top: "20%", left: "50%", color: "accent-secondary", opacity: 0.35, animation: "wander", animationDelay: "2s" },
      // Below hero
      { shape: "emoji", emoji: "⚡", size: 32, top: "35%", left: "14%", color: "accent-secondary", opacity: 0.3, animation: "float-reverse", animationDelay: "1.5s" },
      { shape: "emoji", emoji: "⚡", size: 28, top: "37%", right: "14%", color: "accent", opacity: 0.28, animation: "pulse-gentle", animationDelay: "3s" },
      // Around divider
      { shape: "emoji", emoji: "⚡", size: 26, top: "50%", left: "47%", color: "accent", opacity: 0.25, animation: "drift", animationDelay: "4s" },
      // Lower section
      { shape: "emoji", emoji: "⚡", size: 22, top: "64%", left: "48%", color: "accent-secondary", opacity: 0.2, animation: "float-slow", animationDelay: "5s" },
    ],
    headingEffect: { type: "gradient" },
  },

  entertainment: {
    floatingElements: [
      // Above creator label
      { shape: "emoji", emoji: "🎬", size: 32, top: "1%", left: "10%", color: "accent", opacity: 0.35, animation: "wander", animationDelay: "0s" },
      // Column gap
      { shape: "emoji", emoji: "🎬", size: 40, top: "8%", left: "46%", color: "accent", opacity: 0.4, animation: "float-slow", animationDelay: "0.5s" },
      { shape: "emoji", emoji: "🎬", size: 28, top: "21%", left: "50%", color: "accent-secondary", opacity: 0.3, animation: "wander", animationDelay: "2s" },
      // Below hero
      { shape: "emoji", emoji: "🎬", size: 30, top: "36%", left: "16%", color: "accent-secondary", opacity: 0.28, animation: "pulse-gentle", animationDelay: "1.5s" },
      { shape: "emoji", emoji: "🎬", size: 26, top: "38%", right: "16%", color: "accent", opacity: 0.25, animation: "drift", animationDelay: "3s" },
      // Around divider
      { shape: "emoji", emoji: "🎬", size: 24, top: "52%", left: "47%", color: "accent", opacity: 0.22, animation: "float", animationDelay: "4s" },
    ],
    headingEffect: { type: "glow" },
  },

  music: {
    backgroundPattern: { type: "waves", colorKey: "accent", opacity: 0.08, spacing: 20, size: 1.5 },
    floatingElements: [
      // Above creator label
      { shape: "emoji", emoji: "♪", size: 32, top: "1%", left: "12%", color: "accent", opacity: 0.35, animation: "wander", animationDelay: "0s" },
      // Column gap
      { shape: "emoji", emoji: "♪", size: 42, top: "8%", left: "46%", color: "accent", opacity: 0.4, animation: "pulse-gentle", animationDelay: "0.5s" },
      { shape: "emoji", emoji: "♪", size: 28, top: "22%", left: "50%", color: "accent-secondary", opacity: 0.3, animation: "wander", animationDelay: "2s" },
      // Below hero
      { shape: "emoji", emoji: "♪", size: 30, top: "36%", left: "15%", color: "accent-secondary", opacity: 0.28, animation: "pulse-gentle", animationDelay: "1.5s" },
      { shape: "emoji", emoji: "♪", size: 26, top: "38%", right: "15%", color: "accent", opacity: 0.25, animation: "float", animationDelay: "3s" },
      // Around divider
      { shape: "emoji", emoji: "♪", size: 26, top: "51%", left: "47%", color: "accent", opacity: 0.25, animation: "float-slow", animationDelay: "4s" },
      // Lower section
      { shape: "emoji", emoji: "♪", size: 20, top: "65%", left: "48%", color: "accent-secondary", opacity: 0.2, animation: "drift", animationDelay: "5s" },
    ],
    headingEffect: { type: "glow" },
  },

  media: {
    backgroundPattern: { type: "cross-hatch", colorKey: "accent", opacity: 0.06, spacing: 16, size: 1 },
    floatingElements: [
      // Above creator label
      { shape: "emoji", emoji: "◉", size: 28, top: "2%", left: "10%", color: "accent", opacity: 0.3, animation: "wander", animationDelay: "0s" },
      // Column gap
      { shape: "emoji", emoji: "◉", size: 36, top: "9%", left: "47%", color: "accent", opacity: 0.35, animation: "drift", animationDelay: "1s" },
      { shape: "emoji", emoji: "◉", size: 26, top: "22%", left: "50%", color: "accent-secondary", opacity: 0.28, animation: "wander", animationDelay: "3s" },
      // Below hero
      { shape: "emoji", emoji: "◉", size: 28, top: "36%", left: "16%", color: "accent-secondary", opacity: 0.25, animation: "float-slow", animationDelay: "2s" },
      { shape: "emoji", emoji: "◉", size: 24, top: "38%", right: "16%", color: "accent", opacity: 0.22, animation: "drift", animationDelay: "4s" },
      // Around divider
      { shape: "emoji", emoji: "◉", size: 22, top: "52%", left: "48%", color: "accent-secondary", opacity: 0.2, animation: "float-slow", animationDelay: "5s" },
    ],
    headingEffect: { type: "gradient" },
  },

  professional: {
    backgroundPattern: { type: "dots", colorKey: "accent", opacity: 0.06, spacing: 22, size: 1.5 },
    floatingElements: [
      // Above creator label
      { shape: "emoji", emoji: "◆", size: 24, top: "2%", left: "10%", color: "accent", opacity: 0.25, animation: "wander", animationDelay: "0s" },
      // Column gap
      { shape: "emoji", emoji: "◆", size: 32, top: "10%", left: "47%", color: "accent", opacity: 0.3, animation: "float-slow", animationDelay: "1s" },
      { shape: "emoji", emoji: "◆", size: 22, top: "22%", left: "50%", color: "accent-secondary", opacity: 0.22, animation: "wander", animationDelay: "3s" },
      // Below hero
      { shape: "emoji", emoji: "◆", size: 24, top: "37%", left: "18%", color: "accent-secondary", opacity: 0.2, animation: "drift", animationDelay: "2s" },
      { shape: "emoji", emoji: "◆", size: 20, top: "38%", right: "18%", color: "accent", opacity: 0.18, animation: "float-reverse", animationDelay: "4s" },
      // Around divider
      { shape: "emoji", emoji: "◆", size: 20, top: "52%", left: "48%", color: "accent", opacity: 0.18, animation: "drift", animationDelay: "5s" },
    ],
    headingEffect: { type: "gradient" },
  },
};

// ── Standout skin overrides ──────────────────────────────────────────────────

const SKIN_OVERRIDES: Record<string, Partial<SkinDecorationConfig>> = {
  // ── CLASSIC STUDIO — clean white bg (#FAFAFA) + warm burnt orange accent
  "classic-studio": {
    skipAdaptation: true,
    backgroundPattern: { type: "dots", colorKey: "accent", opacity: 0.06, spacing: 36, size: 1.5 },
    headingEffect: { type: "gradient", gradientOverride: "linear-gradient(135deg, #BB4D00, #E56000)" },
    floatingElements: [
      { shape: "ring", size: 56, top: "3%", right: "6%", color: "accent", opacity: 0.08, animation: "float-slow", animationDelay: "0s" },
      { shape: "ring", size: 40, top: "30%", left: "4%", color: "accent-secondary", opacity: 0.06, animation: "drift", animationDelay: "3s" },
      { shape: "ring", size: 44, bottom: "12%", right: "8%", color: "accent", opacity: 0.05, animation: "float-slow", animationDelay: "6s" },
      { shape: "circle", size: 6, top: "12%", right: "20%", color: "accent", opacity: 0.12, animation: "pulse-gentle", animationDelay: "0s" },
      { shape: "circle", size: 4, top: "42%", left: "14%", color: "accent-secondary", opacity: 0.1, animation: "pulse-gentle", animationDelay: "2s" },
      { shape: "circle", size: 5, bottom: "22%", right: "18%", color: "accent", opacity: 0.08, animation: "pulse-gentle", animationDelay: "4s" },
    ],
  },

  // ── ZEN GARDEN — warm stone white (#FAFAF9) + forest green accent
  "lifestyle-zen": {
    skipAdaptation: true,
    backgroundPattern: undefined,
    headingEffect: { type: "none" },
    floatingElements: [
      { shape: "ring", size: 64, top: "5%", right: "8%", color: "accent", opacity: 0.05, animation: "float-slow", animationDelay: "0s" },
      { shape: "ring", size: 44, bottom: "12%", left: "6%", color: "accent-secondary", opacity: 0.04, animation: "float-slow", animationDelay: "4s" },
      { shape: "emoji", emoji: "☯", size: 32, top: "28%", left: "20%", color: "accent", opacity: 0.12, animation: "drift", animationDelay: "2s" },
    ],
  },

  "creative-retro": {
    backgroundPattern: { type: "scanlines", colorKey: "accent", opacity: 0.1, spacing: 4, size: 1 },
    headingEffect: {
      type: "glow",
      glowShadowOverride: "0 0 10px #E12AFB88, 0 0 30px #E12AFB44, 0 0 60px #00D3F322",
    },
    floatingElements: [
      { shape: "square", size: 24, top: "5%", right: "8%", color: "accent", opacity: 0.35, animation: "pulse-gentle", animationDelay: "0s" },
      { shape: "emoji", emoji: "👾", size: 32, top: "20%", left: "6%", color: "accent-secondary", opacity: 0.4, animation: "pulse-gentle", animationDelay: "0.5s" },
      { shape: "square", size: 20, bottom: "15%", right: "5%", color: "accent", opacity: 0.25, animation: "pulse-gentle", animationDelay: "1s" },
      { shape: "square", size: 12, bottom: "30%", left: "10%", color: "accent-secondary", opacity: 0.32, animation: "pulse-gentle", animationDelay: "1.5s" },
      { shape: "square", size: 28, top: "45%", right: "3%", color: "accent", opacity: 0.2, animation: "float", animationDelay: "2s" },
    ],
  },

  "creative-code": {
    backgroundPattern: { type: "scanlines", colorKey: "accent", opacity: 0.08, spacing: 4, size: 1 },
    headingEffect: {
      type: "glow",
      glowShadowOverride: "0 0 15px #22C55E66, 0 0 40px #22C55E33",
    },
    floatingElements: [
      { shape: "square", size: 10, top: "8%", right: "12%", color: "accent", opacity: 0.3, animation: "drift", animationDelay: "0s" },
      { shape: "emoji", emoji: ">", size: 24, top: "25%", left: "5%", color: "accent", opacity: 0.4, animation: "drift", animationDelay: "1.5s" },
      { shape: "square", size: 12, bottom: "20%", right: "7%", color: "accent", opacity: 0.2, animation: "drift", animationDelay: "3s" },
      { shape: "square", size: 6, top: "45%", left: "8%", color: "accent", opacity: 0.22, animation: "drift", animationDelay: "5s" },
    ],
  },

  "creative-esports": {
    backgroundPattern: undefined,
    headingEffect: {
      type: "glow",
      glowShadowOverride: "0 0 15px currentColor, 0 0 40px currentColor, 0 0 80px currentColor",
    },
    floatingElements: [
      { shape: "diamond", size: 32, top: "3%", right: "6%", color: "accent", opacity: 0.4, animation: "pulse-gentle", animationDelay: "0s" },
      { shape: "ring", size: 44, top: "12%", left: "4%", color: "accent-secondary", opacity: 0.35, animation: "pulse-gentle", animationDelay: "0.3s" },
      { shape: "emoji", emoji: "🎮", size: 36, top: "28%", right: "10%", color: "accent", opacity: 0.4, animation: "float", animationDelay: "0.6s" },
      { shape: "ring", size: 28, bottom: "35%", left: "8%", color: "accent-secondary", opacity: 0.32, animation: "pulse-gentle", animationDelay: "0.9s" },
      { shape: "diamond", size: 20, bottom: "20%", right: "4%", color: "accent", opacity: 0.38, animation: "float-reverse", animationDelay: "1.2s" },
      { shape: "ring", size: 36, bottom: "8%", left: "12%", color: "accent-secondary", opacity: 0.25, animation: "pulse-gentle", animationDelay: "1.5s" },
      { shape: "circle", size: 16, top: "50%", right: "2%", color: "accent", opacity: 0.35, animation: "float", animationDelay: "1.8s" },
      { shape: "circle", size: 20, top: "40%", left: "3%", color: "accent-secondary", opacity: 0.28, animation: "pulse-gentle", animationDelay: "2.1s" },
    ],
  },

  "lifestyle-graffiti": {
    backgroundPattern: { type: "diagonal-lines", colorKey: "accent", opacity: 0.08, spacing: 10, size: 1 },
    headingEffect: {
      type: "shadow-3d",
      shadow3dOverride: "3px 3px 0 var(--token-color-accent-secondary), 6px 6px 0 rgba(0,0,0,0.3)",
    },
    floatingElements: [
      { shape: "diamond", size: 40, top: "5%", right: "6%", color: "accent", opacity: 0.35, animation: "float", animationDelay: "0s" },
      { shape: "emoji", emoji: "💥", size: 36, top: "20%", left: "4%", color: "accent-secondary", opacity: 0.4, animation: "float-reverse", animationDelay: "1s" },
      { shape: "diamond", size: 24, bottom: "18%", right: "10%", color: "accent", opacity: 0.25, animation: "float", animationDelay: "2s" },
      { shape: "square", size: 28, bottom: "30%", left: "7%", color: "accent-secondary", opacity: 0.22, animation: "float-slow", animationDelay: "0.5s" },
    ],
  },

  "entertainment-film-noir": {
    backgroundPattern: { type: "scanlines", colorKey: "text-primary", opacity: 0.06, spacing: 3, size: 1 },
    headingEffect: {
      type: "shadow-3d",
      shadow3dOverride: "2px 2px 8px rgba(0,0,0,0.8), 0 0 40px rgba(255,255,255,0.05)",
    },
    floatingElements: [
      { shape: "circle", size: 120, top: "-5%", right: "-5%", color: "accent", opacity: 0.04, animation: "drift", animationDelay: "0s" },
      { shape: "circle", size: 16, top: "20%", left: "8%", color: "accent", opacity: 0.2, animation: "float-slow", animationDelay: "2s" },
      { shape: "circle", size: 12, bottom: "25%", right: "12%", color: "accent", opacity: 0.15, animation: "drift", animationDelay: "4s" },
    ],
  },

  "entertainment-festival": {
    backgroundPattern: { type: "dots", colorKey: "accent", opacity: 0.1, spacing: 18, size: 2.5 },
    headingEffect: {
      type: "gradient",
      gradientOverride: "linear-gradient(90deg, #FF006E, #FB5607, #FFBE0B, #3A86FF, #8338EC)",
    },
    floatingElements: [
      { shape: "circle", size: 32, top: "3%", right: "8%", color: "accent", opacity: 0.4, animation: "float", animationDelay: "0s" },
      { shape: "emoji", emoji: "🎉", size: 36, top: "12%", left: "5%", color: "accent-secondary", opacity: 0.45, animation: "float-reverse", animationDelay: "0.3s" },
      { shape: "circle", size: 20, top: "25%", right: "15%", color: "accent", opacity: 0.3, animation: "pulse-gentle", animationDelay: "0.6s" },
      { shape: "square", size: 16, bottom: "30%", left: "8%", color: "accent-secondary", opacity: 0.32, animation: "float", animationDelay: "0.9s" },
      { shape: "circle", size: 28, bottom: "15%", right: "5%", color: "accent", opacity: 0.38, animation: "float-slow", animationDelay: "1.2s" },
      { shape: "diamond", size: 20, bottom: "8%", left: "12%", color: "accent-secondary", opacity: 0.25, animation: "pulse-gentle", animationDelay: "1.5s" },
      { shape: "circle", size: 12, top: "45%", right: "3%", color: "accent", opacity: 0.35, animation: "float-reverse", animationDelay: "1.8s" },
      { shape: "square", size: 14, top: "55%", left: "3%", color: "accent-secondary", opacity: 0.28, animation: "float", animationDelay: "2.1s" },
    ],
  },

  "music-dancefloor": {
    backgroundPattern: undefined,
    headingEffect: {
      type: "glow",
      glowShadowOverride: "0 0 20px currentColor, 0 0 50px currentColor",
    },
    floatingElements: [
      { shape: "ring", size: 48, top: "4%", right: "6%", color: "accent", opacity: 0.35, animation: "pulse-gentle", animationDelay: "0s" },
      { shape: "emoji", emoji: "🎵", size: 36, top: "18%", left: "4%", color: "accent-secondary", opacity: 0.4, animation: "pulse-gentle", animationDelay: "0.5s" },
      { shape: "ring", size: 40, bottom: "20%", right: "8%", color: "accent", opacity: 0.32, animation: "pulse-gentle", animationDelay: "1s" },
      { shape: "ring", size: 24, bottom: "35%", left: "10%", color: "accent-secondary", opacity: 0.25, animation: "pulse-gentle", animationDelay: "1.5s" },
      { shape: "circle", size: 20, top: "40%", right: "3%", color: "accent", opacity: 0.22, animation: "float", animationDelay: "2s" },
      { shape: "circle", size: 16, top: "50%", left: "5%", color: "accent-secondary", opacity: 0.18, animation: "float-reverse", animationDelay: "2.5s" },
    ],
  },

  "cosmic-studio": {
    backgroundPattern: undefined,
    headingEffect: {
      type: "gradient",
      gradientOverride: "linear-gradient(135deg, #a78bfa, #ec4899, #818cf8)",
    },
    floatingElements: [
      { shape: "circle", size: 72, top: "2%", right: "5%", color: "accent", opacity: 0.12, animation: "float-slow", animationDelay: "0s" },
      { shape: "circle", size: 48, top: "15%", left: "3%", color: "accent-secondary", opacity: 0.15, animation: "drift", animationDelay: "2s" },
      { shape: "ring", size: 40, bottom: "25%", right: "8%", color: "accent", opacity: 0.18, animation: "pulse-gentle", animationDelay: "1s" },
      { shape: "circle", size: 32, bottom: "10%", left: "10%", color: "accent-secondary", opacity: 0.12, animation: "float-slow", animationDelay: "3s" },
      { shape: "emoji", emoji: "✦", size: 28, top: "35%", right: "15%", color: "accent", opacity: 0.4, animation: "pulse-gentle", animationDelay: "0.5s" },
      { shape: "circle", size: 8, top: "50%", left: "8%", color: "accent-secondary", opacity: 0.25, animation: "pulse-gentle", animationDelay: "1.5s" },
    ],
  },

  "ai-command-center": {
    backgroundPattern: { type: "scanlines", colorKey: "accent", opacity: 0.06, spacing: 3, size: 1 },
    headingEffect: {
      type: "glow",
      glowShadowOverride: "0 0 10px #84CC1666, 0 0 30px #84CC1633, 0 0 60px #84CC1618",
    },
    floatingElements: [
      { shape: "square", size: 10, top: "5%", right: "10%", color: "accent", opacity: 0.3, animation: "drift", animationDelay: "0s" },
      { shape: "emoji", emoji: "▹", size: 12, top: "20%", left: "6%", color: "accent", opacity: 0.28, animation: "drift", animationDelay: "2s" },
      { shape: "square", size: 10, bottom: "15%", right: "8%", color: "accent", opacity: 0.28, animation: "drift", animationDelay: "4s" },
      { shape: "square", size: 6, bottom: "30%", left: "12%", color: "accent", opacity: 0.2, animation: "drift", animationDelay: "6s" },
      { shape: "square", size: 8, top: "45%", right: "4%", color: "accent", opacity: 0.22, animation: "drift", animationDelay: "1s" },
    ],
  },

  "activity-sports": {
    backgroundPattern: { type: "chevrons", colorKey: "accent", opacity: 0.08, spacing: 16, size: 1 },
    headingEffect: { type: "shadow-3d" },
    floatingElements: [
      { shape: "diamond", size: 36, top: "4%", right: "7%", color: "accent", opacity: 0.35, animation: "float", animationDelay: "0s" },
      { shape: "emoji", emoji: "🏆", size: 36, top: "18%", left: "5%", color: "accent-secondary", opacity: 0.4, animation: "float-reverse", animationDelay: "0.5s" },
      { shape: "diamond", size: 20, bottom: "22%", right: "10%", color: "accent", opacity: 0.25, animation: "float", animationDelay: "1s" },
      { shape: "diamond", size: 24, bottom: "8%", left: "8%", color: "accent-secondary", opacity: 0.32, animation: "float", animationDelay: "1.5s" },
    ],
  },

  "pro-luxury": {
    backgroundPattern: { type: "dots", colorKey: "accent", opacity: 0.06, spacing: 20, size: 1.5 },
    headingEffect: {
      type: "gradient",
      gradientOverride: "linear-gradient(135deg, #D4AF37, #F5E6A3, #D4AF37)",
    },
    floatingElements: [
      { shape: "circle", size: 16, top: "10%", right: "12%", color: "accent", opacity: 0.15, animation: "drift", animationDelay: "0s" },
      { shape: "circle", size: 12, bottom: "12%", left: "10%", color: "accent", opacity: 0.12, animation: "drift", animationDelay: "4s" },
    ],
  },
};

// ── Per-skin emoji overrides (swap the category default emoji for a better fit) ─

const SKIN_EMOJI_OVERRIDES: Record<string, string> = {
  // Lifestyle — 🌿 doesn't fit all lifestyle skins
  "lifestyle-glam": "💄",
  "lifestyle-wanderlust": "🧭",
  "lifestyle-graffiti": "💥",   // already in SKIN_OVERRIDES but also here for clarity
  "lifestyle-podcast": "🎙️",
  "lifestyle-science": "🔬",
  // Activity — ⚡ doesn't fit all activity skins
  "activity-culinary": "🍳",
  "activity-kids": "🎈",
  "activity-fashion": "👗",
  "activity-hologram": "🔮",
  "activity-workshop": "🔧",
  // Professional — ◆ doesn't fit all professional skins
  "pro-wellness": "🧘",
  "pro-home-gym": "💪",
  "pro-street-fitness": "💪",
  "pro-adventure": "⛰️",
  "pro-book-nook": "📖",
  "pro-mind-map": "🧠",
  "pro-startup": "🚀",
};

// ── Resolution function ──────────────────────────────────────────────────────

export function getSkinDecorations(
  skinId: string,
  tokens: SkinTokens
): SkinDecorationConfig {
  // Get category for this skin
  const entry = getSkinCatalogEntry(skinId);
  const category = entry?.category ?? "classic";

  // Start with category defaults
  const base = CATEGORY_DECORATIONS[category] ?? CATEGORY_DECORATIONS.classic;

  // Check for per-skin override
  const override = SKIN_OVERRIDES[skinId];
  const config: SkinDecorationConfig = !override ? base : {
    backgroundPattern: override.backgroundPattern !== undefined ? override.backgroundPattern : base.backgroundPattern,
    floatingElements: override.floatingElements ?? base.floatingElements,
    headingEffect: override.headingEffect ?? base.headingEffect,
    skipAdaptation: override.skipAdaptation,
  };

  // Swap emoji character if there's a per-skin override
  const emojiOverride = SKIN_EMOJI_OVERRIDES[skinId];
  if (emojiOverride) {
    config.floatingElements = config.floatingElements.map((el) =>
      el.shape === "emoji" ? { ...el, emoji: emojiOverride } : el
    );
  }

  // Hand-tuned overrides skip automatic adaptation
  if (config.skipAdaptation) return config;

  // Adapt based on background luminance
  if (isLightBackground(tokens)) {
    return adaptForLightBg(config);
  }

  return adaptForDarkBg(config);
}
