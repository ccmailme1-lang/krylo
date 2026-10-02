// qa_structuralbrief_canonical_relationships.mjs — KRYL-1341 live-validation fix.
// structuralbrief.jsx's isEntity branch gained a canonical-ρ relationship check. No JSX
// renderer is available in this repo's test setup (confirmed: no testing-library, no existing
// qa_*.mjs precedent for .jsx), so this validates the exact real logic the render depends on --
// the same identity bridge (nodeId + findAdmittedRelationshipsFor) the component itself calls,
// against the real Sysco/Restaurant Depot data and a real no-relationship entity -- not a mock.
//
// Run: node qa_structuralbrief_canonical_relationships.mjs

import { resolveAny, toTopologyNodeId } from './src/engine/entityresolution.js';
import { nodeId, NODE_LABELS } from './src/engine/entitytopologyregistry.js';
import { findAdmittedRelationshipsFor } from './src/engine/canonicalrelationshipprojection.js';
import './src/engine/producers/rsievidencemigration.js'; // populates the real ACQUIRED edge

// Same display transform structuralbrief.jsx's render block applies: resolve each part id to
// its registered NODE_LABELS name (never a raw internal id), join with -> for Semantic/ordered
// types (ACQUIRED, HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE) and <-> for Statistical/unordered types
// (SHARED_PATENT_ASSIGNMENT) -- matches r.phiClass, not a per-type hardcode.
function displayPart(r) {
  return r.part.map(id => NODE_LABELS[id] ?? id).join(r.phiClass === 'Semantic' ? ' -> ' : ' <-> ');
}

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

// Replicates subjectscope.js's real resolution shape exactly (same resolve() call, same
// entity.identifiers/canonicalName fields) -- not a synthetic subjScope.
function subjScopeFor(name) {
  const e = resolveAny(name);
  if (!e) return { kind: 'UNRESOLVED', reason: 'no match' };
  return { kind: 'ENTITY', canonicalId: e.canonicalId, entity: { canonicalId: e.canonicalId, name: e.canonicalName, identifiers: e.identifiers ?? {}, domainTags: e.domainTags ?? [] } };
}

// Exact same computation structuralbrief.jsx's isEntity branch now runs (KRYL-1342:
// consolidated onto the shared toTopologyNodeId(canonicalId) bridge, was an inline
// nodeId(identifiers.edgar, name) reconstruction -- see structuralbrief.jsx's comment).
function entityCanonicalRelationshipsFor(subjScope) {
  if (subjScope.kind !== 'ENTITY') return [];
  return findAdmittedRelationshipsFor(toTopologyNodeId(subjScope.canonicalId));
}

console.log('Sysco (bound as entity subject) -- real ACQUIRED relationship with Restaurant Depot:');
{
  const subjScope = subjScopeFor('Sysco');
  ok('resolves to a real ENTITY subject', subjScope.kind === 'ENTITY');
  const rels = entityCanonicalRelationshipsFor(subjScope);
  ok('finds exactly the real ACQUIRED relationship', rels.length === 1 && rels[0].type === 'ACQUIRED');
  ok('part includes Restaurant Depot', rels[0]?.part.includes('RESTAURANT_DEPOT'));
  ok('nuState.dealStatus is real, not fabricated', rels[0]?.nuState?.dealStatus === 'PENDING');
  ok('displays resolved names, not raw CIK/topology ids', displayPart(rels[0]) === 'Sysco -> Restaurant Depot');
  ok('ordered arrow (acquirer -> target), not <->, since ACQUIRED is Semantic/ordered', rels[0]?.phiClass === 'Semantic');

  // KRYL-1342 equivalence proof: the new shared bridge (toTopologyNodeId(canonicalId)) must
  // resolve to the EXACT SAME id the old inline reconstruction (nodeId(identifiers.edgar,
  // name)) produced -- proves the consolidation changed nothing about which real entity gets
  // looked up, not just that the test still passes.
  const oldPathId = nodeId(subjScope.entity.identifiers?.edgar, subjScope.entity.name);
  const newPathId = toTopologyNodeId(subjScope.canonicalId);
  ok('old inline bridge and new shared bridge resolve to the identical real id', oldPathId === newPathId);
}

console.log('\nRestaurant Depot (bound as entity subject) -- same real relationship, from the other side:');
{
  const subjScope = subjScopeFor('Restaurant Depot');
  ok('resolves to a real ENTITY subject', subjScope.kind === 'ENTITY');
  const rels = entityCanonicalRelationshipsFor(subjScope);
  ok('finds the same real ACQUIRED relationship (either side)', rels.length === 1 && rels[0].type === 'ACQUIRED');
}

console.log('\nNo-relationship case: a real, resolvable entity with zero admitted canonical relationships:');
{
  const subjScope = subjScopeFor('NVIDIA');
  ok('resolves to a real ENTITY subject', subjScope.kind === 'ENTITY');
  const rels = entityCanonicalRelationshipsFor(subjScope);
  ok('zero relationships -- canonicalClause would be empty, sentence unchanged from pre-fix behavior', rels.length === 0);
}

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
