// qa_cf_persistence.mjs — CF production-readiness WS2 (persistence) + WS3 (cross-session).
//
// Validates:
//   WS2  reload-determinism  — serialize → hydrate → replay produces identical
//        identity / admission decisions vs a no-reload run.
//   WS2  compaction          — compact() preserves reconstructibility (X4): identity,
//        termination, topology retained; only recoverable payload dropped; reconstruct()
//        still complete for participating domains.
//   WS3  X5 across a reload   — a stale pathway carried through serialize/hydrate CANNOT
//        become admission evidence until genuinely re-corroborated.
//
// Run: node qa_cf_persistence.mjs

import {
  resetFabric, ingest, admissibleParticles, admissionByPathway, recordConvergence,
  reconstruct, serialize, hydrate, compact, tierByPathway, pathwayCount,
} from './src/engine/cf/pathwaystore.js';
import { inferFormation } from './src/engine/formationinference.js';

const mk = (domain, mag, extra = {}) => ({ domain, confidence: Math.round(mag * 100), polarity: 'constructive', ts: 0, ...extra });
const sig = () => admissibleParticles().map(p => `${p.domain}:${Math.round((p.confidence ?? p.magnitude * 100))}`).sort().join(',');
const fmt = f => (f ? [...new Set(f.participatingDomains)].sort().join('+') : '—');

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); else console.log('  ✓ ' + m); };

// three connected legs (Tier-A dependsOn chain) + an unconnected decoy
const BATCHES = [
  [ mk('OWNERSHIP', 0.55, { obsId: 'o1', subject: 's1' }), mk('LABOR', 0.50, { obsId: 'L0' }) ],
  [ mk('MEDIA',     0.55, { obsId: 'o2', subject: 's1', dependsOn: 'o1' }), mk('LABOR', 0.50, { obsId: 'L1', dependsOn: 'L0' }) ],
  [ mk('CAPITAL',   0.50, { obsId: 'o3', subject: 's1', dependsOn: 'o2' }) ],
];

// ── WS2: reload-determinism ───────────────────────────────────────────────
console.log('\nWS2 — reload-determinism\n');
function runNoReload() {
  resetFabric();
  const trace = [];
  for (const b of BATCHES) {
    ingest(b);
    const f = inferFormation(admissibleParticles());
    if (f) recordConvergence(f.participatingDomains);
    trace.push(`${sig()} | ${fmt(f)} | ${JSON.stringify(admissionByPathway())}`);
  }
  return trace;
}
function runWithReload() {
  resetFabric();
  const trace = [];
  let snap = null;
  for (const b of BATCHES) {
    if (snap) { resetFabric(); hydrate(snap); }
    ingest(b);
    const f = inferFormation(admissibleParticles());
    if (f) recordConvergence(f.participatingDomains);
    trace.push(`${sig()} | ${fmt(f)} | ${JSON.stringify(admissionByPathway())}`);
    snap = serialize();
  }
  return trace;
}
const a = runNoReload();
const b = runWithReload();
a.forEach((line, i) => console.log(`  b${i}  ${line}`));
ok(JSON.stringify(a) === JSON.stringify(b),
   'serialize→hydrate→replay is byte-identical to a no-reload run (IS-1 determinism across storage)');

// snapshot round-trips without loss of structural fields
{
  resetFabric();
  for (const bt of BATCHES) ingest(bt);
  const s1 = serialize();
  resetFabric(); hydrate(s1);
  const s2 = serialize();
  ok(JSON.stringify(s1) === JSON.stringify(s2), 'snapshot is a fixed point (hydrate∘serialize = identity)');
  ok(s1.version === 'cf-pathwaystore/1', 'snapshot carries an explicit version');
}

// ── WS2: compaction preserves reconstructibility (X4) ─────────────────────
console.log('\nWS2 — compaction (X4: compact reconstructible history, never delete)\n');
{
  resetFabric();
  for (const bt of BATCHES) ingest(bt);
  // age the fabric past COMPACT_AFTER with unrelated activity
  for (let i = 0; i < 10; i++) ingest([ mk('TECHNOLOGY', 0.50, { obsId: `t${i}`, dependsOn: i ? `t${i-1}` : undefined }) ]);
  const before = { count: pathwayCount(), recon: reconstruct(['OWNERSHIP', 'MEDIA', 'CAPITAL']).complete };
  const res = compact();
  const s = serialize();
  const own = s.pathways.find(p => p.lineageKey === 'ownership');
  const labor = s.pathways.find(p => p.lineageKey === 'labor');

  ok(pathwayCount() === before.count, `compact() removed 0 pathways (${res.compacted} compacted, ${res.eventsDropped} interior events collapsed) — no deletion (X4)`);
  ok(reconstruct(['OWNERSHIP', 'MEDIA', 'CAPITAL']).complete === true,
     'reconstruct() still complete for participating domains after compaction (CF-002 §23)');
  ok(labor && labor.compacted && labor.compacted.droppedPayload === true,
     'the stale LABOR decoy pathway was compacted (payload dropped)');
  ok(labor && labor.pathway_id && labor.lineageKey === 'labor' && Array.isArray(labor.domains),
     'compacted pathway retains identity (pathway_id, lineageKey, domains)');
  ok(labor && labor.lineage[0] && labor.lineage[0].event_type === 'OBSERVATION_CREATED',
     'compacted pathway retains its origin event');
  ok(labor && (labor.sealed ? !!labor.terminationEvent : true),
     'a sealed compacted pathway retains its termination event');
  ok(own && own.lineage.some(e => e.provenance && Array.isArray(e.provenance.derives_from)),
     'compacted pathway retains the derives_from topology');
  ok(labor && labor.lineage.every(e => e._particle === undefined),
     'compacted observations carry no _particle payload (recoverable from the connector log)');
}

// ── WS3: X5 across a reload ───────────────────────────────────────────────
console.log('\nWS3 — X5 firewall survives a reload (stale pathway ≠ admission evidence)\n');
{
  resetFabric();
  ingest([ mk('LABOR', 0.60, { obsId: 'x0' }) ]);
  ingest([ mk('LABOR', 0.60, { obsId: 'x1', dependsOn: 'x0' }) ]);
  ingest([ mk('LABOR', 0.60, { obsId: 'x2', dependsOn: 'x1' }) ]);   // LABOR strong, corroborated b2
  const snap = serialize();

  resetFabric(); hydrate(snap);                                       // reload — LABOR is stale
  ingest([ mk('CAPITAL', 0.55, { obsId: 'c0' }), mk('OWNERSHIP', 0.55, { obsId: 'w0' }) ]);  // b3, fresh
  const adm = admissionByPathway();
  const parts = admissibleParticles().map(p => p.domain);
  const f = inferFormation(admissibleParticles());

  ok(adm['p1_labor'] === false, 'reloaded stale LABOR pathway is NOT admission-eligible (X5)');
  ok(!parts.includes('LABOR'), 'no LABOR particle in the admission set after reload');
  ok(f && [...new Set(f.participatingDomains)].sort().join('+') === 'CAPITAL+OWNERSHIP',
     'post-reload formation is CAPITAL+OWNERSHIP only — the stale decoy did not leak (FP=0)');
  // re-corroborate LABOR → now it legitimately re-enters
  ingest([ mk('LABOR', 0.55, { obsId: 'x3', dependsOn: 'x2' }) ]);
  ok(admissionByPathway()['p1_labor'] === true, 'a re-corroborated reloaded pathway does re-enter admission (not permanently sealed)');
}

// ── verdict ──────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(80));
if (fails.length) {
  console.log(`WS2/WS3: ${fails.length} FAILED`);
  for (const f of fails) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log('WS2 (persistence) + WS3 (cross-session) — ALL CHECKS PASS');
process.exit(0);
