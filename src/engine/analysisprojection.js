// WO-1714 — Analysis Projection Assembly Gate
// THE ONLY FILE permitted to import both convergenceclassifier.js and structuralfriction.js.
// This is the single V+F convergence point. All other engine modules stay in their lane.

import { classifyConvergenceState, applyTransitionPolicy } from './convergenceclassifier.js';
import { computeStructuralFriction }                       from './structuralfriction.js';

// Assemble full AnalysisProjection from independent V and F pipelines.
//
// vector:              { D, V, A, T } position vector — from positioningengine.js
// telemetryConfidence: 0–1
// domain:              LENS_BROKER_DOMAIN_MAP value (e.g. 'CAREER')
// bayResult:           output of baylogic.adaptiveThresholdDescent
export function assembleAnalysisProjection(vector, telemetryConfidence, domain, bayResult) {
  // V path — convergence classifier only. No friction input.
  const raw    = classifyConvergenceState(vector, telemetryConfidence);
  const stable = applyTransitionPolicy(raw);

  // F path — structural friction only. No convergence input.
  const { horizonMix, feasibility, structuralFriction } = computeStructuralFriction(domain, bayResult);

  return {
    convergenceState:   stable,
    horizonMix,
    feasibility,
    structuralFriction,
  };
}
