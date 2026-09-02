// src/engine/cf/significance.js — CF Significance Policy `cf-sig-policy/0.2`.
//
// One versioned POLICY that produces the contract-level observable ν_t(p) and
// answers "what is currently supported?". Replaceable without touching the CF
// contract, IS-1 identity, or the pathway lifecycle. Spec:
// SPEC-cf-significance-policy.md. Rulings: X2, X5, X4.
//
// v0.1 → v0.2 change (empirical, qa_cf_canonical.mjs):
//   A pure recency window CANNOT both bridge a staggered multi-event formation
//   and reject a persistent decoy — the decoy's staleness at the moment the
//   genuine formation appears is *smaller* than the multi-event stagger, so any
//   window wide enough for one admits the other. The real discriminator is
//   REFERENCE CONTINUITY (IS-1 §3), not time:
//     - a pathway feeds admission iff it was corroborated THIS batch, or it
//       belongs to a convergence cluster with a this-batch corroboration;
//     - decay/recency now governs RETENTION ONLY (tier), never admission.
//   ν_t (memory) stays; it is benign — a wrong λ costs footprint, not a false
//   formation.

export const POLICY_VERSION = 'cf-sig-policy/0.2';

// ── Parameters (Founder values pending — SPEC §6) ──────────────────────────
export const PARAMS = {
  lambda:      0.15,  // ν_t memory decay per batch. Benign — retention only.
  archiveGap:  3,     // batches since last corroboration → ARCHIVED (retention tier).
  memoryFloor: 0.05,  // ν_t below this + uncorroborated → TOMBSTONE (never delete).
  deadband:    0.02,  // ΔS label deadband.
};

export function magnitude(particle) {
  if (typeof particle.magnitude === 'number') return particle.magnitude;
  return Math.max(0, Math.min(1, (particle.confidence ?? 0) / 100));
}

// ── memory: ν_{t} = max(0, ν_{t-1}·(1-λ) + corroboration_this_batch) ───────
export function decayedNu(prevNu, corroborationThisBatch, params = PARAMS) {
  return Math.max(0, prevNu * (1 - params.lambda) + corroborationThisBatch);
}

// ── ADMISSION support (X5 / FC-REQ-05) — reference-continuity based ────────
// A pathway feeds relationship / formation admission iff it is structurally
// active NOW: corroborated this batch, or a member of a convergence cluster in
// which some pathway was corroborated this batch.
//
//   corroboratedThisBatch : boolean  (pathway got a new event this batch)
//   clusterLiveThisBatch  : boolean  (any cluster co-member did)
export function admissibleForFormation(corroboratedThisBatch, clusterLiveThisBatch) {
  return !!(corroboratedThisBatch || clusterLiveThisBatch);
}

// ── retention tier (X4) — never returns "delete" ──────────────────────────
export function tierOf({ nu, lastCorroboratedBatch, sealed }, nowBatch, params = PARAMS) {
  if (sealed) return 'TOMBSTONED';
  if (nu < params.memoryFloor && (nowBatch - (lastCorroboratedBatch ?? -Infinity)) > 0) return 'TOMBSTONED';
  if (lastCorroboratedBatch === nowBatch) return 'ACTIVE';
  if ((nowBatch - (lastCorroboratedBatch ?? -Infinity)) <= params.archiveGap) return 'ACTIVE';
  return 'ARCHIVED';
}

// ── ΔS classification (CF-005 §5) — OPTIONAL derived label ────────────────
export function classifyDeltaS(prevNu, nu, params = PARAMS) {
  const d = nu - prevNu;
  const label = d < -params.deadband ? 'DECAY'
              : d >  params.deadband ? 'AMPLIFICATION'
              : 'PERSISTENCE';
  return { label, delta: +d.toFixed(4), policy_version: POLICY_VERSION };
}

// ── ν_t provenance envelope (DEF-05-04 — REQUIRED for persisted ν_t) ──────
export function nuRecord(value, inputEventIds, logicalTime) {
  return {
    value: +value.toFixed(6),
    policy_version: POLICY_VERSION,
    input_reference: [...inputEventIds],
    logical_time: logicalTime,
  };
}
