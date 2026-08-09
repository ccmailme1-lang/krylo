// src/engine/perceptionhydrator.test.mjs
// KRYL-1159 — Completion Criteria contract tests.
// Plain assert-based runner (matches this repo's qa_*.mjs convention) — run with:
//   node src/engine/perceptionhydrator.test.mjs
import assert from 'node:assert/strict';
import { hydrate, validateRawRecord } from './perceptionhydrator.js';
import { isValidPerceptionFrame, DOMAIN_STATE, CANONICAL_DOMAIN_ORDER } from '../contracts/perceptionframe.js';

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log(`  PASS  ${name}`); }
  catch (e) { fail++; console.log(`  FAIL  ${name}\n        ${e.message}`); }
}

// ── Gate 1 — Six Cone Integrity ──────────────────────────────────────────────
test('Test 1 — cold start: 6 domains always present, even from empty input', () => {
  const frame = hydrate([]);
  assert.equal(frame.domains.length, 6);
  const names = frame.domains.map(d => d.domain).sort();
  assert.deepEqual(names, [...CANONICAL_DOMAIN_ORDER].sort());
});

test('empty input -> all 6 domains AWAITING, frame is PARTIAL', () => {
  const frame = hydrate([]);
  assert.ok(frame.domains.every(d => d.state === DOMAIN_STATE.AWAITING));
  assert.equal(frame.status, 'PARTIAL');
});

// ── Gate 2 — State Truth Integrity (the exact invariants from the spec) ─────
test('unknown is not zero — no records for a domain -> AWAITING, not pressure:0/OBSERVED', () => {
  const frame = hydrate([{ domain: 'capital', leverage: 90, volatility: 0.5 }]);
  const labor = frame.domains.find(d => d.domain === 'labor');
  assert.equal(labor.state, DOMAIN_STATE.AWAITING);
  assert.equal(labor.pressure, null);
});

test('real zero remains valid — a real record with leverage:0 stays OBSERVED, not collapsed to AWAITING', () => {
  const frame = hydrate([{ domain: 'labor', leverage: 0, volatility: 0.2 }]);
  const labor = frame.domains.find(d => d.domain === 'labor');
  assert.equal(labor.state, DOMAIN_STATE.OBSERVED);
  assert.equal(labor.pressure, 0);
});

// ── Test 2 — Partial Hydration ────────────────────────────────────────────
test('Test 2 — partial hydration: 2 domains OBSERVED, 4 AWAITING', () => {
  const frame = hydrate([
    { domain: 'capital',   leverage: 65, volatility: 0.3 },
    { domain: 'ownership', leverage: 92, volatility: 0.4 },
  ]);
  const byId = Object.fromEntries(frame.domains.map(d => [d.domain, d.state]));
  assert.equal(byId.capital,    DOMAIN_STATE.OBSERVED);
  assert.equal(byId.ownership,  DOMAIN_STATE.OBSERVED);
  assert.equal(byId.labor,      DOMAIN_STATE.AWAITING);
  assert.equal(byId.media,      DOMAIN_STATE.AWAITING);
  assert.equal(byId.technology, DOMAIN_STATE.AWAITING);
  assert.equal(byId.knowledge,  DOMAIN_STATE.AWAITING);
  assert.equal(frame.status, 'PARTIAL');
});

// ── Test 3 — Complete Hydration ───────────────────────────────────────────
test('Test 3 — complete hydration: all 6 OBSERVED once all evidence arrives', () => {
  const frame = hydrate(CANONICAL_DOMAIN_ORDER.map(domain => ({ domain, leverage: 65, volatility: 0.3 })));
  assert.ok(frame.domains.every(d => d.state === DOMAIN_STATE.OBSERVED));
  assert.equal(frame.status, 'COMPLETE');
});

// ── Test 4 — Invalid Data ─────────────────────────────────────────────────
test('Test 4 — malformed evidence -> affected domain INVALID, others unaffected', () => {
  const frame = hydrate([
    { domain: 'capital', leverage: 65, volatility: 0.3 },
    { domain: 'labor', leverage: 'not-a-number', volatility: 0.3 }, // malformed
    { domain: 'labor', leverage: 999, volatility: 0.3 },            // out of range
  ]);
  const byId = Object.fromEntries(frame.domains.map(d => [d.domain, d.state]));
  assert.equal(byId.capital, DOMAIN_STATE.OBSERVED);
  assert.equal(byId.labor, DOMAIN_STATE.INVALID);
  assert.equal(byId.media, DOMAIN_STATE.AWAITING); // untouched, still just absent
});

test('validateRawRecord rejects malformed shapes directly', () => {
  assert.equal(validateRawRecord(null), false);
  assert.equal(validateRawRecord({ domain: 'capital', leverage: NaN, volatility: 0.3 }), false);
  assert.equal(validateRawRecord({ domain: 'not-a-domain', leverage: 50, volatility: 0.3 }), false);
  assert.equal(validateRawRecord({ domain: 'capital', leverage: 50, volatility: 0.3 }), true);
});

// ── Gate 6 — Frame Integrity (determinism + immutability) ─────────────────
test('same input records -> same domain content (deterministic, ignoring frameId/createdAt)', () => {
  const input = [{ domain: 'capital', leverage: 65, volatility: 0.3 }];
  const a = hydrate(input);
  const b = hydrate(input);
  assert.deepEqual(a.domains, b.domains);
});

test('frame is immutable — mutation attempts throw or silently fail, content unchanged', () => {
  const frame = hydrate([{ domain: 'capital', leverage: 65, volatility: 0.3 }]);
  assert.throws(() => { frame.status = 'COMPLETE'; }, TypeError);
  assert.throws(() => { frame.domains[0].pressure = 999; }, TypeError);
});

test('isValidPerceptionFrame accepts a real hydrated frame and rejects garbage', () => {
  const frame = hydrate([{ domain: 'capital', leverage: 65, volatility: 0.3 }]);
  assert.equal(isValidPerceptionFrame(frame), true);
  assert.equal(isValidPerceptionFrame({}), false);
  assert.equal(isValidPerceptionFrame({ frameId: 'x', status: 'COMPLETE', domains: [] }), false);
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
