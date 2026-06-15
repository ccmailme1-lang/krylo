// qa_phase_b_validation.mjs
// Validates Phase-A-COMPLETE + WO-1721 work orders by checking file existence
// and presence of key symbols/exports declared in each WO spec.
// Run: node qa_phase_b_validation.mjs

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));

let passed = 0;
let failed = 0;
const failures = [];

function file(rel) {
  return resolve(ROOT, rel);
}

function check(wo, label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.log(`  ✗  ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
    failures.push(`${wo}: ${label}`);
  }
}

function hasFile(rel) {
  return existsSync(file(rel));
}

function contains(rel, ...terms) {
  if (!existsSync(file(rel))) return false;
  const src = readFileSync(file(rel), 'utf8');
  return terms.every(t => src.includes(t));
}

// ─── WO-1026: Character-Level Traceability ───────────────────────────────────
console.log('\nWO-1026 — Character-Level Traceability');
check('WO-1026', 'oraclesignal.js exists',              hasFile('src/engine/oraclesignal.js'));
check('WO-1026', 'traceability[] in oraclesignal',      contains('src/engine/oraclesignal.js', 'traceability'));
check('WO-1026', 'auditworkspace.jsx exists',           hasFile('src/components/audit/auditworkspace.jsx'));
check('WO-1026', 'TraceabilityChain in auditworkspace', contains('src/components/audit/auditworkspace.jsx', 'TraceabilityChain'));
check('WO-1026', 'oracleview span count indicator',     contains('src/components/oracleview.jsx', 'traceability'));

// ─── WO-1029: Signal Foresight Layer ─────────────────────────────────────────
console.log('\nWO-1029 — Signal Foresight Layer');
check('WO-1029', 'foresight_pipeline.js exists',        hasFile('src/engine/foresight_pipeline.js'));
check('WO-1029', 'calculateTemporalCoherence exported', contains('src/engine/foresight_pipeline.js', 'calculateTemporalCoherence'));
check('WO-1029', 'ForesightPanel in tenkvault.jsx',     contains('src/components/tenkvault.jsx', 'ForesightPanel'));

// ─── WO-1031: Revenue Signal Bridge ──────────────────────────────────────────
console.log('\nWO-1031 — Revenue Signal Bridge');
check('WO-1031', 'revenuesignal.jsx exists',        hasFile('src/components/spine/revenuesignal.jsx'));
check('WO-1031', 'ADV in revenuesignal',            contains('src/components/spine/revenuesignal.jsx', 'ADV'));
check('WO-1031', 'intelligencebrief.jsx has CAC',   contains('src/components/analysis/intelligencebrief.jsx', 'CAC'));
check('WO-1031', 'intelligencebrief.jsx has ROAS',  contains('src/components/analysis/intelligencebrief.jsx', 'ROAS'));

// ─── WO-1032: Foresight Engine ────────────────────────────────────────────────
console.log('\nWO-1032 — Foresight Engine');
check('WO-1032', 'foresight_pipeline.js exists', hasFile('src/engine/foresight_pipeline.js'));

// ─── WO-1034: PLI Engine ─────────────────────────────────────────────────────
console.log('\nWO-1034 — PLI Engine');
check('WO-1034', 'pliengine.js exists', hasFile('src/engine/pliengine.js'));

// ─── WO-1102: ETR Stream Handshake ───────────────────────────────────────────
console.log('\nWO-1102 — ETR Stream Handshake');
check('WO-1102', 'usesignalstream.js exists',         hasFile('src/hooks/usesignalstream.js'));
check('WO-1102', 'DEFAULT_SIGNAL defined',            contains('src/hooks/usesignalstream.js', 'DEFAULT_SIGNAL'));
check('WO-1102', 'exponential backoff present',       contains('src/hooks/usesignalstream.js', 'backoff'));

// ─── WO-1125: Signal Positioning Engine ──────────────────────────────────────
console.log('\nWO-1125 — Signal Positioning Engine');
check('WO-1125', 'positioningengine.js exists',         hasFile('src/engine/positioningengine.js'));
check('WO-1125', 'computePositionVector exported',      contains('src/engine/positioningengine.js', 'computePositionVector'));
check('WO-1125', 'validatePositionVector exported',     contains('src/engine/positioningengine.js', 'validatePositionVector'));
check('WO-1125', 'SOURCE_TIER_REACH present',           contains('src/engine/positioningengine.js', 'SOURCE_TIER_REACH'));

// ─── WO-1317: Analysis P2 — OracleEngine ─────────────────────────────────────
console.log('\nWO-1317 — Analysis P2 OracleEngine');
check('WO-1317', 'oracleengine.jsx exists',          hasFile('src/components/analysis/oracleengine.jsx'));
check('WO-1317', 'ALIGNED tension state',            contains('src/components/analysis/oracleengine.jsx', 'ALIGNED'));
check('WO-1317', 'FRACTURE tension state',           contains('src/components/analysis/oracleengine.jsx', 'FRACTURE'));
check('WO-1317', 'UNVERIFIED tension state',         contains('src/components/analysis/oracleengine.jsx', 'UNVERIFIED'));

// ─── WO-1336: Causal Inference OS ────────────────────────────────────────────
console.log('\nWO-1336 — Causal Inference OS');
check('WO-1336', 'causalos/index.js exists',         hasFile('src/engine/causalos/index.js'));
check('WO-1336', 'substrate.js exists',              hasFile('src/engine/causalos/substrate.js'));
check('WO-1336', 'vectorengine.js exists',           hasFile('src/engine/causalos/vectorengine.js'));
check('WO-1336', 'provenance.js exists',             hasFile('src/engine/causalos/provenance.js'));
check('WO-1336', 'CausalInferenceOS exported',       contains('src/engine/causalos/index.js', 'CausalInferenceOS'));

// ─── WO-1339: Resonance Path ─────────────────────────────────────────────────
console.log('\nWO-1339 — Resonance Path');
check('WO-1339', 'ResonancePath or causal chain in conemap',
  contains('src/components/spine/conemap.jsx', 'resonance') ||
  contains('src/components/spine/conemap.jsx', 'Resonance') ||
  contains('src/modules/conemap/ConeMap.jsx',  'Resonance') ||
  contains('src/modules/conemap/ConeMap.jsx',  'resonance'));

// ─── WO-1340: Entity Signal Injection ────────────────────────────────────────
console.log('\nWO-1340 — Entity Signal Injection');
check('WO-1340', 'useEntitySignal.js exists',       hasFile('src/hooks/useEntitySignal.js'));
check('WO-1340', 'useEntitySignal wired in conemap', contains('src/components/spine/conemap.jsx', 'useEntitySignal'));
check('WO-1340', 'useEntitySignal wired in targetpacket', contains('src/components/analysis/targetpacket.jsx', 'useEntitySignal'));

// ─── WO-1343: SpatialLens ────────────────────────────────────────────────────
console.log('\nWO-1343 — SpatialLens');
check('WO-1343', 'signalmaplayer.jsx exists',   hasFile('src/components/analysis/signalmaplayer.jsx'));
check('WO-1343', 'geometry present',            contains('src/components/analysis/signalmaplayer.jsx', 'Geometry'));

// ─── WO-1365: Acquisition Broker ─────────────────────────────────────────────
console.log('\nWO-1365 — Acquisition Broker');
check('WO-1365', 'acquisitionbroker.js exists',        hasFile('src/engine/acquisitionbroker.js'));
check('WO-1365', 'processAcquisition exported',        contains('src/engine/acquisitionbroker.js', 'processAcquisition'));
check('WO-1365', 'Fs gate (0.50) present',             contains('src/engine/acquisitionbroker.js', '0.50'));
check('WO-1365', 'VALIDATED state present',            contains('src/engine/acquisitionbroker.js', 'VALIDATED'));
check('WO-1365', 'BLOCKED state present',              contains('src/engine/acquisitionbroker.js', 'BLOCKED'));

// ─── WO-1721: Kalshi Live Endpoint ───────────────────────────────────────────
console.log('\nWO-1721 — Kalshi Live Endpoint');
check('WO-1721', 'usekalshisignals.js exists',          hasFile('src/hooks/usekalshisignals.js'));
check('WO-1721', 'dispatchBatch wired',                 contains('src/hooks/usekalshisignals.js', 'dispatchBatch'));
check('WO-1721', '/api/kalshi/signals route in engine', contains('as-diff/engine.js', '/api/kalshi/signals'));
check('WO-1721', 'CATEGORY_DOMAIN map in engine',       contains('as-diff/engine.js', 'CATEGORY_DOMAIN'));
check('WO-1721', 'buildEventDomainMap in engine',       contains('as-diff/engine.js', 'buildEventDomainMap'));

// ─── WO-1725: Entity Attribution ─────────────────────────────────────────────
console.log('\nWO-1725 — Single-Entity Signal Injection (Musk Protocol)');
check('WO-1725', 'entityattribution.js exists',          hasFile('src/engine/entityattribution.js'));
check('WO-1725', 'attributeEntityToSignals exported',    contains('src/engine/entityattribution.js', 'attributeEntityToSignals'));
check('WO-1725', 'footprint check present',              contains('src/engine/entityattribution.js', 'footprint'));
check('WO-1725', 'attentionstack wired',
  contains('src/components/surface/attentionstack.jsx', 'entity') ||
  contains('src/components/surface/attentionstack.jsx', 'Entity'));

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`RESULT: ${passed} PASS / ${failed} FAIL`);
if (failures.length) {
  console.log('\nFAILED:');
  failures.forEach(f => console.log('  ✗ ' + f));
  process.exit(1);
} else {
  console.log('ALL PASS — registry may be updated to COMPLETE.');
}
