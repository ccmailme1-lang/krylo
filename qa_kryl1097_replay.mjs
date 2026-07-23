// qa_kryl1097_replay.mjs
// KRYL-1097 integration — seal trigger + replay exposure.
// Drives the producer live, then commits via lineage.buildEnvelope (the completion event) and
// asserts the sealed convergence fingerprint rides the immutable replay envelope as read-only
// metadata (FR-6), provenance-linked to the analysis (FR-4).

import { normalizeToOracleSignal } from './src/engine/oraclesignal.js';
import { buildEnvelope } from './src/engine/lineage.js';
import { getFingerprintByExecution, _resetRegistry } from './src/engine/convergencefingerprint.js';

let pass = 0, fail = 0;
const assert = (name, cond) => { cond ? (pass++, console.log(`  ✓ ${name}`)) : (fail++, console.log(`  ✗ ${name}`)); };
const sig = (id, f, fs) => ({ id, fidelity_components: { m_checksum: f, t_telemetry: f, e_viral: f, docs: f, voice: f }, fs });

const tensor = {
  arbitration: { requestId: 'req-77', modelVersion: 'v1', survivors: [{ id: 's1', score: 0.8 }], featureVectorHash: 'fvh', scoreVector: [0.8, 0.6] },
  seedQuery: 'test q', lens: 'INVESTOR', domain: 'CAPITAL', horizon: 'MED', floor: 0.3, domains: ['CAPITAL'],
};
const commitEvent = { type: 'COMMIT', requestId: 'req-77', candidateId: 'c1', score: 0.8, nextBest: 0.6, timestamp: 123 };

console.log('KRYL-1097 — seal trigger + replay exposure\n');

_resetRegistry();
// producer: observe convergence for a signal across the session (live path)
normalizeToOracleSignal(sig('sig-X', 0.0, 0.1),  { applyHysteresis: true });
normalizeToOracleSignal(sig('sig-X', 0.95, 0.85), { applyHysteresis: true });

// completion event: commit → buildEnvelope seals open trajectories + exposes on the envelope
const env = buildEnvelope(tensor, commitEvent);

console.log('seal at commit + replay exposure:');
assert('envelope carries convergenceFingerprints',      Array.isArray(env.convergenceFingerprints) && env.convergenceFingerprints.length === 1);
assert('envelope is frozen (replay artifact immutable)', Object.isFrozen(env));
assert('fingerprint collection is frozen',              Object.isFrozen(env.convergenceFingerprints));

const fp = env.convergenceFingerprints[0];
assert('fingerprint is frozen',                         Object.isFrozen(fp));
assert('provenance.executionId links the signal',       fp.provenance.executionId === 'sig-X');
assert('provenance.analysisId links the analysis (requestId)', fp.provenance.analysisId === 'req-77');
assert('trajectory captured >= 1 state',                fp.sampleCount >= 1);

console.log('\nsealed + retrievable, open cleared:');
assert('getFingerprintByExecution returns the sealed fp', getFingerprintByExecution('sig-X') === fp);

console.log(`\n     replay fingerprint: ${fp.trajectory.map(t => t.state).join(' → ')}`);
console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
