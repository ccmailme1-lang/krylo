#!/bin/bash
# Reads key from file, signs, fetches one page of markets, prints unique categories
node - << 'EOF'
import { createSign } from 'crypto';
import { readFileSync } from 'fs';
import https from 'https';

const key  = process.env.KALSHI_API_KEY;
const pkey = readFileSync(process.env.KALSHI_PRIVATE_KEY_FILE, 'utf8').trim();

const path = '/trade-api/v2/markets';
const ts   = Date.now().toString();
const msg  = ts + 'GET' + path;
const s    = createSign('SHA256');
s.update(msg); s.end();
const sig  = s.sign(pkey, 'base64');

const req = https.request({
  hostname: 'api.elections.kalshi.com',
  path: path + '?status=open&limit=100',
  method: 'GET',
  headers: {
    'KALSHI-ACCESS-KEY': key,
    'KALSHI-ACCESS-TIMESTAMP': ts,
    'KALSHI-ACCESS-SIGNATURE': sig,
  }
}, res => {
  let raw = '';
  res.on('data', c => raw += c);
  res.on('end', () => {
    const data = JSON.parse(raw);
    const cats = [...new Set((data.markets||[]).map(m => m.category).filter(Boolean))].sort();
    console.log('CATEGORIES:', JSON.stringify(cats, null, 2));
    console.log('SAMPLE:', JSON.stringify((data.markets||[]).slice(0,3).map(m=>({ticker:m.ticker,category:m.category,last_price:m.last_price})), null, 2));
  });
});
req.on('error', e => console.error(e.message));
req.end();
EOF
