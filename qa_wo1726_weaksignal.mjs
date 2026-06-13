// qa_wo1726_weaksignal.mjs — WO-1726 Weak Signal Detection Layer
// Validates Phase A (sub-threshold), Phase B (velocity/emerging), Phase C (early convergence alert).
// Run: node qa_wo1726_weaksignal.mjs

import { detectWeakSignals, resetWeakSignalHistory, WEAK_THRESHOLD, PHASE_C_DOMAINS } from './src/engine/weaksignaldetector.js';

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

// ── BLOCK 1: Constants and empty input ───────────────────────────────────────
console.log('BLOCK 1 — Constants and edge cases\n');

assert('WEAK_THRESHOLD = 20', WEAK_THRESHOLD === 20);
assert('PHASE_C_DOMAINS includes TECHNOLOGY', PHASE_C_DOMAINS.includes('TECHNOLOGY'));
assert('PHASE_C_DOMAINS includes KNOWLEDGE',  PHASE_C_DOMAINS.includes('KNOWLEDGE'));

const empty = detectWeakSignals([]);
assert('Empty input: weakSignals = []',           empty.weakSignals.length === 0);
assert('Empty input: emergingSignals = []',        empty.emergingSignals.length === 0);
assert('Empty input: earlyConvergenceAlert false', empty.earlyConvergenceAlert === false);

const nullInput = detectWeakSignals(null);
assert('Null input: no throw, weakSignals = []',   nullInput.weakSignals.length === 0);

// ── BLOCK 2: Phase A — sub-threshold detection ───────────────────────────────
console.log('\nBLOCK 2 — Phase A: sub-threshold signal detection\n');

resetWeakSignalHistory();

const mixedSignals = [
  { domain: 'TECHNOLOGY', signal: 12, ts: Date.now() },
  { domain: 'CAPITAL',    signal: 55, ts: Date.now() },
  { domain: 'KNOWLEDGE',  signal:  8, ts: Date.now() },
  { domain: 'MEDIA',      signal: 72, ts: Date.now() },
  { domain: 'LABOR',      signal: 19, ts: Date.now() },   // just below threshold
  { domain: 'OWNERSHIP',  signal: 20, ts: Date.now() },   // exactly at threshold — NOT weak
];

const phaseA = detectWeakSignals(mixedSignals);

assert('Phase A: 3 weak signals (12, 8, 19)', phaseA.weakSignals.length === 3,
  `got ${phaseA.weakSignals.length}`);
assert('Phase A: TECHNOLOGY in weakSignals', phaseA.weakSignals.some(s => s.domain === 'TECHNOLOGY'));
assert('Phase A: KNOWLEDGE in weakSignals',  phaseA.weakSignals.some(s => s.domain === 'KNOWLEDGE'));
assert('Phase A: LABOR in weakSignals',      phaseA.weakSignals.some(s => s.domain === 'LABOR'));
assert('Phase A: CAPITAL (55) NOT in weakSignals', !phaseA.weakSignals.some(s => s.domain === 'CAPITAL'));
assert('Phase A: OWNERSHIP (20) NOT in weakSignals', !phaseA.weakSignals.some(s => s.domain === 'OWNERSHIP'));
assert('Phase A: weak signals carry slope field', phaseA.weakSignals.every(s => typeof s.slope === 'number'));

// ── BLOCK 3: Phase B — velocity / emerging detection ─────────────────────────
console.log('\nBLOCK 3 — Phase B: velocity tracker and EMERGING flag\n');

resetWeakSignalHistory();

const now = Date.now();

// Feed 3 rising readings for TECHNOLOGY — slope should exceed EMERGING_SLOPE (1.5)
detectWeakSignals([{ domain: 'TECHNOLOGY', signal:  5, ts: now - 2000 }]);
detectWeakSignals([{ domain: 'TECHNOLOGY', signal: 10, ts: now - 1000 }]);
const phaseB = detectWeakSignals([{ domain: 'TECHNOLOGY', signal: 15, ts: now }]);

const tech = phaseB.weakSignals.find(s => s.domain === 'TECHNOLOGY');
assert('Phase B: TECHNOLOGY still weak (15 < 20)',       tech !== undefined);
assert('Phase B: TECHNOLOGY slope > 0',                  tech && tech.slope > 0,
  `slope=${tech?.slope}`);
assert('Phase B: TECHNOLOGY in emergingSignals (rising 5→10→15)', phaseB.emergingSignals.some(s => s.domain === 'TECHNOLOGY'),
  `emerging=${phaseB.emergingSignals.map(s => s.domain)}`);

// Flat signal — should not be emerging
resetWeakSignalHistory();
detectWeakSignals([{ domain: 'LABOR', signal: 10, ts: now - 2000 }]);
detectWeakSignals([{ domain: 'LABOR', signal: 10, ts: now - 1000 }]);
const flatResult = detectWeakSignals([{ domain: 'LABOR', signal: 10, ts: now }]);
assert('Phase B: flat signal (10→10→10) NOT emerging', !flatResult.emergingSignals.some(s => s.domain === 'LABOR'));

// Falling signal — should not be emerging
resetWeakSignalHistory();
detectWeakSignals([{ domain: 'MEDIA', signal: 18, ts: now - 2000 }]);
detectWeakSignals([{ domain: 'MEDIA', signal: 12, ts: now - 1000 }]);
const fallingResult = detectWeakSignals([{ domain: 'MEDIA', signal:  6, ts: now }]);
assert('Phase B: falling signal (18→12→6) NOT emerging', !fallingResult.emergingSignals.some(s => s.domain === 'MEDIA'));

// ── BLOCK 4: Phase C — early convergence alert ───────────────────────────────
console.log('\nBLOCK 4 — Phase C: early convergence alert (TECHNOLOGY + KNOWLEDGE both emerging)\n');

resetWeakSignalHistory();

// Build velocity for both TECHNOLOGY and KNOWLEDGE
detectWeakSignals([
  { domain: 'TECHNOLOGY', signal:  4, ts: now - 2000 },
  { domain: 'KNOWLEDGE',  signal:  3, ts: now - 2000 },
]);
detectWeakSignals([
  { domain: 'TECHNOLOGY', signal:  9, ts: now - 1000 },
  { domain: 'KNOWLEDGE',  signal:  8, ts: now - 1000 },
]);
const phaseC = detectWeakSignals([
  { domain: 'TECHNOLOGY', signal: 14, ts: now },
  { domain: 'KNOWLEDGE',  signal: 13, ts: now },
  { domain: 'CAPITAL',    signal: 60, ts: now },  // above threshold — should not affect alert
]);

assert('Phase C: TECHNOLOGY emerging',           phaseC.emergingSignals.some(s => s.domain === 'TECHNOLOGY'));
assert('Phase C: KNOWLEDGE emerging',            phaseC.emergingSignals.some(s => s.domain === 'KNOWLEDGE'));
assert('Phase C: earlyConvergenceAlert = true',  phaseC.earlyConvergenceAlert === true,
  `got ${phaseC.earlyConvergenceAlert}`);

// Only one Phase C domain emerging — alert should NOT fire
resetWeakSignalHistory();
detectWeakSignals([{ domain: 'TECHNOLOGY', signal:  4, ts: now - 2000 }]);
detectWeakSignals([{ domain: 'TECHNOLOGY', signal:  9, ts: now - 1000 }]);
const halfC = detectWeakSignals([
  { domain: 'TECHNOLOGY', signal: 14, ts: now },
  { domain: 'KNOWLEDGE',  signal:  2, ts: now },  // flat — not emerging
]);
assert('Phase C: only TECHNOLOGY emerging → no alert', halfC.earlyConvergenceAlert === false,
  `got ${halfC.earlyConvergenceAlert}`);

// ── BLOCK 5: resetWeakSignalHistory clears velocity ──────────────────────────
console.log('\nBLOCK 5 — History reset clears velocity state\n');

resetWeakSignalHistory();
detectWeakSignals([{ domain: 'TECHNOLOGY', signal: 5, ts: now - 2000 }]);
detectWeakSignals([{ domain: 'TECHNOLOGY', signal: 10, ts: now - 1000 }]);
resetWeakSignalHistory();  // ← clear mid-sequence
const afterReset = detectWeakSignals([{ domain: 'TECHNOLOGY', signal: 15, ts: now }]);
const techAfter = afterReset.weakSignals.find(s => s.domain === 'TECHNOLOGY');
assert('After reset: TECHNOLOGY slope = 0 (only 1 reading)', techAfter && techAfter.slope === 0,
  `slope=${techAfter?.slope}`);
assert('After reset: TECHNOLOGY NOT emerging', !afterReset.emergingSignals.some(s => s.domain === 'TECHNOLOGY'));

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════');
console.log(`  RESULT: ${pass} PASS / ${fail} FAIL`);
console.log('══════════════════════════════════════════════════\n');
if (fail > 0) process.exit(1);
