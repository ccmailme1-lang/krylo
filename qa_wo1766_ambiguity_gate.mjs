// qa_wo1766_ambiguity_gate.mjs — WO-1766 Domain Ambiguity Gate BAU
// Tests classifyAmbiguity() directly with explicit score maps.
// All 6 vectors must pass.

import { classifyAmbiguity } from './src/engine/domainambiguitygate.js';

let pass = 0;
let fail = 0;

function check(label, domainScores, expectedState, note) {
  const result = classifyAmbiguity(domainScores);
  const ok = result.state === expectedState;
  const mark = ok ? '✓ PASS' : '✗ FAIL';
  if (ok) pass++; else fail++;
  console.log(`${mark}  [${label}]`);
  console.log(`       scores: ${JSON.stringify(domainScores)}`);
  console.log(`       expected: ${expectedState} | got: ${result.state} | H=${result.entropy.toFixed(3)} | winner=${result.winner} | coActive=[${result.coActive.join(',')}]`);
  if (note) console.log(`       note: ${note}`);
  if (!ok) console.log(`       ^^^ FAILURE`);
  console.log('');
}

console.log('=== WO-1766 — Domain Ambiguity Gate ===\n');

// T1: Single dominant domain — 3 hits, nothing else → HARD
check(
  'T1 single-dominant',
  { REAL_ESTATE: 3 },
  'HARD',
  '"buy a house in Austin" — REAL_ESTATE clear dominant, 3 keyword hits'
);

// T2: Single domain, 2 hits → HARD
check(
  'T2 retirement-clear',
  { RETIREMENT: 2 },
  'HARD',
  '"roll over my 401k into an IRA" — RETIREMENT dominant'
);

// T3: Single domain, 1 hit → HARD (winner=1.0, H=0, margin=1.0)
check(
  'T3 single-one-hit',
  { CAREER: 1 },
  'HARD',
  'Single domain, 1 hit — degenerate HARD'
);

// T4: Two domains at equal score → SOFT (margin=0, coActive present)
check(
  'T4 two-way-tie',
  { REAL_ESTATE: 1, CAREER: 1 },
  'SOFT',
  '"rent career capital growth" — REAL_ESTATE + CAREER co-active'
);

// T5: Empty score map → HOLD
check(
  'T5 empty',
  {},
  'HOLD',
  'No keyword matches — pure proper noun query or empty string'
);

// T6: Five-way tie → HOLD (H≈2.32 > 2.2, winner normalized=0.2 < MIN_CONFIDENCE=0.25)
check(
  'T6 five-way-tie',
  { CAREER: 1, REAL_ESTATE: 1, RETIREMENT: 1, AUTO: 1, HEALTH: 1 },
  'HOLD',
  '5-way equal distribution — H>2.2 and winner score<MIN_CONFIDENCE trigger HOLD'
);

// Bonus: SOFT — 2:1 ratio (winner=0.667, second=0.333, margin=0.333 < HARD_MARGIN=0.35)
check(
  'T7 soft-two-to-one',
  { REAL_ESTATE: 2, CAREER: 1 },
  'SOFT',
  'REAL_ESTATE leads 2:1 but margin(0.333) < HARD_MARGIN(0.35) → SOFT'
);

// Bonus: HARD — asymmetric (3:1 margin=0.5 ≥ HARD_MARGIN, H<1.0)
check(
  'T8 hard-asymmetric',
  { RETIREMENT: 3, GENERAL: 1 },
  'HARD',
  'RETIREMENT 3:1 over GENERAL → margin=0.5, H=0.811 → HARD'
);

console.log(`=== RESULT: ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
