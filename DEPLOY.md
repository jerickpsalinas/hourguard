# Deployment Guide — Hostinger VPS

## Prerequisites

- Hostinger VPS (KVM 1 or higher)
- Domain pointing to VPS IP
- Supabase project (free tier works)

## 1. Server Setup

```bash
# SSH into VPS
ssh root@your-vps-ip

# Install Node.js 20
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 20

# Install pnpm
npm install -g pnpm

# Install PM2
npm install -g pm2

# Install Nginx
apt update && apt install -y nginx certbot python3-certbot-nginx
```

## 2. Deploy Web Dashboard

```bash
# Clone repo
git clone https://github.com/jerickpsalinas/hubstaff-mimick.git
cd hubstaff-mimick

# Install dependencies
pnpm install

# Create .env
cp .env.example .env
nano .env  # Fill in Supabase credentials

# Build
pnpm build:web

# Start with PM2
pm2 start "pnpm --filter @hubstaff/web start" --name hubstaff-web
pm2 save
pm2 startup
```

## 3. Nginx + SSL

```nginx
# /etc/nginx/sites-available/hubstaff
server {
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/hubstaff /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL
certbot --nginx -d your-domain.com
```

## 4. Supabase Setup

1. Create project at supabase.com
2. Go to SQL Editor, paste `supabase/migrations/001_initial_schema.sql`, run it
3. Create a Storage bucket called `screenshots` (private)
4. Copy project URL and anon key to `.env`

## 5. Desktop App Installers

```bash
# On a dev machine with the repo:
cd apps/desktop
pnpm package

# Outputs to apps/desktop/release/
# - Windows: .exe installer
# - macOS: .dmg
# - Linux: .AppImage
```

Host the installer files on the VPS as static files, or as GitHub releases.

## 6. Updates

```bash
cd hubstaff-mimick
git pull
pnpm install
pnpm build:web
pm2 restart hubstaff-web
```
