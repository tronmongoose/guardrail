/**
 * Pure CSS background-pattern generators for skin decorations.
 *
 * Each function returns { backgroundImage, backgroundSize } CSS properties.
 * Color must be a concrete hex value (CSS vars don't work in gradient functions).
 */

export type PatternType =
  | "dots"
  | "grid"
  | "diagonal-lines"
  | "scanlines"
  | "cross-hatch"
  | "concentric-circles"
  | "chevrons"
  | "waves"
  | "radial-glow";

interface PatternConfig {
  type: PatternType;
  /** Hex color for pattern elements */
  color: string;
  /** Spacing between pattern repeats (px) */
  spacing?: number;
  /** Size of individual pattern elements (px) */
  size?: number;
}

interface PatternCSS {
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition?: string;
}

export function getPatternCSS(config: PatternConfig): PatternCSS {
  const { type, color, spacing = 24, size = 1 } = config;

  switch (type) {
    case "dots":
      return {
        backgroundImage: `radial-gradient(circle, ${color} ${size}px, transparent ${size + 0.5}px)`,
        backgroundSize: `${spacing}px ${spacing}px`,
      };

    case "grid":
      return {
        backgroundImage: [
          `linear-gradient(${color} ${size}px, transparent ${size}px)`,
          `linear-gradient(90deg, ${color} ${size}px, transparent ${size}px)`,
        ].join(", "),
        backgroundSize: `${spacing}px ${spacing}px`,
      };

    case "diagonal-lines":
      return {
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent ${spacing - size}px, ${color} ${spacing - size}px, ${color} ${spacing}px)`,
        backgroundSize: "100% 100%",
      };

    case "scanlines":
      return {
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent ${spacing - size}px, ${color} ${spacing - size}px, ${color} ${spacing}px)`,
        backgroundSize: "100% 100%",
      };

    case "cross-hatch":
      return {
        backgroundImage: [
          `repeating-linear-gradient(45deg, transparent, transparent ${spacing - size}px, ${color} ${spacing - size}px, ${color} ${spacing}px)`,
          `repeating-linear-gradient(-45deg, transparent, transparent ${spacing - size}px, ${color} ${spacing - size}px, ${color} ${spacing}px)`,
        ].join(", "),
        backgroundSize: "100% 100%",
      };

    case "concentric-circles":
      return {
        backgroundImage: [
          `radial-gradient(circle at 50% 50%, transparent ${spacing * 0.6}px, ${color} ${spacing * 0.6}px, ${color} ${spacing * 0.6 + size}px, transparent ${spacing * 0.6 + size}px)`,
          `radial-gradient(circle at 50% 50%, transparent ${spacing * 1.2}px, ${color} ${spacing * 1.2}px, ${color} ${spacing * 1.2 + size}px, transparent ${spacing * 1.2 + size}px)`,
          `radial-gradient(circle at 50% 50%, transparent ${spacing * 1.8}px, ${color} ${spacing * 1.8}px, ${color} ${spacing * 1.8 + size}px, transparent ${spacing * 1.8 + size}px)`,
        ].join(", "),
        backgroundSize: "100% 100%",
        backgroundPosition: "center center",
      };

    case "chevrons":
      return {
        backgroundImage: [
          `linear-gradient(135deg, ${color} 25%, transparent 25%)`,
          `linear-gradient(225deg, ${color} 25%, transparent 25%)`,
        ].join(", "),
        backgroundSize: `${spacing}px ${spacing}px`,
        backgroundPosition: `0 0, ${spacing / 2}px 0`,
      };

    case "waves": {
      // SVG-based wave pattern as data URI
      const encodedColor = encodeURIComponent(color);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${spacing * 4}" height="${spacing}" viewBox="0 0 ${spacing * 4} ${spacing}"><path d="M0 ${spacing / 2} Q${spacing} 0 ${spacing * 2} ${spacing / 2} T${spacing * 4} ${spacing / 2}" fill="none" stroke="${encodedColor}" stroke-width="${size}"/></svg>`;
      const dataUri = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
      return {
        backgroundImage: dataUri,
        backgroundSize: `${spacing * 4}px ${spacing}px`,
      };
    }

    case "radial-glow":
      // Soft ambient light pools — beautiful on light backgrounds
      return {
        backgroundImage: [
          `radial-gradient(ellipse 60% 50% at 15% 20%, ${color}, transparent)`,
          `radial-gradient(ellipse 50% 40% at 85% 60%, ${color}, transparent)`,
          `radial-gradient(ellipse 40% 30% at 50% 90%, ${color}, transparent)`,
        ].join(", "),
        backgroundSize: "100% 100%",
      };

    default:
      return { backgroundImage: "none", backgroundSize: "100% 100%" };
  }
}
