// qa_kryl1097_convergence_fingerprint.mjs
// KRYL-1097 — Convergence Fingerprint Registry & Replay Artifact.
// Guards: trajectory capture (order-preserving), immutability once sealed (FR-3),
// provenance (FR-4), read-only retrieval (FR-6), idempotent seal,
// deterministic/replay-reproducible identity (NFR — sealedAt excluded from identity).

import {
  recordConvergenceSample, sealFingerprint, getFingerprint, getFingerprintByExecution,
  _resetRegistry, FINGERPRINT_VECTOR_VERSION,
} from './src/engine/convergencefingerprint.js';

let pass = 0, fail = 0;
const assert = (name, cond) => { cond ? (pass++, console.log(`  ✓ ${name}`)) : (fail++, console.log(`  ✗ ${name}`)); };

console.log('KRYL-1097 — Convergence Fingerprint\n');

// samples an execution would emit over its life (observed, not computed here)
const samples = [
  { state: 'LOW SIGNAL YIELD',     score: 0.25, ts: 1 },
  { state: 'BUILDING CONVERGENCE', score: 0.55, ts: 2 },
  { state: 'HIGH CONVERGENCE',     score: 0.90, ts: 3 },
];
const prov = { replayId: 'replay-9', analysisId: 'an-3' };

// ── capture + provenance ──
_resetRegistry();
console.log('capture + provenance:');
samples.forEach(s => recordConvergenceSample('exec-A', s));
const fpA = sealFingerprint('exec-A', prov);
assert('sampleCount == 3',                            fpA.sampleCount === 3);
assert('trajectory order preserved',                 fpA.trajectory.map(t => t.state).join('>') === 'LOW SIGNAL YIELD>BUILDING CONVERGENCE>HIGH CONVERGENCE');
assert('provenance links execution/replay/analysis', fpA.provenance.executionId === 'exec-A' && fpA.provenance.replayId === 'replay-9' && fpA.provenance.analysisId === 'an-3');
assert('vectorVersion stamped',                      fpA.vectorVersion === FINGERPRINT_VECTOR_VERSION);

// ── immutability (FR-3) ──
console.log('\nimmutability:');
assert('fingerprint is frozen',       Object.isFrozen(fpA));
assert('trajectory is frozen',        Object.isFrozen(fpA.trajectory));
let threw = false;
try { recordConvergenceSample('exec-A', { state: 'HIGH CONVERGENCE', score: 0.99 }); } catch { threw = true; }
assert('recording after seal throws', threw === true);

// ── read-only retrieval (FR-6) ──
console.log('\nread-only retrieval:');
assert('getFingerprint(id) returns sealed artifact',        getFingerprint(fpA.fingerprintId) === fpA);
assert('getFingerprintByExecution returns sealed artifact', getFingerprintByExecution('exec-A') === fpA);
assert('unknown id → null',                                 getFingerprint('nope') === null);

// ── idempotent seal ──
console.log('\nidempotent seal:');
assert('re-seal returns same fingerprint', sealFingerprint('exec-A') === fpA);

// ── distinct execution is a distinct, provenance-bound artifact ──
console.log('\nprovenance-bound identity:');
samples.forEach(s => recordConvergenceSample('exec-B', s));
const fpB = sealFingerprint('exec-B', prov);
assert('distinct execution → distinct fingerprintId', fpB.fingerprintId !== fpA.fingerprintId);

// ── deterministic / replay-reproducible identity (NFR) — reset + replay, runs LAST ──
// Same execution + same observed data → same identity regardless of WHEN sealed (sealedAt excluded).
console.log('\ndeterministic identity (replay):');
const hashA = fpA.contentHash, idA = fpA.fingerprintId;
_resetRegistry();
samples.forEach(s => recordConvergenceSample('exec-A', s));
const replay = sealFingerprint('exec-A', prov);
assert('replay of same execution+data → identical contentHash', replay.contentHash === hashA);
assert('replay → identical fingerprintId (sealedAt excluded)',   replay.fingerprintId === idA);

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
