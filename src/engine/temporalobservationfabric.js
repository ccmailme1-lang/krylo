// temporalobservationfabric.js — KRYL-1075 slice 1. The substrate the RFA reasons OVER (not a
// reasoning engine). It records temporal observation with NEGATIVE states (present AND absent) so the
// invariance test (causalepistemicstamp.invariance) has real state transitions to read.
//
// Co-occurrence asks "did A and B appear together?" — weak. Temporal invariance asks "across changing
// environment states, what persists / disappears / inverts?" — the environmental VARIATION is the test.
// So a bucket where α is observed but β is NOT is skipped, never counted as "β absent" (§22: unobserved
// ≠ absent). Only buckets with explicit observations of BOTH α and β contribute.
//
// DOCTRINE RULE (machine-testable, Founder 2026-07-17): KRYLO will not claim invariance without observed
// state transitions containing BOTH presence and absence counterstates. Enforced in buildInvarianceRecord:
// if either the present sample or the absent sample is below the counterstate floor, the record is
// WITHHELD (null) → the edge stays PROJECTED. Environmental variation is mandatory, not optional.
//
// External temporal datasets (EIA energy, port congestion, weather, market microstructure) feed this via
// the Observation Normalizer (observe / observeRow) in follow-on ingestion WOs. This slice is the core +
// the recordFor adapter, fixture-testable with zero external dependency.

export const DEFAULT_MIN_COUNTERSTATES = 2; // RUNTIME_POLICY floor — NOT a core invariant knob (§11a)

const up = s => String(s ?? '').toUpperCase();

/** createFabric() — empty temporal state graph. buckets: bucketKey(ts) -> Map(signal -> stateObj). */
export function createFabric() {
  return { buckets: new Map() };
}

/**
 * observe(fabric, obs) — record ONE normalized observation.
 * @param obs { signal, ts, present:boolean, confidence?, provenance?, context? }
 * Ignores malformed input (present must be an explicit boolean — no coercion; unknown stays unknown).
 */
export function observe(fabric, { signal, ts, present, confidence = null, provenance = null, context = null, tier = null } = {}) {
  if (!fabric?.buckets || !signal || ts == null || typeof present !== 'boolean') return fabric;
  const key = String(ts);
  if (!fabric.buckets.has(key)) fabric.buckets.set(key, new Map());
  // tier: 1 authoritative (gov/regulatory), 2 commercial (licensed), 3 crowd/observational. null = unmarked.
  fabric.buckets.get(key).set(up(signal), { present, confidence, provenance, context, tier });
  return fabric;
}

/**
 * observeRow(fabric, row) — Observation Normalizer for a time-aligned state row (his "good" table shape):
 * @param row { ts, states: { SIGNAL: boolean, ... }, confidence?, provenance?, context? }
 */
export function observeRow(fabric, { ts, states = {}, confidence = null, provenance = null, context = null, tier = null } = {}) {
  for (const [signal, present] of Object.entries(states)) {
    if (typeof present === 'boolean') observe(fabric, { signal, ts, present, confidence, provenance, context, tier });
  }
  return fabric;
}

/**
 * buildInvarianceRecord(fabric, alpha, beta, opts) — contemporaneous same-bucket biconditional counts
 * for α↔β across the record. Returns the record invariance() consumes, or NULL if WITHHELD by the
 * counterstate doctrine.
 * @returns {Object|null} { presentTotal, presentWithEffect, absentTotal, absentWithEffect } | null
 */
export function buildInvarianceRecord(fabric, alpha, beta, { minCounterstates = DEFAULT_MIN_COUNTERSTATES } = {}) {
  if (!fabric?.buckets) return null;
  const A = up(alpha), B = up(beta);
  let presentTotal = 0, presentWithEffect = 0, absentTotal = 0, absentWithEffect = 0;
  let evidenceTier = null; // weakest-link tier across contributing evidence (higher = weaker; null ignored)
  for (const states of fabric.buckets.values()) {
    const a = states.get(A), b = states.get(B);
    if (!a || !b) continue; // need explicit obs of BOTH (§22: unobserved ≠ absent)
    for (const t of [a.tier, b.tier]) if (t != null) evidenceTier = evidenceTier == null ? t : Math.max(evidenceTier, t);
    if (a.present === true)      { presentTotal++; if (b.present === true) presentWithEffect++; }
    else if (a.present === false) { absentTotal++; if (b.present === true) absentWithEffect++; }
  }
  // DOCTRINE: no invariance claim without both presence AND absence counterstates at/above the floor.
  if (presentTotal < minCounterstates || absentTotal < minCounterstates) return null;
  return { presentTotal, presentWithEffect, absentTotal, absentWithEffect, evidenceTier };
}

/**
 * recordForFactory(fabric, opts) — adapter that plugs TOF into stampChain(edges, { recordFor }).
 * @returns {(edge) => Object|null}  edge {from,to} → invariance record (or null → PROJECTED)
 */
export function recordForFactory(fabric, opts = {}) {
  return (edge = {}) => buildInvarianceRecord(fabric, edge.from, edge.to, opts);
}
