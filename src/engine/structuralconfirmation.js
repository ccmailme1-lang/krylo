// WO-2005B — Structural Confirmation Engine
// Calibrated properties + SCI computation. Post-formation only — never influences identity.
// Consumes: WO-2004 EvidenceGraph, WO-2005A descriptors, WO-1869 pathstore.
//
// Calibration discipline: priors are corrected toward observed reality only.
// Never tune anchorStrength or independencePrior to produce a desired SCI output.

import { getDescriptor, EPISTEMIC_CLASS, listByClass } from './evidencetiers.js';
import { getLRPriorByKey } from './pathstore.js';

// ── Calibration priors (WO-2005B owns these numbers — not evidencetiers.js) ──────────────
// anchorStrength: non-fabricability ceiling (0–1); STRUCTURAL floor ≈ 0.80 by definition.
// independencePrior: physical isolation from narrative channels (0–1); prior until N≥20.
const CALIBRATION_PRIORS = {
  POWER_CONSUMPTION:       { anchorStrength: 0.95, independencePrior: 0.98 },
  POWER_LOAD:              { anchorStrength: 0.90, independencePrior: 0.97 },
  POWER_INFRA:             { anchorStrength: 0.97, independencePrior: 0.96 },
  POWER_DATACENTER_DEMAND: { anchorStrength: 0.88, independencePrior: 0.92 },
  POWER_DISCONTINUITY:     { anchorStrength: 0.82, independencePrior: 0.94 },
  WATER_USAGE:             { anchorStrength: 0.91, independencePrior: 0.97 },
  NETWORK_TRAFFIC:         { anchorStrength: 0.85, independencePrior: 0.93 },
  FREIGHT_LOGISTICS:       { anchorStrength: 0.88, independencePrior: 0.95 },
  CONSTRUCTION_PERMITS:    { anchorStrength: 0.93, independencePrior: 0.93 },
  COMPUTE_CAPACITY:        { anchorStrength: 0.87, independencePrior: 0.91 },
  SEC_FILING:              { anchorStrength: 0.72, independencePrior: 0.78 },
  EARNINGS_CALL:           { anchorStrength: 0.60, independencePrior: 0.62 },
  ANALYST_REPORT:          { anchorStrength: 0.40, independencePrior: 0.35 },
  NEWS_ARTICLE:            { anchorStrength: 0.30, independencePrior: 0.30 },
  PRESS_RELEASE:           { anchorStrength: 0.28, independencePrior: 0.45 },
  SOCIAL_MEDIA:            { anchorStrength: 0.12, independencePrior: 0.18 },
};

// Tier weights: reflect non-fabricability hierarchy.
// STRUCTURAL at 0.50 — only tier where fabrication is physically costly.
const TIER_WEIGHT = {
  [EPISTEMIC_CLASS.STRUCTURAL]:  0.50,
  [EPISTEMIC_CLASS.OPERATIONAL]: 0.25,
  [EPISTEMIC_CLASS.FINANCIAL]:   0.15,
  [EPISTEMIC_CLASS.NARRATIVE]:   0.10,
  [EPISTEMIC_CLASS.SPECULATIVE]: 0.10,
};

// Theoretical maximum SCI — computed once from priors (all types covered at max values).
const MAX_POSSIBLE = Object.entries(CALIBRATION_PRIORS).reduce((sum, [type, cal]) => {
  const d = getDescriptor(type);
  if (!d) return sum;
  return sum + cal.anchorStrength * cal.independencePrior * (TIER_WEIGHT[d.epistemicClass] ?? 0.05);
}, 0);

// ── Calibration API ───────────────────────────────────────────────────────────

export function getCalibration(evidenceType) {
  return CALIBRATION_PRIORS[evidenceType] ?? null;
}

// Used by identitykernel.js stabilityScore when precise calibration is needed.
export function getAnchorStrength(evidenceType) {
  return CALIBRATION_PRIORS[evidenceType]?.anchorStrength ?? null;
}

// ── SCI — Structural Confirmation Index ──────────────────────────────────────

export function computeSCI(evidenceGraph) {
  if (!evidenceGraph?.nodes?.size) return null;

  // One contribution per distinct evidenceType — stacking rule enforced.
  const coveredTypes = new Set(
    Array.from(evidenceGraph.nodes.values()).map(n => n.evidenceType)
  );

  let raw = 0;
  const classCount = {};

  for (const type of coveredTypes) {
    const descriptor = getDescriptor(type);
    const cal        = CALIBRATION_PRIORS[type];
    if (!descriptor || !cal) continue;

    // Use independenceObserved once calibrated (N≥20); fall back to prior.
    const independence  = cal.independenceObserved ?? cal.independencePrior;
    const contribution  = cal.anchorStrength * independence;
    const tw            = TIER_WEIGHT[descriptor.epistemicClass] ?? 0.05;
    raw += contribution * tw;
    classCount[descriptor.epistemicClass] = (classCount[descriptor.epistemicClass] ?? 0) + 1;
  }

  const score       = parseFloat(Math.min(10, MAX_POSSIBLE > 0 ? (raw / MAX_POSSIBLE) * 10 : 0).toFixed(1));
  // Groundedness: rises with coverage diversity; saturates at ~8 distinct types
  const groundedness = parseFloat(Math.min(1, coveredTypes.size / 8).toFixed(2));

  return {
    score,
    groundedness,
    coveredTypes:  [...coveredTypes],
    classCoverage: classCount,   // { STRUCTURAL: 3, FINANCIAL: 1, ... }
  };
}

// ── Structural Momentum ───────────────────────────────────────────────────────
// Rate of change in structural burden across a rolling window of CanonicalEvents.

export function computeStructuralMomentum(eventHistory, windowMs = 30 * 24 * 60 * 60 * 1000) {
  if (!eventHistory?.length || eventHistory.length < 2) return null;

  const now    = Date.now();
  const cutoff = now - windowMs;
  const recent = eventHistory.filter(e => {
    const ts = e.timeWindow?.start?.getTime?.() ?? e.timeWindow?.start ?? 0;
    return ts >= cutoff;
  });

  if (recent.length < 2) return null;

  // Compute structural burden per event
  const burdens = recent.map(e => {
    const sci = computeSCI(e.evidenceGraph);
    const structuralOnly = sci ? (sci.classCoverage?.[EPISTEMIC_CLASS.STRUCTURAL] ?? 0) / 10 : 0;
    return { ts: e.timeWindow?.start?.getTime?.() ?? 0, burden: structuralOnly };
  }).sort((a, b) => a.ts - b.ts);

  // Δ burden / Δ time (ms), normalized
  const oldest = burdens[0];
  const newest = burdens[burdens.length - 1];
  const deltaT = newest.ts - oldest.ts;
  if (deltaT === 0) return 0;

  const momentum = (newest.burden - oldest.burden) / (deltaT / windowMs);
  return parseFloat(Math.max(-1, Math.min(1, momentum)).toFixed(3));
}

// ── Structural Divergence ─────────────────────────────────────────────────────
// Disagreement between STRUCTURAL tier and NARRATIVE tier on the same hypothesis.
// High divergence + fracture polarity = §20 Direction Honesty Principle trigger.

export function computeStructuralDivergence(evidenceGraph) {
  if (!evidenceGraph?.nodes?.size) return null;

  const coveredTypes = new Set(
    Array.from(evidenceGraph.nodes.values()).map(n => n.evidenceType)
  );

  let structuralBurden = 0;
  let narrativeBurden  = 0;

  for (const type of coveredTypes) {
    const descriptor = getDescriptor(type);
    const cal        = CALIBRATION_PRIORS[type];
    if (!descriptor || !cal) continue;
    const independence = cal.independenceObserved ?? cal.independencePrior;
    const contribution = cal.anchorStrength * independence;
    if (descriptor.epistemicClass === EPISTEMIC_CLASS.STRUCTURAL || descriptor.epistemicClass === EPISTEMIC_CLASS.OPERATIONAL) {
      structuralBurden += contribution;
    } else {
      narrativeBurden += contribution;
    }
  }

  // Normalize both to [0,1] against their own max possible values
  const maxStruct = listByClass(EPISTEMIC_CLASS.STRUCTURAL).concat(listByClass(EPISTEMIC_CLASS.OPERATIONAL))
    .reduce((s, t) => { const c = CALIBRATION_PRIORS[t]; return s + (c ? c.anchorStrength * c.independencePrior : 0); }, 0);
  const maxNarr = listByClass(EPISTEMIC_CLASS.NARRATIVE).concat(listByClass(EPISTEMIC_CLASS.SPECULATIVE)).concat(listByClass(EPISTEMIC_CLASS.FINANCIAL))
    .reduce((s, t) => { const c = CALIBRATION_PRIORS[t]; return s + (c ? c.anchorStrength * c.independencePrior : 0); }, 0);

  const normStruct = maxStruct > 0 ? structuralBurden / maxStruct : 0;
  const normNarr   = maxNarr   > 0 ? narrativeBurden  / maxNarr   : 0;

  const divergence = parseFloat(Math.abs(normStruct - normNarr).toFixed(3));
  const direction  = normStruct > normNarr ? 'STRUCTURAL_LEADS' : normNarr > normStruct ? 'NARRATIVE_LEADS' : 'BALANCED';

  return { divergence, direction, structuralBurden: parseFloat(normStruct.toFixed(3)), narrativeBurden: parseFloat(normNarr.toFixed(3)) };
}

// ── Structural Precursor Score (SPS) ─────────────────────────────────────────
// Extends §19 Path Memory to structural signal compositions.
// WITHHOLD discipline: surface only at N≥5. Coincidence ≠ causation.

function fnv32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function makeStructuralKey({ evidenceGraph, convergenceBand, domain }) {
  const structuralTypes = Array.from(evidenceGraph?.nodes?.values() ?? [])
    .filter(n => n.epistemicClass === EPISTEMIC_CLASS.STRUCTURAL)
    .map(n => n.evidenceType)
    .sort()
    .join('+');
  return `STRUCT|${structuralTypes || 'NONE'}|${convergenceBand ?? 'MID'}|${domain ?? 'UNKNOWN'}`;
}

export function computeSPS({ evidenceGraph, convergenceBand, domain }) {
  if (!evidenceGraph?.nodes?.size) return null;
  const key = makeStructuralKey({ evidenceGraph, convergenceBand, domain });
  return getLRPriorByKey(key);   // returns null if N<5 (WITHHOLD)
}

// ── Main suite ────────────────────────────────────────────────────────────────
// Attach all structural metrics to a CanonicalEvent post-formation.

export function computeStructuralSuite(event, { convergenceBand, domain, eventHistory } = {}) {
  const g   = event?.evidenceGraph;
  const sci = computeSCI(g);
  const div = computeStructuralDivergence(g);
  const sps = computeSPS({ evidenceGraph: g, convergenceBand, domain });
  const mom = eventHistory ? computeStructuralMomentum(eventHistory) : null;

  return { sci, divergence: div, sps, momentum: mom };
}
