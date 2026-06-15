// qa_wo1721_kalshi.mjs — BAU harness for WO-1721 Kalshi Live Endpoint
// Tests: ticker→domain mapping, price parsing, volume filtering,
//        confidence computation, signal contract compliance, domain filter.
// Run: node qa_wo1721_kalshi.mjs

import assert from 'assert';

let pass = 0; let fail = 0;
function test(label, fn) {
  try { fn(); console.log(`✔ ${label}`); pass++; }
  catch (e) { console.error(`✘ ${label} — ${e.message}`); fail++; }
}

// ── Mirror backend logic ──────────────────────────────────────────────────────
const TICKER_DOMAIN = [
  ['KXBTC','capital'],['KXETH','capital'],['KXCRYPTO','capital'],
  ['KXFED','capital'],['KXRATE','capital'],['KXNASD','capital'],
  ['KXSP500','capital'],['KXDOW','capital'],['KXINFL','capital'],
  ['KXCPI','capital'],['KXGDP','capital'],['KXGOLD','capital'],['KXOIL','capital'],
  ['KXAI','technology'],['KXTECH','technology'],
  ['KXPRES','knowledge'],['KXSENATE','knowledge'],['KXHOUSE','knowledge'],
  ['KXGOV','knowledge'],['KXSCOTUS','knowledge'],['KXELECT','knowledge'],
  ['KXUNEMPLOY','labor'],['KXJOBS','labor'],['KXPAYROLL','labor'],
  ['KXNBA','media'],['KXNFL','media'],['KXNHL','media'],
  ['KXMLB','media'],['KXUFC','media'],['KXATP','media'],['KXWC','media'],
  ['KXSOCCER','media'],
  ['KXHOUS','ownership'],['KXREAL','ownership'],
];
function tickerToDomain(ticker) {
  for (const [p, d] of TICKER_DOMAIN) if (ticker?.startsWith(p)) return d;
  return null;
}
function aggregateMarkets(markets, domainFilter = null) {
  const buckets = {};
  for (const m of markets) {
    const vol = parseFloat(m.volume_fp ?? '0');
    if (vol === 0) continue;
    const domain = tickerToDomain(m.event_ticker || m.ticker);
    if (!domain) continue;
    if (domainFilter && domain !== domainFilter) continue;
    if (!buckets[domain]) buckets[domain] = { scores: [], volumes: [] };
    const price = parseFloat(m.last_price_dollars ?? '0') * 100;
    buckets[domain].scores.push(Math.max(0, Math.min(100, price)));
    buckets[domain].volumes.push(vol);
  }
  return Object.entries(buckets).map(([domain, { scores, volumes }]) => {
    const avg = scores.reduce((a,b)=>a+b,0)/scores.length;
    const tv  = volumes.reduce((a,b)=>a+b,0);
    return { id:`kalshi-${domain}-0`, source:'KALSHI', label:`KALSHI_${domain.toUpperCase()}`,
             domain, signal:Math.round(avg),
             confidence:parseFloat(Math.min(0.92,0.40+(tv/500_000)*0.52).toFixed(2)),
             fs:0.71, origin:'KALSHI', ts:0, zone:'national' };
  });
}

const MOCK = [
  { event_ticker:'KXBTC-26DEC',         last_price_dollars:'0.6500', volume_fp:'300000.00' },
  { event_ticker:'KXFED-26SEP',         last_price_dollars:'0.4000', volume_fp:'200000.00' },
  { event_ticker:'KXNBA-26FIN-BOS',     last_price_dollars:'0.7200', volume_fp:'150000.00' },
  { event_ticker:'KXUNEMPLOY-26JUL',    last_price_dollars:'0.5000', volume_fp:'80000.00'  },
  { event_ticker:'KXHOUS-26Q4',         last_price_dollars:'0.3500', volume_fp:'60000.00'  },
  { event_ticker:'KXAI-26GPT5',         last_price_dollars:'0.8000', volume_fp:'400000.00' },
  { event_ticker:'KXPRES-28DEM',        last_price_dollars:'0.5500', volume_fp:'500000.00' },
  { event_ticker:'KXMVESPORTS-PARLAY',  last_price_dollars:'0.9000', volume_fp:'0.00'       }, // zero vol — should be excluded
  { event_ticker:'KXUNKNOWN-XYZ',       last_price_dollars:'0.9000', volume_fp:'999999.00'  }, // unknown prefix
];

console.log('\n── STAGE 1: TICKER → DOMAIN MAPPING ───────────────────');
test('KXBTC → capital',       () => assert.equal(tickerToDomain('KXBTC-26DEC'), 'capital'));
test('KXFED → capital',       () => assert.equal(tickerToDomain('KXFED-26SEP'), 'capital'));
test('KXNBA → media',         () => assert.equal(tickerToDomain('KXNBA-26FIN-BOS'), 'media'));
test('KXUNEMPLOY → labor',    () => assert.equal(tickerToDomain('KXUNEMPLOY-26JUL'), 'labor'));
test('KXHOUS → ownership',    () => assert.equal(tickerToDomain('KXHOUS-26Q4'), 'ownership'));
test('KXAI → technology',     () => assert.equal(tickerToDomain('KXAI-26GPT5'), 'technology'));
test('KXPRES → knowledge',    () => assert.equal(tickerToDomain('KXPRES-28DEM'), 'knowledge'));
test('unknown → null',        () => assert.equal(tickerToDomain('KXUNKNOWN-XYZ'), null));

console.log('\n── STAGE 2: PRICE PARSING ──────────────────────────────');
test('last_price_dollars "0.6500" → 65', () => assert.equal(Math.round(parseFloat('0.6500')*100), 65));
test('last_price_dollars "1.0000" → 100', () => assert.equal(Math.round(parseFloat('1.0000')*100), 100));
test('last_price_dollars "0.0000" → 0',   () => assert.equal(Math.round(parseFloat('0.0000')*100), 0));

console.log('\n── STAGE 3: ZERO-VOLUME FILTER ─────────────────────────');
const signals = aggregateMarkets(MOCK);
test('sports parlay (vol=0) excluded', () => assert.equal(signals.find(s=>s.signal===90), undefined));
test('unknown prefix excluded',        () => assert.equal(signals.find(s=>s.label?.includes('UNKNOWN')), undefined));
test('7 valid markets → 7 domains with data', () => assert.equal(signals.length, 6)); // BTC+FED share capital

console.log('\n── STAGE 4: SIGNAL VALUES ──────────────────────────────');
const cap = signals.find(s=>s.domain==='capital');
test('capital = avg(65,40) = 53', () => assert.equal(cap.signal, 53));
test('technology signal = 80',   () => assert.equal(signals.find(s=>s.domain==='technology').signal, 80));
test('knowledge signal = 55',    () => assert.equal(signals.find(s=>s.domain==='knowledge').signal, 55));

console.log('\n── STAGE 5: CONTRACT COMPLIANCE ────────────────────────');
const REQUIRED = ['id','source','label','domain','signal','confidence','fs','origin','ts','zone'];
test('all fields present', () => {
  for (const s of signals)
    for (const f of REQUIRED) assert.ok(f in s, `${s.domain} missing ${f}`);
});
test('source = KALSHI on all', () => signals.forEach(s => assert.equal(s.source, 'KALSHI')));
test('fs = 0.71 on all',       () => signals.forEach(s => assert.equal(s.fs, 0.71)));
test('signal in 0–100',        () => signals.forEach(s => assert.ok(s.signal>=0 && s.signal<=100)));

console.log('\n── STAGE 6: DOMAIN FILTER ──────────────────────────────');
test('filter capital → 1 signal', () => {
  const f = aggregateMarkets(MOCK, 'capital');
  assert.equal(f.length, 1); assert.equal(f[0].domain, 'capital');
});
test('filter labor → 1 signal',   () => assert.equal(aggregateMarkets(MOCK,'labor').length, 1));

console.log('\n────────────────────────────────────────────────────────');
console.log(`WO-1721 BAU: ${pass}/${pass+fail} PASS${fail?` — ${fail} FAIL`:''}`);
if (fail) process.exit(1);
