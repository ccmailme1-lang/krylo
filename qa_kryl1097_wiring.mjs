// qa_kryl1097_wiring.mjs
// KRYL-1097 integration — validates the PRODUCER wire through the real oraclesignal path,
// not synthetic store calls. Threshold-agnostic: compares the sealed fingerprint against the
// convergence states normalizeToOracleSignal actually emits.

import { normalizeToOracleSignal } from './src/engine/oraclesignal.js';
import { sealFingerprint, getFingerprintByExecution, _resetRegistry } from './src/engine/convergencefingerprint.js';

let pass = 0, fail = 0;
const assert = (name, cond) => { cond ? (pass++, console.log(`  ✓ ${name}`)) : (fail++, console.log(`  ✗ ${name}`)); };

const dedupe = arr => arr.filter((s, i) => i === 0 || s !== arr[i - 1]);
const sig = (id, f, fs) => ({ id, fidelity_components: { m_checksum: f, t_telemetry: f, e_viral: f, docs: f, voice: f }, fs });

console.log('KRYL-1097 — producer wiring (live oraclesignal path)\n');

// ── display/hysteresis path records; capture what the live function emits ──
_resetRegistry();
console.log('display path captures live convergence states:');
const inputs = [sig('sig-1', 0.0, 0.1), sig('sig-1', 0.95, 0.85), sig('sig-1', 0.95, 0.85), sig('sig-1', 0.5, 0.5)];
const observed = inputs.map(s => normalizeToOracleSignal(s, { applyHysteresis: true }).state);
const expected = dedupe(observed);
const fp = sealFingerprint('sig-1', { analysisId: 'live-run' });
assert('trajectory == deduped live states', fp.trajectory.map(t => t.state).join('|') === expected.join('|'));
assert('consecutive-identical state deduped', fp.sampleCount === expected.length && observed.length > expected.length);
console.log(`     observed: ${observed.join(' → ')}`);
console.log(`     sealed:   ${fp.trajectory.map(t => t.state).join(' → ')}`);

// ── bulk path (applyHysteresis:false) must NOT record — flood guard ──
console.log('\nbulk path does not record (flood guard):');
for (const f of [0.1, 0.4, 0.9]) normalizeToOracleSignal(sig('bulk-1', f, f), { applyHysteresis: false });
const bulkFp = sealFingerprint('bulk-1');
assert('bulk normalization recorded nothing', bulkFp.sampleCount === 0);

// ── unidentified signal (no id) records nothing ──
console.log('\nunidentified signal skipped:');
normalizeToOracleSignal({ fidelity_components: { m_checksum: 0.9, t_telemetry: 0.9, e_viral: 0.9 }, fs: 0.8 }, { applyHysteresis: true });
const anon = getFingerprintByExecution(undefined);
assert('no fingerprint for id-less signal', anon === null);

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
