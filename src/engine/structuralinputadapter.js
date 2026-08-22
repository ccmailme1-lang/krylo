// src/engine/structuralinputadapter.js — KRYL-1195: Structural Input Adapter
//
// Translates a sigmaengine.js buildStructure() output (Σ) into the RelationshipSet
// shape src/engine/structuralrecognition.js consumes. See
// specs/SPEC-KRYL-1195-structural-input-adapter-contract.md for the full contract
// and code citations this implementation is grounded in.
//
// Provenance is whole-Σ, not per-edge (contract VALIDATION #1 — sigmaengine.js's
// `traceable` is one boolean for the entire structure, no per-edge flag exists). If
// the input's traceable !== true, this returns [] for the ENTIRE structure — it does
// not walk provenanceDAG to invent per-edge provenance. That would be a different,
// unbuilt capability requiring its own contract, not this adapter's job.
//
// This module does not discover relationships, repair provenance, resolve new
// entities, or make scalar connectors relational. It only translates already-
// admitted, already-verified structure. Refusal (returning []) is a valid, expected
// result — never a fabricated fallback.

import { RELATION_TYPES } from './entitytopologyregistry.js';
import { resolveByIdentifier } from './entityresolution.js';

// Real-world relationship types only. BRIDGES_TO is documented in
// entitytopologyregistry.js as synthetic — added by bridgeV1ToV2(), "not a
// real-world relationship" — kept in the enum specifically so consumers can filter
// it out. Derived from RELATION_TYPES itself (minus BRIDGES_TO) rather than a
// separately hardcoded list, so this can't silently drift from the canonical
// vocabulary if a new real type is added there.
const ADMISSIBLE_TYPES = new Set(
  Object.values(RELATION_TYPES).filter((t) => t !== RELATION_TYPES.BRIDGES_TO)
);

// E_Σ's from/to are already entitytopologyregistry.js's own nodeId() output:
// "CIK:<cik>" when a CIK was available at registration time, else a normalized
// name string. Only the CIK-keyed form has an exact, non-fuzzy reverse check
// available (resolveByIdentifier('edgar', cik)). A name-keyed nodeId has no safe
// exact reverse — attempting a fuzzy name resolve here would be exactly the kind
// of identity manufacturing the contract forbids. Name-keyed endpoints are
// therefore treated as unresolved and refused, not fuzzy-matched.
function isResolvedEndpoint(nodeIdValue) {
  const m = /^CIK:(\d+)$/.exec(nodeIdValue ?? '');
  if (!m) return false;
  return resolveByIdentifier('edgar', m[1]) !== null;
}

/**
 * toRelationshipSet(sigmaStructure) → RelationshipSet[]
 *
 * sigmaStructure: a sigmaengine.js buildStructure() return value, or null/undefined.
 * Returns [] on any refusal condition (missing input, traceable !== true, no
 * admissible edges) — never throws, never fabricates an edge.
 */
export function toRelationshipSet(sigmaStructure) {
  if (!sigmaStructure) return [];
  if (sigmaStructure.traceable !== true) return []; // whole-Σ gate — see contract VALIDATION #1

  const out = [];
  for (const e of sigmaStructure.edges ?? []) {
    if (!e || !ADMISSIBLE_TYPES.has(e.type)) continue;   // refuse synthetic/unknown types
    if (!isResolvedEndpoint(e.from)) continue;            // refuse unresolved subject
    if (!isResolvedEndpoint(e.to)) continue;              // refuse unresolved object

    out.push({
      id: e.id,
      subjectId: e.from,
      objectId: e.to,
      type: e.type,
      // The edge is itself real evidence for its own inclusion — buildStructure()
      // links it as such (sigmaengine.js:75-79). Not a placeholder.
      evidenceRefs: [e.id],
      ts: e.validFrom ?? null,
    });
  }
  return out;
}
