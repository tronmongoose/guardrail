# GuideRail — Claude Code Context

## Project Overview

**GuideRail** is a creator-to-learner transformation delivery SaaS. Creators build structured weekly programs (not courses); learners buy and complete them on a calm, drip-paced timeline. First-lane focus is fitness/movement programs (MVP).

Typical flow: Creator pastes YouTube links → AI suggests structure → Creator approves → Publishes with price → Learner buys → Completes weekly actions → Creator gets paid 90%.

---

## Monorepo Structure

```
apps/web/          # Next.js 15 app — primary application
packages/ai/       # Embeddings, clustering, LLM adapter, Gemini video analysis
packages/shared/   # Zod schemas, skin tokens, canonical types, YouTube utils
docs/              # Architecture & skin contract docs
docker-compose.yml # Local Postgres on port 5433
```

Package manager: **pnpm 9** (workspaces).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15.1 (App Router) + React 19 + TypeScript 5.6 |
| Database | PostgreSQL via Prisma 6.2 (Neon in prod, Docker locally) |
| Auth — Creators | Clerk (`@clerk/nextjs`) |
| Auth — Learners | Magic links (email-based, custom) |
| Payments | Stripe one-time payments + Stripe Connect Express (creator payouts) |
| File storage | Vercel Blob |
| Email | Resend API (falls back to console if no key) |
| AI — LLM | Anthropic Claude (`claude-sonnet-4-20250514`) or OpenAI GPT-4o |
| AI — Embeddings | HuggingFace `sentence-transformers/all-MiniLM-L6-v2` |
| AI — Video | Gemini 2.5 Flash |
| Styling | Tailwind CSS 3 + custom token-based skin system |
| Testing | Vitest 2 |

---

## Dev Commands

```bash
pnpm dev              # Start Next.js on localhost:3000
pnpm build            # prisma generate + next build
pnpm db:push          # Push Prisma schema to DB (no migration file)
pnpm db:generate      # Regenerate Prisma client only
pnpm test             # Run Vitest
docker-compose up -d  # Start local Postgres (port 5433)
```

---

## Key Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...        # Neon (prod) or localhost:5433 (local)
DIRECT_DATABASE_URL=postgresql://... # Used for migrations/direct connection

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI
LLM_PROVIDER=stub|anthropic|openai   # stub = no API calls, safe for local dev
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
HUGGINGFACEHUB_API_TOKEN=hf_...

# Email
RESEND_API_KEY=...                   # Optional — logs to console if absent
```

---

## Data Model (Key Models)

Schema: [apps/web/prisma/schema.prisma](apps/web/prisma/schema.prisma)

| Model | Purpose |
|---|---|
| `User` | Creators (clerkId) and learners (email). Same table, `role` field distinguishes. |
| `Program` | Creator-owned program. Has `stripeProductId`, `stripePriceId`, `skinId`, `pacingMode`, `videoGroups`, `sectionBoundaries`. |
| `Week → Session → Action` | Hierarchical content. Actions are WATCH / READ / DO / REFLECT. |
| `Entitlement` | Purchase record. Tracks `currentWeek`, `status` (ACTIVE/REVOKED/EXPIRED). Unique on `(userId, programId)`. |
| `LearnerProgress` | Per-action completion + reflection text. |
| `MagicLink` | Short-lived learner auth tokens. |
| `ProgramArtifact` | PDF/DOCX uploads — metadata + extracted text stored in DB. |
| `GenerationJob` / `ProgramDraft` | Async AI generation pipeline state. |
| `Embedding` / `ClusterAssignment` | HF vector embeddings + k-means cluster results. |

---

## Payment Flow

- **Platform fee:** 10% (hardcoded `PLATFORM_FEE_PERCENT` in checkout route)
- **Creator payout:** 90% via Stripe Connect **destination charges** — automatic transfer to creator's connected account
- **Checkout:** `POST /api/checkout/[programId]` creates a Stripe Checkout Session
- **Webhook:** `POST /api/webhooks/stripe` handles `checkout.session.completed` → upserts `Entitlement` (ACTIVE), sends magic link email to learner
- **Publish gate:** Paid programs require `stripeOnboardingComplete = true` on the creator's `User` record
- **Free programs** (`priceInCents = 0`) bypass Stripe entirely — immediate access granted

Edge case: if a creator somehow lacks a Stripe Connect account at checkout time, funds go 100% to the platform (logged as a warning, not blocked).

---

## Auth Flow

**Creators** → Clerk JWT. Middleware at [apps/web/middleware.ts](apps/web/middleware.ts) protects `/dashboard`, `/programs/*`, `/onboarding`, `/new`.

**Learners** → Magic links. On checkout, a `MagicLink` token is emailed. `GET /auth/magic?token=...` verifies it and sets a session cookie. Learner `User` records are auto-created on first checkout (email-based identity).

---

## Skin / Theme System

- **50+ skin bundles** across 8 categories: `activity`, `classic`, `creative`, `entertainment`, `lifestyle`, `media`, `music`, `pro`
- Legacy skins (`default`, `professional`, `warm`, `minimal`) have been removed — all programs use the new catalog
- Token types defined in [packages/shared/src/skin-tokens.ts](packages/shared/src/skin-tokens.ts)
- Full spec in [docs/SKIN-CONTRACT.md](docs/SKIN-CONTRACT.md)
- Runtime CSS variable injection via [apps/web/lib/skin-bridge.ts](apps/web/lib/skin-bridge.ts)
- Both modern (`--token-*`) and legacy (`--skin-*`) CSS variables are emitted for compatibility
- Token categories: `color`, `text`, `radius`, `shadow`, `component`
- Optional `background.gradient` token emits `--token-color-bg-gradient` for learner page gradient backgrounds
- `SkinPicker` uses a two-panel layout (category tabs + skin grid) with hover-to-preview via `SkinPreviewPanel`
- `SkinPreviewPanel` renders a live mock learner page using CSS token vars; shows Learner step view and Program covers sections

---

## AI Pipeline

1. Creator pastes YouTube video URLs
2. **Video segmentation** ([packages/ai/src/video-segmentation.ts](packages/ai/src/video-segmentation.ts)): long videos (>10 min) are split into virtual child records using Gemini topic timestamps — no physical file splitting
3. HuggingFace generates embeddings from video metadata/transcripts ([packages/ai/src/hf-embeddings.ts](packages/ai/src/hf-embeddings.ts))
4. K-means clustering groups related videos ([packages/ai/src/clustering.ts](packages/ai/src/clustering.ts))
5. LLM generates a structured program draft (weeks/sessions/actions) ([packages/ai/src/llm-adapter.ts](packages/ai/src/llm-adapter.ts))
6. Gemini 2.5 Flash analyzes individual videos for full topic extraction, segment boundaries, transcripts ([packages/ai/src/gemini-video-analyzer.ts](packages/ai/src/gemini-video-analyzer.ts))
7. Async generation pipeline handles segmented videos as independent content pieces
8. Creator reviews the `ProgramDraft` and approves or edits before publishing

Use `LLM_PROVIDER=stub` locally to skip all LLM API calls.

---

## Program Creation Wizard

4-step wizard at `apps/web/components/wizard/`:

| Step | Label | Component | Notes |
|---|---|---|---|
| 1 | Basics | `StepBasics` | Title + target transformation only (description/outcome removed from UI but kept in data model) |
| 2 | Content | `StepContent` | YouTube URLs + file artifact uploads |
| 3 | Lessons flow | `StepDuration` | Program length presets + pacing mode (drip vs unlock-on-complete) |
| 4 | Theme | `StepReview` | `SkinPicker` as hero; `vibePrompt` + `skinId` saved on generation |

- Wizard state auto-persists to `localStorage` (artifacts' `extractedText` excluded to avoid quota issues)
- On final step, saves program details via `PATCH /api/programs/[id]`, then calls `POST /api/programs/[id]/generate-async`

---

## Program Editor

Tab-based editor (`ProgramBuilderSplit`) with four tabs:

- **Curriculum** — drag-and-drop week/session tree (`TreeNavigation`), single `DndContext` to avoid nested sensor interference, cross-group session moves, inline rename on click
- **Settings** — program metadata
- **Pricing** — price, promo codes
- **Preview** — live skin preview

Drag-and-drop notes:
- Week reordering uses a two-pass DB transaction to avoid unique constraint conflicts on `sortOrder`
- Session moves send `weekId` to support cross-group (cross-week) moves
- "Week" label swaps to "Lesson" in display when `pacingMode = UNLOCK_ON_COMPLETE`

---

## Promo Codes

- Full CRUD API at `POST/GET/PATCH/DELETE /api/programs/[id]/promo-codes`
- Validate endpoint: `POST /api/promo-codes/validate`

---

## Deployment

- Target: **Vercel** — root directory must be set to `apps/web` in Vercel project settings
- Config: [apps/web/vercel.json](apps/web/vercel.json)
- Build runs `prisma migrate deploy` before `next build`
- Remote image domains: `i.ytimg.com`, `img.youtube.com` (YouTube thumbnails)

---

## Key File Locations

| Purpose | Path |
|---|---|
| Prisma schema | [apps/web/prisma/schema.prisma](apps/web/prisma/schema.prisma) |
| Stripe checkout | [apps/web/app/api/checkout/[programId]/route.ts](apps/web/app/api/checkout/[programId]/route.ts) |
| Stripe webhook | [apps/web/app/api/webhooks/stripe/route.ts](apps/web/app/api/webhooks/stripe/route.ts) |
| Stripe Connect onboarding | [apps/web/app/api/stripe/connect/route.ts](apps/web/app/api/stripe/connect/route.ts) |
| Program publish (Stripe product creation) | [apps/web/app/api/programs/[id]/publish/route.ts](apps/web/app/api/programs/[id]/publish/route.ts) |
| Magic link utility | [apps/web/lib/magic-link.ts](apps/web/lib/magic-link.ts) |
| Skin bridge (CSS variable injection) | [apps/web/lib/skin-bridge.ts](apps/web/lib/skin-bridge.ts) |
| Skin token types | [packages/shared/src/skin-tokens.ts](packages/shared/src/skin-tokens.ts) |
| Skin picker component | [apps/web/components/SkinPicker.tsx](apps/web/components/SkinPicker.tsx) |
| Skin preview panel | [apps/web/components/SkinPreviewPanel.tsx](apps/web/components/SkinPreviewPanel.tsx) |
| LLM adapter | [packages/ai/src/llm-adapter.ts](packages/ai/src/llm-adapter.ts) |
| Video segmentation | [packages/ai/src/video-segmentation.ts](packages/ai/src/video-segmentation.ts) |
| Gemini video analyzer | [packages/ai/src/gemini-video-analyzer.ts](packages/ai/src/gemini-video-analyzer.ts) |
| Promo codes API | [apps/web/app/api/programs/[id]/promo-codes/route.ts](apps/web/app/api/programs/[id]/promo-codes/route.ts) |
| Platform checkout | [apps/web/app/api/checkout/platform/route.ts](apps/web/app/api/checkout/platform/route.ts) |
| Dashboard settings | [apps/web/app/dashboard/settings/page.tsx](apps/web/app/dashboard/settings/page.tsx) |
| Next.js config | [apps/web/next.config.ts](apps/web/next.config.ts) |
| Clerk middleware | [apps/web/middleware.ts](apps/web/middleware.ts) |
| Stripe client init | [apps/web/lib/stripe.ts](apps/web/lib/stripe.ts) |
