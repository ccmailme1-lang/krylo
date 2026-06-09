/**
 * useSpineData — Bridge between SharedSignalBus and R3F SpineMap
 * WO-208 | Owner: Paul Henschel | Platform: Claude Opus
 *
 * Reads convergence, state, trend from bus.
 * Returns values formatted for Three.js consumption.
 */

import { useSyncExternalStore } from 'react';
import { sharedSignalBus, type EngineState, type EngineTrend } from '../core/SharedSignalBus';

export interface SpineConfig {
  convergence: number;
  state: EngineState;
  trend: EngineTrend;
  spreadRadius: number;     // 200 * (1 - convergence)
  glowIntensity: number;    // CALM: 0.7, WATCH: 1.0, ALERT: 1.4
  rotationSpeed: number;    // base * trend modifier
  jitterScale: number;      // signal intensity → displacement
}

const GLOW_MAP: Record<EngineState, number> = {
  CALM: 0.7,
  WATCH: 1.0,
  ALERT: 1.4,
};

const TREND_SPEED: Record<EngineTrend, number> = {
  RISING: 1.3,
  STABLE: 1.0,
  FADING: 0.7,
};

const BASE_ROTATION_SPEED = 0.02; // radians per frame at 60fps

export function useSpineData(): SpineConfig {
  const computed = useSyncExternalStore(
    sharedSignalBus.subscribe,
    () => sharedSignalBus.getSnapshot().computed
  );

  return {
    convergence: computed.convergence,
    state: computed.state,
    trend: computed.trend,
    spreadRadius: 200 * (1 - computed.convergence),
    glowIntensity: GLOW_MAP[computed.state],
    rotationSpeed: BASE_ROTATION_SPEED * TREND_SPEED[computed.trend],
    jitterScale: computed.C * 0.3,
  };
}
