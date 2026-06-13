// qa_wo1743_metasignals.mjs — WO-1743 Meta-Signal Registry & Detection Contract
// Validates the canonical registry and validateProtocol() enforcement gate.
// Run: node qa_wo1743_metasignals.mjs

import { META_SIGNALS, META_SIGNAL_KEYS, validateProtocol } from './src/engine/metasignals.js';

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

function assertThrows(label, fn, expectedFragment) {
  try {
    fn();
    console.log(`  FAIL  ${label} — expected throw, got none`);
    fail++;
  } catch (e) {
    const ok = e.message.includes(expectedFragment);
    if (ok) {
      console.log(`  PASS  ${label}`);
      pass++;
    } else {
      console.log(`  FAIL  ${label} — message "${e.message}" missing "${expectedFragment}"`);
      fail++;
    }
  }
}

console.log('\n════════════════════════════════════════════════');
console.log('  WO-1743 META-SIGNAL REGISTRY — CONTRACT HARNESS');
console.log('════════════════════════════════════════════════\n');

// ── BLOCK 1: Registry completeness ──────────────────────────────────────────
console.log('BLOCK 1 — Registry completeness\n');

assert('META_SIGNALS is a non-null object', META_SIGNALS && typeof META_SIGNALS === 'object');
assert('Registry contains PLATFORM_FORMATION', 'PLATFORM_FORMATION' in META_SIGNALS);
assert('Registry contains DISRUPTION_ALERT',   'DISRUPTION_ALERT'   in META_SIGNALS);
assert('Registry contains NARRATIVE_PERMISSION','NARRATIVE_PERMISSION' in META_SIGNALS);
assert('META_SIGNAL_KEYS length = 3', META_SIGNAL_KEYS.length === 3,
  `got ${META_SIGNAL_KEYS.length}`);

// Each entry must have trigger, output, version
for (const key of META_SIGNAL_KEYS) {
  const sig = META_SIGNALS[key];
  assert(`${key} has trigger string`,  typeof sig.trigger  === 'string' && sig.trigger.length  > 0);
  assert(`${key} has output string`,   typeof sig.output   === 'string' && sig.output.length   > 0);
  assert(`${key} has version string`,  typeof sig.version  === 'string' && sig.version.length  > 0);
  assert(`${key} output matches key`,  sig.output === key);
}

// ── BLOCK 2: validateProtocol — clean protocols ──────────────────────────────
console.log('\nBLOCK 2 — Clean protocol passes validation\n');

// No subscriptions
assert('Empty protocol object passes', (() => { try { validateProtocol({}); return true; } catch { return false; } })());

// Valid subscriptions
assert('Protocol with valid subscriptions passes', (() => {
  try {
    validateProtocol({
      name: 'AnthonyProtocol',
      subscriptions: ['DISRUPTION_ALERT'],
      onEvent: () => {},
    });
    return true;
  } catch { return false; }
})());

// Multiple valid subscriptions
assert('Protocol with multiple valid subscriptions passes', (() => {
  try {
    validateProtocol({
      name: 'MultiSubscriber',
      subscriptions: ['PLATFORM_FORMATION', 'NARRATIVE_PERMISSION'],
    });
    return true;
  } catch { return false; }
})());

// ── BLOCK 3: validateProtocol — contract violations ──────────────────────────
console.log('\nBLOCK 3 — Contract violations throw PROTOCOL_CONTRACT_VIOLATION\n');

assertThrows(
  'Protocol with trigger key throws',
  () => validateProtocol({ name: 'BadProtocol', trigger: 'BUILDING + CAPITAL' }),
  'PROTOCOL_CONTRACT_VIOLATION'
);

assertThrows(
  'Protocol with trigger key names the protocol in error',
  () => validateProtocol({ name: 'BadProtocol', trigger: 'anything' }),
  'BadProtocol'
);

assertThrows(
  'Unknown subscription key throws',
  () => validateProtocol({ name: 'UnknownSub', subscriptions: ['MADE_UP_SIGNAL'] }),
  'PROTOCOL_CONTRACT_VIOLATION'
);

assertThrows(
  'Unknown subscription names the bad key in error',
  () => validateProtocol({ name: 'UnknownSub', subscriptions: ['MADE_UP_SIGNAL'] }),
  'MADE_UP_SIGNAL'
);

assertThrows(
  'Non-array subscriptions throws',
  () => validateProtocol({ name: 'BadSubs', subscriptions: 'DISRUPTION_ALERT' }),
  'PROTOCOL_CONTRACT_VIOLATION'
);

assertThrows(
  'Null proto throws',
  () => validateProtocol(null),
  'validateProtocol'
);

// ── BLOCK 4: Registry immutability guard ─────────────────────────────────────
console.log('\nBLOCK 4 — Registry entries are structurally consistent\n');

// All output values match their key (canonical contract)
const allOutputsMatchKeys = META_SIGNAL_KEYS.every(k => META_SIGNALS[k].output === k);
assert('All signal outputs match their registry key', allOutputsMatchKeys);

// META_SIGNAL_KEYS mirrors META_SIGNALS keys exactly
const keysMatch = JSON.stringify(META_SIGNAL_KEYS.slice().sort()) ===
                  JSON.stringify(Object.keys(META_SIGNALS).sort());
assert('META_SIGNAL_KEYS mirrors META_SIGNALS keys', keysMatch);

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════');
console.log(`  RESULT: ${pass} PASS / ${fail} FAIL`);
console.log('════════════════════════════════════════════════\n');
if (fail > 0) process.exit(1);
