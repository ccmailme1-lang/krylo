// WO-1768-A — HTTP integration harness for /v1/timing-proxy
// Tests the full HTTP contract — status codes, JSON shape, spec constraints.
// Uses a controlled test double server so upstreams are deterministic.
// Run: node qa_wo1768a_integration.mjs
// For live server tests: node qa_wo1768a_integration.mjs --live

import http from 'http';
import { reconcile } from './src/engine/timingproxy.js';

const LIVE_BASE  = 'http://localhost:4000';
const TEST_PORT  = 4099;
const TEST_BASE  = `http://localhost:${TEST_PORT}`;
const runLive    = process.argv.includes('--live');

let pass = 0; let fail = 0; let skip = 0;

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function get(base, path = '/v1/timing-proxy') {
  return new Promise((resolve, reject) => {
    const url = base + path;
    http.get(url, (res) => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    }).on('error', reject);
  });
}

function check(label, cond, detail = '') {
  if (cond) { console.log(`✓ ${label}`); pass++; }
  else       { console.log(`✗ ${label}${detail ? ' — ' + detail : ''}`); fail++; }
}

function skipTest(label, reason) {
  console.log(`  ${label} [SKIP: ${reason}]`);
  skip++;
}

// ── Test double server ────────────────────────────────────────────────────────
// Replicates engine.js /v1/timing-proxy route with injectable scenarios.
// Consumed FIFO per request; last scenario repeats if queue is exhausted.

let scenarios = [];

function createTestServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const url = req.url.split('?')[0];

      if (req.method === 'GET' && url === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (req.method === 'GET' && url === '/v1/timing-proxy') {
        const sc = scenarios.length > 1 ? scenarios.shift() : (scenarios[0] ?? { type: '200', fsStar: 2.5, dfc: 'NORMAL', ycid: 0 });

        if (sc.type === '503') {
          res.writeHead(503);
          res.end(JSON.stringify({ error: 'UPSTREAM_DATA_UNAVAILABLE', missing: sc.missing ?? [] }));
          return;
        }

        const result = reconcile(sc.fsStar, sc.dfc, sc.ycid);
        res.writeHead(200);
        res.end(JSON.stringify({
          fsStar:     parseFloat(sc.fsStar.toFixed(4)),
          dfcStatus:  sc.dfc,
          ycidDays:   sc.ycid,
          action:     result.action,
          conviction: result.conviction,
          ts:         Date.now(),
        }));
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    server.listen(TEST_PORT, () => resolve(server));
  });
}

// ── Shape validator — shared between test double + live ───────────────────────

function validateShape(label, res) {
  const { fsStar, dfcStatus, ycidDays, action, conviction, ts } = res.body;

  check(`${label}: status 200`,          res.status === 200);
  check(`${label}: fsStar is number`,    typeof fsStar === 'number',   `got ${typeof fsStar}`);
  check(`${label}: dfcStatus is string`, typeof dfcStatus === 'string', `got ${typeof dfcStatus}`);
  check(`${label}: ycidDays >= 0`,       typeof ycidDays === 'number' && ycidDays >= 0, `got ${ycidDays}`);
  check(`${label}: action valid`,        action === 'FADE_SIGNAL' || action === 'PASS', `got ${action}`);
  check(`${label}: conviction valid`,    conviction === 'MAXIMUM' || conviction === 'MEDIUM' || conviction === null, `got ${JSON.stringify(conviction)}`);
  check(`${label}: ts is recent`,        typeof ts === 'number' && Date.now() - ts < 10_000, `ts=${ts}`);
  check(`${label}: dfcStatus enum`,      ['NORMAL', 'ELEVATED', 'HIGH CONCENTRATION'].includes(dfcStatus), `got ${dfcStatus}`);

  // Spec §6 constraints for FADE_SIGNAL
  if (action === 'FADE_SIGNAL') {
    check(`${label}: FADE→Fs*>=7.0`,  fsStar >= 7.0,                     `got ${fsStar}`);
    check(`${label}: FADE→HIGH CONC`, dfcStatus === 'HIGH CONCENTRATION', `got ${dfcStatus}`);
    // MAXIMUM requires ycidDays >= 30; MEDIUM fires when ycidDays < 30
    if (conviction === 'MAXIMUM') {
      check(`${label}: MAXIMUM→ycid>=30`, ycidDays >= 30, `got ${ycidDays}`);
    } else if (conviction === 'MEDIUM') {
      check(`${label}: MEDIUM→ycid<30`,   ycidDays < 30,  `got ${ycidDays}`);
    }
  }
}

function validate503(label, res, expectedMissing) {
  const { error, missing } = res.body;
  check(`${label}: status 503`,          res.status === 503);
  check(`${label}: error field`,         error === 'UPSTREAM_DATA_UNAVAILABLE', `got ${error}`);
  check(`${label}: missing is array`,    Array.isArray(missing),                `got ${JSON.stringify(missing)}`);
  check(`${label}: missing non-empty`,   missing.length > 0);
  if (expectedMissing) {
    check(`${label}: missing contains ${expectedMissing}`,
      missing.includes(expectedMissing), `got ${JSON.stringify(missing)}`);
  }
}

// ── Test suites ───────────────────────────────────────────────────────────────

async function testDoubleNominal(base) {
  console.log('\n── Nominal pass-through (Fs*=2.5, NORMAL, ycid=0) ──────────────');
  scenarios = [{ type: '200', fsStar: 2.5, dfc: 'NORMAL', ycid: 0 }];
  const res = await get(base);
  validateShape('nominal', res);
  check('nominal: action=PASS', res.body.action === 'PASS', `got ${res.body.action}`);
  check('nominal: conviction=null', res.body.conviction === null, `got ${res.body.conviction}`);
}

async function testFadeMaximum(base) {
  console.log('\n── FADE_SIGNAL / MAXIMUM (Fs*=9.2, HIGH CONC, ycid=45) ─────────');
  scenarios = [{ type: '200', fsStar: 9.2, dfc: 'HIGH CONCENTRATION', ycid: 45 }];
  const res = await get(base);
  validateShape('fade-max', res);
  check('fade-max: action=FADE_SIGNAL', res.body.action === 'FADE_SIGNAL', `got ${res.body.action}`);
  check('fade-max: conviction=MAXIMUM', res.body.conviction === 'MAXIMUM',  `got ${res.body.conviction}`);
}

async function testFadeMedium(base) {
  console.log('\n── FADE_SIGNAL / MEDIUM (Fs*=9.2, HIGH CONC, ycid=15) ──────────');
  scenarios = [{ type: '200', fsStar: 9.2, dfc: 'HIGH CONCENTRATION', ycid: 15 }];
  const res = await get(base);
  validateShape('fade-med', res);
  check('fade-med: action=FADE_SIGNAL', res.body.action === 'FADE_SIGNAL', `got ${res.body.action}`);
  check('fade-med: conviction=MEDIUM',  res.body.conviction === 'MEDIUM',   `got ${res.body.conviction}`);
}

async function testBelowFsThreshold(base) {
  console.log('\n── Below Fs* threshold (Fs*=3.0, HIGH CONC, ycid=60) ───────────');
  scenarios = [{ type: '200', fsStar: 3.0, dfc: 'HIGH CONCENTRATION', ycid: 60 }];
  const res = await get(base);
  validateShape('below-fs', res);
  check('below-fs: action=PASS', res.body.action === 'PASS', `got ${res.body.action}`);
}

async function testElevatedNotHighConc(base) {
  console.log('\n── ELEVATED dfcStatus (not HIGH CONCENTRATION) ──────────────────');
  scenarios = [{ type: '200', fsStar: 9.2, dfc: 'ELEVATED', ycid: 45 }];
  const res = await get(base);
  validateShape('elevated', res);
  check('elevated: action=PASS', res.body.action === 'PASS', `got ${res.body.action}`);
}

async function test503NoApiKey(base) {
  console.log('\n── 503: missing FRED_API_KEY ────────────────────────────────────');
  scenarios = [{ type: '503', missing: ['FRED_API_KEY'] }];
  const res = await get(base);
  validate503('no-api-key', res, 'FRED_API_KEY');
}

async function test503MissingBAML(base) {
  console.log('\n── 503: BAMLH0A0HYM2 upstream unavailable ───────────────────────');
  // Spec: 3 consecutive FRED gaps for BAMLH0A0HYM2 → 503 UPSTREAM_UNAVAILABLE
  scenarios = [{ type: '503', missing: ['BAMLH0A0HYM2'] }];
  const res = await get(base);
  validate503('missing-baml', res, 'BAMLH0A0HYM2');
}

async function test503MissingEDGAR(base) {
  console.log('\n── 503: EDGAR upstream unavailable ──────────────────────────────');
  scenarios = [{ type: '503', missing: ['EDGAR'] }];
  const res = await get(base);
  validate503('missing-edgar', res, 'EDGAR');
}

// ── Live server tests ─────────────────────────────────────────────────────────

async function testLiveServer() {
  console.log(`\n════════════════ LIVE SERVER (${LIVE_BASE}) ════════════════`);
  let res;
  try {
    res = await get(LIVE_BASE);
  } catch (e) {
    skipTest('live shape', `server unreachable — ${e.message}`);
    skipTest('live action enum', 'server unreachable');
    skipTest('live conviction enum', 'server unreachable');
    skipTest('live spec constraints', 'server unreachable');
    console.log('  ↳ Start server: node as-diff/engine.js');
    return;
  }

  if (res.status === 200)       validateShape('live', res);
  else if (res.status === 503)  validate503('live-503', res, null);
  else check('live: unexpected status', false, `got ${res.status}`);
}

// ── Entry ──────────────────────────────────────────────────────────────────────

console.log('════════════════ WO-1768-A HTTP Integration Harness ════════════════');
console.log(`Test double server → ${TEST_BASE}`);

const server = await createTestServer();

await testDoubleNominal(TEST_BASE);
await testFadeMaximum(TEST_BASE);
await testFadeMedium(TEST_BASE);
await testBelowFsThreshold(TEST_BASE);
await testElevatedNotHighConc(TEST_BASE);
await test503NoApiKey(TEST_BASE);
await test503MissingBAML(TEST_BASE);
await test503MissingEDGAR(TEST_BASE);

if (runLive) await testLiveServer();

server.close();

console.log(`\n${pass}/${pass + fail + skip} passed  ${skip > 0 ? `(${skip} skipped)` : ''}`);
if (fail > 0) process.exit(1);
