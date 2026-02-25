import type { CSSProperties } from "react";

export const ACTION_TYPE_LABELS: Record<string, string> = {
  WATCH: "Watch",
  READ: "Read",
  DO: "Practice",
  REFLECT: "Reflect",
};

function getActionColor(type: string): string {
  switch (type) {
    case "WATCH":
    case "READ":
      return "var(--token-color-accent)";
    case "REFLECT":
      return "var(--token-color-semantic-action-reflect)";
    case "DO":
      return "var(--token-color-semantic-action-do)";
    default:
      return "var(--token-color-text-secondary)";
  }
}

export function getActionTypeColor(type: string): CSSProperties {
  return { color: getActionColor(type) };
}

export function getActionTypeBg(type: string, transparency = 90): CSSProperties {
  const color = getActionColor(type);
  return {
    backgroundColor: `color-mix(in srgb, ${color}, transparent ${transparency}%)`,
    color,
  };
}

export function getActionTypeBgWithBorder(type: string, bgTransparency = 90, borderTransparency = 70): CSSProperties {
  const color = getActionColor(type);
  return {
    backgroundColor: `color-mix(in srgb, ${color}, transparent ${bgTransparency}%)`,
    borderColor: `color-mix(in srgb, ${color}, transparent ${borderTransparency}%)`,
  };
}
