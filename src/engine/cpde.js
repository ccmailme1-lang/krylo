// KRYL-939 — Constraint Precursor Detection Engine (CPDE)
// "System behavior changes BEFORE constraint execution window -> precursor detected."
// Consumes: simulationengine.js, attentionengine.js, truthpressurefield.js,
// constraintimpactengine.js (WO-2038/2030/2035/2041). See
// specs/structural detection engine.md for the full spec this implements.
//
// NOT INVENTED HERE, left undefined per spec: regimeFlipProbability (needs a historical
// base rate this system doesn't have), deviationType classification (no rule was ever
// specified for VOLUME_SPIKE vs VELOCITY_CHANGE vs ... — do not guess).

// Precursor Delta = RealizedBehavior - SimulatedBaseline, per domain.
function computePrecursorDelta(simulatedBaseline, realizedBehavior) {
  const domains = new Set([...Object.keys(simulatedBaseline ?? {}), ...Object.keys(realizedBehavior ?? {})]);
  const delta = {};
  for (const d of domains) delta[d] = (realizedBehavior?.[d] ?? 0) - (simulatedBaseline?.[d] ?? 0);
  return delta;
}

// Precursor Velocity = (change magnitude x cross-domain spread) / time-to-constraint-event
function computePrecursorVelocity(delta, timeToConstraintEventMs) {
  const values = Object.values(delta);
  const changeMagnitude   = Math.sqrt(values.reduce((s, v) => s + v * v, 0));
  const crossDomainSpread = values.filter(v => Math.abs(v) > 0).length;
  const timeToEventDays   = Math.max(1e-6, (timeToConstraintEventMs ?? 0) / (1000 * 60 * 60 * 24));
  return (changeMagnitude * crossDomainSpread) / timeToEventDays;
}

// Anti-false-positive gate — spec requires ALL FOUR:
//   cross-domain consistency, directional alignment, persistence over time window,
//   divergence from simulation baseline.
function passesFalsePositiveGate(delta, persistenceWindowCount, minPersistence = 3) {
  const values = Object.values(delta);
  if (values.length === 0) return false;

  const crossDomainConsistency = values.filter(v => Math.abs(v) > 0).length >= 2;
  const sign0 = Math.sign(values[0]);
  const directionalAlignment   = values.every(v => v === 0 || Math.sign(v) === sign0 || sign0 === 0);
  const persistence            = (persistenceWindowCount ?? 0) >= minPersistence;
  const divergenceFromBaseline = values.some(v => Math.abs(v) > 0.01);

  return crossDomainConsistency && directionalAlignment && persistence && divergenceFromBaseline;
}

// { constraintId, simulatedBaseline, realizedBehavior, timeToConstraintEventMs, persistenceWindowCount }
//   simulatedBaseline / realizedBehavior: domain-pressure objects, e.g. from getAllDomainPressures()
//   persistenceWindowCount: how many consecutive observation windows this delta has held
export function detectPrecursor({ constraintId, simulatedBaseline, realizedBehavior, timeToConstraintEventMs, persistenceWindowCount }) {
  const delta    = computePrecursorDelta(simulatedBaseline, realizedBehavior);
  const velocity = computePrecursorVelocity(delta, timeToConstraintEventMs);
  const detected = passesFalsePositiveGate(delta, persistenceWindowCount);

  const affectedDomains         = Object.entries(delta).filter(([, v]) => Math.abs(v) > 0).map(([d]) => d);
  const expectedShiftMagnitude  = Math.sqrt(Object.values(delta).reduce((s, v) => s + v * v, 0));

  return {
    constraintId,
    detected,
    precursorDelta:    delta,
    precursorVelocity: velocity,
    predictedImpactVector: {
      affectedDomains,
      expectedShiftMagnitude,
      regimeFlipProbability: null, // undefined in spec — do not fabricate
    },
  };
}
