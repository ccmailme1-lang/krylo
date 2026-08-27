// qa_kryl1218_canonical_recommendedaction.mjs — KRYL-1218 (canonical boundary)
// The canonical synthesis path (synthCanonical) never emitted recommendedAction,
// so a query that resolved to a real domain (CAPITAL/OWNERSHIP/LABOR) rendered the
// packet's weak null-fallback ("Query did not resolve…" / "Generating.").
//
// Fix: synthCanonical emits a perception-only recommendedAction from its own live
// signal fields — same pattern as every SYNTH_MAP synthesizer. querysynthesis.js
// spreads it through both canonical returns. Packet unchanged.
//
// Proof: CAPITAL + OWNERSHIP with seeded live signal → grounded perception signal.
// LABOR with no signal → honest-absence signal, no fabricated magnitude.
// Run: node qa_kryl1218_canonical_recommendedaction.mjs

import { surfaceRouter } from './src/engine/surfacerouter.js';
import { synthesizeQuery } from './src/engine/querysynthesis.js';

let pass = 0, fail = 0;
const check = (label, cond) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else      { fail++; console.log(`  ✗ ${label}`); }
};

// Seed the live domain-pressure field (gravity is a passive surfaceRouter observer).
const now = Date.now();
const seed = (domain, polarity, confidence, n) => {
  for (let i = 0; i < n; i++) surfaceRouter.dispatch({ domain, polarity, confidence, ts: now - i * 1000 });
};
seed('CAPITAL',   'NEGATIVE', 62, 3);   // fracture, 3 signals
seed('OWNERSHIP',  'POSITIVE', 48, 2);   // constructive, 2 signals
// LABOR: intentionally unseeded.

// Mirror targetpacket.jsx PRIMARY SIGNAL render logic exactly.
const primarySignal = (s) => {
  if (s?.recommendedAction != null) return s.recommendedAction;
  if (s?.stateLabel === 'INSUFFICIENT_SIGNAL' || s?.resolutionEligible === false)
    return 'Query did not resolve. Add a decision, amount, or timeline.';
  if (s?.stateLabel === 'LOW_SIGNAL_YIELD') return 'Signal below threshold. Narrow the query.';
  return 'Generating.';
};

const QCAP = 'the board is weighing a debt refinancing against a covenant deadline';
const QOWN = 'an activist investor is building a stake and pushing for board restructuring';
const QLAB = 'a coordinated strike and rising attrition are hitting the workforce across the sector';

const CAP = synthesizeQuery({ id: 'c', query: QCAP, lens: 'OPEN', tensor: {} });
const OWN = synthesizeQuery({ id: 'o', query: QOWN, lens: 'OPEN', tensor: {} });
const LAB = synthesizeQuery({ id: 'l', query: QLAB, lens: 'OPEN', tensor: {} });

for (const [k, r] of [['CAPITAL', CAP], ['OWNERSHIP', OWN], ['LABOR', LAB]]) {
  console.log(`\n${k}: domain=${r?.queryDomain} resEligible=${r?.resolutionEligible} confidence=${r?.confidence ?? 'null'}`);
  console.log(`  → PRIMARY SIGNAL: ${JSON.stringify(primarySignal(r))}`);
}
console.log();

// 1. Every canonical query yields a non-null Primary Signal (no fallback path).
check('CAPITAL Primary Signal is non-null recommendedAction', typeof CAP.recommendedAction === 'string');
check('OWNERSHIP Primary Signal is non-null recommendedAction', typeof OWN.recommendedAction === 'string');
check('LABOR Primary Signal is non-null recommendedAction', typeof LAB.recommendedAction === 'string');

// 2. Each names its own resolved domain — query-specific.
check('CAPITAL signal names CAPITAL', /CAPITAL/.test(CAP.recommendedAction));
check('OWNERSHIP signal names OWNERSHIP', /OWNERSHIP/.test(OWN.recommendedAction));
check('LABOR signal names LABOR', /LABOR/.test(LAB.recommendedAction));
check('CAPITAL ≠ OWNERSHIP ≠ LABOR signal', new Set([CAP.recommendedAction, OWN.recommendedAction, LAB.recommendedAction]).size === 3);

// 3. Grounded canonical signals describe the live field (perception, from real numbers).
check('CAPITAL signal reports its live magnitude', /magnitude \d+\/100/.test(CAP.recommendedAction));
check('CAPITAL signal reports polarity', /(fracture|constructive) polarity/.test(CAP.recommendedAction));
check('CAPITAL signal reports the signal count', /across \d+ signal/.test(CAP.recommendedAction));
check('OWNERSHIP signal reports its live magnitude', /magnitude \d+\/100/.test(OWN.recommendedAction));

// 4. Withheld (no live signal) is honest absence — no fabricated magnitude.
check('LABOR signal states the absence', /no signal in the current window/.test(LAB.recommendedAction));
check('LABOR signal does NOT fabricate a magnitude', !/magnitude \d+\/100/.test(LAB.recommendedAction));
check('LABOR resolutionEligible stays false (semantics preserved)', LAB.resolutionEligible === false);

// 5. No query coaching in any canonical signal — perception only.
const all = CAP.recommendedAction + OWN.recommendedAction + LAB.recommendedAction;
check('no "Add a dollar figure" coaching', !/Add a dollar figure|Add a decision|Add a specific|more concrete the input/.test(all));
check('none is the packet fallback string', !/Query did not resolve|Generating\./.test(all));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
