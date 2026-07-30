// Formation Representation Layer — schema (KRYL-Formation Mathematics v0.1, Operational subset).
// Sandboxed: not wired into conemap.jsx or any live rendering path. No shaders, no morph targets,
// no geometry changes.
//
// Split, locked 2026-07-30: Operational Mathematics (implemented here, grounded in real data) vs.
// Research Mathematics (deferred — requires instrumentation Krylo doesn't have yet). Never fake an
// input to make a field look computed. A field with no real substrate is null with a reason, not a
// placeholder number (§22 absence-is-signal, applied to metrics as well as signals).
//
//   Magnitude  — operational. Real domain-pressure aggregate.
//   Cohesion   — operational (partial). C_f = S/4 (classifier stage / 4). The A_f alignment term
//                (cosine similarity over signal vectors) is Research Math — Krylo has no signal
//                vector representation yet, so A_f is not computed, not approximated.
//   Velocity   — operational (reduced state vector). V_f = ||ΔF|| / Δt over F=[M,C] only, tracked
//                across real calls. The full [M,C,E,R] vector and learned weighting matrix W are
//                Research Math, pending Evidence Depth and Connector Strength existing for real.
//   Evidence Depth — Research Math. Requires Q_s/I_s/R_c/T_f (source quality, independence, causal
//                relevance, temporal freshness) — none of which exist as tracked values anywhere
//                in Krylo today. Explicitly null, not a proxy.
//   Connector Strength — operational (baseline). R_ab = min(C_a, C_b). The evidence-modulated form
//                (× E_ab) is Research Math, pending Evidence Depth.

export const FORMATION_STATE = Object.freeze({
  STABLE:   'stable',
  EMERGING: 'emerging',
});

// A domain with no active signal has no formation — absence is a state, not a fabricated
// "emerging" one (§22 absence-is-signal). Callers check for null before rendering anything.
export function buildFormation({ domain, magnitude, state, cohesion, velocity, signalCount }) {
  if (!Object.values(FORMATION_STATE).includes(state)) {
    throw new Error(`buildFormation: invalid state '${state}' — must be one of ${Object.values(FORMATION_STATE).join(', ')}`);
  }
  return Object.freeze({
    formation_id: domain,
    state,
    magnitude: parseFloat(magnitude.toFixed(1)),
    cohesion: parseFloat(cohesion.toFixed(3)),
    velocity: parseFloat(velocity.toFixed(3)),
    // Research Math — not yet instrumented. Explicit null + reason, never a fabricated proxy.
    evidence_depth: null,
    evidence_depth_reason: 'NOT_YET_INSTRUMENTED — requires Q_s/I_s/R_c/T_f, no evidence schema exists yet',
    signal_count: signalCount,
    relationships: [], // populated by computeConnectorStrength() at the caller level, not stored here
  });
}

// Connector Strength — operational baseline: R_ab = min(C_a, C_b). The weakest-link formation
// bounds the pair's strength. Evidence-modulated form (× E_ab) is Research Math pending Evidence
// Depth's instrumentation — do not multiply in a fabricated E_ab to look more complete.
export function computeConnectorStrength(formationA, formationB) {
  return Math.min(formationA.cohesion, formationB.cohesion);
}
