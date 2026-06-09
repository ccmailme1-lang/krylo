// WO-ORACLE-MAPPER — Canonical Signal Bridge
// Bridges AnalysisStore session tensor → 4-plane CanonicalSignal contract.
// Import path correction: classifier lives at engine/, not core/.

import { classifyConvergenceState } from '../engine/convergenceclassifier.js';
import { emitTelemetry }            from '../engine/telemetry.js';

// =============================================================================
// ORACLE REGIME MAP
// WO-1126A analytical states → Oracle render regimes.
// raw.stateId (0–4) keyed via STATE_ID_TO_KEY before lookup.
// =============================================================================

const ORACLE_REGIME_MAP = {
  INSUFFICIENT: 'PASSIVE',
  LOW:          'TRACKING',
  BUILDING:     'TRACKING',
  TURBULENT:    'RESONANT',
  HIGH:         'DISPATCH',
};

const STATE_ID_TO_KEY = ['INSUFFICIENT', 'LOW', 'BUILDING', 'TURBULENT', 'HIGH'];

// =============================================================================
// deriveConvergenceState(tensor)
// Bridges tensor {cs, ie} → classifier vector {D, V, A, T}.
// Proxy rationale:
//   D (dependency density)   = cs   (constraint strength ≈ signal density)
//   V (volatility)           = ie   (intent entropy ≈ ambiguity pressure)
//   A (reach)                = cs   (reach correlates with constraint definition)
//   T (temporal coherence)   = 1-ie (coherence = inverse of entropy)
//   telemetryConfidence      = cs
// =============================================================================

export function deriveConvergenceState(tensor = {}) {
  const cs = tensor.constraintStrength ?? 0;
  const ie = tensor.intentEntropy      ?? 0;

  const vector = { D: cs, V: ie, A: cs, T: 1 - ie };
  const raw    = classifyConvergenceState(vector, cs);

  const oracleKey = STATE_ID_TO_KEY[raw.stateId] ?? 'INSUFFICIENT';

  return {
    raw,
    state: ORACLE_REGIME_MAP[oracleKey] ?? 'PASSIVE',
    score: tensor.resonance ?? tensor.constraintStrength ?? 0,
  };
}

// =============================================================================
// deriveEmphasis(tensor)
// Projection-layer render prominence. NOT an analytical field.
// Weighting: cs×0.45 + ie×0.35 + vol×0.20
// =============================================================================

export function deriveEmphasis(tensor = {}) {
  const cs  = tensor.constraintStrength ?? 0;
  const ie  = tensor.intentEntropy      ?? 0;
  const vol = tensor.volatility         ?? 0;

  const pressure = (cs * 0.45) + (ie * 0.35) + (vol * 0.20);

  if (pressure >= 0.78) return 'high';
  if (pressure >= 0.42) return 'medium';
  return 'low';
}

// =============================================================================
// computePressureScalar(tensor)
// Shared weighting field for topology, cone deformation, replay prominence,
// typography density, precursor surfacing, signal prioritization.
// Future: projection.ui.pressure.
// =============================================================================

export function computePressureScalar(tensor = {}) {
  const cs  = tensor.constraintStrength ?? 0;
  const ie  = tensor.intentEntropy      ?? 0;
  const vol = tensor.volatility         ?? 0;

  return (cs * 0.45) + (ie * 0.35) + (vol * 0.20);
}

// =============================================================================
// useOracleMapper(session)
// Maps raw AnalysisStore session → 4-plane CanonicalSignal.
// Planes: meta (identity) · tensor (raw) · inference (interpretation) · projection (render)
// =============================================================================

export function useOracleMapper(session) {
  if (!session) return null;

  const tensor  = session.tensor ?? {};
  const actions = session.actions ?? [];

  const convergence = deriveConvergenceState(tensor);
  const emphasis    = deriveEmphasis(tensor);

  const ts = Date.now();

  emitTelemetry({
    type:            'projection_generated',
    sessionId:       session.id,
    actionCount:     actions.length,
    confidenceScore: tensor.confidence ?? 0,
    timestamp:       ts,
  });

  actions.forEach(action => {
    emitTelemetry({
      type:       'action_dispatched',
      sessionId:  session.id,
      actionId:   action.actionId,
      actionType: action.type,
      payload:    action.payload,
      timestamp:  ts,
    });
  });

  return {
    meta: {
      session_id:     session.id,
      query:          session.query,
      ts_created:     session.createdAt,
      ts_updated:     session.updatedAt,
      replayable:     true,
      historical:     !!session.historical,
      engine_version: session.engineVersion ?? 'unknown',
    },

    tensor: {
      cs:              tensor.constraintStrength ?? 0,
      ie:              tensor.intentEntropy      ?? 0,
      domains:         tensor.domains            ?? [],
      volatility:      tensor.volatility         ?? 0,
      divergence:      tensor.divergence         ?? 0,
      resonance:       tensor.resonance          ?? 0,
      topology_vector: tensor.topologyVector     ?? [0, 0, 0],
      confidence:      tensor.confidence         ?? 0,
    },

    inference: {
      convergence,
      causal: {
        trigger:   tensor.trigger,
        parent_id: tensor.parentId,
        rule_id:   tensor.ruleId,
      },
      trajectory: {
        direction:    tensor.direction    ?? 0,
        acceleration: tensor.acceleration ?? 0,
      },
    },

    projection: {
      lens:    tensor.lens ?? '10K View',
      actions,
      ui: {
        priority:        tensor.priority ?? 0,
        emphasis,
        show_topology:   true,
        show_replay:     true,
        show_precursors: (tensor.precursorCount ?? 0) > 0,
      },
    },
  };
}
