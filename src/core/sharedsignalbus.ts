/**
 * SharedSignalBus — Singleton external store for the Truth Engine
 * WO-205 | Owner: Mark Erikson | Platform: Claude Sonnet
 *
 * The single source of truth. All components read from here via
 * useSyncExternalStore. No React re-renders from clock ticks alone.
 */

export type EngineState = 'CALM' | 'WATCH' | 'ALERT';
export type EngineTrend = 'RISING' | 'STABLE' | 'FADING';

export interface SignalRecord {
  metadata: number;
  telemetry: number;
  docs: number;
  signature: number;
  age: number;
  pressure: number;
}

export interface ComputedSignals {
  Fs: number;
  Wt: number;
  Pa: number;
  C: number;
  state: EngineState;
  trend: EngineTrend;
  convergence: number;
}

export interface ClockState {
  tick: number;
  phase: number;       // 0-1 sawtooth
  driftMs: number;     // cumulative drift from ideal
  running: boolean;
}

export interface BusSnapshot {
  record: SignalRecord;
  computed: ComputedSignals;
  clock: ClockState;
}

type Listener = () => void;

const DEFAULT_RECORD: SignalRecord = {
  metadata: 1.0,
  telemetry: 1.0,
  docs: 0.8,
  signature: 1.0,
  age: 6,
  pressure: 0.2,
};

const DEFAULT_COMPUTED: ComputedSignals = {
  Fs: 0, Wt: 0, Pa: 0.2, C: 0,
  state: 'CALM',
  trend: 'STABLE',
  convergence: 0,
};

const DEFAULT_CLOCK: ClockState = {
  tick: 0,
  phase: 0,
  driftMs: 0,
  running: false,
};

class SignalBus {
  private _snapshot: BusSnapshot;
  private _listeners: Set<Listener> = new Set();

  constructor() {
    this._snapshot = {
      record: { ...DEFAULT_RECORD },
      computed: { ...DEFAULT_COMPUTED },
      clock: { ...DEFAULT_CLOCK },
    };
  }

  /** useSyncExternalStore compatible */
  subscribe = (listener: Listener): (() => void) => {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  };

  /** useSyncExternalStore compatible — returns immutable ref until next emit */
  getSnapshot = (): BusSnapshot => {
    return this._snapshot;
  };

  /** Update record fields. Does NOT notify — call emit() after batch updates. */
  updateRecord(partial: Partial<SignalRecord>) {
    this._snapshot = {
      ...this._snapshot,
      record: { ...this._snapshot.record, ...partial },
    };
  }

  /** Update computed signals. Does NOT notify — call emit() after. */
  updateComputed(partial: Partial<ComputedSignals>) {
    this._snapshot = {
      ...this._snapshot,
      computed: { ...this._snapshot.computed, ...partial },
    };
  }

  /** Update clock state. Does NOT notify — call emit() after. */
  updateClock(partial: Partial<ClockState>) {
    this._snapshot = {
      ...this._snapshot,
      clock: { ...this._snapshot.clock, ...partial },
    };
  }

  /** Notify all subscribers. Creates new snapshot ref for useSyncExternalStore. */
  emit() {
    this._snapshot = { ...this._snapshot };
    for (const fn of this._listeners) fn();
  }

  /** Reset to defaults */
  reset() {
    this._snapshot = {
      record: { ...DEFAULT_RECORD },
      computed: { ...DEFAULT_COMPUTED },
      clock: { ...DEFAULT_CLOCK },
    };
    this.emit();
  }
}

/** Singleton instance */
export const sharedSignalBus = new SignalBus();
