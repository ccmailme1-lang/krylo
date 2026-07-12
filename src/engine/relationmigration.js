// relationmigration.js — WO-20XX SRE Phase 1: anti-ghost edge adapter (§4 / WO-295).
// Maps the EXISTING typed-edge substrate (entitytopologyregistry.TYPED_EDGES, walked by
// causalimpactmap.js; chokepointedges.js) into RelationCore — a VIEW, not a parallel store.
// "CausalEdge becomes RelationCore{type:CAUSES}" (Appendix A migration Phase 1). No new engine.
//
// φ-grounding honesty: a migrated edge asserts the relation EXISTS (η, from its grounded flag)
// but its EFFECT strength is unmeasured at migration ⇒ φ₀ = 0. Phase-1 dynamics may only raise
// ϕ via observed evidence deltas (assertPhiGrounded). We never fabricate a strength here.

import { makeRelationCore, RelationType, isRelationType } from './relationontology.js';

// Deterministic FNV-1a hash (stable ids without a crypto dep; provenance identity token).
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// Default edge.type → RelationType. Dependency-flavored facts become DEPENDS_ON; the rest
// default to CAUSES (the original CausalEdge semantics). Override via typeMap.
const DEFAULT_TYPE_MAP = Object.freeze({
  CAUSES: RelationType.CAUSES,
  DEPENDS_ON: RelationType.DEPENDS_ON,
  DOMAIN_DEP: RelationType.DEPENDS_ON,
  CONSTRAINS: RelationType.CONSTRAINS,
  ENABLES: RelationType.ENABLES,
});

function resolveType(edgeType, typeMap) {
  const map = { ...DEFAULT_TYPE_MAP, ...(typeMap ?? {}) };
  if (edgeType && isRelationType(edgeType)) return edgeType;            // already a RelationType
  if (edgeType && map[edgeType]) return map[edgeType];
  if (/dep/i.test(edgeType ?? '')) return RelationType.DEPENDS_ON;
  return RelationType.CAUSES;                                           // CausalEdge default
}

// Adapt one TYPED_EDGE → RelationCore. Returns { relation } or { skipped, reason } when the
// edge is unsourced (§19: no unsourced relation minted — surfaced as tentative, never asserted).
//   edge: { from, to, type, source }
export function typedEdgeToRelationCore(edge, { typeMap, createdAt } = {}) {
  if (!edge || !edge.from || !edge.to) return { skipped: true, reason: 'MALFORMED_EDGE' };
  const grounded = !!edge.source && edge.source !== 'UNKNOWN';
  if (!grounded) return { skipped: true, reason: 'UNSOURCED_TENTATIVE' }; // §19 withhold-beats-fabricate

  const relationType = resolveType(edge.type, typeMap);
  const id  = `rc:${fnv1a(`${edge.from}|${relationType}|${edge.to}`)}`;   // stable ⇒ idempotent re-migration
  const eta = grounded ? 0.9 : 0.3;                                       // existence confidence from provenance
  return {
    relation: makeRelationCore({
      id,
      sourceId: edge.from,
      targetId: edge.to,
      relationType,
      eta,
      phi0: 0,                       // effect strength unmeasured at migration — NOT fabricated
      structuralSupport: 0.8,        // grounded edge → σ (must be >0)
      provenanceHash: `prov:${fnv1a(`${edge.from}|${edge.to}|${edge.type}|${edge.source}`)}`,
      createdAt: createdAt ?? Date.now(),
    }),
  };
}

// Batch adapter. Returns { relations:[RelationCore], skipped:[{edge,reason}] }.
export function migrateTypedEdges(edges, opts = {}) {
  const relations = [], skipped = [];
  for (const e of edges ?? []) {
    const r = typedEdgeToRelationCore(e, opts);
    if (r.relation) relations.push(r.relation);
    else skipped.push({ edge: e, reason: r.reason });
  }
  return { relations, skipped };
}
