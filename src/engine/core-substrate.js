// WO-1000 + WO-1001 — Core Substrate
// Fusion Engine: raw signal → Canonical Signal Unit (CSU)
// SMC Algorithm: pairwise CSU convergence detection

/**
 * WO-1000: FUSION ENGINE
 * Normalizes disparate signal inputs into the Canonical Signal Unit (CSU)
 * Data Contract: SU_Packet { id, origin, vector, raw_mass }
 */
export const FusionEngine = (rawInput) => ({
  id:       `CSU-${Math.random().toString(36).substr(2, 9)}`,
  vector:   rawInput.vector || [0, 0, 0],
  mass:     rawInput.weight || 0.1,
  domain:   rawInput.domain,
  metadata: rawInput.payload || {},
});

/**
 * WO-1001: SMC (SIGNAL MULTI-CONVERGENCE)
 * Detects and amplifies overlapping CSU points.
 * If Distance(A, B) < τ, create SMC_Node with amplified weight.
 */
export const SMCAlgorithm = (unitA, unitB, threshold = 0.5) => {
  const distance = Math.hypot(
    unitA.vector[0] - unitB.vector[0],
    unitA.vector[1] - unitB.vector[1]
  );

  if (distance < threshold) {
    return {
      type:           'CONVERGENCE_NODE',
      origin_ids:     [unitA.id, unitB.id],
      amplified_mass: (unitA.mass + unitB.mass) * 1.5,
      centroid: [
        (unitA.vector[0] + unitB.vector[0]) / 2,
        (unitA.vector[1] + unitB.vector[1]) / 2,
        0,
      ],
    };
  }
  return null;
};
