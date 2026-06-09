// WO-1126A.v2 — Convergence Classifier + Hysteresis Buffer
// Heuristic only. No predictive claims. UI compression states, not unified scalars.

// ── THEME TOKENS ────────────────────────────────────────────────────────────
// void_gray     → #000000 (existing --moat-bg)
// muted_slate   → low-signal muted state
// signal_lime   → #66FF00 (existing --signal-lime)
// signal_blue   → #007FFF (existing Leverage Lattice blue)
// unicorn_purple → #8A2BE2 (existing --unicorn-purple)

// ── CLASSIFIER ──────────────────────────────────────────────────────────────

export function classifyConvergenceState(vector, telemetryConfidence) {
  const { D, V, A, T } = vector;
  let stateId, label, theme;

  // 0: EPISTEMIC UNCERTAINTY
  if (telemetryConfidence < 0.50 || (D < 0.1 && A < 0.1)) {
    [stateId, label, theme] = [0, 'INSUFFICIENT SIGNAL', 'void_gray'];
  }
  // 1: BASELINE NOISE
  else if (D < 0.4 && A < 0.4) {
    [stateId, label, theme] = [1, 'LOW SIGNAL YIELD', 'muted_slate'];
  }
  // 3: TURBULENT — high volatility paired with poor temporal alignment
  else if (V > 0.8 && T < 0.5) {
    [stateId, label, theme] = [3, 'TURBULENT CONVERGENCE', 'signal_blue'];
  }
  // 4: IDEAL PRECURSOR
  else if (D >= 0.75 && A >= 0.75 && T >= 0.6 && V <= 0.6) {
    [stateId, label, theme] = [4, 'HIGH CONVERGENCE', 'unicorn_purple'];
  }
  // 2: STANDARD ACCUMULATION
  else {
    [stateId, label, theme] = [2, 'BUILDING CONVERGENCE', 'signal_lime'];
  }

  return { classifierVersion: '1126A.v2', stateId, label, theme };
}

// ── HYSTERESIS BUFFER ────────────────────────────────────────────────────────
// Prevents frame-to-frame UI toggling by requiring state persistence.

const stateBuffer = [];
const PERSISTENCE_REQUIRED = 3;

let lockedCognitiveState = { stateId: 0, label: 'INSUFFICIENT SIGNAL', theme: 'void_gray' };

export function applyTransitionPolicy(rawStateEvaluation) {
  stateBuffer.push(rawStateEvaluation.stateId);

  if (stateBuffer.length > PERSISTENCE_REQUIRED) {
    stateBuffer.shift();
  }

  const isStable =
    stateBuffer.length === PERSISTENCE_REQUIRED &&
    stateBuffer.every(id => id === rawStateEvaluation.stateId);

  if (isStable && lockedCognitiveState.stateId !== rawStateEvaluation.stateId) {
    lockedCognitiveState = rawStateEvaluation;
  }

  return lockedCognitiveState;
}

export function resetHysteresisBuffer() {
  stateBuffer.length = 0;
  lockedCognitiveState = { stateId: 0, label: 'INSUFFICIENT SIGNAL', theme: 'void_gray' };
}

// ── FRAGILITY PHASE CLASSIFIER (WO-1384) ─────────────────────────────────────
// Bubble-physics lifecycle detection. Feed-forward only — no UI params.
// Phase 1: system looks strong, zero sub-surface buffer (Molecular Setup)
// Phase 2: expanding but volatility says it's cannibalizing itself (Marangoni)
// Phase 3: TURBULENT — straining at critical threshold (Tenuous Critical Point)
// Phase 4: signal collapsed (The Snap)

export function detectFragilityPhase(vector, fs, stateId) {
  const V = Number(vector?.V ?? 0);

  if (stateId <= 1)                               return { phase: 4, label: 'PHASE_4_SNAP' };
  if (stateId === 3)                              return { phase: 3, label: 'PHASE_3_TENUOUS' };
  if (stateId === 4 && fs < 0.50)                return { phase: 1, label: 'PHASE_1_SETUP' };
  if (stateId >= 2 && V > 0.70)                  return { phase: 2, label: 'PHASE_2_MARANGONI' };
  return { phase: 0, label: 'NOMINAL' };
}
