// WO-1768-A — BAU harness: Macro Timing Proxy validation
// Run: node qa_wo1768a_timing_proxy.mjs
// Tests all 6 spec vectors from §12

import { reconcile } from './src/engine/timingproxy.js';

let pass = 0; let fail = 0;

function check(label, actual, expected) {
  const ok = actual.action === expected.action && actual.conviction === expected.conviction;
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) console.log(`  expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  ok ? pass++ : fail++;
}

// Spec §12 test vectors
check('FADE/MAXIMUM: Fs*=9.2, HIGH CONC, YCID=45',
  reconcile(9.2, 'HIGH CONCENTRATION', 45),
  { action: 'FADE_SIGNAL', conviction: 'MAXIMUM' });

check('FADE/MEDIUM: Fs*=9.2, HIGH CONC, YCID=15',
  reconcile(9.2, 'HIGH CONCENTRATION', 15),
  { action: 'FADE_SIGNAL', conviction: 'MEDIUM' });

check('PASS: Fs*=9.2, NORMAL, YCID=0',
  reconcile(9.2, 'NORMAL', 0),
  { action: 'PASS', conviction: null });

check('PASS: Fs*=3.0, HIGH CONC, YCID=60',
  reconcile(3.0, 'HIGH CONCENTRATION', 60),
  { action: 'PASS', conviction: null });

check('PASS: all nominal (Fs*=2.5, NORMAL, YCID=0)',
  reconcile(2.5, 'NORMAL', 0),
  { action: 'PASS', conviction: null });

check('PASS: ELEVATED (not HIGH CONCENTRATION)',
  reconcile(9.2, 'ELEVATED', 45),
  { action: 'PASS', conviction: null });

console.log(`\n${pass}/${pass + fail} passed`);
if (fail > 0) process.exit(1);
