// WO-2079 — Epistemic Transparency Layer
// Assembles a provenance trace, uncertainty decomposition, and hidden-assumption
// surfacing from data ALREADY produced by decisioninvariants.js (WO-2063) and
// availabilityfilter.js (WO-2068/2072). Invents no new confidence math — this only
// formats and surfaces what those engines already compute, so it's externally
// interpretable without exposing their raw internals.
// Distinct from DEF-1863/statecontract.js: that gates TERMINAL/PROJECTION language
// on completion state. This exposes WHY a confidence figure is what it is.

import { DECISION_INVARIANTS } from './decisioninvariants.js';

// ── Provenance trace ───────────────────────────────────────────────────────────
// invariantSet: output of adaptToInvariants() (WO-2066). One entry per POPULATED
// invariant — sourceMetric/confidence/direction are already carried on the WO-2063
// schema; this just surfaces them in one place instead of requiring a consumer to
// walk all 8 keys and check `.populated` itself.
export function buildProvenanceTrace(invariantSet) {
  return DECISION_INVARIANTS
    .filter(inv => invariantSet?.[inv]?.populated)
    .map(inv => ({
      invariant:    inv,
      sourceMetric: invariantSet[inv].sourceMetric,
      confidence:   invariantSet[inv].confidence,
      direction:    invariantSet[inv].direction,
    }));
}

// ── Uncertainty decomposition ──────────────────────────────────────────────────
// "How sure are we" is not one scalar — coverage (how much of the schema has any
// data) and avgConfidence (how sure we are about what IS populated) are different
// questions. avgConfidence is computed over populated invariants only — an
// unpopulated dimension is absent, not a zero, and averaging it in would fabricate
// certainty about a gap.
export function decomposeUncertainty(invariantSet) {
  const populated   = DECISION_INVARIANTS.filter(inv => invariantSet?.[inv]?.populated);
  const unpopulated = DECISION_INVARIANTS.filter(inv => !invariantSet?.[inv]?.populated);
  const confidences = populated
    .map(inv => invariantSet[inv].confidence)
    .filter(c => c !== null && c !== undefined);

  return {
    coverage:      parseFloat((populated.length / DECISION_INVARIANTS.length).toFixed(3)),
    avgConfidence: confidences.length
      ? parseFloat((confidences.reduce((s, c) => s + c, 0) / confidences.length).toFixed(3))
      : null,
    populated,
    unpopulated, // the honest gap — never silently dropped from the report
  };
}

// ── Hidden assumption surfacing ────────────────────────────────────────────────
// Names two known sources of assumption already in the codebase that don't
// otherwise announce themselves: a populated-but-low-confidence invariant, and an
// Availability Filter advisory (WO-2068/2072) — a constraint failed but wasn't
// enforced, so the candidate passed silently. This doesn't change either engine's
// behavior; it just names the assumption so a consumer can choose to show it.
const LOW_CONFIDENCE_FLAG = 0.5;

export function surfaceHiddenAssumptions(invariantSet, filterResult = null) {
  const flags = [];

  for (const inv of DECISION_INVARIANTS) {
    const entry = invariantSet?.[inv];
    if (entry?.populated && entry.confidence !== null && entry.confidence !== undefined && entry.confidence < LOW_CONFIDENCE_FLAG) {
      flags.push({
        type:   'LOW_CONFIDENCE_INVARIANT',
        detail: `${inv} is populated (raw=${entry.raw}) but confidence is only ${entry.confidence}`,
      });
    }
  }

  for (const advisory of filterResult?.advisories ?? []) {
    flags.push({
      type:   'ADVISORY_ONLY_CONSTRAINT',
      detail: `${advisory.category} failed but was not enforced — candidate passed anyway (${advisory.reason})`,
    });
  }

  return flags;
}

// ── Combined report ─────────────────────────────────────────────────────────────
export function buildTransparencyReport(invariantSet, filterResult = null) {
  return {
    provenance:        buildProvenanceTrace(invariantSet),
    uncertainty:       decomposeUncertainty(invariantSet),
    hiddenAssumptions: surfaceHiddenAssumptions(invariantSet, filterResult),
    builtAt:           Date.now(),
  };
}
