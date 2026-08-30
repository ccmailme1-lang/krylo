// qa_patentsviewmigrationproducer.mjs — golden set for
// src/engine/producers/patentsviewmigrationproducer.js (M7 contract validation).
// No network. No live connector import. Run: node qa_patentsviewmigrationproducer.mjs

import { extractMigrationCandidates } from './src/engine/producers/patentsviewmigrationproducer.js';

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else      { fail++; console.log(`  ✗ ${label}`); }
}

// Real API response shape (patent_id, assignees[].assignee_organization, inventors[].inventor_id)
// — field names transcribed from the actual query in patentsviewconnector.js, not invented.
const patent = (id, org, inventorIds) => ({
  patent_id: id,
  assignees: [{ assignee_organization: org }],
  inventors: inventorIds.map(inventor_id => ({ inventor_id })),
});

console.log('\n=== Positive case: a real 2-organization migration ===');
{
  // Inventor INV_1 has 2 patents at OrgB (destination, higher count) and 1 at OrgA (source).
  const patents = [
    patent('P1', 'Org A Inc', ['INV_1']),
    patent('P2', 'Org B LLC', ['INV_1']),
    patent('P3', 'Org B LLC', ['INV_1']),
  ];
  const result = extractMigrationCandidates(patents, 5000);
  check('exactly one candidate produced', result.length === 1);
  const rc = result[0];
  check('sourceId is normalized Org A', rc.sourceId === 'ORG_A_INC');
  check('targetId is normalized Org B (higher patent count)', rc.targetId === 'ORG_B_LLC');
  check('relationType is COUPLED_WITH', rc.relationType === 'COUPLED_WITH');
  check('RelationCore is frozen (real schema validation ran)', Object.isFrozen(rc));
  check('provenanceHash is present and non-empty', typeof rc.provenanceHash === 'string' && rc.provenanceHash.length > 0);
  check('createdAt matches evidence window', rc.createdAt === 5000);
  check('eta in (0,1]', rc.eta > 0 && rc.eta <= 1);
  check('phi0 in [0,1]', rc.phi0 >= 0 && rc.phi0 <= 1);
  check('phi0 reflects dest dominance (2 of 3 patents = 0.667)', Math.abs(rc.phi0 - (2 / 3)) < 1e-9);
}

console.log('\n=== Negative case: single-organization inventor -> NO relationship ===');
{
  const patents = [
    patent('P1', 'Org A Inc', ['INV_2']),
    patent('P2', 'Org A Inc', ['INV_2']),
    patent('P3', 'Org A Inc', ['INV_2']),
  ];
  const result = extractMigrationCandidates(patents, 5000);
  check('zero candidates — no fabricated relationship from single-org evidence', result.length === 0);
}

console.log('\n=== Negative case: empty evidence -> NO relationship, no throw ===');
{
  check('empty array produces zero candidates', extractMigrationCandidates([], 5000).length === 0);
  check('null/undefined input does not throw', (() => {
    try { extractMigrationCandidates(undefined, 5000); return true; } catch { return false; }
  })());
}

console.log('\n=== Malformed evidence: skipped, never defaulted ===');
{
  const patents = [
    { patent_id: 'P1', assignees: [{}], inventors: [{ inventor_id: 'INV_3' }] }, // missing org
    { patent_id: null, assignees: [{ assignee_organization: 'Org X' }], inventors: [{ inventor_id: 'INV_3' }] }, // missing patent_id
    { patent_id: 'P2', assignees: [{ assignee_organization: 'Org Y' }], inventors: [{}] }, // missing inventor_id
  ];
  const result = extractMigrationCandidates(patents, 5000);
  check('all malformed records skipped, zero candidates (not defaulted into a fake relationship)', result.length === 0);
}

console.log('\n=== Determinism: identical evidence -> identical output, including provenanceHash ===');
{
  const patents = [
    patent('P1', 'Org C', ['INV_4']),
    patent('P2', 'Org D', ['INV_4']),
    patent('P3', 'Org D', ['INV_4']),
  ];
  const r1 = extractMigrationCandidates(patents, 7000);
  const r2 = extractMigrationCandidates(patents, 7000);
  check('same evidence, same run -> identical provenanceHash', r1[0].provenanceHash === r2[0].provenanceHash);
  check('same evidence -> identical sourceId/targetId/eta/phi0',
    r1[0].sourceId === r2[0].sourceId && r1[0].targetId === r2[0].targetId &&
    r1[0].eta === r2[0].eta && r1[0].phi0 === r2[0].phi0);
}

console.log('\n=== Provenance traceability: different evidence -> different hash ===');
{
  const patentsA = [patent('P1', 'Org E', ['INV_5']), patent('P2', 'Org F', ['INV_5'])];
  const patentsB = [patent('P9', 'Org E', ['INV_5']), patent('P2', 'Org F', ['INV_5'])]; // one patent id changed
  const rA = extractMigrationCandidates(patentsA, 8000);
  const rB = extractMigrationCandidates(patentsB, 8000);
  check('changing underlying evidence changes provenanceHash', rA[0].provenanceHash !== rB[0].provenanceHash);
}

console.log('\n=== Multi-inventor evidence: each qualifying inventor yields one candidate ===');
{
  const patents = [
    patent('P1', 'Org G', ['INV_6']), patent('P2', 'Org H', ['INV_6']),
    patent('P3', 'Org I', ['INV_7']), patent('P4', 'Org J', ['INV_7']),
    patent('P5', 'Org K', ['INV_8']), // single-org inventor, no candidate
  ];
  const result = extractMigrationCandidates(patents, 9000);
  check('two qualifying inventors -> exactly 2 candidates (single-org inventor excluded)', result.length === 2);
}

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
