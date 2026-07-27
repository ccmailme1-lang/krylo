// uncertaintyenvelope.js — Uncertainty Envelope (KRYL-RSCH-2026-07 → KRYL-UE-001)
// Quantifies the EPISTEMIC STABILITY of a published claim — NOT a probability of truth, not a
// forecast, not a recommendation. UE answers exactly one question: "if the missing or weak
// evidence arrived, how far could this interpretation move?" See specs/KRYL-RSCH-2026-07-
// UncertaintyEnvelope.md for the frozen research note this implements.
//
// UE = EQ × OC × RR × MA  — multiplicative attenuation (NOT a floor/min operator): weakness in
// any single leg proportionally reduces interpretive stability (§18 multiplicative-only, §22
// grounded-or-withhold — no leg is ever silently defaulted to make the score computable).
//
// NON-GOALS (locked, do not drift): UE_c MUST NOT be presented or consumed as probability of
// future events, investment/trading confidence, recommendation strength, model-truth likelihood,
// or outcome-prediction confidence. It describes robustness of the CURRENT interpretation, nothing else.

export const UE_BANDS = Object.freeze([
  { max: 0.20, label: 'SPECULATIVE' },
  { max: 0.45, label: 'PRELIMINARY' },
  { max: 0.70, label: 'GROUNDED' },
  { max: 1.01, label: 'STRONGLY_GROUNDED' }, // 1.01 so UE=1.0 lands inside this band
]);

const clamp01 = (x) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));

/** bandOf — maps a UE score to its editorial token. Never print a "%". */
export function bandOf(ue) {
  const c = clamp01(ue);
  return UE_BANDS.find((b) => c <= b.max)?.label ?? 'SPECULATIVE';
}

/** 2.1 Evidence Quality — mean groundedness of referenced artifacts. */
export function computeEQ(groundednessValues = []) {
  const vs = groundednessValues.filter(Number.isFinite);
  return vs.length ? clamp01(vs.reduce((a, b) => a + b, 0) / vs.length) : null; // null = withheld, not 0
}

/** 2.2 Observation Completeness — present required facets / required facets. */
export function computeOC(presentCount, requiredCount) {
  if (!Number.isFinite(requiredCount) || requiredCount <= 0) return null;
  return clamp01((presentCount ?? 0) / requiredCount);
}

/** 2.3 Relationship Reliability — mean groundedness of edges the claim relies on.
 *  No edges ⇒ RR=1 (nothing to be unreliable about — spec §2.3). */
export function computeRR(edgeGroundednessValues = []) {
  if (!edgeGroundednessValues.length) return 1;
  const vs = edgeGroundednessValues.filter(Number.isFinite);
  return vs.length ? clamp01(vs.reduce((a, b) => a + b, 0) / vs.length) : null;
}

/** 2.4 Model Adequacy — 1 − holdout error ε_v on the canonical validation set.
 *  No validation dataset exists anywhere in KRYLO today — MUST return null (withheld), never
 *  silently default to 1. A withheld MA means UE itself cannot be computed (§22). */
export function computeMA(holdoutError) {
  return Number.isFinite(holdoutError) ? clamp01(1 - holdoutError) : null;
}

/**
 * computeUE — the envelope itself. Any null leg (withheld) makes the WHOLE envelope withheld —
 * grounded-or-withhold, never a partial/defaulted score (§22, §18).
 * @returns { ue: number|null, band: string, withheld: string[] } withheld lists which legs were null.
 */
export function computeUE({ EQ, OC, RR, MA }) {
  const legs = { EQ, OC, RR, MA };
  const withheld = Object.entries(legs).filter(([, v]) => v == null).map(([k]) => k);
  if (withheld.length) return { ue: null, band: null, withheld };
  const ue = clamp01(EQ * OC * RR * MA);
  return { ue, band: bandOf(ue), withheld: [] };
}
