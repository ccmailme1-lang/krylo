// qa_wo1726_weaksignal.mjs — WO-1726 Weak Signal Detection Layer (corrected canon)
// Phase A: sub-threshold detection. Phase B: velocity / emerging flag.
// Phase C (cross-domain correlation) re-homed to WO-1734 — not tested here.
// All output signals must carry WEAK-tier tag + promotable: false.
// Run: node qa_wo1726_weaksignal.mjs

import { detectWeakSignals, resetWeakSignalHistory, WEAK_THRESHOLD } from './src/engine/weaksignaldetector.js';
import { validateBoundary } from './src/engine/epistemictier.js';

let pass = 0;
let fail = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${label}`);
    pass++;
  } else {
    console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`);
    fail++;
  }
}

console.log('\n══════════════════════════════════════════════════');
console.log('  WO-1726 WEAK SIGNAL DETECTION — OUTCOME HARNESS');
console.log('══════════════════════════════════════════════════\n');

// ── BLOCK 1: Constants and edge cases ───────────────────────────────────────
console.log('BLOCK 1 — Constants and edge cases\n');

assert('WEAK_THRESHOLD = 20', WEAK_THRESHOLD === 20);

const empty = detectWeakSignals([]);
assert('Empty input: weakSignals = []',    empty.weakSignals.length === 0);
assert('Empty input: emergingSignals = []', empty.emergingSignals.length === 0);
assert('No earlyConvergenceAlert on empty output (Phase C removed)',
  !('earlyConvergenceAlert' in empty));

const nullInput = detectWeakSignals(null);
assert('Null input: no throw, weakSignals = []', nullInput.weakSignals.length === 0);

// ── BLOCK 2: Phase A — sub-threshold detection ───────────────────────────────
console.log('\nBLOCK 2 — Phase A: sub-threshold signal detection\n');

resetWeakSignalHistory();

const mixedSignals = [
  { domain: 'TECHNOLOGY', signal: 12, ts: Date.now() },
  { domain: 'CAPITAL',    signal: 55, ts: Date.now() },
  { domain: 'KNOWLEDGE',  signal:  8, ts: Date.now() },
  { domain: 'MEDIA',      signal: 72, ts: Date.now() },
  { domain: 'LABOR',      signal: 19, ts: Date.now() },
  { domain: 'OWNERSHIP',  signal: 20, ts: Date.now() }, // at threshold — NOT weak
];

const phaseA = detectWeakSignals(mixedSignals);

assert('Phase A: 3 weak signals (12, 8, 19)', phaseA.weakSignals.length === 3,
  `got ${phaseA.weakSignals.length}`);
assert('Phase A: TECHNOLOGY in weakSignals',  phaseA.weakSignals.some(s => s.domain === 'TECHNOLOGY'));
assert('Phase A: KNOWLEDGE in weakSignals',   phaseA.weakSignals.some(s => s.domain === 'KNOWLEDGE'));
assert('Phase A: LABOR in weakSignals',       phaseA.weakSignals.some(s => s.domain === 'LABOR'));
assert('Phase A: CAPITAL (55) NOT weak',      !phaseA.weakSignals.some(s => s.domain === 'CAPITAL'));
assert('Phase A: OWNERSHIP (20) NOT weak',    !phaseA.weakSignals.some(s => s.domain === 'OWNERSHIP'));
assert('Phase A: weak signals carry slope',   phaseA.weakSignals.every(s => typeof s.slope === 'number'));

// ── BLOCK 3: Epistemic tier contract on output ───────────────────────────────
console.log('\nBLOCK 3 — Epistemic tier: all weak signals carry WEAK tag + promotable: false\n');

for (const s of phaseA.weakSignals) {
  assert(`${s.domain}: _epistemicTier = WEAK`,   s._epistemicTier === 'WEAK',  `got "${s._epistemicTier}"`);
  assert(`${s.domain}: promotable = false`,       s.promotable === false,        `got ${s.promotable}`);
}

// validateBoundary gate: each signal passes WEAK boundary check
let boundaryOk = true;
for (const s of phaseA.weakSignals) {
  try { validateBoundary(s, 'WEAK'); }
  catch { boundaryOk = false; }
}
assert('All weak signals pass validateBoundary(WEAK)', boundaryOk);

// ── BLOCK 4: Phase B — velocity / emerging detection ─────────────────────────
console.log('\nBLOCK 4 — Phase B: velocity tracker and EMERGING flag\n');

resetWeakSignalHistory();
const now = Date.now();

detectWeakSignals([{ domain: 'TECHNOLOGY', signal:  5, ts: now - 2000 }]);
detectWeakSignals([{ domain: 'TECHNOLOGY', signal: 10, ts: now - 1000 }]);
const phaseB = detectWeakSignals([{ domain: 'TECHNOLOGY', signal: 15, ts: now }]);

const tech = phaseB.weakSignals.find(s => s.domain === 'TECHNOLOGY');
assert('Phase B: TECHNOLOGY still weak (15 < 20)',                   tech !== undefined);
assert('Phase B: TECHNOLOGY slope > 0',                              tech && tech.slope > 0, `slope=${tech?.slope}`);
assert('Phase B: TECHNOLOGY in emergingSignals (5→10→15)',           phaseB.emergingSignals.some(s => s.domain === 'TECHNOLOGY'));
assert('Phase B: emerging signals also WEAK-tagged',
  phaseB.emergingSignals.every(s => s._epistemicTier === 'WEAK' && s.promotable === false));

resetWeakSignalHistory();
detectWeakSignals([{ domain: 'LABOR', signal: 10, ts: now - 2000 }]);
detectWeakSignals([{ domain: 'LABOR', signal: 10, ts: now - 1000 }]);
const flat = detectWeakSignals([{ domain: 'LABOR', signal: 10, ts: now }]);
assert('Phase B: flat (10→10→10) NOT emerging', !flat.emergingSignals.some(s => s.domain === 'LABOR'));

resetWeakSignalHistory();
detectWeakSignals([{ domain: 'MEDIA', signal: 18, ts: now - 2000 }]);
detectWeakSignals([{ domain: 'MEDIA', signal: 12, ts: now - 1000 }]);
const falling = detectWeakSignals([{ domain: 'MEDIA', signal:  6, ts: now }]);
assert('Phase B: falling (18→12→6) NOT emerging', !falling.emergingSignals.some(s => s.domain === 'MEDIA'));

// ── BLOCK 5: No Phase C output on this layer ─────────────────────────────────
console.log('\nBLOCK 5 — Phase C removed: no earlyConvergenceAlert in output\n');

resetWeakSignalHistory();
detectWeakSignals([{ domain: 'TECHNOLOGY', signal: 4, ts: now - 2000 }, { domain: 'KNOWLEDGE', signal: 3, ts: now - 2000 }]);
detectWeakSignals([{ domain: 'TECHNOLOGY', signal: 9, ts: now - 1000 }, { domain: 'KNOWLEDGE', signal: 8, ts: now - 1000 }]);
const noPhaseC = detectWeakSignals([{ domain: 'TECHNOLOGY', signal: 14, ts: now }, { domain: 'KNOWLEDGE', signal: 13, ts: now }]);

assert('No earlyConvergenceAlert key in output (re-homed to WO-1734)',
  !('earlyConvergenceAlert' in noPhaseC));
assert('TECHNOLOGY still detected as emerging (data preserved for NC layer)',
  noPhaseC.emergingSignals.some(s => s.domain === 'TECHNOLOGY'));
assert('KNOWLEDGE still detected as emerging (data preserved for NC layer)',
  noPhaseC.emergingSignals.some(s => s.domain === 'KNOWLEDGE'));

// ── BLOCK 6: History reset ───────────────────────────────────────────────────
console.log('\nBLOCK 6 — History reset clears velocity state\n');

resetWeakSignalHistory();
detectWeakSignals([{ domain: 'TECHNOLOGY', signal: 5, ts: now - 2000 }]);
detectWeakSignals([{ domain: 'TECHNOLOGY', signal: 10, ts: now - 1000 }]);
resetWeakSignalHistory();
const afterReset = detectWeakSignals([{ domain: 'TECHNOLOGY', signal: 15, ts: now }]);
const techAfter = afterReset.weakSignals.find(s => s.domain === 'TECHNOLOGY');
assert('After reset: slope = 0 (only 1 reading)', techAfter && techAfter.slope === 0, `slope=${techAfter?.slope}`);
assert('After reset: NOT emerging',               !afterReset.emergingSignals.some(s => s.domain === 'TECHNOLOGY'));

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════');
console.log(`  RESULT: ${pass} PASS / ${fail} FAIL`);
console.log('══════════════════════════════════════════════════\n');
if (fail > 0) process.exit(1);
