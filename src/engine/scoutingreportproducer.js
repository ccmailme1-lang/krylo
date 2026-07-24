// src/engine/scoutingreportproducer.js
// Assembles the five reporting-lens reads for ONE domain from live signals, then builds the
// sell-layer Scouting Report. This is the bridge between the running field and the storefront.
//
// It REUSES the existing engines — nothing is re-derived (§4):
//   SIGNAL      ← cone pressure (aggregation.js) → signalRead
//   PRESSURE    ← computeVesselPressure gauge (pressurevessel.js) → pressureRead
//   CONVERGENCE ← classifyConvergenceState (convergenceclassifier.js) → convergenceRead
//   DRIFT       ← computeDivergence('DRIFT', …) result, passed in (usedriftdivergence) → driftRead
//   FLOW        ← directed edges (domainflow.js); absent in this path → §22 withheld, never faked
//
// §21 route-don't-aggregate: each lens read is produced atomically from its own producer; the
// composite is computed inside buildScoutingReport, after the reads exist — never before.
// §22 absence-is-signal: a lens with no live producer output stays WITHHELD, classified, visible.

import { computeVesselPressure } from './pressurevessel.js';
import { classifyConvergenceState } from './convergenceclassifier.js';
import {
  buildScoutingReport, signalRead, pressureRead, convergenceRead, driftRead, flowRead, withheldRead,
} from './scoutingreport.js';

const CONE_VECTOR_T = 0.5;             // matches conemap.jsx pin (one source of the T axis)
const CONE_TELEMETRY_CONFIDENCE = 0.7; // matches conemap.jsx call site

// Same convergence vector conemap.jsx builds — kept identical so the report and the cone never drift.
function coneConvergenceVector(pressure, volatility) {
  const leverageN = (pressure ?? 0) / 100;
  return { D: leverageN, V: volatility ?? 0.5, A: leverageN, T: CONE_VECTOR_T };
}

/**
 * buildScoutingReportForDomain — one domain's live reads → a Scouting Report.
 *
 * @param {string} domain — canonical domain (§17)
 * @param {object} live — live inputs for that domain:
 *   { pressure:0–100, volatility:0–1,
 *     signals?: [{magnitude,velocity,confidence}]  // for the PRESSURE vessel gauge
 *     drift?:   computeDivergence('DRIFT', …) result,
 *     flow?:    { direction, magnitude:0–1, counterparty } | null }
 * @param {{now?:number, groundedness?:number}} opts
 *   groundedness — hierarchy-of-truth weight for cone-derived reads (§18). Cone telemetry is a
 *     live feed, not a user actual, so it is < 1 by default and STATED, never assumed to be 1.
 * @returns frozen Scouting Report (src/engine/scoutingreport.js shape)
 */
export function buildScoutingReportForDomain(domain, live = {}, { now, groundedness = 0.7 } = {}) {
  const { pressure, volatility, signals, drift, flow } = live;

  // SIGNAL — cone pressure on the §16 0–100 scale.
  const signal = Number.isFinite(pressure)
    ? signalRead({ pressure, groundedness })
    : withheldRead('SIGNAL', 'NO_CONE_PRESSURE', { absence: 'TEMPORAL' });

  // PRESSURE — vessel gauge (% of ceiling) from the domain's raw signals; withheld if none.
  let pressureR;
  if (Array.isArray(signals) && signals.length) {
    const { gauge } = computeVesselPressure(signals);
    pressureR = pressureRead({ gauge: gauge / 100, groundedness });
  } else {
    pressureR = withheldRead('PRESSURE', 'NO_VESSEL_SIGNALS', { absence: 'TEMPORAL' });
  }

  // CONVERGENCE — classifier state via the exact cone vector; normalized stateId (0..4 → 0..1).
  let convergence;
  if (Number.isFinite(pressure)) {
    const c = classifyConvergenceState(coneConvergenceVector(pressure, volatility), CONE_TELEMETRY_CONFIDENCE);
    convergence = convergenceRead({
      convergence: c.stateId / 4, stateId: c.stateId, stateLabel: c.label, groundedness,
    });
  } else {
    convergence = withheldRead('CONVERGENCE', 'NO_CLASSIFIER_INPUT', { absence: 'TEMPORAL' });
  }

  // DRIFT — pass the divergence result straight through (grounded or withheld admission).
  const driftR = drift ? driftRead(drift, { groundedness }) : withheldRead('DRIFT', 'NO_DIVERGENCE_RESULT', { absence: 'TEMPORAL' });

  // FLOW — only if directed edges were supplied; otherwise honest §22 absence.
  const flowR = (flow && flow.direction)
    ? flowRead({ ...flow, groundedness })
    : withheldRead('FLOW', 'NO_DIRECTED_EDGES', { absence: 'TEMPORAL' });

  return buildScoutingReport(
    domain,
    { signal, flow: flowR, pressure: pressureR, convergence, drift: driftR },
    { now, vitals: {
        pressure: Number.isFinite(pressure) ? Math.round(pressure) : '—',
        volatility: Number.isFinite(volatility) ? volatility : '—',
      } },
  );
}
