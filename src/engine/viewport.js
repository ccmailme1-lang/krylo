// viewport.js — KRYL-1034: epistemic VIEWPORT system (headless dispatcher + LensSlicePayload v1).
//
// The ribbon does not navigate KRYLO; it selects a structural OPERATOR that transforms the SAME
// ecosystem. Substrate chain (Founder): Canonical Events → Identity Kernel → Evidence Graph →
// Structural State → [Viewport Transformation] → HUD Slice. This module is that transformation.
//
// Boundary (Founder #5): every viewport emits LensSlicePayload v1. React never sees engines,
// the HUD never sees evidence sources, engines never see presentation. withholding_reason bakes
// §22 (absence-is-signal) into the contract — a viewport with nothing to show SAYS so, never fills.
//
// Honesty: a viewport PROJECTS facets already present in structuralState (populated upstream by
// the engines). It does not fabricate a facet. Read-only — the substrate is never mutated.

export const LENS_SLICE_VERSION = 'v1';

// LensSlicePayload v1 — the load-bearing architectural artifact.
export function makeLensSlicePayload({
  lens_id, entities = [], relationships = [], observations = [],
  evidence = [], confidence = [], structural_state = [], withholding_reason = null,
}) {
  return Object.freeze({
    version: LENS_SLICE_VERSION,
    lens_id,
    timestamp: Date.now(),
    entities:         Object.freeze([...entities]),
    relationships:    Object.freeze([...relationships]),
    observations:     Object.freeze([...observations]),
    evidence:         Object.freeze([...evidence]),
    confidence:       Object.freeze([...confidence]),
    structural_state: Object.freeze([...structural_state]),
    withholding_reason,   // §22 — null when grounded; a classified reason otherwise
  });
}

const withhold = (lens_id, reason, partial = {}) =>
  makeLensSlicePayload({ lens_id, withholding_reason: reason, ...partial });

// ── The seven operators. Defined by OPERATOR/question, NOT data source (overlap is expected —
// microscope and telescope both use light). `facet` names the structuralState key it projects. ──
export const VIEWPORTS = Object.freeze({
  OBSERVE:     { operator: 'capture',            question: 'What exists?',                              facet: null },
  SIGNAL:      { operator: 'detect change',      question: 'What is moving?',                           facet: 'change' },
  FLOW:        { operator: 'trace movement',     question: 'Where does it travel?',                     facet: 'flow' },
  PRESSURE:    { operator: 'attribute pressure', question: 'What constraints are shaping this?',        facet: 'pressure' },
  CONVERGENCE: { operator: 'validate agreement', question: 'What has structural weight?',               facet: 'convergence' },
  DRIFT:       { operator: 'expose divergence',  question: 'Where do narratives separate from state?',  facet: 'divergence' },
  OPPORTUNITY: { operator: 'translate leverage', question: 'Where does action emerge?',                 facet: 'leverage' },
});
export const VIEWPORT_IDS = Object.freeze(Object.keys(VIEWPORTS));

const facetEntries = (structuralState, facet) =>
  (structuralState ?? []).filter(s => s && s.facet === facet);

// dispatchViewport(id, substrate) → LensSlicePayload v1 (grounded) or a withheld payload.
//   substrate: { entities, relationships, observations, evidence, confidence, structuralState }
export function dispatchViewport(lensId, substrate = {}) {
  const vp = VIEWPORTS[lensId];
  if (!vp) throw new Error(`viewport: unknown operator '${lensId}'`);
  const { entities = [], relationships = [], observations = [], evidence = [], confidence = [], structuralState = [] } = substrate;

  // OBSERVE — capture: raw world before interpretation. No facet, no scoring.
  if (lensId === 'OBSERVE') {
    if (!observations.length) return withhold('OBSERVE', 'NO_OBSERVATIONS');
    return makeLensSlicePayload({ lens_id: 'OBSERVE', entities, observations, evidence, confidence });
  }

  const state = facetEntries(structuralState, vp.facet);

  // DRIFT is structurally partial by design: the structural half exists (computeStructuralDivergence),
  // the NARRATIVE half is unbuilt (KRYL-986). Surface structural divergence + a classified withhold —
  // never imply the divergence read is complete (§11a: OBSERVED divergence, not forecast error).
  if (lensId === 'DRIFT') {
    if (!state.length) return withhold('DRIFT', 'NO_DIVERGENCE_SIGNAL');
    return makeLensSlicePayload({
      lens_id: 'DRIFT', entities, relationships, evidence, confidence, structural_state: state,
      withholding_reason: 'NARRATIVE_DIMENSION_UNBUILT_KRYL986', // partial: structural only
    });
  }

  // OPPORTUNITY — translate leverage, NEVER recommend. The payload carries the opportunity FIELD
  // (condition + asymmetry + timing + actor as structural_state entries). There is deliberately NO
  // action/recommendation field: the human makes the move (detect-not-recommend, §11a-aligned).
  if (lensId === 'OPPORTUNITY') {
    if (!state.length) return withhold('OPPORTUNITY', 'NO_LEVERAGE_FIELD');
    return makeLensSlicePayload({ lens_id: 'OPPORTUNITY', entities, relationships, evidence, confidence, structural_state: state });
  }

  // SIGNAL / FLOW / PRESSURE / CONVERGENCE — project the operator's facet of structural state.
  if (!state.length) return withhold(lensId, 'NO_' + vp.facet.toUpperCase() + '_SIGNAL');
  return makeLensSlicePayload({
    lens_id: lensId, entities, relationships, observations, evidence, confidence, structural_state: state,
  });
}

// Convenience: run one viewport, guaranteeing a payload (dispatch already withholds, never throws
// except on an unknown operator). Kept separate so the ribbon can enumerate all viewports cheaply.
export function availableViewports() {
  return VIEWPORT_IDS.map(id => ({ id, operator: VIEWPORTS[id].operator, question: VIEWPORTS[id].question }));
}
