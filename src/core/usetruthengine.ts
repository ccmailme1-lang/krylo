/**
 * useTruthEngine — Truth Engine Protocol v2
 * WO-205 | Owner: Mark Erikson | Platform: Claude Sonnet
 *
 * Ported from krylo.html SignalMap._computeState()
 * Runs on SharedSignalBus. Updates computed signals every 1.5s.
 *
 * Formulas:
 *   Fs = 0.40*metadata + 0.30*telemetry + 0.20*docs + 0.10*signature
 *   Wt = (age/48)^1.5
 *   C  = (Fs * Wt) - Pa  →  clamped [0,1]
 *   state = CALM (<0.25) | WATCH (0.25–0.59) | ALERT (≥0.60)
 *   trend = RISING (ΔC > 0.03) | STABLE | FADING (ΔC < -0.03)
 */

import { useEffect, useRef, useSyncExternalStore } from 'react';
import {
  sharedSignalBus,
  type EngineState,
  type EngineTrend,
  type SignalRecord,
  type ComputedSignals,
} from './SharedSignalBus';

const EPSILON = 0.03;
const UPDATE_INTERVAL = 1500; // ms
const MAX_AGE = 48;
const MAX_PRESSURE = 0.6;

/** Pure computation — no side effects */
export function computeConvergence(record: SignalRecord): {
  Fs: number;
  Wt: number;
  Pa: number;
  C: number;
} {
  const Fs =
    0.4 * record.metadata +
    0.3 * record.telemetry +
    0.2 * record.docs +
    0.1 * record.signature;

  const Wt = Math.pow(Math.min(record.age / MAX_AGE, 1), 1.5);
  const Pa = record.pressure;
  const C = Math.max(0, Math.min(1, Fs * Wt - Pa));

  return { Fs, Wt, Pa, C };
}

export function deriveState(C: number): EngineState {
  if (C < 0.25) return 'CALM';
  if (C < 0.60) return 'WATCH';
  return 'ALERT';
}

export function deriveTrend(C: number, prevC: number): EngineTrend {
  const delta = C - prevC;
  if (delta > EPSILON) return 'RISING';
  if (delta < -EPSILON) return 'FADING';
  return 'STABLE';
}

/** Seeded RNG matching krylo.html implementation */
function createSeededRng(seed: string) {
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = ((state << 5) - state + seed.charCodeAt(i)) | 0;
  }
  state = Math.abs(state) || 1;

  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

/**
 * useTruthEngine — starts the engine loop, writes to SharedSignalBus.
 * @param seed - query string for deterministic entity generation
 */
export function useTruthEngine(seed: string = 'default') {
  const prevCRef = useRef<number>(0);
  const firstFrameRef = useRef<boolean>(true);
  const rngRef = useRef(createSeededRng(seed));

  useEffect(() => {
    // Reset on new seed
    firstFrameRef.current = true;
    prevCRef.current = 0;
    rngRef.current = createSeededRng(seed);

    sharedSignalBus.reset();

    const interval = setInterval(() => {
      const snapshot = sharedSignalBus.getSnapshot();
      const record = snapshot.record;

      // Evolve record (matches krylo.html setInterval logic)
      const rng = rngRef.current;
      const newAge = record.age + 0.5;
      const pressureDelta = (rng() - 0.5) * 0.1;
      const newPressure = Math.max(0, Math.min(MAX_PRESSURE, record.pressure + pressureDelta));

      sharedSignalBus.updateRecord({
        age: newAge,
        pressure: newPressure,
      });

      // Compute
      const updated = sharedSignalBus.getSnapshot().record;
      const { Fs, Wt, Pa, C } = computeConvergence(updated);
      const state = deriveState(C);

      let trend: EngineTrend;
      if (firstFrameRef.current) {
        trend = 'STABLE';
        firstFrameRef.current = false;
      } else {
        trend = deriveTrend(C, prevCRef.current);
      }

      prevCRef.current = C;

      sharedSignalBus.updateComputed({
        Fs, Wt, Pa, C,
        state,
        trend,
        convergence: C,
      });

      sharedSignalBus.emit();
    }, UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [seed]);

  // Subscribe to computed signals
  return useSyncExternalStore(
    sharedSignalBus.subscribe,
    () => sharedSignalBus.getSnapshot().computed
  );
}

/**
 * useSignalBusSnapshot — generic read hook for any part of the bus.
 * Only re-renders when bus emits.
 */
export function useSignalBusSnapshot() {
  return useSyncExternalStore(
    sharedSignalBus.subscribe,
    sharedSignalBus.getSnapshot
  );
}
