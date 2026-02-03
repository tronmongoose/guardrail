# GuideRail — Project Kickoff (Next Level)

## 1. Assumptions

- Single developer, macOS, VS Code, Claude Code
- Local-first development with Docker Postgres already running on port 5433
- Existing scaffold is functional: landing, dashboard, editor, sales page, learner timeline all render
- 19 tests passing, Prisma schema pushed, dev mock user works
- No real API keys configured yet (Clerk, Stripe, HF) — first priority is wiring these
- Target: runnable vertical slice where creator can paste videos, generate structure, publish, and learner can purchase and complete actions
- Security sensitivity: medium (payment data via Stripe, user auth via Clerk — both delegated to trusted third parties)
- Timebox: 1 session to complete Priority 1 (creator flow E2E)

## 2. Stack, Platform, Users, Scale, Constraints

- **Stack**: Next.js 15 (App Router), TypeScript, Tailwind, Prisma, Postgres, Clerk, Stripe, HF Inference API
- **Platform**: Vercel (web), local Postgres for dev, Supabase or Railway for prod DB
- **Users**: Creators (build programs), Learners (purchase and complete programs)
- **Scale**: Single-tenant MVP, <100 concurrent users
- **Constraints**: No video editing, no community features, no cohort UI, drip_by_week pacing only

## 3. Repo & Workspace Layout

```
~/code/guiderail/guide.rail/
├── apps/
│   └── web/
│       ├── app/                 # Next.js App Router pages + API routes
│       ├── components/          # Shared UI components (to be created)
│       ├── lib/                 # Prisma, auth, Stripe, utils
│       ├── prisma/              # Schema
│       └── __tests__/           # Vitest
├── packages/
│   ├── shared/                  # Zod schemas, types, YouTube parser
│   └── ai/                      # HF embeddings, clustering, LLM adapter
├── docs/                        # Session notes, kickoff, excluded features
└── scripts/                     # Setup scripts (to be created)
```

## 4. Dev Environment

- **Language**: TypeScript 5.x
- **Framework**: Next.js 15.5.10
- **Dependency manager**: pnpm 9.x (workspaces)
- **.env strategy**: `.env.example` committed, `.env` gitignored, per-app in `apps/web/.env`
- **Docker**: Yes — Postgres already running in Docker on port 5433; no devcontainer needed

## 5. Run Commands

```bash
# install
pnpm install

# run
pnpm dev

# test
pnpm test
```

## 6. Minimum Viable Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App                          │
├─────────────────────────────────────────────────────────────┤
│  Pages (Server Components)                                  │
│  ├── /                    Landing (neon theme)              │
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
├─────────────────────────────────────────────────────────────┤
│  Middleware                                                 │
│  └── Clerk auth (optional bypass for dev)                   │
└─────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│   Postgres   │    │  Clerk (Auth)    │    │   Stripe     │
│   (Prisma)   │    │                  │    │  (Payments)  │
└──────────────┘    └──────────────────┘    └──────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  packages/ai                                                 │
│  ├── HF Embeddings (sentence-transformers/all-MiniLM-L6-v2) │
│  ├── K-means clustering (deterministic, fixed seed)         │
│  └── LLM Adapter (stub / anthropic / openai)                │
└──────────────────────────────────────────────────────────────┘
```

**Data Model (Prisma)**:
- User → Program (1:N)
- Program → Week → Session → Action (nested 1:N)
- Program → YouTubeVideo (1:N)
- Program → ProgramDraft (1:N)
- User → Entitlement → Program (M:N via join)
- User → LearnerProgress → Action (M:N via join)
- Program → Embedding, ClusterAssignment (AI artifacts)

## 7. Security & Safety Baseline

| Threat | Mitigation |
|--------|------------|
| Unauthorized access to creator content | Clerk auth + creatorId check on all program mutations |
| Payment bypass | Stripe webhook signature verification, entitlement check on learner routes |
| YouTube URL injection | Allowlist youtube.com/youtu.be domains, sanitize videoId |
| LLM prompt injection | Structured JSON output, zod validation, retry-repair loop |
| Secrets in repo | .env gitignored, .env.example with placeholders only |

## 8. Milestones

### Day 0: Runnable vertical slice
- Set up Clerk dev instance, add keys
- Theme dashboard + editor to match neon landing
- Test YouTube paste → oEmbed fetch → thumbnail display
- Test AI generate with stub mode
- Verify program structure persists to DB

### Day 1: Core user flow
- Set up Stripe test keys
- Test publish → Stripe product/price creation
- Test checkout → webhook → entitlement
- Test learner timeline → action completion → reflection storage
- Implement weekly drip gating

### Day 2: Hardening and error handling
- Add loading states, error toasts, empty states
- Add sign-in/sign-up pages
- Mobile viewport testing
- Deploy to Vercel, verify build
- Real LLM provider test (anthropic or openai)

## 9. Git Plan

| Commit | Contents |
|--------|----------|
| `feat: wire Clerk auth end-to-end` | Add Clerk keys to .env, create sign-in/sign-up pages, verify middleware protects routes |
| `style: theme dashboard and editor to neon dark` | Update dashboard/page.tsx, programs/[id]/edit/page.tsx, add shared neon component styles |
| `feat: test and fix YouTube paste flow` | Manual test, fix any oEmbed issues, confirm thumbnail + title render |
| `feat: test AI generate with stub mode` | Verify auto-structure + generate endpoints, confirm ProgramDraft persists |
| `feat: wire Stripe checkout and webhook` | Add Stripe keys, test publish, test checkout, verify entitlement created |
| `feat: implement weekly drip gating` | Add enrollment date to Entitlement, gate future weeks in learner timeline |
| `chore: add error states and loading UI` | Spinners, toasts, empty states across all pages |

## 10. Claude Code Prompt Pack

### Prompt 1: Wire Clerk Auth
**Objective**: Configure Clerk with real keys and verify auth flow works end-to-end.

**Files to create or modify**:
- `apps/web/.env` — add CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- `apps/web/app/sign-in/[[...sign-in]]/page.tsx` — Clerk SignIn component
- `apps/web/app/sign-up/[[...sign-up]]/page.tsx` — Clerk SignUp component
- `apps/web/middleware.ts` — verify routes are protected

**Acceptance criteria**:
- User can sign up, sign in, sign out
- Unauthenticated users redirected to sign-in when accessing /dashboard
- Dev mock user fallback still works when Clerk keys not set

---

### Prompt 2: Theme Dashboard and Editor
**Objective**: Apply neon dark theme from landing page to dashboard and program editor.

**Files to modify**:
- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/programs/[id]/edit/page.tsx`
- `apps/web/app/globals.css` (if new utility classes needed)

**Acceptance criteria**:
- Dashboard has dark bg, neon accents, matches landing page aesthetic
- Editor has dark bg, neon form elements, consistent with dashboard
- No light-on-dark contrast issues

---

### Prompt 3: Test YouTube Paste Flow
**Objective**: Verify YouTube URL paste works end-to-end in the editor.

**Files to verify/fix**:
- `apps/web/app/programs/[id]/edit/page.tsx` (paste handler)
- `apps/web/app/api/programs/[id]/videos/route.ts` (oEmbed fetch)
- `packages/shared/src/youtube.ts` (URL parser)

**Acceptance criteria**:
- Paste a real YouTube URL in editor
- Thumbnail and title appear within 2 seconds
- Video persisted to YouTubeVideo table
- Error toast if invalid URL

---

### Prompt 4: Test AI Generate Flow
**Objective**: Verify auto-structure and generate endpoints work with stub mode.

**Files to verify**:
- `apps/web/app/api/programs/[id]/auto-structure/route.ts`
- `apps/web/app/api/programs/[id]/generate/route.ts`
- `packages/ai/src/llm-stub.ts`

**Acceptance criteria**:
- Click "Generate Structure" in editor
- Week/Session/Action structure appears in preview
- Structure persisted to Week, Session, Action tables
- ProgramDraft record created with status PENDING

---

### Prompt 5: Wire Stripe Checkout
**Objective**: Configure Stripe test mode and verify purchase flow.

**Files to modify**:
- `apps/web/.env` — add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- `apps/web/app/api/programs/[id]/publish/route.ts` — verify product/price creation
- `apps/web/app/api/checkout/[programId]/route.ts` — verify session creation
- `apps/web/app/api/webhooks/stripe/route.ts` — verify signature, create entitlement

**Acceptance criteria**:
- Publish a program → Stripe product and price created
- Click "Buy" on sales page → Stripe Checkout opens
- Complete test purchase → webhook fires → Entitlement created
- User can access /learn/[programId]

---

### Prompt 6: Implement Weekly Drip
**Objective**: Gate learner access to future weeks based on enrollment date.

**Files to modify**:
- `apps/web/prisma/schema.prisma` — add enrolledAt to Entitlement (if not present)
- `apps/web/app/learn/[programId]/page.tsx` — calculate current allowed week
- `apps/web/app/learn/[programId]/timeline.tsx` — hide/disable future weeks

**Acceptance criteria**:
- User enrolled today can only see Week 1
- User enrolled 7 days ago can see Weeks 1-2
- Future weeks show locked state with "Unlocks in X days"

---

### Prompt 7: Add Loading and Error States
**Objective**: Add UX polish for async operations.

**Files to modify**:
- `apps/web/app/programs/[id]/edit/page.tsx` — loading states for generate, publish
- `apps/web/app/learn/[programId]/timeline.tsx` — loading state for progress updates
- Create `apps/web/components/ui/spinner.tsx`
- Create `apps/web/components/ui/toast.tsx` (or use sonner)

**Acceptance criteria**:
- Spinner shows during async operations
- Error toast appears on API failure
- Empty states for no programs, no videos, no actions

---

### Prompt 8: Create Sign-In/Sign-Up Pages
**Objective**: Add dedicated auth pages with Clerk components.

**Files to create**:
- `apps/web/app/sign-in/[[...sign-in]]/page.tsx`
- `apps/web/app/sign-up/[[...sign-up]]/page.tsx`

**Acceptance criteria**:
- Pages render with neon dark theme
- Clerk components styled to match app
- Redirect to /dashboard after auth

---

### Prompt 9: Mobile Viewport Testing
**Objective**: Verify all pages work on mobile (375px viewport).

**Files to verify**:
- All pages in `apps/web/app/`
- `apps/web/app/globals.css` — responsive utilities

**Acceptance criteria**:
- Landing page hero readable, CTAs tappable
- Dashboard cards stack vertically
- Editor form fields full-width
- Learner timeline scrollable, actions completable

---

### Prompt 10: Deploy to Vercel
**Objective**: Deploy app to Vercel with all env vars configured.

**Steps**:
- Connect repo to Vercel
- Add env vars: DATABASE_URL (prod DB), CLERK keys, STRIPE keys, LLM_PROVIDER
- Verify build succeeds
- Test all flows on production URL

**Acceptance criteria**:
- Build completes without errors
- All pages load
- Auth, checkout, learner flow work on prod
