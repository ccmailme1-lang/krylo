/**
 * Core — Truth Engine infrastructure
 * WO-205 | All exports
 */
export { sharedSignalBus } from './SharedSignalBus';
export type {
  EngineState,
  EngineTrend,
  SignalRecord,
  ComputedSignals,
  ClockState,
  BusSnapshot,
} from './SharedSignalBus';

export {
  useMetabolicClock,
  getMetabolicTick,
  getMetabolicPhase,
  TARGET_HZ,
  TARGET_MS,
} from './useMetabolicClock';

export {
  useTruthEngine,
  useSignalBusSnapshot,
  computeConvergence,
  deriveState,
  deriveTrend,
} from './useTruthEngine';
