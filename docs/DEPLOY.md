# Hourguard — Vercel deployment runbook

Turnkey steps to deploy `apps/web` to **hourguard.hirejps.com** on Vercel.
Do this on a computer (Vercel dashboard + your DNS provider). Everything the
build needs is already in the repo (`vercel.json`, `pnpm-lock.yaml`).

Facts baked into the repo:
- Monorepo: pnpm workspace + turbo. `packageManager: pnpm@9.9.0`.
- `vercel.json` sets `buildCommand: pnpm build:web`, `outputDirectory:
  apps/web/.next`, `framework: nextjs`, and a daily screenshot-cleanup cron.
- Auth redirect links use the request origin / `NEXT_PUBLIC_APP_URL`, so no
  hardcoded URLs to change.

---

## 0. Prerequisites

- [ ] The **hirejps-portal** Supabase project exists and has run
      `supabase/migrations/002_hirejps_portal_adapted.sql` (the `hg_*` tables,
      `current_org_id()`, RLS). This app uses that project — NOT a new one.
- [ ] A private Storage bucket named **`screenshots`** exists in that project
      (Storage → New bucket → name `screenshots` → keep it **private**; the app
      serves images via signed URLs).
- [ ] This repo is on GitHub and the branch you want to deploy is pushed.

## 1. Import the project into Vercel

1. Vercel → **Add New… → Project** → import the `hourguard` GitHub repo.
2. **Root Directory:** leave as the repo root (`./`). Do NOT set it to
   `apps/web` — the build script `pnpm build:web` and the pnpm workspace run
   from the root, and `vercel.json` already points the output at
   `apps/web/.next`.
3. Framework / build / install: auto-detected from `vercel.json`
   (Next.js, `pnpm build:web`, `pnpm install`). Leave the overrides off.
4. **Node.js version:** 20.x (Project → Settings → General → Node.js Version) —
   Next 14 requires ≥18.17; 20 is the safe default.

## 2. Environment variables

Add these under **Settings → Environment Variables** for **Production** (and
Preview if you want preview deploys to work). Values come from the
hirejps-portal Supabase project (Settings → API).

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | `https://<project>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **server-only** — never prefix with `NEXT_PUBLIC`. Powers signup/invite/cron/webhook. |
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://hourguard.hirejps.com` |
| `CRON_SECRET` | ✅ (for retention) | any long random string. Vercel automatically sends it as `Authorization: Bearer <CRON_SECRET>` to cron routes; the cleanup route checks it. |
| `SCREENSHOT_RETENTION_DAYS` | optional | defaults to `90` |
| `PADDLE_WEBHOOK_SECRET` | optional | set when you wire Paddle; until then the webhook returns 503 (harmless) |

## 3. First deploy + smoke test on the `*.vercel.app` URL

1. Deploy. When it's green, open the temporary `…vercel.app` URL.
2. Marketing page loads at `/`.
3. `/signup` → create a throwaway org → lands on the dashboard (this exercises
   the service-role provisioning route). Then delete that org/user later from
   Supabase if you don't want it.
4. `/login` → sign in works.

## 4. Attach the domain

1. Vercel → Project → **Settings → Domains → Add** → `hourguard.hirejps.com`.
2. Vercel shows the DNS record to create. At your DNS provider for
   `hirejps.com`, add it — normally:
   - **CNAME** `hourguard` → `cname.vercel-dns.com`
   (If `hirejps.com` apex is on Vercel already, Vercel may instead show an A/ALIAS
   target — use exactly what it displays.)
3. Wait for Vercel to verify and issue the TLS cert (usually minutes).

> Note: `hourguard.hirejps.com` is a **new subdomain**, independent of the
> `portal.hirejps.com` placeholder move described in the portal-dashboard repo.
> Nothing to remove from the main site for this one.

## 5. Supabase Auth configuration (do this or reset/confirm links break)

In the hirejps-portal project → **Authentication → URL Configuration**:

- **Redirect URLs** — add (allowlist):
  - `https://hourguard.hirejps.com/reset-password`
  - `https://hourguard.hirejps.com/**`
  - keep `http://localhost:3000/**` for local dev
- **Site URL** — this project is shared across the portal products, so leave it
  at whatever the portal uses. Hourguard passes an explicit `redirectTo`
  (`NEXT_PUBLIC_APP_URL/reset-password`) for password resets and Paddle
  set-password links, so the shared Site URL doesn't matter **as long as those
  URLs are in the allowlist above**.
- If **email confirmations** are ON for the project, either turn them off, or
  keep in mind signup/invite already create users with the email pre-confirmed
  server-side, so buyers/owners won't be blocked.

## 6. Verify the cron

- Vercel → Project → **Cron Jobs** should list `/api/cron/cleanup-screenshots`
  (`0 4 * * *`, daily).
- Trigger it once from that page (or `curl -H "Authorization: Bearer $CRON_SECRET"
  https://hourguard.hirejps.com/api/cron/cleanup-screenshots`) and confirm a
  `200` with an `ok: true` JSON body.
- On Vercel Hobby, cron granularity is daily — the `0 4 * * *` schedule is fine.

## 7. Point the desktop tracker at production

The Electron app bakes its Supabase config at build time (it does NOT read
Vercel env). Before `pnpm build:desktop` / `pnpm package`, set:

```
MAIN_VITE_SUPABASE_URL=https://<project>.supabase.co
MAIN_VITE_SUPABASE_ANON_KEY=<anon key>
```

(Same project as the web app.) Desktop distribution/code-signing is a separate
task — see STATUS.md item 4.

## 8. Post-deploy checklist

- [ ] `https://hourguard.hirejps.com` serves the app over HTTPS
- [ ] signup, login, password reset (email link returns to the app), invite
      accept all work end-to-end against live RLS
- [ ] a screenshot upload from the desktop app appears in the dashboard
- [ ] cron route returns `200` with the secret, `401` without
- [ ] (when Paddle is live) a test purchase provisions an org — check the
      Vercel function logs for `[paddle] provisioned …`
