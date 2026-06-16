#!/bin/bash
set -e
cat > /opt/krylo-api/ecosystem.config.cjs << 'CONF'
module.exports={apps:[{name:"krylo-api",script:"as-diff/engine.js",cwd:"/opt/krylo-api",env:{NODE_ENV:"production",DATABASE_URL:"postgresql://postgres:6CifNNSz1NTkE747@db.qgoyyxjyecpxoeqpibgv.supabase.co:5432/postgres",KALSHI_API_KEY:"38f8a227-8010-4fa4-9010-4f0f96a7f8d3",KALSHI_PRIVATE_KEY_FILE:"/opt/krylo-api/kalshi.key"}}]}
CONF
echo "=== ecosystem written ==="
cat /opt/krylo-api/ecosystem.config.cjs
echo ""
pm2 delete krylo-api || true
pm2 start /opt/krylo-api/ecosystem.config.cjs
pm2 save
echo "=== env check ==="
pm2 env 0 | grep -i kalshi || echo "KALSHI not found in env"
echo "=== signal check ==="
sleep 2
curl -s http://127.0.0.1:4000/api/kalshi/signals
