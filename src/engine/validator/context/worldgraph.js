// worldgraph.js — ValidationContext provider: Gᵂ (local graph neighborhood).
// Implements SPEC-relationship-validator-operator-contract.md §3 `worldGraph`.
//
// LIVE-WIRED: directly calls entitytopologyregistry.js's real findPath(), no gap. sourceId/
// targetId on ImmutableRelationshipCandidate are entity registry keys — this is a direct,
// verified mapping (see SPEC-relationship-validator-adapter-orchestration-design.md §3
// Structural/Alternatives rows).

import { findPath } from '../../entitytopologyregistry.js';

// getWorldGraph(candidate, depth = 6) → LocalNeighborhood | null
// Returns the read-only path/neighborhood result between the candidate's endpoints. Callers
// needing "other paths into B" (Alternatives operator) must do additional traversal on top of
// this — findPath() itself only resolves the path between the two given endpoints, confirmed
// by direct read (see design doc's Alternatives correction, 2026-08-18). This provider does not
// fabricate that additional traversal — it exposes exactly what findPath() gives.
export function getWorldGraph(candidate, depth = 6) {
  if (!candidate?.sourceId || !candidate?.targetId) return null;
  const result = findPath(candidate.sourceId, candidate.targetId, depth);
  if (!result?.found) return null;
  return Object.freeze({ ...result, hops: Object.freeze(result.hops ?? []) });
}
