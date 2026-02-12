# GuideRail Deployment Troubleshooting Plan

## Current Issue

**Problem:** API routes return 404 on all Vercel production URLs, even though:
- Code is pushed to `origin/main` (commit `9fbec36`)
- Local build succeeds with all routes listed
- Homepage (/) returns 200, but /dashboard and all /api/* routes return 404

**URLs Tested:**
- `https://guardrail-web.vercel.app/` → 200 (homepage only)
- `https://guardrail-web.vercel.app/api/health` → 404
- `https://guardrail-web.vercel.app/dashboard` → 404

**Diagnosis:** This is a partial deployment - only static assets deployed, not the full Next.js app with API routes and dynamic pages.

---

## Option 1: Fix Root Directory Setting (Most Likely Fix)

**Time:** 2 minutes

1. Go to Vercel Dashboard → Your Project → **Settings** → **General**
2. Find **Root Directory** setting
3. Set it to: `apps/web`
4. Click Save
5. Go to **Deployments** → Click "..." on latest → **Redeploy**

**Why this works:** Your monorepo has the Next.js app in `apps/web`, not the root. Without this setting, Vercel deploys from the wrong directory.

---

## Option 2: Check Build Logs for Errors

**Time:** 5 minutes

1. Go to Vercel Dashboard → **Deployments**
2. Click the latest deployment (should show commit `9fbec36`)
3. Click **"Building"** tab to see full build logs
4. Look for:
   - Red error messages
   - "Build failed" or "Error" keywords
   - Missing environment variables warnings
   - Prisma generation errors

**Common issues to look for:**
- `DATABASE_URL` not set → Add in Vercel Environment Variables
- `CLERK_SECRET_KEY` missing → Add in Vercel Environment Variables
- Prisma client generation failed → Usually env var issue

---

## Option 3: Verify Environment Variables

**Time:** 5 minutes

Required environment variables for GuideRail:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth (public) |
| `CLERK_SECRET_KEY` | Clerk auth (secret) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
| `ANTHROPIC_API_KEY` | Claude AI for program generation |
| `STRIPE_SECRET_KEY` | Stripe payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks |

**Steps:**
1. Go to Vercel Dashboard → **Settings** → **Environment Variables**
2. Verify all variables above are set for **Production** environment
3. Compare with your local `.env` file in `apps/web/.env`

---

## Option 4: Force Clean Redeploy

**Time:** 5 minutes

If settings look correct but deployment is still broken:

1. Go to Vercel Dashboard → **Deployments**
2. Find a deployment you know worked (or the initial one)
3. Click "..." → **Promote to Production**

Or trigger a fresh deploy:
```bash
# Make a trivial change and push
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

---

## Option 5: Verify vercel.json Configuration

Current `apps/web/vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "cd ../.. && corepack enable && pnpm install",
  "buildCommand": "pnpm run build",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

This looks correct, but verify in Vercel Dashboard that:
- **Framework Preset** is set to "Next.js"
- **Build Command** override (if any) matches
- **Output Directory** is `.next`

---

## Option 6: Check for Middleware Issues

The app has Clerk middleware at `apps/web/middleware.ts`. If there's an issue:

1. Check if middleware is blocking routes
2. Temporarily comment out middleware to test
3. Check Vercel Functions logs for errors

---

## Verification Steps After Fix

Once you've applied a fix, verify with:

```bash
# Test health endpoint
curl https://guardrail-web.vercel.app/api/health

# Expected response:
# {"status":"ok","timestamp":"...","version":"2026-02-11-wizard","features":{...}}

# Test dashboard (should redirect to sign-in, not 404)
curl -I https://guardrail-web.vercel.app/dashboard
# Expected: 307 redirect to /sign-in, NOT 404
```

---

## Quick Checklist

- [ ] Root Directory set to `apps/web` in Vercel Settings
- [ ] All environment variables configured for Production
- [ ] Build logs show successful completion
- [ ] Framework set to Next.js
- [ ] Latest commit `9fbec36` is deployed

---

## New Features Ready After Fix

Once deployment works, these features will be available:

1. **Program Creation Wizard** - Multi-step guided flow (`/programs/[id]/edit?wizard=true`)
2. **Duration Presets** - 4, 6, 8, 12, 24 week options + custom
3. **PDF/DOCX Upload** - Client-side extraction (privacy-first)
4. **Influencer Style Matching** - API ready at `/api/influencers`
5. **Health Check Endpoint** - `/api/health` for monitoring

---

## Contact

If none of these options work, the issue may be Vercel-specific. Check:
- Vercel Status: https://www.vercel-status.com/
- Vercel Support: https://vercel.com/support
