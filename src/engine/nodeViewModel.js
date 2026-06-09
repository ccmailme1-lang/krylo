// nodeViewModel.js — WO-CL-01
// Pure function: liveSignals → deterministic visual state objects
// Canvas never interprets raw signals. It only renders pre-decided visual truth.
// No physics. No randomness. Deterministic from signal properties only.

export const MODE = {
  LIVE:      'LIVE',
  CAUSAL:    'CAUSAL',
  EMERGENCE: 'EMERGENCE',
};

// Deterministic float [0,1] from any string — used for stable spatial placement
function idToFloat(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// Second hash axis — orthogonal to idToFloat
function idToFloat2(str) {
  let h = 1009;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return (h % 10000) / 10000;
}

function assignMode(sig) {
  const fs = sig.fs ?? 0;
  if (fs >= 0.75) return MODE.EMERGENCE;
  if ((sig.fidelity?.t_telemetry ?? 0) > 0.08 || (sig.fidelity?.m_checksum ?? 0) > 0.08) {
    return MODE.CAUSAL;
  }
  return MODE.LIVE;
}

// buildNodeViewModel — PURE FUNCTION
// Returns normalized coords [0,1] — canvas scales to actual dimensions
export function buildNodeViewModel(signals) {
  if (!signals?.length) return [];

  const sorted = [...signals].sort((a, b) => (b.fs ?? 0) - (a.fs ?? 0));

  const nodes = sorted.map((sig, i) => {
    const id  = String(sig.id ?? `node-${i}`);
    const fs  = sig.fs ?? 0;
    const mode = assignMode(sig);

    const x = 0.05 + idToFloat(id) * 0.90;
    const yBase   = mode === MODE.EMERGENCE ? 0.15 : mode === MODE.CAUSAL ? 0.45 : 0.72;
    const yJitter = (idToFloat2(id) - 0.5) * 0.25;
    const y = Math.max(0.04, Math.min(0.96, yBase + yJitter));

    return {
      id,
      x,
      y,
      intensity:       fs,
      mode,
      activeNeighbors: [],      // WO-CL-02: populated below
      label:           sig.text ?? sig.id ?? '—',
      source:          sig.source ?? 'unknown',
    };
  });

  // WO-CL-02 — assign neighbors for CAUSAL + EMERGENCE nodes
  // Max 3 edges per node. Deterministic by spatial proximity. Hidden from LIVE.
  const edgeEligible = nodes.filter(n => n.mode !== MODE.LIVE);
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));

  for (const node of edgeEligible) {
    const distances = edgeEligible
      .filter(n => n.id !== node.id)
      .map(n => ({
        id:   n.id,
        dist: Math.hypot(n.x - node.x, n.y - node.y),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);   // hard cull: max 3 neighbors

    node.activeNeighbors = distances.map(d => d.id);
  }

  return nodes;
}
