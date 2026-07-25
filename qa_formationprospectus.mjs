// qa_formationprospectus.mjs — KRYL-1117 Prospectus Assembly.
// Proves: 12 sections in spec order; grounded-or-withhold correctness; §22 no fabricated numbers
// (every grounded value traces to the formation); null formation → fully-withheld prospectus; frozen.

import { inferFormation } from './src/engine/formationinference.js';
import { buildFormationProspectus } from './src/engine/formationprospectus.js';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

const P = (domain, confidence, polarity = 'constructive', ts = 1) => ({ domain, confidence, polarity, ts });

const ORDER = [
  'STRUCTURAL_IDENTITY', 'EXECUTIVE_STRUCTURAL_ASSESSMENT', 'FORMATION_ANATOMY', 'STRUCTURAL_FIELD',
  'FORMATION_PROPERTIES', 'STRUCTURAL_RELATIONSHIPS', 'FORMATION_RESONANCE', 'STRUCTURAL_DRIFT',
  'PRESSURE_MAP', 'FORMATION_TRAJECTORY', 'EVIDENCE_FOUNDATION', 'STRUCTURAL_INTELLIGENCE_CONCLUSION',
];
const GROUNDED = new Set(['STRUCTURAL_IDENTITY','EXECUTIVE_STRUCTURAL_ASSESSMENT','FORMATION_ANATOMY',
  'FORMATION_PROPERTIES','STRUCTURAL_RELATIONSHIPS','PRESSURE_MAP','EVIDENCE_FOUNDATION','STRUCTURAL_INTELLIGENCE_CONCLUSION']);
const WITHHELD = new Set(['STRUCTURAL_FIELD','FORMATION_RESONANCE','STRUCTURAL_DRIFT','FORMATION_TRAJECTORY']);

console.log('Prospectus Assembly\n');

// ── asserted formation ──
const f = inferFormation([P('TECHNOLOGY', 80), P('CAPITAL', 80), P('MEDIA', 80, 'fracture')], { now: 1 });
const pr = buildFormationProspectus(f, { now: 1000, windowMs: 300000 });
const byId = Object.fromEntries(pr.sections.map(s => [s.id, s]));

console.log('grounded formation:');
ok('title/layer/live', pr.title === 'Structural Intelligence Prospectus' && pr.layer === 'SELL' && pr.live === true);
ok('12 sections', pr.sections.length === 12);
ok('sections in spec order', pr.sections.map(s => s.id).join(',') === ORDER.join(','));
ok('header state = E band', pr.header.state === 'EMERGING'); // E≈0.333 → EMERGING
ok('header existence === formation.existence (full precision, §22 no fabrication)', pr.header.existence === f.existence);
ok('header coverage = 3/6 = 0.5', pr.header.coverage === 0.5);
ok('header evidenceCount = 3', pr.header.evidenceCount === 3);
ok('prospectus + sections frozen', Object.isFrozen(pr) && Object.isFrozen(pr.sections) && pr.sections.every(Object.isFrozen));

console.log('\nper-section grounded/withheld:');
for (const id of ORDER) {
  const s = byId[id];
  const expect = GROUNDED.has(id) ? 'GROUNDED' : 'WITHHELD';
  ok(`${id}: ${s.state} (expected ${expect})`, s.state === expect);
}

console.log('\n§22 — grounded values trace to the formation (no invented numbers):');
ok('PROPERTIES existence/C/Q/Ḡ match engine',
   byId.FORMATION_PROPERTIES.existence === f.existence &&
   byId.FORMATION_PROPERTIES.cohesion === f.cohesion &&
   byId.FORMATION_PROPERTIES.pressureCoherence === f.pressureCoherence &&
   byId.FORMATION_PROPERTIES.avgGroundedness === f.avgGroundedness);
ok('EXEC fingerprint existence === engine', byId.EXECUTIVE_STRUCTURAL_ASSESSMENT.fingerprint.existence === f.existence);
ok('EVIDENCE basis.evidenceCount === particles', byId.EVIDENCE_FOUNDATION.basis.evidenceCount === f.particles.length);
ok('RELATIONSHIPS edges === graph edges', byId.STRUCTURAL_RELATIONSHIPS.edges === f.graph.edges);
ok('withheld sections carry absence + reason',
   [...WITHHELD].every(id => byId[id].absence && byId[id].reason));
ok('TRAJECTORY absence is TEMPORAL', byId.FORMATION_TRAJECTORY.absence === 'TEMPORAL');

// ── DRIFT grounds when a divergence is supplied ──
console.log('\ndrift wiring:');
const withDrift = buildFormationProspectus(f, { drift: { lens: 'DRIFT', withheld: false, direction: 'STRUCTURE_LEADS', margin: 0.3, relationship: 'X' } });
const driftSec = withDrift.sections.find(s => s.id === 'STRUCTURAL_DRIFT');
ok('STRUCTURAL_DRIFT grounds with a divergence', driftSec.state === 'GROUNDED');

// ── null formation → fully withheld prospectus ──
console.log('\nnull formation (no subject):');
const empty = buildFormationProspectus(null, { now: 2 });
ok('live false', empty.live === false);
ok('header INSUFFICIENT', empty.header.state === 'INSUFFICIENT SIGNAL');
ok('existence null (not 0)', empty.header.existence === null);
ok('12 sections, all withheld', empty.sections.length === 12 && empty.sections.every(s => s.state === 'WITHHELD'));
ok('no fabricated numbers anywhere in a dead prospectus',
   empty.sections.every(s => s.existence === undefined && s.value === undefined));

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
