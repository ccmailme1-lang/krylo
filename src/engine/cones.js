// Shared cone source of truth — consumed by Workstation and ConsoleDashboard

export const BAY_MAP = {
  C01: 'financial',
  C02: 'operating',
  C03: 'time',
  C04: 'personal',
  C05: 'market',
  C06: 'knowledge',
};

const SIG_TO_CONE = {
  capital: 'financial', ownership: 'financial', financial: 'financial',
  technology: 'operating', operating: 'operating',
  labor: 'time', time: 'time',
  media: 'personal', personal: 'personal',
  market: 'market',
  knowledge: 'knowledge',
};

export const CONES = {
  financial: { value: 0.82, trend: [10, 12, 9, 14, 18], alerts: ['Liquidity tightening'], color: '#66FF00' },
  operating: { value: 0.55, trend: [5,  7,  6,  8,  10], alerts: [],                      color: '#007FFF' },
  time:      { value: 0.63, trend: [2,  3,  4,  6,  8],  alerts: ['Drift increasing'],    color: '#007FFF' },
  personal:  { value: 0.71, trend: [8,  7,  6,  5,  4],  alerts: ['Recovery deficit'],    color: '#66FF00' },
  market:    { value: 0.66, trend: [6,  7,  9,  11, 10], alerts: [],                      color: '#007FFF' },
  knowledge: { value: 0.58, trend: [3,  4,  4,  5,  6],  alerts: [],                      color: '#66FF00' },
};

function deriveConesFromSignals(liveSignals) {
  const acc = {};
  Object.values(BAY_MAP).forEach(d => { acc[d] = []; });

  liveSignals.forEach(sig => {
    // cone_domain (live records) routes via domain; stubs keep source
    const cone = SIG_TO_CONE[((sig.domain ?? sig.source) ?? '').toLowerCase()];
    if (cone) acc[cone].push(Math.min(1, Number(sig.strength ?? 0) / 5));
  });

  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const result = {};
  Object.entries(acc).forEach(([domain, vals]) => {
    const v = avg(vals);
    if (v == null) return;
    const rounded = Math.round(v * 100) / 100;
    const trend   = vals.slice(-5).map(x => Math.round(x * 100));
    const alerts  = vals.filter(x => x > 0.8).map(() => `High signal: ${domain}`);
    const color   = rounded > 0.7 ? '#66FF00' : rounded > 0.4 ? '#007FFF' : 'rgba(255,60,60,0.85)';
    result[domain] = { value: rounded, trend, alerts, color };
  });

  return result;
}

// BAY_NUM_TO_DOMAIN — inverse of BAY_MAP for color override lookup
const BAY_NUM_TO_DOMAIN = Object.fromEntries(
  Object.entries(BAY_MAP).map(([k, v]) => [Number(k.slice(1)), v])
);

export function buildActiveCones(liveSignals, colorOverrides = {}) {
  const live = liveSignals?.length ? deriveConesFromSignals(liveSignals) : {};

  // Build domain-keyed override map from bay-num-keyed overrides
  const domainOverrides = {};
  Object.entries(colorOverrides).forEach(([bayNum, color]) => {
    const domain = BAY_NUM_TO_DOMAIN[Number(bayNum)];
    if (domain) domainOverrides[domain] = color;
  });

  return Object.fromEntries(
    Object.keys(CONES).map(d => {
      const cone = live[d] ?? CONES[d];
      return [d, domainOverrides[d] ? { ...cone, color: domainOverrides[d] } : cone];
    })
  );
}
