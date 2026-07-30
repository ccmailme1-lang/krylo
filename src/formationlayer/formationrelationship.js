// Formation Relationship — Connector Layer, Approved Build Scope (2026-07-30).
// Inter-cone relationship visualization only. No new page, no cone geometry changes, no causal
// invention, no evidence modulation/embeddings/learned weights.

export const RELATIONSHIP_STATE = Object.freeze({
  EMERGING:   'EMERGING',
  CONVERGING: 'CONVERGING',
  STABLE:     'STABLE',
  WEAKENING:  'WEAKENING',
  DIVERGING:  'DIVERGING',
  UNKNOWN:    'UNKNOWN',
});

const STABLE_EPS = 0.02;
const LARGE_NEGATIVE = -0.15;

// Deterministic id, normalized so (A,B) and (B,A) collide to the same relationship.
export function relationshipId(sourceId, targetId) {
  const [a, b] = [sourceId, targetId].sort();
  return `${a}__${b}`;
}

// R_ab = min(C_a, C_b) — the weakest-link formation bounds the pair. No evidence modulation.
export function deriveStrength(source, target) {
  return Math.min(source.cohesion, target.cohesion);
}

// State from temporal change in strength — requires a real prior reading, never guessed.
export function deriveState(currentStrength, previousStrength) {
  if (previousStrength === null || previousStrength === undefined) return RELATIONSHIP_STATE.UNKNOWN;
  const delta = currentStrength - previousStrength;
  if (delta <= LARGE_NEGATIVE) return RELATIONSHIP_STATE.DIVERGING;
  if (delta < -STABLE_EPS)     return RELATIONSHIP_STATE.WEAKENING;
  if (Math.abs(delta) <= STABLE_EPS) return RELATIONSHIP_STATE.STABLE;
  if (delta > STABLE_EPS)       return RELATIONSHIP_STATE.CONVERGING;
  return RELATIONSHIP_STATE.UNKNOWN;
}

// Correction applied: Formation has no `confidence` field anywhere in the current runtime
// (evidence_depth is explicit Research Math, null). Averaging two nonexistent values would be
// fabrication. Confidence is UNKNOWN/withheld until Formation actually carries a real Γ_f.
export function deriveConfidence(_source, _target) {
  return null; // withheld, not invented
}

const _previousStrength = new Map(); // relationshipId -> last computed strength

export function resetRelationshipHistory(id) {
  if (id) _previousStrength.delete(id);
  else _previousStrength.clear();
}

// Candidate pairs: correction applied — do NOT generate all-pairs (n(n-1)/2 complete graph) and
// do NOT reuse the prototype's arbitrary "same theme" rule. Krylo has no real domain-to-domain
// association registry today (entitytopologyregistry.js exists but is keyed by individual
// companies like NVIDIA/TSMC, not the 6 canonical domains this layer operates on). Per the spec's
// own rule: if no association exists, relationships = []. This is the honest current answer, not
// a placeholder bug — extend this function when a real association source exists.
export function computeCandidatePairs(_formations) {
  return [];
}

// formations: array of { formation_id, cohesion, ... }. Returns FormationRelationship[] for
// whichever candidate pairs exist (currently always [], per computeCandidatePairs above).
export function deriveRelationships(formations) {
  const pairs = computeCandidatePairs(formations);
  const now = Date.now();
  return pairs.map(([source, target]) => {
    const id = relationshipId(source.formation_id, target.formation_id);
    const strength = deriveStrength(source, target);
    const previous = _previousStrength.has(id) ? _previousStrength.get(id) : null;
    const state = deriveState(strength, previous);
    _previousStrength.set(id, strength);
    return Object.freeze({
      id,
      sourceFormationId: source.formation_id,
      targetFormationId: target.formation_id,
      strength,
      state,
      confidence: deriveConfidence(source, target),
      direction: 'UNKNOWN', // fixed for this build, never implied by rendering
      createdAt: now,
      updatedAt: now,
      visible: true, // density filtering (Hero vs Surface) applied by the caller, not here
    });
  });
}

// Hero: strongest relationships only, capped, reduced density.
export function filterForHero(relationships, { minStrength = 0.65, minConfidenceIgnored = 0.5, cap = 10 } = {}) {
  return relationships
    .filter(r => r.strength >= minStrength) // confidence is withheld (null) in this build, so
                                             // the confidence floor from the spec can't be applied
                                             // honestly yet — strength-only filter until Γ_f exists
    .sort((a, b) => b.strength - a.strength)
    .slice(0, cap);
}

// Surface: full valid set above a lower floor.
export function filterForSurface(relationships, { minStrength = 0.25 } = {}) {
  return relationships.filter(r => r.strength >= minStrength);
}
