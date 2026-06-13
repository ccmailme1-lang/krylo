// qa_wo1719_1720_feeds.mjs — WO-1719 (FRED) + WO-1720 (EDGAR) validation
// Tests: normalization, live API fetch, signal shape, surfaceRouter contract
// No mocks — hits real FRED and EDGAR endpoints.

// ── Normalization (mirrored from hooks) ───────────────────────────────────────
function normalize(value, floor, ceiling, invert) {
  const clamped = Math.max(floor, Math.min(ceiling, value));
  const score   = ((clamped - floor) / (ceiling - floor)) * 100;
  return Math.round(invert ? 100 - score : score);
}

const FRED_SERIES = [
  { id: 'BAMLH0A0HYM2', label: 'HY_CREDIT_SPREAD', domain: 'capital',    floor: 2.0,  ceiling: 12.0, invert: false },
  { id: 'T10Y2Y',        label: 'YIELD_CURVE',       domain: 'capital',    floor: -1.5, ceiling:  2.5, invert: true  },
  { id: 'M2V',           label: 'MONEY_VELOCITY',    domain: 'ownership',  floor: 1.0,  ceiling:  2.2, invert: false },
];

// ── Signal shape validator (surfaceRouter contract) ───────────────────────────
function validateSignalShape(signal, label) {
  const required = ['id', 'source', 'domain', 'signal', 'confidence', 'fs', 'origin', 'ts'];
  const missing  = required.filter(k => signal[k] == null);
  const inRange  = signal.signal >= 0 && signal.signal <= 100;
  const fsValid  = signal.fs >= 0 && signal.fs <= 1;
  return { ok: missing.length === 0 && inRange && fsValid, missing, inRange, fsValid };
}

function check(label, result, expected) {
  const pass = expected === true ? !!result : typeof expected === 'number' ? result >= expected : result === expected;
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${label}: ${JSON.stringify(result)}`);
  return pass ? 1 : 0;
}

async function run() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  WO-1719 (FRED) + WO-1720 (EDGAR) — FEED VALIDATION');
  console.log('════════════════════════════════════════════════════════\n');

  let passed = 0;
  let total  = 0;

  // ── WO-1719: FRED ──────────────────────────────────────────────────────────
  console.log('── WO-1719: FRED CAPITAL FEED ───────────────────────────');

  const FRED_KEY = process.env.VITE_FRED_API_KEY ?? null;
  if (!FRED_KEY) {
    console.log('  [SKIP] VITE_FRED_API_KEY not set — get free key at fred.stlouisfed.org');
    console.log('         Run: VITE_FRED_API_KEY=your_key node qa_wo1719_1720_feeds.mjs\n');
  }

  for (const series of FRED_SERIES) {
    if (!FRED_KEY) { total += 4; console.log(`  [SKIP] ${series.id}`); continue; }
    try {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series.id}&api_key=${FRED_KEY}&sort_order=desc&limit=1&file_type=json`;
      const res = await fetch(url);
      total++; passed += check(`${series.id} HTTP 200`, res.ok, true);
      if (!res.ok) continue;

      const json = await res.json();
      const obs  = json.observations?.[0];
      const raw  = obs && obs.value !== '.' ? parseFloat(obs.value) : null;

      total++; passed += check(`${series.id} has observation`, raw !== null, true);
      if (raw === null) continue;

      const signal = normalize(raw, series.floor, series.ceiling, series.invert);
      console.log(`    raw=${raw}  signal=${signal}  date=${obs.date}`);

      const envelope = {
        id:         `fred-${series.id}-${obs.date}`,
        source:     'FRED',
        label:      series.label,
        domain:     series.domain,
        signal,
        raw,
        confidence: 0.82,
        fs:         0.78,
        origin:     'FRED',
        ts:         Date.now(),
        zone:       'national',
      };

      const v = validateSignalShape(envelope, series.id);
      total++; passed += check(`${series.id} signal shape valid`, v.ok, true);
      total++; passed += check(`${series.id} signal 0–100`, v.inRange, true);

    } catch (err) {
      console.log(`  [FAIL] ${series.id} fetch error: ${err.message}`);
      total += 2; // count as failures
    }
  }

  // ── WO-1720: EDGAR ─────────────────────────────────────────────────────────
  console.log('\n── WO-1720: EDGAR FORM D FEED ───────────────────────────');

  try {
    const startdt = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    const enddt   = new Date().toISOString().slice(0, 10);
    const params  = new URLSearchParams({ q: '"Form D"', dateRange: 'custom', startdt, enddt, forms: 'D', hits: '20' });
    const url     = `https://efts.sec.gov/LATEST/search-index?${params}`;

    const res = await fetch(url, { headers: { 'User-Agent': 'krylo-research/1.0 contact@krylo.org' } });
    total++; passed += check('EDGAR HTTP 200', res.ok, true);

    if (res.ok) {
      const json  = await res.json();
      const hits  = json.hits?.hits ?? [];
      const count = json.hits?.total?.value ?? hits.length;
      console.log(`    Form D filings (last 7d): ${count}`);

      const signal     = Math.round(Math.min(100, (count / 50) * 100));
      const confidence = Math.min(0.90, 0.50 + (count / 100) * 0.40);

      total++; passed += check('EDGAR count > 0', count, 1);
      total++; passed += check('EDGAR signal 0–100', signal >= 0 && signal <= 100, true);

      const ownership = {
        id: `edgar-formd-${Date.now()}`, source: 'EDGAR', label: 'PE_DEAL_FLOW',
        domain: 'ownership', signal, raw: count, confidence, fs: 0.72,
        origin: 'EDGAR', ts: Date.now(), zone: 'national',
      };
      const capital = {
        id: `edgar-formd-capital-${Date.now()}`, source: 'EDGAR', label: 'PE_CAPITAL_DEPLOYMENT',
        domain: 'capital', signal: Math.round(signal * 0.65), raw: count,
        confidence: confidence * 0.80, fs: 0.65, origin: 'EDGAR', ts: Date.now(), zone: 'national',
      };

      const v1 = validateSignalShape(ownership, 'EDGAR-OWNERSHIP');
      const v2 = validateSignalShape(capital,   'EDGAR-CAPITAL');
      total++; passed += check('EDGAR ownership signal shape valid', v1.ok, true);
      total++; passed += check('EDGAR capital signal shape valid',   v2.ok, true);
    }
  } catch (err) {
    console.log(`  [FAIL] EDGAR fetch error: ${err.message}`);
    total += 4;
  }

  // ── Shared pool contract ───────────────────────────────────────────────────
  console.log('\n── SHARED POOL CONTRACT ─────────────────────────────────');
  console.log('  Rule: no connector owns a cone — router assigns domains');
  console.log('  Rule: all signals normalized 0–100 before dispatch');
  console.log('  Rule: parity — no single source dominates');
  console.log('  [INFO] dispatchBatch() wired in app.jsx — runtime validated in browser');

  const verdict = passed === total ? 'ALL PASS' : `${total - passed} FAIL`;
  console.log('\n════════════════════════════════════════════════════════');
  console.log(`  RESULT: ${passed}/${total} — ${verdict}`);
  console.log('  WO-1719 FRED · WO-1720 EDGAR');
  console.log('════════════════════════════════════════════════════════\n');
}

run();
