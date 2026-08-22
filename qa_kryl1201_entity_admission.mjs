// qa_kryl1201_entity_admission.mjs — KRYL-1201 Entity Identity Authority & Runtime Admission
// Traces: SEC filing -> CIK -> resolveByIdentifier -> runtime admission -> canonical entity
// -> repeat CIK encounter -> same entity. Separately: admission -> no relationship/formation
// output. Run: node qa_kryl1201_entity_admission.mjs

import { resolveByIdentifier, createEntity } from './src/engine/entityresolution.js';
import { TYPED_EDGES } from './src/engine/entitytopologyregistry.js';

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else      { fail++; console.log(`  ✗ ${label}`); }
}

// A CIK guaranteed not to collide with the real 56-entity registry or real EDGAR filers.
const FRESH_CIK = '9988776655';
const FRESH_NAME = 'TEST DISCOVERED ENTITY LLC (KRYL-1201 QA FIXTURE)';
const FRESH_ACCESSION = '0009988776-25-000001';

// Real curated entity, for regression coverage.
const LOCKHEED_CIK = '0000936395';

console.log('\n=== TRACE: unknown CIK is unresolved before admission ===');
check('fresh CIK resolves to null pre-admission', resolveByIdentifier('edgar', FRESH_CIK) === null);

console.log('\n=== TRACE: SEC filing -> CIK -> runtime admission -> canonical entity ===');
const admitted = createEntity({
  canonicalName: FRESH_NAME,
  identifiers: { edgar: FRESH_CIK },
  domainTags: [],
  admissionSource: 'SEC/EDGAR',
  admissionEvidence: FRESH_ACCESSION,
});
check('createEntity returns a real entity card', admitted !== null);
check('admissionSource recorded', admitted?.admissionSource === 'SEC/EDGAR');
check('admissionEvidence records the real accession number, not a placeholder', admitted?.admissionEvidence === FRESH_ACCESSION);
check('domainTags is empty on admission — no SIC inference', Array.isArray(admitted?.domainTags) && admitted.domainTags.length === 0);
check('identifiers.edgar preserves the CIK', admitted?.identifiers?.edgar === FRESH_CIK);

console.log('\n=== TRACE: admitted CIK now resolves via resolveByIdentifier ===');
const resolved = resolveByIdentifier('edgar', FRESH_CIK);
check('resolveByIdentifier now finds the runtime-admitted entity', resolved !== null);
check('resolved entity is the same canonicalId as admitted', resolved?.canonicalId === admitted?.canonicalId);

console.log('\n=== TRACE: repeat CIK encounter -> same entity, not a duplicate ===');
// Mirrors the connector's own admitIfUnknown gate: check first, only create if absent.
const alreadyKnown = resolveByIdentifier('edgar', FRESH_CIK);
let secondAttempt = null;
if (!alreadyKnown) {
  secondAttempt = createEntity({ canonicalName: FRESH_NAME, identifiers: { edgar: FRESH_CIK }, domainTags: [] });
}
check('CIK-first check short-circuits before a second createEntity call fires', secondAttempt === null && alreadyKnown !== null);
check('the entity found on repeat encounter is identity-identical to the first admission', alreadyKnown.canonicalId === admitted.canonicalId);

console.log('\n=== SEPARATION: entity admission produces no relationship/formation output ===');
const typedEdgesCountAfterAdmission = TYPED_EDGES.length;
const secondAdmission = createEntity({
  canonicalName: 'SECOND TEST DISCOVERED ENTITY (KRYL-1201 QA)',
  identifiers: { edgar: '9988776656' },
  domainTags: [],
  admissionSource: 'SEC/EDGAR',
  admissionEvidence: '0009988776-25-000002',
});
check('a second, independent admission also succeeds', secondAdmission !== null);
check('TYPED_EDGES is completely untouched by entity admission — identity substrate only, never a relationship', TYPED_EDGES.length === typedEdgesCountAfterAdmission);

console.log('\n=== REGRESSION: curated (static) registry lookup is unchanged ===');
const lockheed = resolveByIdentifier('edgar', LOCKHEED_CIK);
check('static registry entity still resolves correctly', lockheed?.canonicalId === 'lockheed-martin');
check('static entity has no admissionSource (never runtime-admitted)', lockheed?.admissionSource === undefined);

console.log('\n=== NON-GOAL: unresolvable identifiers still return null, not a fabricated entity ===');
check('bogus source key returns null', resolveByIdentifier('not-a-real-source', FRESH_CIK) === null);
check('empty id returns null', resolveByIdentifier('edgar', '') === null);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
