// qa_canonicalrelationship.mjs — KRYL-1339 Canonical Relationship Primitive.
// Proves the mechanism (canonicalrelationship.js) against all 3 ratified types
// (ratifiedrelationshiptypes.js), using real-shaped evidence matching each producer's actual
// extraction fields (secownershipconnector.js, patentsviewmigrationproducer.js,
// rsievidencemigration.js) -- not fabricated data shapes.
//
// Run: node qa_canonicalrelationship.mjs

import { admitRelationship } from './src/engine/canonicalrelationship.js';
import './src/engine/ratifiedrelationshiptypes.js';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

// ── mechanism-level checks (generic, pre-ratification) ──────────────────────────────────────
console.log('mechanism (unregistered types, provenance, no legacy fields):');
{
  const r = admitRelationship({ part: ['A', 'B'], type: 'NOT_REGISTERED', evidence: { provenance: 'x' } }, []);
  ok('unregistered type rejects honestly', r.admitted === false && r.reason.includes('not ratified'));
}
{
  const r = admitRelationship({ part: ['A', 'B'], type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', evidence: {} }, []);
  ok('missing provenance rejects', r.admitted === false);
}

// ── Type 1: HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE (SEC 13D/13G) ───────────────────────────────
console.log('\nHAS_BENEFICIAL_OWNERSHIP_DISCLOSURE (SEC 13D/13G, secownershipconnector.js shape):');
{
  const subjectId = 'CIK:0001018724', filerId = 'CIK:0001067983';
  const a1 = { part: [subjectId, filerId], type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', nuId: {}, nuState: {},
    evidence: { provenance: { accession: '0000950123-26-001234', source: 'SEC_13D_13G' }, ts: Date.parse('2026-02-14') } };
  const r1 = admitRelationship(a1, []);
  ok('NEW on first filing', r1.admitted && r1.predicate === 'NEW');
  ok('direction subject -> filer', r1.relationship?.part?.[0] === subjectId && r1.relationship.part[1] === filerId);
  ok('phiClass Semantic', r1.relationship?.phiClass === 'Semantic');
  ok('nuId/nuState empty', JSON.stringify(r1.relationship?.nuId) === '{}' && JSON.stringify(r1.relationship?.nuState) === '{}');
  ok('no legacy eta/phi0/structuralSupport', !('eta' in (r1.relationship||{})) && !('phi0' in (r1.relationship||{})) && !('structuralSupport' in (r1.relationship||{})));

  const a2 = { ...a1, evidence: { provenance: { accession: '0000950123-26-009999' }, ts: Date.parse('2026-06-01') } };
  const r2 = admitRelationship(a2, [r1.relationship]);
  ok('second filing same pair -> PERSISTENT, same id', r2.predicate === 'PERSISTENT' && r2.relationship.id === r1.relationship.id);

  const r3 = admitRelationship({ ...a1, evidence: { provenance: {} } }, []);
  ok('missing accession rejected', r3.admitted === false);
}

// ── Type 2: SHARED_PATENT_ASSIGNMENT (inventor co-assignment) ───────────────────────────────
console.log('\nSHARED_PATENT_ASSIGNMENT (PatentsView inventor co-assignment, patentsviewmigrationproducer.js shape):');
{
  const orgA = 'ACME_LABS', orgB = 'GLOBEX_CORP', inventorId = 'inv_00042';
  const a1 = { part: [orgA, orgB], type: 'SHARED_PATENT_ASSIGNMENT', nuId: { inventorId }, nuState: {},
    evidence: { provenance: { patentIds: ['US10123456B2', 'US10987654B1'] }, ts: Date.now() } };
  const r1 = admitRelationship(a1, []);
  ok('NEW on first evidence', r1.admitted && r1.predicate === 'NEW');
  ok('phiClass Statistical', r1.relationship?.phiClass === 'Statistical');

  const reversed = { ...a1, part: [orgB, orgA], evidence: { provenance: { patentIds: ['US12000000B2'] }, ts: Date.now() } };
  const r2 = admitRelationship(reversed, [r1.relationship]);
  ok('part unordered -- same-ness holds reversed', r2.relationship.id === r1.relationship.id);

  const diffInventor = { ...a1, nuId: { inventorId: 'inv_99999' }, evidence: { provenance: { patentIds: ['US13000000B2'] }, ts: Date.now() } };
  const r3 = admitRelationship(diffInventor, [r1.relationship]);
  ok('different inventor -> different relationship (NEW)', r3.predicate === 'NEW' && r3.relationship.id !== r1.relationship.id);

  const r4 = admitRelationship({ ...a1, nuId: {} }, []);
  ok('missing inventorId rejected', r4.admitted === false);
}

// ── Type 3: ACQUIRED (Sysco/Restaurant Depot) ────────────────────────────────────────────────
console.log('\nACQUIRED (Sysco/Restaurant Depot, rsievidencemigration.js shape):');
{
  const a1 = { part: ['Sysco', 'Restaurant Depot'], type: 'ACQUIRED', nuId: {}, nuState: { dealStatus: 'PENDING' },
    evidence: { provenance: { accession: '000095014226000924' }, ts: Date.parse('2026-03-30') } };
  const r1 = admitRelationship(a1, []);
  ok('NEW, PENDING', r1.admitted && r1.predicate === 'NEW');
  ok('phiClass Semantic', r1.relationship?.phiClass === 'Semantic');
  ok('part ordered (acquirer first)', r1.relationship?.part?.[0] === 'Sysco');

  const r2 = admitRelationship({ ...a1, evidence: { provenance: { accession: 'corroborating-article-1' }, ts: Date.now() } }, [r1.relationship]);
  ok('repeat same status -> PERSISTENT, same id', r2.predicate === 'PERSISTENT' && r2.relationship.id === r1.relationship.id);

  const closed = { ...a1, nuState: { dealStatus: 'CLOSED' }, evidence: { provenance: { accession: '0000950123-27-005555' }, ts: Date.now() } };
  const r3 = admitRelationship(closed, [r1.relationship]);
  ok('PENDING -> CLOSED -> RECONFIGURED, same id', r3.predicate === 'RECONFIGURED' && r3.relationship.id === r1.relationship.id);

  const pendingDeal = { part: ['AcquirerX', 'TargetY'], type: 'ACQUIRED', nuId: {}, nuState: { dealStatus: 'PENDING' }, evidence: { provenance: { accession: 'acc-1' }, ts: Date.now() } };
  const r4a = admitRelationship(pendingDeal, []);
  const terminated = { ...pendingDeal, nuState: { dealStatus: 'TERMINATED' }, evidence: { provenance: { accession: 'acc-2-termination' }, ts: Date.now() } };
  const r4b = admitRelationship(terminated, [r4a.relationship]);
  ok('PENDING -> TERMINATED -> DISSOLVED, same id', r4b.predicate === 'DISSOLVED' && r4b.relationship.id === r4a.relationship.id);

  const deal1 = { part: ['CompanyA', 'CompanyB'], type: 'ACQUIRED', nuId: { transactionId: 'deal-2024' }, nuState: { dealStatus: 'TERMINATED' }, evidence: { provenance: { accession: 'acc-old' }, ts: 1 } };
  const r5a = admitRelationship(deal1, []);
  const deal2 = { part: ['CompanyA', 'CompanyB'], type: 'ACQUIRED', nuId: { transactionId: 'deal-2026' }, nuState: { dealStatus: 'PENDING' }, evidence: { provenance: { accession: 'acc-new' }, ts: 2 } };
  const r5b = admitRelationship(deal2, [r5a.relationship]);
  ok('different transactionId -> different relationship (NEW)', r5b.predicate === 'NEW' && r5b.relationship.id !== r5a.relationship.id);

  const r6 = admitRelationship({ ...a1, nuState: { dealStatus: 'BOGUS' } }, []);
  ok('invalid dealStatus rejected', r6.admitted === false);

  ok('no legacy eta/phi0/structuralSupport', !('eta' in (r1.relationship||{})) && !('phi0' in (r1.relationship||{})) && !('structuralSupport' in (r1.relationship||{})));
}

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
