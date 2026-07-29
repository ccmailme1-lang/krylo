// KRYL-1126 — Structural Tension (τ). Analytical Plane only — never consumed or computed by
// the Integrity Plane. Measures declared constraint friction within a scenario; an analytical
// judgment about internal consistency, not an evidentiary claim.

const clamp01 = (x) => Math.max(0, Math.min(1, x));

// constraints: [{ id, opposingId, frictionMagnitude (0-1) }, ...] — caller-declared, this module
// does not detect constraints on its own, it only scores declared ones (no fabrication).
export function computeTau(constraints = []) {
  if (constraints.length === 0) {
    return { tension_tau: 0, primary_friction: null, analysis_state: 'NO_CONSTRAINTS_DECLARED' };
  }
  const sorted = [...constraints].sort((a, b) => (b.frictionMagnitude ?? 0) - (a.frictionMagnitude ?? 0));
  const primary = sorted[0];
  const tau = clamp01(primary.frictionMagnitude ?? 0);
  return {
    tension_tau: parseFloat(tau.toFixed(3)),
    primary_friction: primary.id && primary.opposingId ? `${primary.id}_vs_${primary.opposingId}` : (primary.id ?? null),
    analysis_state: 'COMPUTED',
  };
}
