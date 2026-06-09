// WO-1326 — Γ: Perceptual Invariant Engine
// Converts graph state G(t) into 5 behavioral invariants.
// Nothing below this layer surfaces raw math in the UI.

const MOCK_G = {
  couplingDensity:    [0.12, 0.18, 0.24, 0.33, 0.41, 0.52, 0.61],
  clusterStability:   0.72,
  clusterDivergence:  0.28,
  firstSpikeToLock:   18,
  edgeActivationMax:  5,
  edgeActivationTotal: 7,
};

// Γ₁ — Convergence Rate
// Source: rate of Ξ density increase across the graph
// Output: "TIGHTENING" / "BUILDING" / "STABLE" / "SPREADING"
export function gamma1(G = MOCK_G) {
  const s = G.couplingDensity;
  const n = s.length;
  const half = Math.floor(n / 2);
  const recent  = s.slice(n - half).reduce((a, v) => a + v, 0) / half;
  const earlier = s.slice(0, half).reduce((a, v) => a + v, 0) / half;
  const rate = recent - earlier;
  const value = Math.min(1, Math.max(0, 0.5 + rate * 2));
  const behavior =
    rate > 0.12 ? 'TIGHTENING' :
    rate > 0.02 ? 'BUILDING'   :
    rate < -0.12 ? 'SPREADING'  : 'STABLE';
  return { value, behavior, series: s, rate };
}

// Γ₂ — Propagation Distance
// Source: max edge-activation spread in Ξ
// Output: "CROSS-DOMAIN" / "REGIONAL" / "CONTAINED"
export function gamma2(G = MOCK_G) {
  const value = G.edgeActivationMax / Math.max(1, G.edgeActivationTotal);
  const behavior =
    value > 0.7 ? 'CROSS-DOMAIN' :
    value > 0.4 ? 'REGIONAL'     : 'CONTAINED';
  return { value, behavior, reached: G.edgeActivationMax, total: G.edgeActivationTotal };
}

// Γ₃ — Structural Persistence
// Source: temporal stability of dominant cluster membership
// Output: "LOCKED" / "HOLDING" / "FRAGMENTING"
export function gamma3(G = MOCK_G) {
  const value = G.clusterStability;
  const behavior =
    value > 0.65 ? 'LOCKED'      :
    value > 0.35 ? 'HOLDING'     : 'FRAGMENTING';
  return { value, behavior };
}

// Γ₄ — Phase Drift
// Source: divergence rate between cluster vectors over time
// Output: "SYNCHRONIZING" / "NEUTRAL" / "FRAGMENTING"
export function gamma4(G = MOCK_G) {
  const value = 1 - G.clusterDivergence;
  const behavior =
    value > 0.65 ? 'SYNCHRONIZING' :
    value > 0.35 ? 'NEUTRAL'       : 'FRAGMENTING';
  return { value, behavior };
}

// Γ₅ — Coherence Latency
// Source: time delta between first Φ spike and Ξ lock across nodes
// Output: "IMMEDIATE" / "DELAYED" / "LAGGING"
export function gamma5(G = MOCK_G) {
  const maxWindow = 96;
  const value = Math.max(0, 1 - G.firstSpikeToLock / maxWindow);
  const behavior =
    G.firstSpikeToLock < 24 ? 'IMMEDIATE' :
    G.firstSpikeToLock < 48 ? 'DELAYED'   : 'LAGGING';
  return { value, behavior, hours: G.firstSpikeToLock };
}

export function computeGamma(G = MOCK_G) {
  return {
    G1: gamma1(G),
    G2: gamma2(G),
    G3: gamma3(G),
    G4: gamma4(G),
    G5: gamma5(G),
  };
}
