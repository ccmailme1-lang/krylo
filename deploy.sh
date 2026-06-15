#!/bin/bash
# deploy.sh — push Krylo to VPS in one shot
# Usage: ./deploy.sh
set -e

VPS="root@216.250.119.104"
API_DIR="/opt/krylo-api"

echo "[1/4] Building..."
npm run build 2>&1 | tail -4

echo "[2/4] Deploying frontend..."
WEB_ROOT=$(ssh "$VPS" "grep -r 'root ' /etc/nginx/conf.d/ /etc/nginx/sites-enabled/ 2>/dev/null | grep -v '#' | head -1 | awk '{print \$NF}' | tr -d ';'" 2>/dev/null)
WEB_ROOT="${WEB_ROOT:-/var/www/krylo}"
echo "    → $WEB_ROOT"
rsync -az --delete dist/ "$VPS:$WEB_ROOT/"

echo "[3/4] Deploying API..."
scp as-diff/engine.js "$VPS:$API_DIR/as-diff/engine.js"

echo "[4/4] Restarting API..."
ssh "$VPS" "pm2 restart krylo-api && pm2 save > /dev/null"

echo ""
ssh "$VPS" "curl -s http://127.0.0.1:4000/health"
echo ""
echo "✓ done"
