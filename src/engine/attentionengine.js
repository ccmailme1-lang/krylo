// WO-2030 — Attention Engine
// Ranks incoming signals { source, domain, signal, confidence, ts } (§16 shape) and keeps
// the top 15 per domain. rank_score = confidence * exp(-lambda * age).
// DECAY_LAMBDA is a tunable default, not a Founder-confirmed constant — adjust if the
// resulting ranking doesn't match observed behavior.
const DECAY_LAMBDA = 0.0005; // ~23min half-life in ms^-1 terms (ln(2)/DECAY_LAMBDA ≈ 1386s)
const TOP_K = 15;

export function rankSignals(signals, domain, now = Date.now()) {
  return (signals ?? [])
    .filter(s => s.domain === domain)
    .map(s => ({
      ...s,
      rank_score: (s.confidence ?? 0) * Math.exp(-DECAY_LAMBDA * Math.max(0, now - (s.ts ?? now))),
    }))
    .sort((a, b) => b.rank_score - a.rank_score)
    .slice(0, TOP_K);
}
