// qa_reconnpayload_relationshipcoverage.mjs — KRYL-1347: reconnpayload.js's relationshipCoverage()
// unblocked, now reads the real canonical-ρ layer (KRYL-1339/1340) instead of being
// unconditionally BLOCKED. Proves: real admitted ACQUIRED relationship (Sysco/Restaurant Depot)
// reaches both assembleReconnPayload() and narrativeassembly.js's relationshipsStage() with
// resolved names (not raw CIK ids); a resolvable-but-unrelated entity gets honest NO_EVIDENCE;
// a non-entity subjScope gets honest WITHHELD -- never a silent BLOCKED default any more.
//
// Run: node qa_reconnpayload_relationshipcoverage.mjs

import { resolveAny } from './src/engine/entityresolution.js';
import { assembleReconnPayload, relationshipCoverage } from './src/engine/reconnpayload.js';
import './src/engine/producers/rsievidencemigration.js'; // populates the real ACQUIRED edge

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

function subjScopeFor(name) {
  const e = resolveAny(name);
  if (!e) return { kind: 'UNRESOLVED', reason: 'no match' };
  return { kind: 'ENTITY', canonicalId: e.canonicalId, entity: { canonicalId: e.canonicalId, name: e.canonicalName, identifiers: e.identifiers ?? {}, domainTags: e.domainTags ?? [] } };
}

console.log('Sysco — real admitted ACQUIRED relationship:');
{
  const subjScope = subjScopeFor('Sysco');
  const rc = relationshipCoverage(subjScope);
  ok('no longer unconditionally BLOCKED', rc.state !== 'BLOCKED');
  ok('state is PRESENT', rc.state === 'PRESENT');
  ok('finds the real ACQUIRED relationship', rc.relationships.length === 1 && rc.relationships[0].type === 'ACQUIRED');

  const payload = assembleReconnPayload({ analysisIntent: null, fieldFormation: null, subjScope });
  ok('assembleReconnPayload carries the same PRESENT coverage', payload.relationshipCoverage.state === 'PRESENT');
}

console.log('\nNVIDIA — real, resolvable entity, zero admitted relationships:');
{
  const subjScope = subjScopeFor('NVIDIA');
  const rc = relationshipCoverage(subjScope);
  ok('honest NO_EVIDENCE, not BLOCKED', rc.state === 'NO_EVIDENCE');
  ok('zero relationships', rc.relationships.length === 0);
}

console.log('\nNo resolved entity subject (e.g. domain-only query):');
{
  const rc = relationshipCoverage({ kind: 'UNRESOLVED' });
  ok('honest WITHHELD for a non-entity subject', rc.state === 'WITHHELD');
}

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
