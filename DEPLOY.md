# Deployment Guide — Vercel (web) + Hostinger VPS (legacy option)

Hourguard's web dashboard ships to Vercel and authenticates against the shared `hirejps-portal` Supabase project. The Electron desktop tracker builds locally and is distributed as installers.

## Prerequisites

- Vercel account linked to GitHub
- Domain: `hourguard.hirejps.com` (subdomain of hirejps.com)
- Access to the `hirejps-portal` Supabase project (URL + anon key)
- (For legacy VPS deployment) Hostinger VPS with Node.js 20 and pnpm

## 1. Vercel Deploy (web dashboard)

1. In the Vercel dashboard: **Add New Project** → import `jerickpsalinas/hourguard`
2. **Root Directory:** `apps/web`
3. **Framework Preset:** Next.js
4. **Build Command:** `pnpm --filter @hourguard/web build`
5. **Install Command:** `pnpm install`
6. Environment Variables (from hirejps-portal → Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
7. **Add domain:** `hourguard.hirejps.com` (Vercel provides the DNS record — add it to the hirejps.com DNS)

## 2. Supabase (already done)

The schema lives inside `hirejps-portal`. Migration `supabase/migrations/002_hirejps_portal_adapted.sql` was run there and creates the `hg_*` tables plus RLS. Do NOT run `001_initial_schema.sql` — that is the original standalone schema and would collide.

Create a Storage bucket in `hirejps-portal` called `screenshots` (private) for the desktop app's screenshot uploads.

## 3. Desktop App Installers

```bash
# On a dev machine with the repo:
cd apps/desktop
pnpm package

# Outputs to apps/desktop/release/
# - Windows: .exe installer
# - macOS: .dmg
# - Linux: .AppImage
```

Host the installer files as GitHub Releases on `jerickpsalinas/hourguard` and link them from the web dashboard Downloads page.

## 4. Updates

Web dashboard: `git push origin main` → Vercel auto-deploys.
Desktop app: bump version in `apps/desktop/package.json`, `pnpm package`, upload new installer to GitHub Releases.

---

## Legacy — Hostinger VPS Option

Only use if you want to self-host instead of Vercel.

```bash
# SSH into VPS
ssh root@your-vps-ip

# Install Node.js 20, pnpm, PM2, Nginx
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 20
npm install -g pnpm pm2
apt update && apt install -y nginx certbot python3-certbot-nginx

# Deploy
git clone https://github.com/jerickpsalinas/hourguard.git
cd hourguard
pnpm install
cp .env.example .env  # Fill in hirejps-portal credentials
pnpm build:web
pm2 start "pnpm --filter @hourguard/web start" --name hourguard-web
pm2 save
pm2 startup

# Nginx (/etc/nginx/sites-available/hourguard)
# server { server_name hourguard.hirejps.com; location / { proxy_pass http://127.0.0.1:3000; ... } }
ln -s /etc/nginx/sites-available/hourguard /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d hourguard.hirejps.com

# Updates
cd hourguard && git pull && pnpm install && pnpm build:web && pm2 restart hourguard-web
```
