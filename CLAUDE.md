# Hubstaff Mimick

Time tracking and employee monitoring platform with a Next.js web dashboard and Electron desktop app.

## Structure

- `packages/shared` — Shared TypeScript types and Supabase client
- `apps/web` — Next.js 14 dashboard (App Router, Tailwind, Supabase SSR)
- `apps/desktop` — Electron desktop tracker (electron-vite, React renderer)
- `supabase/migrations` — Database schema

## Setup

```bash
pnpm install
cp .env.example .env  # Fill in Supabase credentials
```

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

Run `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor.

## API

REST API at `/api/v1/*` secured with Bearer token (API keys generated in dashboard Settings).
Endpoints: time-entries, screenshots, projects, members, invoices.
