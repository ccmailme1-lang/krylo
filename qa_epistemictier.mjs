// qa_epistemictier.mjs — Epistemic Tier Boundary Enforcement
// Validates EPISTEMIC_TIER enum, tagWithTier, validateFlowDirection, validateBoundary.
// Run: node qa_epistemictier.mjs

import {
  EPISTEMIC_TIER,
  tagWithTier,
  validateFlowDirection,
  validateBoundary,
} from './src/engine/epistemictier.js';

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

function assertThrows(label, fn, fragment) {
  try {
    fn();
    console.log(`  FAIL  ${label} — expected throw, got none`);
    fail++;
  } catch (e) {
    const ok = e.message.includes(fragment);
    if (ok) { console.log(`  PASS  ${label}`); pass++; }
    else { console.log(`  FAIL  ${label} — message "${e.message}" missing "${fragment}"`); fail++; }
  }
}

console.log('\n══════════════════════════════════════════════════');
console.log('  EPISTEMIC TIER — BOUNDARY CONTRACT HARNESS');
console.log('══════════════════════════════════════════════════\n');

// ── BLOCK 1: Enum completeness ───────────────────────────────────────────────
console.log('BLOCK 1 — Tier enum\n');

assert('META tier defined',  EPISTEMIC_TIER.META === 'META');
assert('WEAK tier defined',  EPISTEMIC_TIER.WEAK === 'WEAK');
assert('NC tier defined',    EPISTEMIC_TIER.NC   === 'NC');
assert('Exactly 3 tiers',    Object.keys(EPISTEMIC_TIER).length === 3);

// ── BLOCK 2: tagWithTier ─────────────────────────────────────────────────────
console.log('\nBLOCK 2 — tagWithTier\n');

const raw = { domain: 'TECHNOLOGY', signal: 12, slope: 1.8 };

const tagged = tagWithTier(raw, EPISTEMIC_TIER.WEAK);
assert('tagWithTier: _epistemicTier = WEAK',  tagged._epistemicTier === 'WEAK');
assert('tagWithTier: promotable = false',      tagged.promotable === false);
assert('tagWithTier: source fields preserved', tagged.domain === 'TECHNOLOGY' && tagged.signal === 12);
assert('tagWithTier: returns new object (not mutating)', tagged !== raw && raw._epistemicTier === undefined);

const taggedMeta = tagWithTier({ key: 'PLATFORM_FORMATION' }, EPISTEMIC_TIER.META);
assert('tagWithTier: META tier tags correctly', taggedMeta._epistemicTier === 'META');

assertThrows(
  'tagWithTier: unknown tier throws',
  () => tagWithTier({}, 'INVENTED_TIER'),
  'EpistemicInvariantViolation'
);

// ── BLOCK 3: validateFlowDirection — allowed paths ───────────────────────────
console.log('\nBLOCK 3 — validateFlowDirection: allowed downward paths\n');

function doesNotThrow(label, fn) {
  try { fn(); console.log(`  PASS  ${label}`); pass++; }
  catch (e) { console.log(`  FAIL  ${label} — unexpected throw: ${e.message}`); fail++; }
}

doesNotThrow('META → WEAK allowed',  () => validateFlowDirection('META', 'WEAK'));
doesNotThrow('META → NC allowed',    () => validateFlowDirection('META', 'NC'));
doesNotThrow('WEAK → NC allowed',    () => validateFlowDirection('WEAK', 'NC'));
doesNotThrow('Same tier allowed (META → META)', () => validateFlowDirection('META', 'META'));
doesNotThrow('Same tier allowed (WEAK → WEAK)', () => validateFlowDirection('WEAK', 'WEAK'));
doesNotThrow('Same tier allowed (NC → NC)',     () => validateFlowDirection('NC',   'NC'));

// ── BLOCK 4: validateFlowDirection — forbidden upward paths ──────────────────
console.log('\nBLOCK 4 — validateFlowDirection: upward flow forbidden\n');

assertThrows('WEAK → META forbidden', () => validateFlowDirection('WEAK', 'META'), 'upward flow forbidden');
assertThrows('NC → WEAK forbidden',   () => validateFlowDirection('NC',   'WEAK'), 'upward flow forbidden');
assertThrows('NC → META forbidden',   () => validateFlowDirection('NC',   'META'), 'upward flow forbidden');
assertThrows('Unknown fromTier throws', () => validateFlowDirection('GHOST', 'WEAK'), 'EpistemicInvariantViolation');
assertThrows('Unknown toTier throws',   () => validateFlowDirection('WEAK', 'GHOST'), 'EpistemicInvariantViolation');

// ── BLOCK 5: validateBoundary — passing cases ────────────────────────────────
console.log('\nBLOCK 5 — validateBoundary: clean objects pass\n');

const cleanWeak = tagWithTier({ domain: 'KNOWLEDGE', signal: 8, slope: 2.1 }, 'WEAK');
const cleanNC   = tagWithTier({ consensusDelta: 35 }, 'NC');
const cleanMeta = tagWithTier({ output: 'PLATFORM_FORMATION' }, 'META');

doesNotThrow('WEAK-tagged object passes WEAK boundary', () => validateBoundary(cleanWeak, 'WEAK'));
doesNotThrow('NC-tagged object passes NC boundary',     () => validateBoundary(cleanNC,   'NC'));
doesNotThrow('META-tagged object passes META boundary', () => validateBoundary(cleanMeta, 'META'));

// ── BLOCK 6: validateBoundary — violation cases ──────────────────────────────
console.log('\nBLOCK 6 — validateBoundary: violations throw\n');

assertThrows(
  'Wrong tier tag throws',
  () => validateBoundary(cleanWeak, 'NC'),
  'EpistemicInvariantViolation'
);
assertThrows(
  'Untagged object throws',
  () => validateBoundary({ signal: 15 }, 'WEAK'),
  'EpistemicInvariantViolation'
);
assertThrows(
  'promotable: true throws',
  () => validateBoundary({ _epistemicTier: 'WEAK', promotable: true }, 'WEAK'),
  'EpistemicInvariantViolation'
);
assertThrows(
  'promotable: undefined throws',
  () => validateBoundary({ _epistemicTier: 'WEAK' }, 'WEAK'),
  'EpistemicInvariantViolation'
);
assertThrows(
  'null object throws',
  () => validateBoundary(null, 'WEAK'),
  'EpistemicInvariantViolation'
);

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════');
console.log(`  RESULT: ${pass} PASS / ${fail} FAIL`);
console.log('══════════════════════════════════════════════════\n');
if (fail > 0) process.exit(1);
