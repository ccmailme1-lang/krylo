/**
 * useMetabolicClock — 4.4Hz (227ms) drift-corrected clock
 * WO-205 | Owner: Mark Erikson | Platform: Claude Sonnet
 *
 * Runs independently of React render cycle.
 * Writes to SharedSignalBus. Components read via useSyncExternalStore.
 * Drift correction: compares expected vs actual elapsed time each tick.
 */

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { sharedSignalBus } from './SharedSignalBus';

const TARGET_HZ = 4.4;
const TARGET_MS = Math.round(1000 / TARGET_HZ); // 227ms

export function useMetabolicClock() {
  const startTimeRef = useRef<number>(0);
  const tickRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    startTimeRef.current = performance.now();
    tickRef.current = 0;

    sharedSignalBus.updateClock({ running: true, tick: 0, phase: 0, driftMs: 0 });
    sharedSignalBus.emit();

    function scheduleTick() {
      tickRef.current++;
      const tick = tickRef.current;
      const now = performance.now();
      const elapsed = now - startTimeRef.current;
      const expected = tick * TARGET_MS;
      const drift = elapsed - expected;

      // Phase: 0-1 sawtooth within each tick
      const phase = (elapsed % TARGET_MS) / TARGET_MS;

      // Write to bus (no React re-render — just store update)
      sharedSignalBus.updateClock({
        tick,
        phase,
        driftMs: drift,
        running: true,
      });
      // Don't emit on every tick — let consumers opt-in to clock reads
      // Only emit when other state changes (Truth Engine, etc.)

      // Drift correction: adjust next interval to compensate
      const nextDelay = Math.max(1, TARGET_MS - drift);
      timerRef.current = setTimeout(scheduleTick, nextDelay);
    }

    timerRef.current = setTimeout(scheduleTick, TARGET_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      sharedSignalBus.updateClock({ running: false });
      sharedSignalBus.emit();
    };
  }, []);

  // Return current clock snapshot (only re-renders when bus emits)
  return useSyncExternalStore(
    sharedSignalBus.subscribe,
    () => sharedSignalBus.getSnapshot().clock
  );
}

/**
 * useMetabolicPhase — lightweight read-only hook for animation consumers.
 * Reads clock.tick from the bus without subscribing to every tick.
 * Use inside requestAnimationFrame loops instead.
 */
export function getMetabolicTick(): number {
  return sharedSignalBus.getSnapshot().clock.tick;
}

export function getMetabolicPhase(): number {
  return sharedSignalBus.getSnapshot().clock.phase;
}

export { TARGET_HZ, TARGET_MS };
