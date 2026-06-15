// qa_wo1721_kalshi.mjs — BAU harness for WO-1721 Kalshi Live Endpoint
// Tests: category mapping, signal normalization, confidence computation,
//        signal contract compliance, domain filtering.
// Run: node qa_wo1721_kalshi.mjs

import assert from 'assert';

let pass = 0; let fail = 0;
function test(label, fn) {
  try { fn(); console.log(`✔ ${label}`); pass++; }
  catch (e) { console.error(`✘ ${label} — ${e.message}`); fail++; }
}

// ── Mirror backend logic ──────────────────────────────────────────────────────
const CATEGORY_MAP = {
  Economics: 'capital',  Finance: 'capital', Financials: 'capital',
  Crypto: 'capital',     Commodities: 'capital',
  Technology: 'technology',
  Science: 'knowledge',  Education: 'knowledge',
  Politics: 'knowledge', Policy: 'knowledge',
  Employment: 'labor',   Jobs: 'labor',
  Sports: 'media',       Entertainment: 'media', Media: 'media',
  'Real Estate': 'ownership', Housing: 'ownership',
};

function aggregateMarkets(markets, domainFilter = null) {
  const buckets = {};
  for (const m of markets) {
    const domain = CATEGORY_MAP[m.category] ?? null;
    if (!domain) continue;
    if (domainFilter && domain !== domainFilter) continue;
    if (!buckets[domain]) buckets[domain] = { scores: [], volumes: [] };
    const price = m.last_price ?? m.yes_ask ?? 50;
    buckets[domain].scores.push(Math.max(0, Math.min(100, price)));
    buckets[domain].volumes.push(m.volume ?? 0);
  }
  return Object.entries(buckets).map(([domain, { scores, volumes }]) => {
    const avg    = scores.reduce((a, b) => a + b, 0) / scores.length;
    const totVol = volumes.reduce((a, b) => a + b, 0);
    const conf   = parseFloat(Math.min(0.92, 0.40 + (totVol / 500_000) * 0.52).toFixed(2));
    return { id: `kalshi-${domain}-0`, source: 'KALSHI', label: `KALSHI_${domain.toUpperCase()}`,
             domain, signal: Math.round(avg), confidence: conf, fs: 0.71,
             origin: 'KALSHI', ts: 0, zone: 'national' };
  });
}

const MOCK_MARKETS = [
  { category: 'Economics',    last_price: 72, volume: 300_000 },
  { category: 'Economics',    last_price: 60, volume: 200_000 },
  { category: 'Technology',   last_price: 85, volume: 800_000 },
  { category: 'Employment',   last_price: 40, volume: 100_000 },
  { category: 'Real Estate',  last_price: 55, volume: 50_000  },
  { category: 'Sports',       last_price: 70, volume: 150_000 },
  { category: 'UNKNOWN_CAT',  last_price: 90, volume: 999_000 }, // should be ignored
];

console.log('\n── STAGE 1: CATEGORY DOMAIN MAPPING ────────────────────');
test('Economics → capital', () => assert.equal(CATEGORY_MAP['Economics'], 'capital'));
test('Technology → technology', () => assert.equal(CATEGORY_MAP['Technology'], 'technology'));
test('Employment → labor', () => assert.equal(CATEGORY_MAP['Employment'], 'labor'));
test('Real Estate → ownership', () => assert.equal(CATEGORY_MAP['Real Estate'], 'ownership'));
test('Sports → media', () => assert.equal(CATEGORY_MAP['Sports'], 'media'));
test('Unknown category → null (dropped)', () => assert.equal(CATEGORY_MAP['UNKNOWN_CAT'] ?? null, null));

console.log('\n── STAGE 2: SIGNAL NORMALIZATION ───────────────────────');
const signals = aggregateMarkets(MOCK_MARKETS);
const tech = signals.find(s => s.domain === 'technology');
const cap  = signals.find(s => s.domain === 'capital');

test('technology signal = 85 (single market)', () => assert.equal(tech.signal, 85));
test('capital signal = 66 (avg 72+60)/2=66', () => assert.equal(cap.signal, 66));
test('all signals in 0–100 range', () => {
  for (const s of signals) assert.ok(s.signal >= 0 && s.signal <= 100, `${s.domain} out of range`);
});
test('unknown category excluded from output', () => {
  assert.equal(signals.find(s => s.domain == null), undefined);
});

console.log('\n── STAGE 3: CONFIDENCE COMPUTATION ─────────────────────');
test('technology high volume → confidence > 0.80', () => assert.ok(tech.confidence > 0.80, `got ${tech.confidence}`));
test('confidence capped at 0.92', () => {
  const huge = aggregateMarkets([{ category: 'Technology', last_price: 50, volume: 10_000_000 }]);
  assert.equal(huge[0].confidence, 0.92);
});
test('zero volume → confidence = 0.40 base', () => {
  const zero = aggregateMarkets([{ category: 'Sports', last_price: 50, volume: 0 }]);
  assert.equal(zero[0].confidence, 0.40);
});

console.log('\n── STAGE 4: SIGNAL CONTRACT COMPLIANCE ─────────────────');
const REQUIRED = ['id', 'source', 'label', 'domain', 'signal', 'confidence', 'fs', 'origin', 'ts', 'zone'];
test('all required fields present on every signal', () => {
  for (const s of signals) {
    for (const f of REQUIRED) assert.ok(f in s, `${s.domain} missing: ${f}`);
  }
});
test('source = KALSHI', () => signals.forEach(s => assert.equal(s.source, 'KALSHI')));
test('fs = 0.71 on all signals', () => signals.forEach(s => assert.equal(s.fs, 0.71)));

console.log('\n── STAGE 5: DOMAIN FILTER ───────────────────────────────');
test('domain filter returns only matching domain', () => {
  const filtered = aggregateMarkets(MOCK_MARKETS, 'capital');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].domain, 'capital');
});
test('no-match filter returns empty array', () => {
  const filtered = aggregateMarkets(MOCK_MARKETS, 'knowledge');
  assert.equal(filtered.length, 0);
});

console.log('\n─────────────────────────────────────────────────────────');
console.log(`WO-1721 BAU: ${pass}/${pass + fail} PASS${fail ? ` — ${fail} FAIL` : ''}`);
if (fail) process.exit(1);
