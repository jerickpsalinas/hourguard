# Hourguard — build status & follow-ups

Snapshot of what's done and what still needs a live environment. Keep this current.

## Done (code-complete, web + desktop build green)

**Web dashboard**
- HireJPS design system throughout (dark, glass, brand red)
- Shared HireJPS header & footer (matches portal-dashboard chrome — "Back to products", logo, org name, logout, legal nav)
- Marketing landing page at `/` (logged-out visitors) with feature grid + pricing/comparison
- Auth: login, password reset, invite acceptance (SSO from portal — no per-app signup)
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
- Vitest suite (41 tests) over pure helpers: `csv` (incl. formula-injection guard),
  `format` (currency/hours/duration), `dates` (timezone-robust), `aggregate`,
  `invoice` totals, `api-key` hashing, API `paginate`, and `http` helpers.
- GitHub Actions runs typecheck (web + desktop), tests, and both builds on push/PR.

## Recently completed

- **Public signup removed** — Hourguard is a paid product; accounts come only from
  purchase provisioning (Paddle webhook) or admin invite. The `/signup` route now
  redirects to `/login`. Signup page, API route, and all links removed.

- **Shared HireJPS header & footer** — Dashboard and landing page now use the same
  chrome as the portal (official-logo.png, sticky header with "Back to products" →
  portal.hirejps.com, logout, org name; footer with legal links). CSS matches the
  portal's design tokens exactly. Spec documented in `STORE_PRODUCT_SPEC.md`.

- **Invoice `created_by` refactor** — `created_by` is now nullable; `created_via`
  column (`'dashboard'` | `'api'`) models origin honestly. API-generated invoices
  set `created_by: null, created_via: 'api'`. Migration: `003_invoice_created_by_nullable.sql`.

- **Profile identity single source of truth** — DB trigger `hg_sync_full_name` on
  `hg_members` auto-syncs `full_name` to `portal_users`. Profile page no longer
  does a dual-write. Migration: `004_sync_full_name_trigger.sql`.

- **Cross-subdomain SSO** — One login at portal.hirejps.com carries to all product
  apps via shared `.hirejps.com` cookie. No per-app login needed for clients
  arriving from the portal.

- **RLS bootstrap** — Provisioning runs server-side with service role.

- **Screenshot retention cron** — Daily cleanup of old screenshots via Vercel Cron.

- **Paddle webhook scaffold** — Idempotent provisioning on purchase events.

## Needs live environment

1. **Run new migrations** — Execute these in the **hirejps-portal** SQL Editor:
   - `supabase/migrations/003_invoice_created_by_nullable.sql`
   - `supabase/migrations/004_sync_full_name_trigger.sql`

2. **Set `CRON_SECRET`** in Vercel env vars to activate the screenshot cleanup cron.

3. **Desktop distribution** — code signing (Apple/Windows certs), build
   installers, host them, and wire the `/download` page links.

4. **Central Paddle provisioning** — Move webhook to `hirejps.com` so it's
   product-agnostic (currently Hourguard-specific). Wire `customData` to include
   buyer email + org name. Add checkout buttons to homepage (deferred per user).

## Pricing (current landing-page defaults — edit `PRICING` in `apps/web/src/app/page.tsx`)
- One-time license: $399 (unlimited employees)
- Yearly hosting: $149
- Positioned vs ~$7/employee/month competitors
