/**
 * WO-873: State Contract — Active-State Promotion Engine
 * Promotion formula: (R × V) / FS ≥ τ
 *
 * R = min(1.0, speedScale / 4.0)  — resonance proxy via viral spread
 * V = |fsVal[t] - fsVal[t-2]| / max(fsVal[t-2], 0.01)  — scale acceleration over 3 cycles
 * FS = node.fsVal  — friction score (0–1)
 * τ = 0.82  — dynamic threshold (tunable)
 *
 * Gates (all three must pass before formula runs):
 *   R > 0.82
 *   V > 0.15 (15% delta)
 *   FS < 0.3
 */

const R_GATE       = 0.82;
const V_GATE       = 0.15;
const FS_GATE      = 0.30;
const TAU          = 0.82;
const COOLDOWN_MS  = 30_000;
const HISTORY_LEN  = 3;

// Per-node history: { fsHist: [f0,f1,f2], rHist: [r0,r1,r2], lastPromotedAt: number }
const nodeHistory = new Map();

function getHistory(nodeId) {
  if (!nodeHistory.has(nodeId)) {
    nodeHistory.set(nodeId, { fsHist: [], rHist: [], lastPromotedAt: 0 });
  }
  return nodeHistory.get(nodeId);
}

function pushHistory(hist, fsVal, r) {
  hist.fsHist.push(fsVal);
  hist.rHist.push(r);
  if (hist.fsHist.length > HISTORY_LEN) hist.fsHist.shift();
  if (hist.rHist.length  > HISTORY_LEN) hist.rHist.shift();
}

/**
 * tickStateContract — evaluate all nodes in stateRef against promotion formula.
 * Returns array of promoted node descriptors: { id, idx, score, R, V, FS }
 */
export function tickStateContract(stateRef, now = Date.now()) {
  const promoted = [];
  const nodes = stateRef.current;

  for (let idx = 0; idx < nodes.length; idx++) {
    const node = nodes[idx];
    if (!node || !node.primary || node.isZombie) continue;

    const id   = node.id ?? String(idx);
    const hist = getHistory(id);
    const fs   = node.fsVal    ?? 0;
    const ss   = node.speedScale ?? 1;
    const r    = Math.min(1.0, ss / 4.0);

    pushHistory(hist, fs, r);

    // Need full 3-cycle history before evaluating
    if (hist.fsHist.length < HISTORY_LEN) continue;

    // Cooldown — don't re-promote within 30s
    if (now - hist.lastPromotedAt < COOLDOWN_MS) continue;

    // Gate checks
    const rCurrent = hist.rHist[HISTORY_LEN - 1];
    if (rCurrent <= R_GATE) continue;
    if (fs >= FS_GATE)      continue;

    const fsOld = hist.fsHist[0];
    const V = Math.abs(fs - fsOld) / Math.max(fsOld, 0.01);
    if (V <= V_GATE) continue;

    // Promotion formula
    const score = (rCurrent * V) / Math.max(fs, 0.001);
    if (score < TAU) continue;

    hist.lastPromotedAt = now;
    promoted.push({ id, idx, score: Number(score.toFixed(4)), R: rCurrent, V: Number(V.toFixed(4)), FS: fs });
  }

  return promoted;
}

export function evictNodeHistory(nodeId) {
  nodeHistory.delete(nodeId);
}

export function clearStateHistory() {
  nodeHistory.clear();
}
