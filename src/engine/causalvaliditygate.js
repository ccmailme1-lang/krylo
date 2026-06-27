// WO-2007.2 — Causal Validity Gate
// Tests whether a proposed upstream node is IDENTIFIABLE as causal.
// Returns: 'IDENTIFIABLE' | 'CONFOUNDED' | 'UNRESOLVED'
//
// Three criteria — ALL must hold for IDENTIFIABLE:
//   1. Removing upstream signal increases target prediction error ≥ 15%
//   2. Effect stable across ≥ 2 distinct regimes
//   3. No equally predictive non-causal substitute found (confounder substitution)
//
// n < MIN_HISTORY_N → UNRESOLVED. Silence beats fabrication.

const MIN_HISTORY_N          = 10;
const ERROR_INCREASE_FLOOR   = 0.15;  // 15% error increase required
const MIN_REGIMES            = 2;

// assess — main entry point
// upstreamHistory: number[] (0–1 normalized signal values, aligned with target)
// targetHistory:   number[] (0–1 normalized target values)
// regimes:         string[] (regime label per observation, e.g. 'BULL'/'BEAR')
// confounders:     { values: number[], label: string }[]
export function assess({ upstreamHistory = [], targetHistory = [], regimes = [], confounders = [] }) {
  const n = Math.min(upstreamHistory.length, targetHistory.length);

  if (n < MIN_HISTORY_N) {
    return { validity: 'UNRESOLVED', reason: `n=${n} < min=${MIN_HISTORY_N}`, n };
  }

  // Criterion 1 — prediction error increase without upstream
  const baseError  = _mae(upstreamHistory, targetHistory);
  const naiveError = _mae(null, targetHistory);
  const errorIncrease = naiveError > 0 ? (naiveError - baseError) / naiveError : 0;

  if (errorIncrease < ERROR_INCREASE_FLOOR) {
    return {
      validity: 'CONFOUNDED',
      reason:   `Error increase ${(errorIncrease * 100).toFixed(1)}% < ${ERROR_INCREASE_FLOOR * 100}% threshold`,
      n,
    };
  }

  // Criterion 2 — regime stability
  const distinctRegimes = new Set(regimes.filter(Boolean)).size;
  if (regimes.length > 0 && distinctRegimes < MIN_REGIMES) {
    return {
      validity: 'CONFOUNDED',
      reason:   `Effect observed in ${distinctRegimes} regime — stability unconfirmed`,
      n,
    };
  }

  // Criterion 3 — confounder substitution
  for (const conf of confounders) {
    if (!conf.values?.length) continue;
    const confError = _mae(conf.values, targetHistory);
    if (confError <= baseError) {
      return {
        validity: 'CONFOUNDED',
        reason:   `Confounder "${conf.label}" equally or more predictive`,
        n,
      };
    }
  }

  return { validity: 'IDENTIFIABLE', reason: 'All three criteria satisfied', n };
}

// Mean Absolute Error with linear prediction from upstream; null upstream = naive mean prediction
function _mae(upstream, target) {
  const n = target.length;
  if (!upstream) {
    const mean = target.reduce((s, v) => s + v, 0) / n;
    return target.reduce((s, v) => s + Math.abs(v - mean), 0) / n;
  }
  const upMean  = upstream.reduce((s, v) => s + v, 0) / n;
  const tgMean  = target.reduce((s, v) => s + v, 0) / n;
  let cov = 0, varUp = 0;
  for (let i = 0; i < n; i++) {
    cov   += (upstream[i] - upMean) * (target[i] - tgMean);
    varUp += (upstream[i] - upMean) ** 2;
  }
  const slope     = varUp > 0 ? cov / varUp : 0;
  const intercept = tgMean - slope * upMean;
  return target.reduce((s, v, i) => s + Math.abs(v - (intercept + slope * upstream[i])), 0) / n;
}
