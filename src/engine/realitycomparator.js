// src/engine/realitycomparator.js
// Residual / Reality Comparator — the unified expected−observed operator (the "Reality
// Comparator" node). Catches where a structural expectation and an observed value diverge.
//
// GUARDRAILS (load-bearing):
//   · DETECT, NOT PREDICT — both inputs are given; this never forecasts forward.
//   · Direction-NEUTRAL (§20/§21) — reports signed residual + magnitude + direction. It does
//     NOT judge good/bad. A widening residual is stored structural energy, not positive or
//     negative; classification/thresholding is a downstream, post-route concern.
//   · NO hardcoded thresholds — the only scale used is |expected|, derived from the input.
//   · NO fabricated absence (§22) — non-finite input returns null, never a fake 0 residual.
//
// REUSE (not duplication): callers pass `expected` from structuralconfirmation (computeSCI) or
// evidenceregistry predictions, and `observed` from the live signal. This is the single place
// those are compared; it re-derives nothing they already compute.

export const RESIDUAL_DIRECTION = { ABOVE: 'ABOVE', BELOW: 'BELOW', MATCH: 'MATCH' };

/**
 * computeResidual — core operator. residual = observed − expected.
 * @param {{expected:number, observed:number}} input
 * @returns {{ residual:number|null, magnitude:number|null, direction:string|null, relativeResidual:number|null }}
 *   null fields when either input is non-finite (honest absence, never a fabricated 0).
 */
export function computeResidual({ expected, observed } = {}) {
  const e = Number(expected), o = Number(observed);
  if (!Number.isFinite(e) || !Number.isFinite(o)) {
    return { residual: null, magnitude: null, direction: null, relativeResidual: null };
  }
  const residual  = o - e;
  const magnitude = Math.abs(residual);
  const direction = residual > 0 ? RESIDUAL_DIRECTION.ABOVE
                  : residual < 0 ? RESIDUAL_DIRECTION.BELOW
                  : RESIDUAL_DIRECTION.MATCH;
  // residual relative to the expected scale — derived, no tuning constant.
  // |expected| may be 0 → EPSILON guard keeps it finite (observed-where-nothing-expected = large).
  const relativeResidual = magnitude / (Math.abs(e) + Number.EPSILON);
  return { residual, magnitude, direction, relativeResidual };
}

/**
 * computeResidualSeries — element-wise residuals over an expected/observed trajectory pair.
 * Reuses the convergence-trajectory shape; same detect-not-predict contract per element.
 * Length is the shorter of the two series (no padding, no fabricated points).
 */
export function computeResidualSeries(expectedSeries = [], observedSeries = []) {
  const n = Math.min(expectedSeries.length, observedSeries.length);
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(computeResidual({ expected: expectedSeries[i], observed: observedSeries[i] }));
  }
  return out;
}
