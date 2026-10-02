// qa_canonicalrelationshipprojection.mjs — KRYL-1340 Typed-Edge Projection Layer.
// Proves: the direction transform for HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE, no-duplicate
// projection on repeat/PERSISTENT evidence, deterministic unordered-part projection for
// SHARED_PATENT_ASSIGNMENT, graceful rejection of an unratified type, and the actual shipped
// rsievidencemigration.js module working end-to-end through the new pipeline (not a
// reconstruction of it).
//
// Run: node qa_canonicalrelationshipprojection.mjs

import { admitAndProject } from './src/engine/canonicalrelationshipprojection.js';
import './src/engine/ratifiedrelationshiptypes.js';
import { findPath, TYPED_EDGES, nodeId } from './src/engine/entitytopologyregistry.js';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

console.log('HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE -- direction transform:');
{
  const subjectCik = '0001018724', subjectName = 'AMAZON COM INC';
  const filerCik = '0001067983', filerName = 'BERKSHIRE HATHAWAY INC';
  const subjectId = nodeId(subjectCik, subjectName), filerId = nodeId(filerCik, filerName);

  const r = admitAndProject(
    { part: [subjectId, filerId], type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', nuId: {}, nuState: {},
      evidence: { provenance: { accession: '0000950123-26-001234' }, ts: Date.now() } },
    { subjectCik, subjectName, filerCik, filerName, source: 'SEC_13D_13G' }
  );
  ok('admitted NEW', r.admitted && r.predicate === 'NEW');
  ok('canonical ρ.part stays ratified order [subject, filer]', r.relationship.part[0] === subjectId);
  const edge = TYPED_EDGES.find(e => e.type === 'BENEFICIAL_OWNER_OF' && e.from === filerId && e.to === subjectId);
  ok('typed edge transformed to from=filer, to=subject', !!edge);
  const path = findPath(filerId, subjectId);
  ok('findPath sees FORWARD from filer (existing consumer convention preserved)', path.found && path.hops[0]?.relation?.directed === 'FORWARD');
}

console.log('\nSHARED_PATENT_ASSIGNMENT -- deterministic unordered projection, no duplicate edges:');
{
  const r1 = admitAndProject(
    { part: ['ACME_LABS', 'GLOBEX_CORP'], type: 'SHARED_PATENT_ASSIGNMENT', nuId: { inventorId: 'inv_1' }, nuState: {},
      evidence: { provenance: { patentIds: ['US1'] }, ts: Date.now() } },
    { orgA: 'ACME_LABS', orgAName: 'Acme Labs', orgB: 'GLOBEX_CORP', orgBName: 'Globex Corp', source: 'PATENTSVIEW' }
  );
  const r2 = admitAndProject(
    { part: ['GLOBEX_CORP', 'ACME_LABS'], type: 'SHARED_PATENT_ASSIGNMENT', nuId: { inventorId: 'inv_1' }, nuState: {},
      evidence: { provenance: { patentIds: ['US2'] }, ts: Date.now() } },
    { orgA: 'GLOBEX_CORP', orgAName: 'Globex Corp', orgB: 'ACME_LABS', orgBName: 'Acme Labs', source: 'PATENTSVIEW' }
  );
  ok('reversed input order -> same relationship (PERSISTENT), same id', r2.predicate === 'PERSISTENT' && r2.relationship.id === r1.relationship.id);
  const edges = TYPED_EDGES.filter(e => e.type === 'SHARED_PATENT_ASSIGNMENT');
  ok('only ONE typed edge written despite 2 admissions (no duplicate-on-PERSISTENT)', edges.length === 1);
}

console.log('\nUnratified type -- graceful rejection:');
{
  const before = TYPED_EDGES.length;
  const r = admitAndProject({ part: ['A', 'B'], type: 'NOT_A_REAL_TYPE', nuId: {}, nuState: {}, evidence: { provenance: { accession: 'x' } } }, {});
  ok('rejected, no throw', r.admitted === false);
  ok('no edge written', TYPED_EDGES.length === before);
}

console.log('\nReal shipped rsievidencemigration.js -- end-to-end through the new pipeline:');
{
  await import('./src/engine/producers/rsievidencemigration.js'); // runs on import, as it always has
  const edge = TYPED_EDGES.find(e => e.type === 'ACQUIRED' && e.source === 'SEC_425');
  ok('real module produced an ACQUIRED typed edge', !!edge);
  // CIK:0000096021, not CIK:96021 -- nodeId() zero-pads to 10 digits (KRYL-1341 fix, see
  // entitytopologyregistry.js), matching entityresolution.js's registry convention.
  ok('direction acquirer(Sysco)->target(Restaurant Depot)', edge?.from === 'CIK:0000096021');
}

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
