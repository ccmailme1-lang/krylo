// WO-2013 — Bounded Adaptive Coupling (BAC)
// Computes coupling scalar C ∈ [0.1, 0.6] controlling narrative influence on
// Recon Layer exploration routing. Static weights, no learning loop.
// computeC(state) → C scalar

const W1 = 0.30; // instability weight
const W2 = 0.25; // drift weight
const W3 = 0.25; // entropy weight
const W4 = 0.20; // correlation (anti-bias lock)

const C_MIN = 0.10;
const C_MAX = 0.60;
const ANTI_BIAS_THRESHOLD = 0.75; // R > this → force C_MIN

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

// S: regime stability (0–1) — 1-volatilityScore from convergenceclassifier
// D: narrative drift (0–1) — cosine distance between NV snapshots
// H: system entropy (0–1) — normalized Shannon entropy of domain pressure distribution
// R: cross-layer correlation (0–1) — corr(NV, attention allocation) from ring buffer
export function computeC({ S = 0.5, D = 0.3, H = 0.3, R = 0.2 } = {}) {
  // Anti-bias hard lock: if narrative and attention are too correlated, floor coupling
  if (R > ANTI_BIAS_THRESHOLD) return C_MIN;

  const raw = W1 * (1 - S) + W2 * D + W3 * H - W4 * R;
  return clamp(raw, C_MIN, C_MAX);
}

// Convenience: derive inputs from reconlayer ring buffer state
// nvHistory: last N NV snapshots (arrays of domain weights)
// attentionHistory: last N attention weight vectors
export function computeCFromHistory(nvHistory = [], attentionHistory = [], volatilityScore = 0.5, domainPressures = {}) {
  const S = clamp(1 - volatilityScore, 0, 1);

  // D: average cosine distance between consecutive NV snapshots
  let D = 0.3; // default when insufficient history
  if (nvHistory.length >= 2) {
    const last = nvHistory[nvHistory.length - 1] ?? [];
    const prev = nvHistory[nvHistory.length - 2] ?? [];
    const dot  = last.reduce((acc, v, i) => acc + v * (prev[i] ?? 0), 0);
    const magA = Math.sqrt(last.reduce((acc, v) => acc + v * v, 0)) || 1;
    const magB = Math.sqrt(prev.reduce((acc, v) => acc + v * v, 0)) || 1;
    D = clamp(1 - dot / (magA * magB), 0, 1);
  }

  // H: Shannon entropy of domain pressures, normalized by log(6)
  const pressures = Object.values(domainPressures).map(v => (v ?? 0) / 100).filter(v => v > 0);
  let H = 0.3;
  if (pressures.length > 0) {
    const total = pressures.reduce((a, b) => a + b, 0) || 1;
    const norm  = pressures.map(p => p / total);
    const entropy = -norm.reduce((acc, p) => acc + (p > 0 ? p * Math.log(p) : 0), 0);
    H = clamp(entropy / Math.log(6), 0, 1);
  }

  // R: Pearson correlation between last 5 NV sums and attention sums
  let R = 0.2;
  const N = Math.min(nvHistory.length, attentionHistory.length, 5);
  if (N >= 3) {
    const xs = nvHistory.slice(-N).map(v => v.reduce((a, b) => a + b, 0));
    const ys = attentionHistory.slice(-N).map(v => v.reduce((a, b) => a + b, 0));
    const xm = xs.reduce((a, b) => a + b, 0) / N;
    const ym = ys.reduce((a, b) => a + b, 0) / N;
    const cov = xs.reduce((acc, x, i) => acc + (x - xm) * (ys[i] - ym), 0) / N;
    const sdx = Math.sqrt(xs.reduce((acc, x) => acc + (x - xm) ** 2, 0) / N) || 1;
    const sdy = Math.sqrt(ys.reduce((acc, y) => acc + (y - ym) ** 2, 0) / N) || 1;
    R = clamp(cov / (sdx * sdy), 0, 1);
  }

  return computeC({ S, D, H, R });
}
