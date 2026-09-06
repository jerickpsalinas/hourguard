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

## Needs a live environment (do on computer)

1. **RLS bootstrap for signup & invite acceptance** — a brand-new user has no
   membership yet, but `002_...sql` policies only let existing owners/managers
   insert `hg_members`, and the public invite page reads `hg_invites`
   anonymously with no policy permitting it. Both flows likely fail against
   live RLS. Fix: server-side provisioning (API route using the service client)
   or add bootstrap RLS policies. Must be tested against the real Supabase DB.

2. **Screenshot retention policy** — screenshots accumulate forever, growing
   storage/hosting cost without bound. Add auto-deletion after 30–90 days
   (scheduled job / SQL policy) so the flat yearly hosting fee stays viable.

3. **Deployment** — Vercel deploy to hourguard.hirejps.com; set env vars.

4. **Desktop distribution** — code signing (Apple/Windows certs), build
   installers, host them, and wire the `/download` page links.

5. **Account provisioning** — Paddle webhook → auto-create org/access after purchase.

## Pricing (current landing-page defaults — edit `PRICING` in `apps/web/src/app/page.tsx`)
- One-time license: $399 (unlimited employees)
- Yearly hosting: $149
- Positioned vs ~$7/employee/month competitors
