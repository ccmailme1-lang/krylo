import { createSign } from 'crypto';
import { readFileSync } from 'fs';
import https from 'https';

const key  = process.env.KALSHI_API_KEY;
const pkey = readFileSync(process.env.KALSHI_PRIVATE_KEY_FILE, 'utf8').trim();

function sign(path) {
  const ts = Date.now().toString();
  const s  = createSign('SHA256');
  s.update(ts + 'GET' + path); s.end();
  return { ts, sig: s.sign(pkey, 'base64') };
}

function get(path, qs = '') {
  return new Promise((resolve, reject) => {
    const { ts, sig } = sign(path);
    const req = https.request({
      hostname: 'api.elections.kalshi.com',
      path: path + qs,
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
        try { resolve(JSON.parse(raw)); }
        catch { resolve({ _raw: raw.slice(0,400) }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// 1. Fetch open events, no category filter
const r = await get('/trade-api/v2/events', '?status=open&limit=10');
console.log('Open events count:', r.events?.length ?? 'ERROR');
if (r._raw) console.log('RAW:', r._raw);

const e = r.events?.[0];
if (e) {
  console.log('\nFull event object keys:', Object.keys(e));
  console.log('\nSample event:', JSON.stringify({
    event_ticker: e.event_ticker,
    series_ticker: e.series_ticker,
    category: e.category,
    title: e.title,
    status: e.status,
  }, null, 2));
}

// 2. Show all 10 events briefly
console.log('\nAll open events:');
for (const ev of (r.events || [])) {
  console.log(`  ${ev.event_ticker} | series: ${ev.series_ticker} | cat: ${ev.category ?? 'NONE'}`);
}

// 3. For one event, look up its series
if (e?.series_ticker) {
  const s = await get('/trade-api/v2/series/' + e.series_ticker);
  console.log('\nSeries for first event:', JSON.stringify({ ticker: s.series?.ticker, category: s.series?.category, title: s.series?.title }, null, 2));
}
