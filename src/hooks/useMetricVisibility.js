// WO-2009 — useMetricVisibility hook
// React wrapper around computeVisibilityState. Persists state across renders
// via useRef so hysteresis (MIN_STAY_MS + relaxed exit thresholds) survives re-renders.

import { useRef } from 'react';
import { computeVisibilityState } from '../engine/metricvisibility.js';

// metrics: from computeMetrics() — must include .sci and .sps
// dynamics: from computeTruthDynamics() — optional (null until identity bridge wired)
export function useMetricVisibility(metrics, dynamics = null) {
  const stateRef = useRef(null);
  stateRef.current = computeVisibilityState(metrics, dynamics, stateRef.current);
  return stateRef.current;
}
