import type { CSSProperties, ElementType, ReactNode } from "react";

function tokenTextStyle(prefix: string): CSSProperties {
  return {
    fontFamily: `var(${prefix}-font)`,
    fontSize: `var(${prefix}-size)`,
    fontWeight: `var(${prefix}-weight)`,
    lineHeight: `var(${prefix}-line-height)`,
  };
}

// ---------------------------------------------------------------------------
// Heading
// ---------------------------------------------------------------------------

type HeadingSize = "xl" | "lg" | "md";

interface HeadingProps {
  size?: HeadingSize;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

const HEADING_ELEMENTS: Record<HeadingSize, ElementType> = {
  xl: "h1",
  lg: "h2",
  md: "h3",
};

export function Heading({ size = "lg", as, className, style, children }: HeadingProps) {
  const Tag = as ?? HEADING_ELEMENTS[size];
  const prefix = `--token-text-heading-${size}`;
  return (
    <Tag
      className={className}
      style={{
        ...tokenTextStyle(prefix),
        color: "var(--token-color-text-primary)",
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

type BodySize = "md" | "sm";

interface BodyProps {
  size?: BodySize;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function Body({ size = "md", as = "p", className, style, children }: BodyProps) {
  const Tag = as;
  return (
    <Tag
      className={className}
      style={{
        ...tokenTextStyle(`--token-text-body-${size}`),
        color: "var(--token-color-text-secondary)",
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------

interface LabelProps {
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function Label({ as = "span", className, style, children }: LabelProps) {
  const Tag = as;
  return (
    <Tag
      className={className}
      style={{
        ...tokenTextStyle("--token-text-label-sm"),
        color: "var(--token-color-text-secondary)",
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
