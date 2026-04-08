# JOURNEYLINE.md
# Master marketing + brand context file for Claude Code.
# Load this when working on marketing, copy, ads, or brand surfaces.
# Last updated: April 2026

---

## 1. WHAT JOURNEYLINE IS

**One-line:** Journeyline is a transformation delivery system — not a course platform.

**The wedge:** Creators paste existing content → AI generates a structured program draft →
learners progress through lessons at their own pace with one clear next action at a time.

**We are NOT:** a content library, a video host, a community platform, or a course builder.

**We WIN because:** every other platform gives learners a dashboard full of content.
We give them a guided journey with a clear path forward.

---

## 2. POSITIONING — USE THESE EXACT LINES

Primary tagline (use everywhere):
> "Designed programs that feel guided — not a content dump."

Supporting lines (approved for ads, landing pages, copy):
- "Turn your existing content into a paid, guided program."
- "Monetize your content, not just your views."
- "Stop selling courses. Start selling transformations."
- "Upload your content → get a structured program → sell it."
- "Don't get paid $0.0001 per view — get paid $500 every time someone signs up."
- "Your expertise is worth more than ad revenue."
- "Paste your content. Get a structured, guided program you can sell."
- "Ship a paid program in days, not months."
- "Your audience wants a journey, not another dashboard."

**DO NOT generate new positioning lines without checking these first.**
**DO NOT use "course" as a positive descriptor — we position against courses.**
**DO NOT use "time-bound", "weekly", "8-week", or any fixed-duration language.**
**Programs are self-paced. Learners advance lesson by lesson, on their own schedule.**

---

## 3. BRAND / VISUAL IDENTITY

Product name: **Journeyline** (one word, capital J only)
Previously called: Skill Guide / Guiderail (legacy — do not use in new copy)
Entity: Skill Guide LLC
App URL: app.journeyline.ai
Marketing site: journeyline.ai (Webflow)

### Colors

| Role | Name | Hex |
|------|------|-----|
| Primary | Deep Indigo | `#2B2F8C` |
| Accent 1 (CTAs) | Warm Coral | `#FF7A5C` |
| Accent 2 (success/progress) | Teal Signal | `#22C5B5` |
| Background | Soft Shell | `#FAFAFF` |
| Card surface | Pure White | `#FFFFFF` |
| Border | Soft Border | `#E1E4F5` |
| Body text | Ink | `#101323` |
| Muted text | Slate | `#4B4F67` |

**Learner-facing dark theme** (separate from creator dashboard):
- Background gradient: `#1E1A4D → #3C0366 → black`
- Primary accent gradient: `#AD46FF → #F6339A`

**Journeyline brand colors** (nav/header):
- Navy: `#0A0E1A` | Electric blue: `#4D9FFF` | Soft blue: `#6EB3FF` | Deep blue: `#185FA5`

### Typography
- **Display/Headlines:** Space Grotesk (600–700 weight)
- **Body/UI:** Inter (400 weight, 16px base)
- H1 hero: 40–48px desktop / 28–32px mobile
- Buttons: Inter 600, 15–16px, pill radius (999px) or 8px

### Buttons
- Primary CTA: Warm Coral `#FF7A5C` bg, white text, pill shape
- Secondary: Transparent, `1px #2B2F8C` border, Deep Indigo text
- Hover primary: `#F26A4D`

---

## 4. WHO WE BUILD FOR (ICP)

### Creator archetypes
1. **Influencers & content creators** — TikTok/IG/YouTube/X; want to monetize beyond ads; fitness, productivity, editing, design, coding, music, language niches
2. **Coaches & trainers** — fitness, wellness, business, mindset; already run cohorts or 1:1; want a repeatable structured program they can sell at scale
3. **Subject-matter experts** — writers, consultants, operators; have workshops or lesson libraries; want a guided journey with clear outcomes

### Common traits (all archetypes)
- Already publish content and have assets to pull from
- Have (or are close to) a trusting audience
- Care about learner outcomes, not just selling access to a library
- Want to move from "I post a lot" to "I run structured programs people complete"

### Priority lane for early experiments
**Fitness/movement creators** — program-style structures are culturally normal, before/after content is easy to market, coaches already sell structured programs.

Secondary: Skill builders (editing, design, coding, business skills).

---

## 5. COMPETITOR LANDSCAPE

| Platform | Their model | Our angle |
|----------|-------------|-----------|
| Teachable | Course library / content dashboard | "Most platforms give you a dashboard. Journeyline gives learners a clear path." |
| Kajabi | All-in-one marketing + course hub | Heavy, funnel-centric, not outcome-first |
| Thinkific | Traditional course builder | Same "course dashboard" mental model |
| Maven | Live cohorts, high-ops | We're the async, lower-ops alternative |
| Skool | Community + course library | Community-first; program experience is secondary |
| Disco | Cohort communities, live-heavy | Ops-heavy; not built for reusing existing content |

**Ad targeting:** Interest targeting around Teachable, Kajabi, cohort/course tools, Maven, Notion.

---

## 6. CREATOR JOURNEY (THE FUNNEL)

```
First touch → Creator signup → Program draft created → Program published → Learners enrolled
```

1. **First touch:** Ad / organic clip → creator landing page
2. **Signup:** Single CTA — "Create Your Program"
3. **Draft created:** Creator pastes YouTube links or uploads content → AI generates lesson structure → creator reviews (**NEVER auto-publish**)
4. **Published (ACTIVATION):** Creator publishes, gets shareable link, promotes to their audience
5. **Learners enrolled:** Learners buy, advance through lessons at their own pace, complete actions, submit reflections

**Activation = creator has published at least one program.**

### Key metrics
- Cost per creator signup
- % signups → program draft created
- % drafts → published (activation rate)
- Cost per activated creator

---

## 7. PRODUCT — WHAT EXISTS TODAY

### Tech stack
- **Framework:** Next.js 15 (App Router), monorepo at `~/guardrail.influencerapp`, web app at `apps/web`
- **Auth:** Clerk (production, domain: app.journeyline.ai)
- **Database:** Neon Postgres via Prisma — primary tables: `YouTubeVideo`, `Action`
- **Payments:** Stripe ✅ fully built — do NOT rebuild
- **Video:** Mux — fields `muxPlaybackId`, `muxAssetId`, `muxUploadId`, `muxStatus` on `YouTubeVideo`
- **Deployment:** Vercel (`tronmongooses-projects`)
- **Email:** Resend | **AI:** Gemini / OpenAI
- **Marketing site:** Webflow (journeyline.ai)

### Already built — do NOT rebuild
- Stripe payments + access gating ✅
- Clerk auth (production) ✅
- Mux video playback + webhooks ✅
- Program draft generation (AI) ✅
- Creator publish flow ✅

### Learner experience
- Self-paced lesson progression — "Next Action" view
- Learners advance when ready, not on a fixed schedule
- Progress indicators and reflections
- Dark design system (see colors above)

---

## 8. MARKETING CHANNELS + APPROACH

### Paid (primary)
- Meta (Facebook + Instagram) and TikTok
- Start $20–30/day per platform
- Optimize for **cost per activated creator**, not just signups

### Organic (supportive)
- Primary: TikTok or IG Reels — 3–5 short clips/week
- Secondary: X (build-in-public)

### Ad formats to prioritize
- Talking head (creator-style explanation of the promise)
- Screen recording of the builder and learner lesson view
- Motion-text over UI snippets
- Before/after: messy content folder → calm Journeyline lesson path

### Winning hooks (test these first)
1. "Turn your existing content into a paid, guided program."
2. "Monetize your content, not just your views."
3. "Don't get paid $0.0001 per view — get paid $500 every time someone signs up."
4. "Stop selling courses. Start selling transformations."
5. "Upload your content → get a structured program → sell it."

### Weekly cadence
- **Mon:** Review spend, clicks, signups, drafts, activations by creator lane
- **Tue–Wed:** Ship 2–4 new creative variants
- **Thu:** Review funnel drop-offs by stage
- **Fri:** Document learnings, queue next week's experiments

### Always-on experiment buckets (one test per bucket)
- Hook angle
- Creative format (talking head / screen recording / motion text)
- Landing page framing (pain-first / outcome-first / monetization-first)
- Creator lane (fitness / editing / business coaches)

---

## 9. CONTENT PILLARS

1. **The problem:** "Courses feel like Netflix — overwhelming dashboards, no clear path"
2. **The solution:** Show the calm lesson view, "one step at a time, at your own pace"
3. **Creator economics:** "Move from $0.0001/view to $500/enrollment"
4. **Build-in-public:** New features, UI clips, pilot creator stories
5. **Transformation proof:** Creator + learner wins (even small ones)

---

## 10. TOOLING + MCP CONNECTIONS

### Active MCP servers
- Canva — creative generation, brand templates, ad resizing
- ClickUp — task/project management
- Figma — skins file `P94190iyrjqLvtprXiLTKY`, branding file `U1s53lMOVNNwIG63lAhTeM`
- Gmail — outreach, comms
- Google Calendar — content scheduling

### ClickUp structure
- Engineering space ID: `90173879827`
- Journeyline Dev folder ID: `90177789680`
- Lists: Backlog `901712393284`, In Progress, In Review, Done, Session Log
- Valid statuses: `backlog` `in development` `in review` `scoping` `in design`
- ⚠️ NEVER use `in progress` — silently fails

### Planned (not yet active)
- Pipeboard — Meta Ads Manager live data
- Cometly — attribution

---

## 11. RULES FOR MARKETING SESSIONS

1. Read this file before any marketing, copy, or brand task.
2. Use exact copy from Section 2. Do not paraphrase or invent new positioning.
3. No weeks, no time-bound language. Programs are self-paced by lesson.
4. Creator dashboard = light theme. Learner experience = dark theme. Never mix.
5. Domain is `app.journeyline.ai`. Never reference `guiderail.app`.
6. Audit before building — Stripe, auth, and video are fully built.
7. Never auto-publish AI-generated program drafts.
8. Log session summary to ClickUp Session Log list at end of every session.

---

## 12. NOT BUILDING YET (flag and backlog, do not implement)

- Community / forums / chat
- Live cohort / office hours features
- Complex analytics dashboards
- Video remix / re-edit tooling
- Live streaming

---

*Update this file after any major positioning or product shift.*
