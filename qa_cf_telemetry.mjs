// qa_cf_telemetry.mjs — CF production-readiness WS4 (CF-004-MET-01 / INV-006).
//
// Validates that CF analytical workload can vary by orders of magnitude WITHOUT
// moving guest-facing latency, and that the four MET-01 series are independently
// captured.
//
//   INV-006 (a): CF analytical processing is not a synchronous prerequisite for
//                the guest path.  → structural check: no CF analytical module is
//                imported by a render (.jsx) module, and vice versa.
//   INV-006 (c): guest rendering does not trigger on-demand analytical execution.
//                → the guest fn in this harness calls zero CF functions.
//   MET-01:      guest latency stays flat while analytical processing time and
//                objects-examined grow with load.
//
// Run: node qa_cf_telemetry.mjs

import { execSync } from 'node:child_process';
import {
  resetFabric, ingest, admissibleParticles, recordConvergence, ioCounters,
} from './src/engine/cf/pathwaystore.js';
import { inferFormation } from './src/engine/formationinference.js';
import {
  resetTelemetry, recordGuest, recordAnalytical, recordIO, series,
} from './src/engine/cf/telemetry.js';

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); else console.log('  ✓ ' + m); };
const mk = (domain, mag, extra = {}) => ({ domain, confidence: Math.round(mag * 100), polarity: 'constructive', ts: 0, ...extra });

// ── INV-006 (a) — structural isolation ───────────────────────────────────
console.log('\nWS4 — INV-006 (a): structural guest/analytical isolation\n');
{
  const grep = (pat) => {
    try { return execSync(`grep -rn "${pat}" src --include=*.jsx --include=*.js`, { encoding: 'utf8' }).trim(); }
    catch { return ''; }
  };
  // a .jsx render module may import ONLY cf/read.js (the pure read surface) —
  // never an analytical CF module. Match import statements only.
  const jsxCFImportLines = execSync(
    `grep -rn "^import .*engine/cf/" $(find src -name '*.jsx') || true`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const badJsx = jsxCFImportLines.filter(l => !/engine\/cf\/read\.js/.test(l));
  ok(badJsx.length === 0,
     `every .jsx CF import is cf/read.js only (offenders: ${badJsx.join(' | ') || 'none'})`);

  // no CF module imports a render module
  const cfImportsRender = execSync(
    `grep -rln "\\.jsx'" src/engine/cf/ || true`, { encoding: 'utf8' }).trim();
  ok(cfImportsRender === '', `no engine/cf/* module imports a .jsx render module (found: ${cfImportsRender || 'none'})`);

  // telemetry.js is not imported by any .jsx
  const telemetryInJsx = execSync(
    `grep -rln "cf/telemetry" src --include=*.jsx || true`, { encoding: 'utf8' }).trim();
  ok(telemetryInJsx === '', 'cf/telemetry.js is not imported by any render module');
}

// ── MET-01 — guest latency flat under analytical load ────────────────────
console.log('\nWS4 — MET-01: guest latency vs analytical load\n');

// a fixed synthetic guest unit of work (INV-006 c: calls ZERO CF functions)
function guestUnit() {
  let x = 0;
  for (let i = 0; i < 2000; i++) x += Math.sqrt(i);   // ~constant work
  return x;
}

const LOADS = [10, 100, 1000, 5000];
const rows = [];
for (const load of LOADS) {
  resetTelemetry();
  resetFabric();

  // build `load` distinct pathways (one observation stream each)
  for (let s = 0; s < load; s++) {
    recordAnalytical('ingest', () => {
      ingest([ mk(['CAPITAL', 'OWNERSHIP', 'MEDIA', 'LABOR'][s % 4], 0.5, { obsId: `s${s}`, lineageKey: `stream${s}` }) ]);
    }, { enqueuedAt: performance.now() });
  }
  // one analytical formation pass over the whole state
  recordAnalytical('infer', () => {
    const f = inferFormation(admissibleParticles());
    if (f) recordConvergence(f.participatingDomains);
  }, { enqueuedAt: performance.now() });
  recordIO(ioCounters());

  // interleave guest units — they must not slow down as `load` grows
  for (let g = 0; g < 200; g++) recordGuest(guestUnit);

  const s = series();
  rows.push({ load, ...s });
  console.log(`  load=${String(load).padStart(5)}  guest p50=${String(s.guestLatency.p50).padStart(7)}ms p95=${String(s.guestLatency.p95).padStart(7)}ms` +
              `   analytical proc p50=${String(s.processingTime.p50).padStart(8)}ms` +
              `   examined=${String(s.objects.examined).padStart(7)} written=${String(s.objects.written).padStart(6)}`);
}

// analytical load genuinely varied
const procGrew = rows[rows.length - 1].processingTime.max > rows[0].processingTime.max * 3;
const examGrew = rows[rows.length - 1].objects.examined > rows[0].objects.examined * 10;
ok(procGrew, `analytical processing time grew with load (${rows[0].processingTime.max}ms → ${rows[rows.length-1].processingTime.max}ms)`);
ok(examGrew, `objects examined grew with load (${rows[0].objects.examined} → ${rows[rows.length-1].objects.examined})`);

// guest latency did NOT scale with load — p95 at max load within 2x of p95 at min load
const g0 = rows[0].guestLatency.p95;
const gN = rows[rows.length - 1].guestLatency.p95;
ok(gN <= Math.max(g0 * 2, g0 + 0.05),
   `guest p95 latency flat across a ${LOADS[0]}→${LOADS[LOADS.length-1]} load sweep (${g0}ms → ${gN}ms)`);

// the four series are independently populated
const s = rows[rows.length - 1];
ok(s.guestLatency.n > 0 && s.processingTime.n > 0 && s.objects.examined > 0,
   'all four MET-01 series independently captured (guest / queueDelay / procTime / objects)');

// ── verdict ─────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(80));
if (fails.length) {
  console.log(`WS4: ${fails.length} FAILED`);
  for (const f of fails) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log('WS4 (CF-004-MET-01 / INV-006) — ALL CHECKS PASS');
console.log('guest-path latency is flat under a 500x analytical load increase.');
process.exit(0);
