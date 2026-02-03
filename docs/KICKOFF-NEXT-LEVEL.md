# GuideRail — Project Kickoff

## The Wedge

Transformation delivery, not course libraries.

- Programs are 6-12 weeks, paced (drip/unlock)
- One clear next action at a time
- Outcome-first: sell results, not content dumps
- First lane: fitness / movement programs

## What We're NOT Building

Community, chat, cohorts, analytics dashboards, video editing. Scope stays brutally small.

## MVP Definition

Creator can sell a structured journey today.

**Creator can:**
- Create program -> weeks -> sessions -> actions
- Attach existing YouTube links
- Edit instructions + reflection prompts
- Publish and set a price

**Learner can:**
- Buy access
- See a calm timeline ("This Week / Next Action")
- Complete actions + submit reflections
- Have progress saved reliably

**System:**
- Gates access by purchase
- Stores progress deterministically

**AI (assistive only):**
- Generate draft program structure from YouTube metadata
- Creator must review + approve (never auto-publish)
- Validate against schema, retry on failure
- Store drafts explicitly
- Embeddings + clustering for structure
- Paid LLM only for final structured JSON

## Goal

Get 2 pilot creators selling paid programs fast. Manual onboarding is fine. White-glove setup is fine.

---

## 1. Assumptions

- Single developer, macOS, VS Code, Claude Code
- Local-first dev with Docker Postgres on port 5433
- Existing scaffold functional: landing, dashboard, editor, sales page, learner timeline all render
- 19 tests passing, Prisma schema pushed, dev mock user works
- No real API keys configured yet (Clerk, Stripe, HF)
- Target: runnable vertical slice where creator pastes videos, generates structure, publishes, learner purchases and completes
- Security: medium (payments via Stripe, auth via Clerk — both delegated)
- Timebox: 1 session to complete Priority 1 (creator flow E2E)

## 2. Stack, Platform, Users, Scale, Constraints

- **Stack**: Next.js 15 (App Router), TypeScript, Tailwind, Prisma, Postgres, Clerk, Stripe, HF Inference API
- **Platform**: Vercel (web), local Postgres for dev, Supabase or Railway for prod
- **Users**: Creators (build programs), Learners (purchase and complete)
- **Scale**: <100 concurrent users, single-tenant MVP
- **Constraints**: No video editing, no community, no cohort UI, drip_by_week pacing only

## 3. Repo & Workspace Layout

```
~/code/guiderail/guide.rail/
├── apps/
│   └── web/
│       ├── app/           # Next.js App Router pages + API routes
│       ├── components/    # Shared UI (to be created)
│       ├── lib/           # Prisma, auth, Stripe, utils
│       ├── prisma/        # Schema
│       └── __tests__/     # Vitest
├── packages/
│   ├── shared/            # Zod schemas, types, YouTube parser
│   └── ai/                # HF embeddings, clustering, LLM adapter
├── docs/                  # This file, session notes
└── scripts/               # Setup scripts (to be created)
```

## 4. Dev Environment

- **Language**: TypeScript 5.x
- **Framework**: Next.js 15.5.10
- **Dependency manager**: pnpm 9.x (workspaces)
- **.env strategy**: `.env.example` committed, `.env` gitignored
- **Docker**: Postgres on port 5433, no devcontainer

## 5. Run Commands

```bash
pnpm install
pnpm dev
pnpm test
```

## 6. Minimum Viable Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App                          │
├─────────────────────────────────────────────────────────────┤
│  Pages                                                      │
│  ├── /                    Landing                           │
│  ├── /dashboard           Creator program list              │
│  ├── /programs/[id]/edit  Creator editor                    │
│  ├── /p/[slug]            Public sales page                 │
│  └── /learn/[programId]   Learner timeline                  │
├─────────────────────────────────────────────────────────────┤
│  API Routes                                                 │
│  ├── /api/programs/*      CRUD, videos, auto-structure,     │
│  │                        generate, publish                 │
│  ├── /api/checkout/*      Stripe Checkout                   │
│  ├── /api/webhooks/stripe Entitlement creation              │
│  └── /api/progress        Action completion                 │
└─────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
     Postgres            Clerk (Auth)          Stripe
      (Prisma)
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  packages/ai                                                 │
│  ├── HF Embeddings (all-MiniLM-L6-v2)                       │
│  ├── K-means clustering (deterministic)                     │
│  └── LLM Adapter (stub / anthropic / openai)                │
└──────────────────────────────────────────────────────────────┘
```

**Data Model**:
- User -> Program (1:N)
- Program -> Week -> Session -> Action (nested 1:N)
- Program -> YouTubeVideo (1:N)
- Program -> ProgramDraft (1:N, AI-generated, pending approval)
- User -> Entitlement -> Program (M:N)
- User -> LearnerProgress -> Action (M:N)
- Program -> Embedding, ClusterAssignment (AI artifacts)

## 7. Security & Safety Baseline

| Threat | Mitigation |
|--------|------------|
| Unauthorized content access | Clerk auth + creatorId check on mutations |
| Payment bypass | Stripe webhook signature, entitlement check |
| YouTube URL injection | Allowlist domains, sanitize videoId |
| LLM prompt injection | Structured JSON, zod validation, retry-repair |
| Secrets in repo | .env gitignored, .env.example only |

## 8. Milestones

### Day 0: Runnable vertical slice
- Clerk dev instance, add keys
- Theme dashboard + editor to neon dark
- YouTube paste -> oEmbed -> thumbnail
- AI generate with stub mode
- Program structure persists to DB

### Day 1: Core user flow
- Stripe test keys
- Publish -> product/price creation
- Checkout -> webhook -> entitlement
- Learner timeline -> completion -> reflection
- Weekly drip gating

### Day 2: Hardening
- Loading states, error toasts, empty states
- Sign-in/sign-up pages
- Mobile testing
- Deploy to Vercel
- Real LLM provider test

## 9. Git Plan

| Commit | Contents |
|--------|----------|
| `feat: wire Clerk auth` | Keys, sign-in/sign-up pages, middleware |
| `style: neon theme dashboard + editor` | Dark bg, neon accents |
| `feat: YouTube paste flow` | oEmbed fetch, thumbnail display |
| `feat: AI generate (stub)` | auto-structure + generate, ProgramDraft |
| `feat: Stripe checkout + webhook` | Publish, checkout, entitlement |
| `feat: weekly drip gating` | enrolledAt, gate future weeks |
| `chore: loading + error states` | Spinners, toasts, empty states |

## 10. Claude Code Prompt Pack

### Prompt 1: Wire Clerk Auth
Configure Clerk with real keys. Verify auth flow E2E.

**Files**: `.env`, `sign-in/[[...sign-in]]/page.tsx`, `sign-up/[[...sign-up]]/page.tsx`, `middleware.ts`

**Done when**: Sign up, sign in, sign out work. Unauthenticated users redirected. Dev mock still works without keys.

---

### Prompt 2: Theme Dashboard + Editor
Apply neon dark theme from landing to dashboard and editor.

**Files**: `dashboard/page.tsx`, `programs/[id]/edit/page.tsx`, `globals.css`

**Done when**: Dark bg, neon accents, no contrast issues.

---

### Prompt 3: YouTube Paste Flow
Verify URL paste works E2E in editor.

**Files**: `programs/[id]/edit/page.tsx`, `api/programs/[id]/videos/route.ts`, `packages/shared/src/youtube.ts`

**Done when**: Paste URL, thumbnail + title appear in 2s, persisted to DB, error on invalid.

---

### Prompt 4: AI Generate (Stub)
Verify auto-structure and generate endpoints with stub mode.

**Files**: `api/programs/[id]/auto-structure/route.ts`, `api/programs/[id]/generate/route.ts`, `packages/ai/src/llm-stub.ts`

**Done when**: Click generate, structure appears, persisted to Week/Session/Action, ProgramDraft created.

---

### Prompt 5: Stripe Checkout + Webhook
Configure Stripe test mode. Verify purchase flow.

**Files**: `.env`, `api/programs/[id]/publish/route.ts`, `api/checkout/[programId]/route.ts`, `api/webhooks/stripe/route.ts`

**Done when**: Publish creates product/price, buy opens Checkout, webhook creates entitlement, learner accesses timeline.

---

### Prompt 6: Weekly Drip Gating
Gate learner access to future weeks by enrollment date.

**Files**: `prisma/schema.prisma` (enrolledAt), `learn/[programId]/page.tsx`, `learn/[programId]/timeline.tsx`

**Done when**: Today = Week 1 only, 7 days ago = Weeks 1-2, future weeks locked with "Unlocks in X days".

---

### Prompt 7: Loading + Error States
Add UX polish for async ops.

**Files**: `programs/[id]/edit/page.tsx`, `learn/[programId]/timeline.tsx`, `components/ui/spinner.tsx`, `components/ui/toast.tsx`

**Done when**: Spinner during async, error toast on failure, empty states.

---

### Prompt 8: Sign-In/Sign-Up Pages
Dedicated auth pages with Clerk.

**Files**: `sign-in/[[...sign-in]]/page.tsx`, `sign-up/[[...sign-up]]/page.tsx`

**Done when**: Neon dark theme, styled Clerk, redirect to dashboard.

---

### Prompt 9: Mobile Testing
Verify all pages at 375px viewport.

**Files**: All pages, `globals.css`

**Done when**: Landing readable, dashboard stacks, editor full-width, timeline scrollable.

---

### Prompt 10: Deploy to Vercel
Ship it.

**Steps**: Connect repo, add env vars (DATABASE_URL, CLERK, STRIPE, LLM_PROVIDER), verify build.

**Done when**: Build succeeds, all pages load, auth + checkout + learner flow work on prod.
