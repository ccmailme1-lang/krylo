// src/engine/surfacecontract.js
// WO-1040 — Continuous Signal Surface Orchestration
// Canonical shape definitions and render authority contracts.
// WO-1300 — OracleSignal fields added to makeClusterNode + signalToNode.

import { normalizeToOracleSignal } from './oraclesignal.js';

export const RENDER_OWNER = {
  CLUSTER: 'cluster',  // ambient field — ClusterField owns the canvas
  MAP:     'map',      // post-submit topology — SignalMap owns the canvas
  ORACLE:  'oracle',   // drilldown — OracleView owns the canvas
};

export const SURFACE_PHASE = {
  AMBIENT:  'ambient',   // pre-search; field drifts at baseline noise
  SCANNING: 'scanning',  // submit fired; topology is responding
  RESOLVED: 'resolved',  // query resolved; nodes locked to signal target
};

export const PERTURBATION = {
  SEARCH:    'search',
  HOVER:     'hover',
  DRILLDOWN: 'drilldown',
  TRACE:     'trace',
};

export function makeClusterNode(overrides = {}) {
  return {
    id:         overrides.id         ?? `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name:       overrides.name       ?? '—',
    state:      overrides.state      ?? 'building',
    position:   overrides.position   ?? [0, 0, 0],
    born:       overrides.born       ?? Date.now(),
    strength:   overrides.strength   ?? 0.7,
    decayRate:  overrides.decayRate  ?? 0,
    // WO-1300 OracleSignal fields — undefined until signalToNode populates them
    value:      overrides.value      ?? undefined,
    confidence: overrides.confidence ?? undefined,
    theme:      overrides.theme      ?? undefined,
    priority:   overrides.priority   ?? undefined,
    stateId:    overrides.stateId    ?? undefined,
  };
}

export function signalToNode(signal, index, total) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  const r     = 2.5 + (index % 3) * 0.9;
  // applyHysteresis: false — bulk node mapping must not corrupt the hysteresis buffer
  const os    = normalizeToOracleSignal(signal, { applyHysteresis: false });
  return makeClusterNode({
    id:       signal.id       ?? `sig_${index}`,
    name:     signal.text     || signal.truth_statement || signal.title || signal.id,
    state:    os?.state       || signal.convergenceState || 'building',
    position: [
      signal.x  ?? Math.cos(angle) * r,
      0,
      signal.z  ?? Math.sin(angle) * r,
    ],
    strength:   signal.strength ?? signal.fs ?? 0.7,
    decayRate:  0,
    born:       Date.now(),
    value:      os?.value,
    confidence: os?.confidence,
    theme:      os?.theme,
    priority:   os?.priority,
    stateId:    os?.stateId,
  });
}
