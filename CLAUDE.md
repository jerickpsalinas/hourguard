# Hubstaff Mimick

Time tracking and employee monitoring platform with a Next.js web dashboard and Electron desktop app.

## Product positioning

This app is being adapted to ship as a **Store product inside the HireJPS ecosystem** (alongside Finance Tracker, Invoice Tracker, etc.). It will run at `tracker.hirejps.com` as a standalone Next.js app authenticating against the shared `hirejps-portal` Supabase project — same auth as portal.hirejps.com.

- **Multi-tenant model:** every table scoped to `organization_id`, RLS driven by `current_org_id()` (shared with the Finance Tracker and other Store products)
- **Access gate:** an org must have `'time-tracker'` in its `organizations.access_type` array to see the product
- **Product picker entry:** portal-dashboard shows a "Time Tracker" card that opens `tracker.hirejps.com` in the same session (SSO via shared Supabase auth)
- **Desktop tracker (Electron):** authenticates against the same `hirejps-portal` project — employees run it locally to log time, capture screenshots, and record keyboard/mouse events

## Structure

- `packages/shared` — Shared TypeScript types and Supabase client
- `apps/web` — Next.js 14 dashboard (App Router, Tailwind, Supabase SSR)
- `apps/desktop` — Electron desktop tracker (electron-vite, React renderer)
- `supabase/migrations` — Database schema
  - `001_initial_schema.sql` — Original standalone schema (unused going forward)
  - `002_hirejps_portal_adapted.sql` — Adapted schema for hirejps-portal, all tables prefixed `ht_`

## Setup

```bash
pnpm install
cp .env.example .env  # Fill in hirejps-portal Supabase credentials
```

Point `.env` at the **hirejps-portal** project (not a separate one).

## Development

```bash
pnpm dev:web       # Next.js dev server on :3000
pnpm dev:desktop   # Electron app in dev mode
```

## Build

```bash
pnpm build:web      # Production Next.js build
pnpm build:desktop  # Electron build (outputs to apps/desktop/dist)
cd apps/desktop && pnpm package  # Create installer (.exe/.dmg)
```

## Database

Run `supabase/migrations/002_hirejps_portal_adapted.sql` in the **hirejps-portal** SQL editor. All app code references the `ht_` prefixed tables and uses `current_org_id()` for tenant scoping. Do NOT run `001_initial_schema.sql` — it creates a conflicting standalone schema.

## API

REST API at `/api/v1/*` secured with Bearer token (API keys generated in dashboard Settings).
Endpoints: time-entries, screenshots, projects, members, invoices.
