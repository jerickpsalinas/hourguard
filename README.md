# Hourguard — by HireJPS

A time tracking and employee monitoring platform. Web dashboard for managers and owners; Electron desktop tracker for employees. Part of the HireJPS Store; runs against the shared `hirejps-portal` Supabase project.

- **Web dashboard:** Next.js 14 (App Router) — deployed at `hourguard.hirejps.com`
- **Desktop tracker:** Electron — captures time entries, keyboard/mouse activity, and periodic screenshots
- **Backend:** shared `hirejps-portal` Supabase; multi-tenant scoped by `organization_id` with RLS

See `CLAUDE.md` for architecture, `DEPLOY.md` for deployment, and `docs/API.md` for the REST API reference.
