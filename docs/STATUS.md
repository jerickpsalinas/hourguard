# Hourguard — build status & follow-ups

Snapshot of what's done and what still needs a live environment. Keep this current.

## Done (code-complete, web + desktop build green)

**Web dashboard**
- HireJPS design system throughout (dark, glass, brand red)
- Marketing landing page at `/` (logged-out visitors) with feature grid + pricing/comparison
- Auth: login, signup, password reset, invite acceptance
- Multi-org support: users in multiple orgs get an org switcher; access gated by `access_type` including `hourguard`
- Dashboard: today's stats (clickable), 7-day hours chart, top projects, activity by member
- Timesheets: date range + member/project filters, summary tiles, CSV export
- Screenshots: date filter, lightbox, "Load more" pagination
- Projects, Members (with pending-invites management), Invoices (generate + finalize + printable/PDF), Settings (API keys), Profile
- REST API `/api/v1/*` (GET + POST for time-entries, screenshots, invoices; GET projects/members), Bearer-auth, org-scoped with cross-tenant validation
- Polish: toasts, empty states, error boundaries, locale currency formatting, favicon, PWA manifest + apple icon, reduced-motion + focus-visible a11y

**Desktop tracker (Electron)**
- Restyled to brand; login + tracker screens
- Time tracking, screenshots, keyboard/mouse activity, offline queue + sync
- Idle auto-pause + auto-resume, state synced to UI and tray
- Env baked in via `MAIN_VITE_*`; builds to `dist/`; brand app icon

## Tests & CI
- Vitest suite (36 tests) over pure helpers: `csv` (incl. formula-injection guard),
  `format` (currency/hours/duration), `dates` (timezone-robust), `aggregate`,
  `invoice` totals, `api-key` hashing, and API `paginate`.
- GitHub Actions runs typecheck (web + desktop), tests, and both builds on push/PR.

## Recently hardened (code-only)
- Desktop offline queue is now actually flushed (was dead code) — after login, on
  session restore, and every 2 min.
- CSV export guarded against spreadsheet formula injection.
- API pagination guards non-numeric input (was producing NaN ranges).
- Shared helpers remove client/server drift risk for invoice totals and API-key
  hashing.

## Needs a live environment (do on computer)

1. **RLS bootstrap for signup & invite acceptance** — ✅ **fixed in code.**
   Provisioning now runs server-side with the service role, so the RLS
   chicken-and-egg (a brand-new user has no membership, so can't insert
   org/portal_users/hg_members, and can't read `hg_invites` anonymously) no
   longer applies. New routes:
   - `POST /api/auth/signup` — creates the auth user (email pre-confirmed),
     organization (`access_type: ['hourguard']`), `portal_users`, and the owner
     `hg_members` row, with rollback of the partial state on any failure.
   - `GET /api/auth/invite/[token]` — validates an invite (exists / not
     accepted / not expired) and returns only org name, role, and target email.
   - `POST /api/auth/invite/[token]` — creates the auth user + membership at the
     invite's role, enforces the email match when the invite is addressed, and
     marks the invite accepted only after the membership exists.
   The `signup` and `invite/[token]` pages now call these and then sign in.
   Still worth a **live smoke test** against the real Supabase DB (confirm
   `portal_users` has `email`/`role` columns and the service role key is set in
   the deploy env), but the flows no longer depend on RLS to succeed.

2. **Screenshot retention policy** — ✅ **fixed in code.** A daily Vercel Cron
   (`vercel.json` → `0 4 * * *`) calls `GET /api/cron/cleanup-screenshots`,
   which deletes screenshots older than `SCREENSHOT_RETENTION_DAYS` (default 90)
   from both the `screenshots` storage bucket and the `hg_screenshots` table,
   in batches. Protected by `CRON_SECRET`. Storage objects are removed before
   their DB rows so a storage failure retries next run instead of orphaning
   files. **To activate on deploy:** set `CRON_SECRET` (and optionally
   `SCREENSHOT_RETENTION_DAYS`) in the Vercel project env. Verify the first run
   against real data.

3. **Deployment** — Vercel deploy to hourguard.hirejps.com; set env vars.

4. **Desktop distribution** — code signing (Apple/Windows certs), build
   installers, host them, and wire the `/download` page links.

5. **Account provisioning** — Paddle webhook → auto-create org/access after purchase.

## Deeper refactors flagged by review (need schema/live testing)
These are structural improvements, not bugs — the current code works but models
things at the wrong layer. Do with the live DB:
- **Invoice `created_by`**: the API attributes API-generated invoices to an
  arbitrary owner/manager because `created_by` is NOT NULL → `hg_members`. Better:
  make it nullable or add a `created_by_api_key`/`created_via` column so
  integration-created records are modeled honestly.
- **Profile identity dual-write**: `full_name` is mirrored into `hg_members` and
  `portal_users` by best-effort client writes (signup, invite, profile). Better:
  single source of truth (store once + join, or a DB trigger to sync).
- **reset-password validity**: currently inferred from a 10s timeout. Better:
  determine deterministically from the recovery token / URL hash params.
- **Root `force-dynamic`**: pins the whole route tree dynamic; could be scoped to
  only the routes that need per-request rendering (marketing/`/download`/404 can be
  static). Left as-is to avoid regressing the SSR fix without a deploy to verify.

## Pricing (current landing-page defaults — edit `PRICING` in `apps/web/src/app/page.tsx`)
- One-time license: $399 (unlimited employees)
- Yearly hosting: $149
- Positioned vs ~$7/employee/month competitors
