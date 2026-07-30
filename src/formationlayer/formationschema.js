// Formation Representation Layer — schema only (KRYL Formation Representation Layer, prototype).
// Sandboxed: not wired into conemap.jsx or any live rendering path. No shaders, no morph targets,
// no geometry changes — this is a data-shape prototype, testing whether the Surface *could*
// consume structural state instead of a raw signal object, per the agreed scope (2026-07-30).
//
// Scope lock: exactly 2 states for this prototype (stable, emerging). Not a physics engine.
// relationships stays an empty array — cross-formation tension is explicitly out of scope here.

export const FORMATION_STATE = Object.freeze({
  STABLE:   'stable',
  EMERGING: 'emerging',
});

// A domain with no active signal has no formation — absence is a state, not a fabricated
// "emerging" one (§22 absence-is-signal). Callers check for null before rendering anything.
export function buildFormation({ domain, magnitude, state, cohesion, velocity, evidenceDepth, signalCount }) {
  if (!Object.values(FORMATION_STATE).includes(state)) {
    throw new Error(`buildFormation: invalid state '${state}' — must be one of ${Object.values(FORMATION_STATE).join(', ')}`);
  }
  return Object.freeze({
    formation_id: domain,
    state,
    magnitude: parseFloat(magnitude.toFixed(1)),
    cohesion: parseFloat(cohesion.toFixed(3)),
    velocity: parseFloat(velocity.toFixed(3)),
    evidence_depth: parseFloat(evidenceDepth.toFixed(3)),
    signal_count: signalCount,
    relationships: [], // out of scope for this prototype
  });
}
