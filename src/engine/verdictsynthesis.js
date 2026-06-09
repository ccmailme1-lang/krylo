// WO-1331 — Verdict Synthesis Engine
// Welford online algorithm for geo-anchored salary stats + 5-point tactical verdict.
// Cache is queried BEFORE update — first-run geo anchor returns mu: null (no prior data).

const welfordCache = new Map();

function welfordUpdate(state, value) {
  const n      = state.n + 1;
  const delta  = value - state.mean;
  const mean   = state.mean + delta / n;
  const delta2 = value - mean;
  const M2     = state.M2 + delta * delta2;
  return { n, mean, M2 };
}

function welfordQuery(geo) {
  return welfordCache.get(geo) ?? { n: 0, mean: 0, M2: 0 };
}

export async function synthesizeVerdict(payload) {
  if (!payload?.valid || payload.domain !== 'negotiation') return null;

  const { role, geo, target_salary, org_type } = payload.entities;

  const prior = welfordQuery(geo);
  const mu    = prior.n > 0 ? prior.mean : null;

  if (geo && target_salary) {
    welfordCache.set(geo, welfordUpdate(prior, target_salary));
  }

  return {
    welford_stats: {
      geo: geo ?? null,
      mu,
    },
    nodes: {
      anchor:   { label: 'Salary Anchor',    value: target_salary },
      leverage: { label: 'Leverage Signal',  value: org_type },
      market:   { label: 'Geo Market',       value: geo },
      counter:  { label: 'Counter Guidance', value: null },
      risk:     { label: 'Risk Signal',      value: null },
    },
    active_component: 'SignalMap',
  };
}
