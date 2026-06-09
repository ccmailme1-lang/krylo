// WO-1001 — SMC (Signal Multi-Convergence)
// Detects pairwise CSU convergence. If Distance(A,B) < τ, emits SMC_Node.
// Visual layer: STRUCK (engine only — no rendering in this file).

/**
 * SMCAlgorithm
 *
 * Compares two Canonical Signal Units. If their 2D vector distance falls
 * below the threshold τ, returns a CONVERGENCE_NODE with amplified mass
 * and centroid. Returns null when no convergence.
 *
 * @param {Object} unitA     — CSU { id, vector, mass, ... }
 * @param {Object} unitB     — CSU { id, vector, mass, ... }
 * @param {number} threshold — τ (default 0.5)
 * @returns {Object|null}    — CONVERGENCE_NODE or null
 */
export function SMCAlgorithm(unitA, unitB, threshold = 0.5) {
  const distance = Math.hypot(
    unitA.vector[0] - unitB.vector[0],
    unitA.vector[1] - unitB.vector[1],
  );

  if (distance >= threshold) return null;

  return {
    type:           'CONVERGENCE_NODE',
    origin_ids:     [unitA.id, unitB.id],
    amplified_mass: (unitA.mass + unitB.mass) * 1.5,
    distance,
    centroid: [
      (unitA.vector[0] + unitB.vector[0]) / 2,
      (unitA.vector[1] + unitB.vector[1]) / 2,
      0,
    ],
  };
}
