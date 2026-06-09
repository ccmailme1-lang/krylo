// WO-1336 L2 — Vector Engine (Correlation Layer)
// Computes causal gradients, convergence score, emergence detection.
// Stateful (hysteresis). Projection layer cannot alter classifier output.
// Replay and live operate against identical logic.

const EMA_ALPHA = 0.18;

export const VectorEngineState = Object.freeze({
  IDLE:              0,
  INGESTING:         1,
  RESONANCE_BUILDING: 2,
  TURBULENT:         3,
  HIGH_CONVERGENCE:  4,
  DEGRADED:          5,
  LOCKED:            6,
});

// Legal state transitions — any unlisted transition is forbidden
const LEGAL_TRANSITIONS = new Map([
  [VectorEngineState.IDLE,              new Set([VectorEngineState.INGESTING, VectorEngineState.LOCKED])],
  [VectorEngineState.INGESTING,         new Set([VectorEngineState.RESONANCE_BUILDING, VectorEngineState.TURBULENT, VectorEngineState.DEGRADED, VectorEngineState.LOCKED])],
  [VectorEngineState.RESONANCE_BUILDING,new Set([VectorEngineState.HIGH_CONVERGENCE, VectorEngineState.TURBULENT, VectorEngineState.INGESTING, VectorEngineState.LOCKED])],
  [VectorEngineState.TURBULENT,         new Set([VectorEngineState.INGESTING, VectorEngineState.RESONANCE_BUILDING, VectorEngineState.DEGRADED, VectorEngineState.LOCKED])],
  [VectorEngineState.HIGH_CONVERGENCE,  new Set([VectorEngineState.RESONANCE_BUILDING, VectorEngineState.INGESTING, VectorEngineState.LOCKED])],
  [VectorEngineState.DEGRADED,          new Set([VectorEngineState.INGESTING, VectorEngineState.LOCKED])],
  [VectorEngineState.LOCKED,            new Set([])], // terminal — only OS reset can unlock
]);

export class VectorEngine {
  constructor() {
    this._state    = VectorEngineState.IDLE;
    this._ema      = 0;
    this._stateId  = 0; // numeric id matches FsmState: 4 = HIGH_CONVERGENCE
    this._hysteresis_count = 0;
  }

  // Core computation — deterministic given same inputs.
  // Returns { convergenceScore, noveltyDelta, stateId, emergence, state }.
  compute({ D = 0, V = 0, A = 0, T = 0 } = {}) {
    const convergenceScore = clamp01(0.35 * D + 0.35 * A + 0.20 * T + 0.10 * (1 - V));
    const noveltyDelta     = convergenceScore - this._ema;
    this._ema              = this._ema + EMA_ALPHA * (convergenceScore - this._ema);

    const nextStateId = this._classifyState(convergenceScore, V);
    this._advanceState(nextStateId);

    const emergence = (
      this._stateId === 4 &&
      convergenceScore > 0.70 &&
      noveltyDelta > 0.05
    );

    return {
      convergenceScore,
      noveltyDelta,
      stateId: this._stateId,
      emergence,
      state: this._state,
    };
  }

  _classifyState(score, V) {
    if (score > 0.85) return 4; // HIGH_CONVERGENCE
    if (V > 0.7)      return 3; // TURBULENT
    if (score > 0.40) return 2; // RESONANCE_BUILDING
    if (score > 0.05) return 1; // INGESTING
    return 0;                   // IDLE
  }

  _advanceState(nextStateId) {
    // _stateId always follows the classifier output — emergence check is score-driven.
    // FSM _state follows legal transitions for operational behavior.
    this._stateId = nextStateId;

    const nextVesState = [
      VectorEngineState.IDLE,
      VectorEngineState.INGESTING,
      VectorEngineState.RESONANCE_BUILDING,
      VectorEngineState.TURBULENT,
      VectorEngineState.HIGH_CONVERGENCE,
    ][nextStateId] ?? VectorEngineState.INGESTING;

    const legal = LEGAL_TRANSITIONS.get(this._state) ?? new Set();
    if (nextVesState !== this._state && legal.has(nextVesState)) {
      this._state = nextVesState;
      this._hysteresis_count = 0;
    } else {
      this._hysteresis_count++;
    }
  }

  lock() { this._state = VectorEngineState.LOCKED; }
  get locked() { return this._state === VectorEngineState.LOCKED; }
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
