/**
 * Keyword → color library for the Skin Studio's vibe prompt.
 *
 * When a creator types something like "warm brown tones" or "ocean to sunset
 * gradient", we detect the color intent and offer a one-click apply. Each
 * entry defines a primary/secondary pair that maps to the skin's
 * `color.accent.primary` and `color.accent.secondary` tokens.
 */

export interface ColorEntry {
  /** Display name shown in the detection chip. */
  name: string;
  /** Words that trigger this color. First word is the canonical label. */
  keywords: string[];
  /** Hex string — applied to `accent.primary` and `accentHover`. */
  primary: string;
  /** Hex string — applied to `accent.secondary`. */
  secondary: string;
}

export const COLOR_LIBRARY: ColorEntry[] = [
  // Warm neutrals
  { name: "Brown",    keywords: ["brown", "chocolate", "espresso", "mocha", "cocoa", "earthy"], primary: "#8b5e3c", secondary: "#d4a373" },
  { name: "Cream",    keywords: ["cream", "beige", "nude", "sand", "ivory", "bone"], primary: "#c8a87c", secondary: "#f5ebe0" },
  { name: "Terracotta", keywords: ["terracotta", "clay", "rust"], primary: "#c1694f", secondary: "#e6a57e" },
  { name: "Amber",    keywords: ["amber", "honey", "caramel"], primary: "#d4a017", secondary: "#f4d77c" },
  { name: "Gold",     keywords: ["gold", "golden", "goldenrod", "brass"], primary: "#c9a227", secondary: "#f4e4ba" },

  // Reds / oranges
  { name: "Red",      keywords: ["red", "crimson", "cherry", "ruby", "scarlet"], primary: "#c1272d", secondary: "#f08080" },
  { name: "Sunset",   keywords: ["sunset", "fiery", "ember"], primary: "#ff7e5f", secondary: "#feb47b" },
  { name: "Coral",    keywords: ["coral", "salmon", "peach"], primary: "#ff6f61", secondary: "#ffb199" },
  { name: "Orange",   keywords: ["orange", "tangerine", "citrus"], primary: "#f77f00", secondary: "#fcbf49" },
  { name: "Burgundy", keywords: ["burgundy", "wine", "maroon"], primary: "#800020", secondary: "#b5525c" },

  // Pinks / magentas
  { name: "Pink",     keywords: ["pink", "bubblegum"], primary: "#ec4899", secondary: "#f9a8d4" },
  { name: "Rose",     keywords: ["rose", "dusty rose", "blush"], primary: "#d88880", secondary: "#f4c2c2" },
  { name: "Magenta",  keywords: ["magenta", "fuchsia"], primary: "#c026d3", secondary: "#e879f9" },

  // Purples
  { name: "Purple",   keywords: ["purple", "violet", "grape"], primary: "#7c3aed", secondary: "#c4b5fd" },
  { name: "Lavender", keywords: ["lavender", "lilac", "periwinkle"], primary: "#8e7cc3", secondary: "#d4b5e8" },
  { name: "Plum",     keywords: ["plum", "eggplant", "aubergine"], primary: "#5d3a6b", secondary: "#a17fb0" },

  // Blues
  { name: "Ocean",    keywords: ["ocean", "sea", "marine", "nautical"], primary: "#1e6091", secondary: "#4a90c2" },
  { name: "Navy",     keywords: ["navy", "midnight blue", "indigo"], primary: "#1e3a5f", secondary: "#4a5d7a" },
  { name: "Sky",      keywords: ["sky", "azure", "cerulean"], primary: "#3b82f6", secondary: "#93c5fd" },
  { name: "Cobalt",   keywords: ["cobalt", "royal blue", "electric blue"], primary: "#1e40af", secondary: "#60a5fa" },
  { name: "Denim",    keywords: ["denim", "steel blue"], primary: "#4682b4", secondary: "#9bbad9" },

  // Greens / teals
  { name: "Forest",   keywords: ["forest", "pine", "evergreen", "moss"], primary: "#2d5a3d", secondary: "#7fb069" },
  { name: "Sage",     keywords: ["sage", "olive", "fern"], primary: "#87a96b", secondary: "#c6d5b0" },
  { name: "Emerald",  keywords: ["emerald", "jade"], primary: "#10b981", secondary: "#6ee7b7" },
  { name: "Mint",     keywords: ["mint", "spearmint"], primary: "#6fcf97", secondary: "#b8e8c8" },
  { name: "Teal",     keywords: ["teal", "aqua", "seafoam", "turquoise"], primary: "#2a9d8f", secondary: "#a8dadc" },
  { name: "Lime",     keywords: ["lime", "chartreuse", "neon green"], primary: "#84cc16", secondary: "#bef264" },

  // Neutrals / achromatic
  { name: "Charcoal", keywords: ["charcoal", "slate", "graphite", "gunmetal"], primary: "#3a3a3a", secondary: "#6b6b6b" },
  { name: "Silver",   keywords: ["silver", "platinum", "pewter"], primary: "#9ca3af", secondary: "#d1d5db" },
  { name: "Black",    keywords: ["black", "onyx", "jet", "obsidian"], primary: "#0f0f0f", secondary: "#3a3a3a" },
  { name: "White",    keywords: ["white", "snow"], primary: "#ffffff", secondary: "#f3f4f6" },

  // Specialty / mood
  { name: "Neon",     keywords: ["neon", "cyberpunk"], primary: "#ff2dff", secondary: "#00fff0" },
  { name: "Pastel",   keywords: ["pastel"], primary: "#fbb1bd", secondary: "#a2d2ff" },
  { name: "Earth",    keywords: ["earth", "earth tone", "earth tones"], primary: "#9c6644", secondary: "#ddb892" },
  { name: "Autumn",   keywords: ["autumn", "fall", "harvest"], primary: "#bc6c25", secondary: "#dda15e" },
  { name: "Spring",   keywords: ["spring", "fresh"], primary: "#70d6ff", secondary: "#e9ff70" },
  { name: "Winter",   keywords: ["winter", "frost", "glacial", "icy"], primary: "#4a7ba6", secondary: "#c0d6e8" },
  { name: "Tropical", keywords: ["tropical"], primary: "#06a77d", secondary: "#f6ae2d" },
  { name: "Monochrome", keywords: ["monochrome", "grayscale"], primary: "#1f2937", secondary: "#9ca3af" },
];

export interface DetectedColor {
  name: string;
  primary: string;
  secondary: string;
  /** When defined, `color.background.gradient` should be set to this string. */
  gradient?: string;
  /** Human-readable summary for the UI chip. */
  summary: string;
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Scan the prompt for color keywords. Returns up to two matches, ordered by
 * first appearance. Multi-word keywords ("earth tones") are checked against
 * the full string; single-word keywords require a full word match.
 */
function detectColors(prompt: string): { entry: ColorEntry; index: number }[] {
  const words = tokenize(prompt);
  const lower = prompt.toLowerCase();
  const hits: { entry: ColorEntry; index: number }[] = [];
  const seen = new Set<string>();

  for (const entry of COLOR_LIBRARY) {
    let earliest = -1;
    for (const kw of entry.keywords) {
      let idx = -1;
      if (kw.includes(" ")) {
        idx = lower.indexOf(kw);
      } else {
        const wi = words.indexOf(kw);
        if (wi >= 0) {
          // Reconstruct approximate character index by summing previous words.
          idx = lower.indexOf(kw);
        }
      }
      if (idx >= 0 && (earliest === -1 || idx < earliest)) earliest = idx;
    }
    if (earliest >= 0 && !seen.has(entry.name)) {
      hits.push({ entry, index: earliest });
      seen.add(entry.name);
    }
  }
  hits.sort((a, b) => a.index - b.index);
  return hits.slice(0, 2);
}

/**
 * Pick a color (and optional gradient) from the prompt. Returns null when
 * nothing matches.
 *
 * - One color detected → returns that color; no gradient.
 * - Two colors detected → returns the first color as primary; if the prompt
 *   contains gradient intent words ("gradient", " to ", "fade", "blend")
 *   emits a linear-gradient CSS string using both colors.
 */
export function pickColorFromPrompt(prompt: string | null | undefined): DetectedColor | null {
  if (!prompt || !prompt.trim()) return null;
  const hits = detectColors(prompt);
  if (hits.length === 0) return null;

  const lower = prompt.toLowerCase();
  const wantsGradient =
    hits.length === 2 &&
    (lower.includes("gradient") ||
      lower.includes("fade") ||
      lower.includes("blend") ||
      /\b\w+\s+to\s+\w+/.test(lower));

  const a = hits[0].entry;
  if (wantsGradient) {
    const b = hits[1].entry;
    return {
      name: `${a.name} → ${b.name}`,
      primary: a.primary,
      secondary: b.primary,
      gradient: `linear-gradient(135deg, ${a.primary}, ${b.primary})`,
      summary: `${a.name} → ${b.name} gradient`,
    };
  }

  return {
    name: a.name,
    primary: a.primary,
    secondary: a.secondary,
    summary: a.name,
  };
}
