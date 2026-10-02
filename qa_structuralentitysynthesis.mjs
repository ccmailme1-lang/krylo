// qa_structuralentitysynthesis.mjs — KRYL-1341: canonical-ρ-based admission replaces the
// retired text-substring mechanism. Proves: a real named-entity pair with real admitted
// evidence resolves correctly end-to-end into formationsnapshot.js's real, unmodified row
// builder; a generic structural-role-noun pair (no named-entity resolution possible) is
// honestly UNRESOLVED, never fabricated into a match; a real, resolvable pair with no admitted
// relationship is honestly NO_EVIDENCE.
//
// Run: node qa_structuralentitysynthesis.mjs

import { synthStructuralEntity, EVIDENCE_STATE } from './src/engine/structuralentitysynthesis.js';
import { buildCandidateRows } from './src/engine/formationsnapshot.js';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

console.log('Real named entities, real evidence (Sysco / Restaurant Depot):');
{
  const r = synthStructuralEntity({ entities: ['Sysco', 'Restaurant Depot'], relationshipIntent: ['ACQUIRED'], context: 'qa' });
  const pair = r.relationships[0];
  ok('resolves and finds the real ACQUIRED relationship -> SUPPORTED', pair?.state === EVIDENCE_STATE.SUPPORTED);
  ok('facet carries the real canonical relationType', pair?.facet?.relationType === 'ACQUIRED');

  const rows = buildCandidateRows({ evidence: r }, { subject: null, fieldScope: null, formationScope: null });
  ok('real, unmodified formationsnapshot.js produces exactly one row', rows.length === 1);
  ok('relationship_type is the real canonical type, no OBSERVED fallback', rows[0]?.relationship_type === 'ACQUIRED');
}

console.log('\nGeneric structural-role nouns (SUPPLIER / DISTRIBUTOR) -- no named-entity resolution exists:');
{
  const r = synthStructuralEntity({ entities: ['SUPPLIER', 'DISTRIBUTOR'], relationshipIntent: ['RELATIONSHIP'], context: 'qa' });
  const pair = r.relationships[0];
  ok('honestly UNRESOLVED, not fabricated SUPPORTED via substring match', pair?.state === EVIDENCE_STATE.UNRESOLVED);
  ok('no facet on an unresolved pair', pair?.facet === null);
  const rows = buildCandidateRows({ evidence: r }, { subject: null, fieldScope: null, formationScope: null });
  ok('UNRESOLVED pair never persisted as if it were evidence', rows.length === 0);
}

console.log('\nReal resolvable entities, no admitted relationship between them:');
{
  const r = synthStructuralEntity({ entities: ['Sysco', 'NVIDIA'], relationshipIntent: ['RELATIONSHIP'], context: 'qa' });
  const pair = r.relationships[0];
  ok('real entities, no canonical relationship -> NO_EVIDENCE (not UNRESOLVED)', pair?.state === EVIDENCE_STATE.NO_EVIDENCE);
}

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
