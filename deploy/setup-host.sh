#!/bin/sh
# =============================================================================
# Viora Dashboard — one-shot VPS setup script
# =============================================================================
#
# Run as root OR your server user on a fresh Ubuntu/Debian VPS.
# This script installs dependencies, gets SSL, and deploys the app.
#
# Multi-site VPS approach:
#   One nginx instance on the host handles ALL sites on ports 80/443.
#   Each site is a separate file in /etc/nginx/sites-available/.
#   Each app runs on a unique internal port (4179, 4180, ...).
#   nginx routes by server_name — no port conflicts.
#
# Prerequisites:
#   - Ubuntu 22.04+ or Debian 12+
#   - Domain dev.evaka.store pointing to this server's IP
# =============================================================================

set -e

# --- Config ---
DOMAIN="dev.evaka.store"
EMAIL="admin@evaka.store"          # ← change to your email

# The app lives in ~/viora-dashboard/ (home directory, not /opt)
APP_DIR="${HOME}/viora-dashboard"
APP_PORT=4179                      # ← change if 4179 is taken by another site

echo "=== App directory: ${APP_DIR} ==="

# --- 1. System update & dependencies ---
echo "=== 1. Installing system packages ==="
sudo apt update -qq
sudo apt install -y -qq nginx certbot python3-certbot-nginx docker.io docker-compose-v2

# --- 2. SSL certificate (first time) ---
echo "=== 2. Getting SSL certificate ==="
sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m ${EMAIL}

# --- 3. Clone / pull project ---
echo "=== 3. Setting up project ==="
mkdir -p ${APP_DIR}
# Uncomment and set your repo URL:
# git clone <your-repo-url> ${APP_DIR} || (cd ${APP_DIR} && git pull)

# --- 4. Install nginx site config ---
# First replace YOUR_HOME in nginx.conf with the actual home path
echo "=== 4. Installing nginx site config ==="
sed "s|YOUR_HOME|${HOME}|g" ${APP_DIR}/deploy/nginx.conf | sudo tee /etc/nginx/sites-available/${DOMAIN} > /dev/null
sudo ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# --- 5. Start the app ---
echo "=== 5. Deploying application ==="
cd ${APP_DIR}
cp deploy/.env.production .env 2>/dev/null || true

# Option A: Docker (recommended for isolation)
docker compose -f deploy/docker-compose.yml up -d --build

# Option B: PM2 (lighter, no Docker)
# pnpm build:vps
# rsync -avz build-deploy/ ${USER}@vps:${APP_DIR}/build-deploy/
# cd ${APP_DIR}/build-deploy && pnpm install --prod
# pm2 start ${APP_DIR}/deploy/ecosystem.config.cjs --update-env
# pm2 save
# pm2 startup

# --- 6. Done ---
echo "=== 6. Done ==="
echo "→ https://${DOMAIN}"
echo "→ App: ${APP_DIR}"
echo ""
echo "Adding another site to this VPS:"
echo "  1. Create /etc/nginx/sites-available/site2 with a different upstream port"
echo "  2. ln -sf ... sites-enabled/ && nginx -t && systemctl reload nginx"
echo "  3. certbot --nginx -d site2.com"
echo "  4. Run your second app on port 4180 (different from ${APP_PORT})"
echo ""
echo "Existing sites:"
ls -1 /etc/nginx/sites-enabled/ 2>/dev/null || echo "  (none)"
