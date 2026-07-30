// Formation Adapter — maps EXISTING engine outputs into the Formation schema. No new signal
// detection, no new classification logic. Reuses the exact same convergence vector construction
// and classifier the live cones already call (conemap.jsx's coneConvergenceVector +
// classifyConvergenceState + applyTransitionPolicy) — restructuring the output, not recomputing it.
//
// Sandboxed prototype: this module is not imported by conemap.jsx or any live rendering path.

import { getDomainPressure } from '../engine/domaingravity.js';
import { classifyConvergenceState, applyTransitionPolicy } from '../engine/convergenceclassifier.js';
import { buildFormation, FORMATION_STATE } from './formationschema.js';

const CONE_VECTOR_T = 0.7;             // same placeholder constant conemap.jsx uses
const CONE_TELEMETRY_CONFIDENCE = 0.8; // same constant conemap.jsx uses

// Mirrors conemap.jsx's coneConvergenceVector() exactly — one source of truth for this shape
// would ideally be shared, but this prototype stays read-only/sandboxed and doesn't import
// from conemap.jsx to avoid any accidental coupling into the live rendering module.
function convergenceVector(magnitude, volatility) {
  const leverageN = (magnitude ?? 0) / 100;
  return { D: leverageN, V: volatility ?? 0.5, A: leverageN, T: CONE_VECTOR_T };
}

// Lightweight evidence-depth proxy for this prototype — NOT a full groundedness computation
// (that's structuralintegrity.js's job, out of scope here). Normalizes signal count against a
// reasonable saturation point; labeled as a proxy so it's never mistaken for a measured g_e.
function evidenceDepthProxy(signalCount, saturationAt = 10) {
  return Math.min(1, signalCount / saturationAt);
}

// domain: signal domain (TECHNOLOGY, CAPITAL, etc.). volatility: caller-supplied 0-1 (the live
// cones source this from elsewhere in the render loop; this prototype takes it as an input
// rather than re-deriving it, to stay strictly a restructuring layer, not a new detector).
// Returns a frozen Formation object, or null if the domain has no active signal (§22 absence —
// no formation exists, not a fabricated "emerging" one).
export function adaptDomainToFormation(domain, volatility = 0.5) {
  const pressure = getDomainPressure(domain);
  if (pressure.signalCount === 0) return null;

  const vector = convergenceVector(pressure.magnitude, volatility);
  const raw    = classifyConvergenceState(vector, CONE_TELEMETRY_CONFIDENCE);
  const locked = applyTransitionPolicy(raw);

  // Hysteresis-confirmed (raw matches the locked/persisted state) -> stable.
  // Not yet confirmed (still fluctuating frame to frame) -> emerging.
  const state = raw.stateId === locked.stateId ? FORMATION_STATE.STABLE : FORMATION_STATE.EMERGING;

  return buildFormation({
    domain,
    magnitude: pressure.magnitude,
    state,
    cohesion: raw.stateId / 4, // normalized convergence stage (stateId range is 0-4)
    velocity: vector.V,
    evidenceDepth: evidenceDepthProxy(pressure.signalCount),
    signalCount: pressure.signalCount,
  });
}
