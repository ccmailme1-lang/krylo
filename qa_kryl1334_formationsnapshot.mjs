// qa_kryl1334_formationsnapshot.mjs — validates formationsnapshot.js. Pure, no DB.
//   node qa_kryl1334_formationsnapshot.mjs
import assert from 'node:assert/strict';
import { formationIdFor, buildCandidateRows, decideWrite } from './src/engine/formationsnapshot.js';

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log(`  PASS  ${name}`); }
  catch (e) { fail++; console.log(`  FAIL  ${name}\n        ${e.stack ?? e.message}`); }
}

test('formationIdFor is order-independent for the entity pair', () => {
  const a = formationIdFor({ subject: null, fieldScope: null, formationScope: null, entityA: 'SUPPLIER', entityB: 'DISTRIBUTOR', relationshipType: 'OBSERVED' });
  const b = formationIdFor({ subject: null, fieldScope: null, formationScope: null, entityA: 'DISTRIBUTOR', entityB: 'SUPPLIER', relationshipType: 'OBSERVED' });
  assert.equal(a, b);
});

test('formationIdFor is scope-sensitive -- different subject produces a different id', () => {
  const a = formationIdFor({ subject: 'sysco', fieldScope: null, formationScope: null, entityA: 'SUPPLIER', entityB: 'DISTRIBUTOR', relationshipType: 'OBSERVED' });
  const b = formationIdFor({ subject: null, fieldScope: null, formationScope: null, entityA: 'SUPPLIER', entityB: 'DISTRIBUTOR', relationshipType: 'OBSERVED' });
  assert.notEqual(a, b);
});

test('buildCandidateRows only emits SUPPORTED pairs -- NO_EVIDENCE never becomes a row', () => {
  const sq = { evidence: { relationships: [
    { a: 'SUPPLIER', b: 'DISTRIBUTOR', state: 'SUPPORTED', facet: { sourceId: 'x', source: 's', semantics: 'm' } },
    { a: 'SUPPLIER', b: 'FACILITY', state: 'NO_EVIDENCE', facet: null },
  ] } };
  const rows = buildCandidateRows(sq, { subject: null, fieldScope: null, formationScope: null });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].entity_a, 'SUPPLIER');
});

test('decideWrite: no prior row -> NEW', () => {
  const candidate = { formation_id: 'f1', evidence_ref: 'ev1', relationship_type: 'OBSERVED' };
  const w = decideWrite(candidate, null, 'clock');
  assert.equal(w.state, 'NEW');
});

test('decideWrite: identical evidence_ref -> null (no redundant write)', () => {
  const candidate = { formation_id: 'f1', evidence_ref: 'ev1', relationship_type: 'OBSERVED' };
  const last = { formation_id: 'f1', evidence_ref: 'ev1', relationship_type: 'OBSERVED' };
  const w = decideWrite(candidate, last, 'clock');
  assert.equal(w, null);
});

test('decideWrite: different evidence_ref -> STRENGTHENING, real material_change', () => {
  const candidate = { formation_id: 'f1', evidence_ref: 'ev2', relationship_type: 'OBSERVED' };
  const last = { formation_id: 'f1', evidence_ref: 'ev1', relationship_type: 'OBSERVED' };
  const w = decideWrite(candidate, last, 'material_change');
  assert.equal(w.state, 'STRENGTHENING');
  assert.equal(w.trigger, 'material_change');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
