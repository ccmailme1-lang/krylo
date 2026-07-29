// KRYL-1126 — Archetype Engine (Analytical Plane only). Weight profiles are configuration
// metadata, not evidence — versioned for replay determinism (AC-005), never written back into
// the Integrity Plane. Structural Coherence (SC) = weighted sum of caller-supplied components;
// this module does not observe reality, it scores internal consistency of a declared scenario.

const ARCHETYPES = Object.freeze({
  NEGOTIATION: Object.freeze({
    registry_version: 'v4.0',
    weights: Object.freeze({ S: 0.20, R: 0.35, C: 0.25, A: 0.20 }), // S:completeness R:relationship_logic C:constraint_fit A:assumption_hygiene
  }),
});

export function getArchetype(name) {
  const archetype = ARCHETYPES[name];
  if (!archetype) throw new Error(`getArchetype: unknown archetype '${name}'`);
  return archetype;
}

export function listArchetypes() {
  return Object.keys(ARCHETYPES);
}

// components: { completeness, relationshipLogic, constraintFit, assumptionHygiene } each 0-1.
// Returns SC score + per-component breakdown — never a bare scalar without its components
// (mirrors the frozen layer's own "no hidden composite" discipline, applied to this axis too).
export function computeSC(archetypeName, components) {
  const { weights, registry_version } = getArchetype(archetypeName);
  const { completeness = 0, relationshipLogic = 0, constraintFit = 0, assumptionHygiene = 0 } = components ?? {};
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const c = {
    completeness: clamp01(completeness),
    relationship_logic: clamp01(relationshipLogic),
    constraint_fit: clamp01(constraintFit),
    assumption_hygiene: clamp01(assumptionHygiene),
  };
  const SC_score = clamp01(
    weights.S * c.completeness +
    weights.R * c.relationship_logic +
    weights.C * c.constraint_fit +
    weights.A * c.assumption_hygiene
  );
  return {
    SC_score: parseFloat(SC_score.toFixed(3)),
    SC_components: c,
    archetype: archetypeName,
    registry_version,
  };
}
