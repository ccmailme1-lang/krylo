// KRYL-977 — Modality-Weighted Evidence Reliability
// Post-CI-R, pre-RBCS conditioning layer. Adjusts evidence reliability by modality,
// source consistency, and cross-source agreement — without aggregating or scoring.
//
// Boundary rules (locked 2026-07-04 review):
//   Execution order: Raw Evidence -> CI-R gates (raw only) -> surviving evidence ->
//                     this module -> RBCS aggregation.
//   CI-R must never receive a weighted object — it evaluates raw evidence exclusively.
//   This module produces per-item WeightedEvidence only. It does NOT aggregate streams;
//   RBCS remains the sole aggregation boundary (section 21, Route-Don't-Aggregate).
//   NO changes to ConvergenceScore, SCI, Identity Kernel, or drift detection.

// ── Modality classification ───────────────────────────────────────────────────

export const MODALITIES = [
  'structural',
  'temporal_sequence',
  'textual_narrative',
  'event_based',
  'aggregated_metric',
];

const DEFAULT_MODALITY_WEIGHTS = {
  structural:         0.85,
  temporal_sequence:  0.75,
  textual_narrative:  0.55,
  event_based:        0.70,
  aggregated_metric:  0.60,
};

const UNKNOWN_MODALITY_WEIGHT = 0.25; // FM1: unknown modality -> default low reliability

// ── Module-scoped weight config (mutable via addWeightConfig, per spec FR5) ───

let _modalityWeights = { ...DEFAULT_MODALITY_WEIGHTS };
let _configCorrupted = false;

/**
 * addWeightConfig — set/override the base weight for a modality.
 * FM4: if a caller passes a non-finite weight, treat config as corrupted and
 * revert to baseline static weights rather than persist a bad value.
 */
export function addWeightConfig(modality, weight) {
  if (!Number.isFinite(weight) || weight < 0 || weight > 1) {
    _configCorrupted = true;
    _modalityWeights = { ...DEFAULT_MODALITY_WEIGHTS };
    return;
  }
  _modalityWeights[modality] = weight;
}

/**
 * resetWeightConfig — restore baseline static weights. Test isolation + FM4 recovery.
 */
export function resetWeightConfig() {
  _modalityWeights = { ...DEFAULT_MODALITY_WEIGHTS };
  _configCorrupted = false;
}

/**
 * getModalityClassification — classify a single evidence input into a modality.
 * FM1: unrecognized/missing modality -> null (caller applies UNKNOWN_MODALITY_WEIGHT).
 */
export function getModalityClassification(evidence) {
  if (!evidence || typeof evidence.modality !== 'string') return null;
  return MODALITIES.includes(evidence.modality) ? evidence.modality : null;
}

// ── Contextual adjustment factors ─────────────────────────────────────────────
// Section 23 orthogonality declaration (locked 2026-07-04 review):
//   C (consistency) = intra-source temporal stability of a single source's own
//                      evidence production over time. Depends on autocorrelation
//                      of ONE source's history.
//   A (agreement)   = inter-source convergence at the same time slice. Depends on
//                      cross-source similarity at event-alignment points.
//   Risk: partial coupling under sparse multi-source conditions.
//   Mitigation: normalize each source's contribution independently before
//               computing A, so a single dominant source cannot inflate both
//               C and A simultaneously.

/**
 * computeConsistency — intra-source temporal stability, [0,1].
 * sourceHistory: prior reliability_weight outputs for the SAME source_id, oldest-first.
 * No history -> neutral 0.5 (neither penalized nor rewarded on first sighting).
 */
function computeConsistency(sourceHistory = []) {
  if (sourceHistory.length < 2) return 0.5;
  const deltas = [];
  for (let i = 1; i < sourceHistory.length; i++) {
    deltas.push(Math.abs(sourceHistory[i] - sourceHistory[i - 1]));
  }
  const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  return Math.min(1, Math.max(0, 1 - avgDelta));
}

/**
 * computeAgreement — cross-source convergence at the same time slice, [0,1].
 * concurrentPayloads: normalized [0,1] payload values from OTHER sources at the
 * same aligned time slice. No concurrent sources -> neutral 0.5.
 * Independent normalization (mitigation above) is the caller's responsibility:
 * pass already-normalized payload values, not raw heterogeneous units.
 */
function computeAgreement(payload, concurrentPayloads = []) {
  if (!concurrentPayloads.length) return 0.5;
  const diffs = concurrentPayloads.map(p => Math.abs(p - payload));
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return Math.min(1, Math.max(0, 1 - avgDiff));
}

/**
 * computeTemporalDecay — freshness factor, [0,1]. Exponential decay by age.
 * halfLifeMs default: 7 days — matches the general staleness horizon used
 * elsewhere in the ingestion layer (connectors use DAILY/QUARTERLY decay bands;
 * 7 days is a conservative middle default for a modality-agnostic factor).
 */
function computeTemporalDecay(timestamp, now = Date.now(), halfLifeMs = 7 * 24 * 60 * 60 * 1000) {
  if (!Number.isFinite(timestamp)) return 0.5; // missing timestamp -> neutral, not zero
  const age = Math.max(0, now - timestamp);
  return Math.pow(0.5, age / halfLifeMs);
}

// ── Core mechanism ─────────────────────────────────────────────────────────────

/**
 * computeWeightedEvidence — produce a WeightedEvidence record for one Evidence input.
 *
 * @param {object} evidence — { entity_id, modality, timestamp, payload, source_id }
 * @param {object} [context] — optional conditioning context:
 *   sourceHistory       — prior reliability_weight[] for this source_id (for C)
 *   concurrentPayloads  — normalized payload[] from other sources at same time slice (for A)
 * @returns {object} WeightedEvidence — { entity_id, modality, raw_payload, weighted_payload, reliability_weight }
 *
 * FR6: deterministic under identical inputs — no randomness, no hidden mutable state
 * reads other than the explicit modality weight config.
 */
export function computeWeightedEvidence(evidence, context = {}) {
  const { sourceHistory = [], concurrentPayloads = [] } = context;

  const classified = getModalityClassification(evidence);
  const modalityLabel = classified ?? evidence?.modality ?? 'unknown';

  // FR1/FR2: classify + assign base weight. FM1: unknown modality -> low default.
  const Wm = classified
    ? (_modalityWeights[classified] ?? DEFAULT_MODALITY_WEIGHTS[classified])
    : UNKNOWN_MODALITY_WEIGHT;

  // FM2: missing metadata -> bypass weighting with flag (raw payload passed through
  // unweighted, reliability_weight null signals "not evaluated" rather than a fake score).
  if (evidence?.payload === undefined || evidence?.payload === null) {
    return {
      entity_id:        evidence?.entity_id ?? null,
      modality:         modalityLabel,
      raw_payload:      evidence?.payload ?? null,
      weighted_payload: null,
      reliability_weight: null,
      flag:             'MISSING_METADATA_BYPASS',
    };
  }

  const C = computeConsistency(sourceHistory);
  const T = computeTemporalDecay(evidence.timestamp);
  const A = computeAgreement(evidence.payload, concurrentPayloads);

  // W_final = Wm x C x T x A — multiplicative (consistent with the locked section
  // 18/23 pattern: a weak factor craters reliability, no masking).
  const W_final = Wm * C * T * A;
  const weighted_payload = evidence.payload * W_final;

  return {
    entity_id:          evidence.entity_id ?? null,
    modality:           modalityLabel,
    raw_payload:        evidence.payload,       // FR4: raw always preserved alongside weighted
    weighted_payload:   parseFloat(weighted_payload.toFixed(6)),
    reliability_weight: parseFloat(W_final.toFixed(6)),
    factors: {
      Wm: parseFloat(Wm.toFixed(4)),
      C:  parseFloat(C.toFixed(4)),
      T:  parseFloat(T.toFixed(4)),
      A:  parseFloat(A.toFixed(4)),
    },
  };
}

/**
 * computeWeightedEvidenceBatch — apply computeWeightedEvidence per-item over a list.
 * Explicitly NOT an aggregation: returns one WeightedEvidence per input Evidence,
 * same length as input, no cross-item blending. RBCS remains the only aggregation
 * boundary — this function exists for caller convenience only.
 */
export function computeWeightedEvidenceBatch(evidenceList, contextByEntityId = {}) {
  return evidenceList.map(evidence =>
    computeWeightedEvidence(evidence, contextByEntityId[evidence?.entity_id] ?? {})
  );
}

export function isConfigCorrupted() {
  return _configCorrupted;
}
