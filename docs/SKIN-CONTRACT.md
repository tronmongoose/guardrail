# GuideRail Skin Token Contract

This document defines the exact JSON/TypeScript shape that Figma MCP + Claude must produce when exporting a skin bundle for GuideRail. It also describes naming conventions, Brand Kit mapping, and how bundles integrate with the app.

## Token Bundle Shape

Every skin bundle must satisfy the `SkinTokens` interface from `@guide-rail/shared`. The canonical TypeScript definition lives in `packages/shared/src/skin-tokens.ts`.

```typescript
interface SkinTokens {
  id: SkinId;                    // "default" | "professional" | "warm" | "minimal"
  name: string;                  // Human-readable, e.g. "Minimal Zen"
  description: string;           // Short tagline for picker UI

  color: {
    background: {
      default: string;           // Main canvas (#hex)
      elevated: string;          // Cards, headers, secondary surfaces (#hex)
    };
    border: {
      subtle: string;            // Borders, dividers (#hex)
    };
    text: {
      primary: string;           // Headings, body copy (#hex)
      secondary: string;         // Captions, helper text (#hex)
    };
    accent: string;              // CTA, links, active states (#hex)
    accentHover: string;         // Accent on hover/press (#hex)
    semantic: {
      success: string;           // Success indicators (#hex)
      warning: string;           // Warning indicators (#hex)
      error: string;             // Error indicators (#hex)
      actionDo: string;          // DO action type color (#hex)
      actionReflect: string;     // REFLECT action type color (#hex)
    };
  };

  text: {
    heading: {
      xl: TypographyStyle;       // Hero titles
      lg: TypographyStyle;       // Section headings
      md: TypographyStyle;       // Card headings
    };
    body: {
      md: TypographyStyle;       // Default body text
      sm: TypographyStyle;       // Captions, metadata
    };
    label: {
      sm: TypographyStyle;       // Badges, tags, small labels
    };
  };

  radius: {
    sm: string;                  // Checkboxes, badges (e.g. "4px")
    md: string;                  // Cards, inputs (e.g. "8px")
    lg: string;                  // Modals, hero sections (e.g. "16px")
  };

  shadow: {
    sm: string;                  // Subtle depth (CSS box-shadow or "none")
    md: string;                  // Card elevation (CSS box-shadow or "none")
    lg: string;                  // Modal/overlay depth
  };

  component: {
    button: {
      primary: ButtonTokens;     // Main CTA button
      secondary: ButtonTokens;   // Secondary actions
    };
    chip: {
      background: string;       // Chip fill (#hex with alpha, e.g. "#52525220")
      text: string;             // Chip text (#hex)
      radius: string;           // Chip border-radius
    };
    badge: {
      info: {
        background: string;     // Info badge fill (#hex with alpha)
        text: string;           // Info badge text (#hex)
      };
    };
    progress: {
      track: string;            // Unfilled track (#hex)
      fill: string;             // Filled portion (#hex)
      radius: string;           // Track border-radius
    };
    video: {
      frame: {
        radius: string;         // Video container border-radius
        border: string;         // CSS border shorthand, e.g. "1px solid #e4e4e7"
      };
    };
  };
}

interface TypographyStyle {
  font: string;                 // CSS font-family, e.g. "'Inter', system-ui, sans-serif"
  size: string;                 // CSS font-size, e.g. "1.875rem"
  weight: string;               // CSS font-weight, e.g. "600"
  lineHeight: string;           // CSS line-height, e.g. "1.2"
}

interface ButtonTokens {
  variant: "gradient" | "solid" | "soft" | "outline";
  radius: string;               // CSS border-radius
}
```

## Naming Conventions

Token paths use dot-notation. CSS custom properties use kebab-case with a `--token-` prefix.

| Token Path | CSS Variable | Brand Kit Role |
|---|---|---|
| `color.background.default` | `--token-color-bg-default` | Canvas / page background |
| `color.background.elevated` | `--token-color-bg-elevated` | Card / header surfaces |
| `color.border.subtle` | `--token-color-border-subtle` | Dividers, card borders |
| `color.text.primary` | `--token-color-text-primary` | Headings, body text |
| `color.text.secondary` | `--token-color-text-secondary` | Captions, helper text |
| `color.accent` | `--token-color-accent` | CTA, links, active states |
| `color.accentHover` | `--token-color-accent-hover` | Accent hover/press |
| `color.semantic.success` | `--token-color-semantic-success` | Success status |
| `color.semantic.warning` | `--token-color-semantic-warning` | Warning status |
| `color.semantic.error` | `--token-color-semantic-error` | Error status |
| `color.semantic.actionDo` | `--token-color-semantic-action-do` | DO action type |
| `color.semantic.actionReflect` | `--token-color-semantic-action-reflect` | REFLECT action type |
| `radius.sm` | `--token-radius-sm` | Small elements |
| `radius.md` | `--token-radius-md` | Medium elements |
| `radius.lg` | `--token-radius-lg` | Large elements |
| `shadow.sm` | `--token-shadow-sm` | Subtle depth |
| `shadow.md` | `--token-shadow-md` | Card elevation |
| `shadow.lg` | `--token-shadow-lg` | Modal depth |

Legacy CSS variables (`--skin-bg`, `--skin-accent`, etc.) are also emitted by the bridge for backward compatibility but should not be targeted by new work.

## Figma MCP Export Format

When exporting a skin from Figma via MCP + Claude:

1. Export the Brand Kit page as design tokens
2. Map Figma color styles to token paths:
   - `Background/Default` → `color.background.default`
   - `Background/Elevated` → `color.background.elevated`
   - `Border/Subtle` → `color.border.subtle`
   - `Text/Primary` → `color.text.primary`
   - `Text/Secondary` → `color.text.secondary`
   - `Accent/Default` → `color.accent`
   - `Accent/Hover` → `color.accentHover`
   - `Semantic/Success` → `color.semantic.success`
   - `Semantic/Warning` → `color.semantic.warning`
   - `Semantic/Error` → `color.semantic.error`
   - `Semantic/Action Do` → `color.semantic.actionDo`
   - `Semantic/Action Reflect` → `color.semantic.actionReflect`
3. Map Figma text styles to typography tokens:
   - `Heading/XL` → `text.heading.xl`
   - `Heading/LG` → `text.heading.lg`
   - `Heading/MD` → `text.heading.md`
   - `Body/MD` → `text.body.md`
   - `Body/SM` → `text.body.sm`
   - `Label/SM` → `text.label.sm`
4. Validate output with `SkinTokensSchema.parse(bundle)`

## Mapping to program.skinId

Each skin bundle has an `id` field that matches the `Program.skinId` database column. When a creator selects a theme via the SkinPicker, the `skinId` is stored on the program. At render time:

```
program.skinId → SkinId enum → look up SkinTokens bundle → apply to UI
```

The bridge utility (`apps/web/lib/skin-bridge.ts`) converts between the legacy `Skin` interface and `SkinTokens` in both directions:

- `skinToTokens(skin)` — legacy → tokens (auto-fills typography, shadows, semantic colors)
- `tokensToSkin(tokens)` — tokens → legacy (for existing preview components)
- `getTokenCSSVars(tokens)` — generates both `--skin-*` and `--token-*` CSS custom properties

## SkinThemeProvider

The `SkinThemeProvider` (in `apps/web/components/skins/SkinThemeProvider.tsx`) wraps consumer-facing pages and provides both CSS custom properties and typed React Context access.

**Usage in server components:**
```typescript
import { getSkinTokens } from "@/lib/skin-bundles/registry";
import { SkinThemeProvider } from "@/components/skins/SkinThemeProvider";

const tokens = getSkinTokens(program.skinId);

<SkinThemeProvider tokens={tokens}>
  <LearnerTimeline ... />
</SkinThemeProvider>
```

**Usage in client components (typed access):**
```typescript
import { useSkinTokens } from "@/components/skins/SkinThemeProvider";

const tokens = useSkinTokens();
// tokens.color.accent, tokens.component.button.primary.variant, etc.
```

**Currently wraps:**
- `/learn/[programId]` — learner timeline (fully migrated to CSS vars)
- `/p/[slug]` — sales page (uses token registry + `getTokenCSSVars()`)

## Bundle Registry

The registry (`apps/web/lib/skin-bundles/registry.ts`) is the single entry point for looking up complete `SkinTokens` bundles:

```typescript
import { getSkinTokens } from "@/lib/skin-bundles/registry";

const tokens = getSkinTokens(program.skinId); // Falls back to "default"
```

Available bundles: `default.ts`, `professional.ts`, `warm.ts`, `minimal.ts`

## CSS Variable Naming

`getTokenCSSVars()` emits both legacy `--skin-*` vars (backward compat) and new `--token-*` vars:

| Category | CSS Variables |
|---|---|
| **Colors** | `--token-color-bg-default`, `--token-color-bg-elevated`, `--token-color-border-subtle`, `--token-color-text-primary`, `--token-color-text-secondary`, `--token-color-accent`, `--token-color-accent-hover`, `--token-color-semantic-*` |
| **Typography** | `--token-text-heading-xl-{font,size,weight,line-height}`, `--token-text-heading-lg-*`, `--token-text-heading-md-*`, `--token-text-body-md-*`, `--token-text-body-sm-*`, `--token-text-label-sm-*` |
| **Radius** | `--token-radius-sm`, `--token-radius-md`, `--token-radius-lg` |
| **Shadow** | `--token-shadow-sm`, `--token-shadow-md`, `--token-shadow-lg` |
| **Components** | `--token-comp-btn-primary-{variant,radius}`, `--token-comp-btn-secondary-*`, `--token-comp-chip-{bg,text,radius}`, `--token-comp-badge-info-{bg,text}`, `--token-comp-progress-{track,fill,radius}`, `--token-comp-video-{radius,border}` |
| **Legacy** | `--skin-bg`, `--skin-bg-secondary`, `--skin-text`, `--skin-text-muted`, `--skin-accent`, `--skin-accent-hover`, `--skin-border` |

For opacity variants, use `color-mix(in srgb, var(--token-color-accent), transparent 80%)`.

## Adding a New Skin

1. Add the skin ID to the `SkinId` const in `packages/shared/src/skin-tokens.ts`
2. Add it to the `SkinIdSchema` Zod enum in the same file
3. Create a token bundle file: `apps/web/lib/skin-bundles/<name>.ts`
4. Register it in `apps/web/lib/skin-bundles/registry.ts` (import + add to `SKIN_TOKENS`)
5. Add the legacy `Skin` entry to `SKINS` in `apps/web/lib/skins.ts` (for builder preview compat)
6. Validate: `SkinTokensSchema.parse(yourBundle)` must succeed
7. The SkinPicker will automatically show the new skin

## Validation Rules

All token bundles must pass `SkinTokensSchema.parse()`. Additionally:

- Color values must be hex strings (`#rrggbb`) or hex with alpha suffix (`#rrggbbaa`)
- Typography `size` values must be valid CSS (rem, px, em)
- Typography `weight` values must be valid CSS (numeric or keyword)
- `radius` and `shadow` values must be valid CSS
- `component.video.frame.border` must be a valid CSS border shorthand
- `component.button.*.variant` must be one of: `gradient`, `solid`, `soft`, `outline`

## Reference Implementation

See `apps/web/lib/skin-bundles/minimal.ts` for a complete example bundle. All four bundles (`default.ts`, `professional.ts`, `warm.ts`, `minimal.ts`) follow the same pattern.

## Migration Status

| Page | Status | Notes |
|---|---|---|
| `/learn/[programId]` (LearnerTimeline) | Fully migrated | Uses `--token-*` CSS vars via `SkinThemeProvider` |
| `/p/[slug]` (Sales page) | Fully migrated | Uses `getSkinTokens()` + `getTokenCSSVars()`, action badges use semantic tokens |
| Builder preview (`ProgramOverviewPreview`) | Legacy | Uses `skin.colors.*` inline styles (not in scope — builder-only) |
| Builder (`SkinPicker`) | Legacy | Uses `SKINS` record directly (not in scope — builder-only) |
