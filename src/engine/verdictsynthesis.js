// WO-1331 — Verdict Synthesis Engine
// Welford online algorithm for geo-anchored salary stats + 5-point tactical verdict.
// Cache is queried BEFORE update — first-run geo anchor returns mu: null (no prior data).
//
// WO-1722 — Cross-Domain Synthesis Layer (Munger Protocol)
// synthesizeCrossDomain(domainStates) fires when ≥3 domains reach BUILDING CONVERGENCE
// simultaneously with Fs ≥ 0.70 per domain. Provenance from each contributing domain.

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

// ── WO-1722: CROSS-DOMAIN SYNTHESIS (MUNGER PROTOCOL) ───────────────────────

const MUNGER_FS_GATE    = 0.70;
const MUNGER_MIN_DOMAINS = 3;
const BUILDING_LABEL    = 'BUILDING CONVERGENCE';

// Synthesis statements keyed by sorted domain combination.
// Fallback handles any unlisted combination.
const SYNTHESIS_MAP = {
  'CAPITAL+KNOWLEDGE+TECHNOLOGY':  'Capital formation, knowledge infrastructure, and technology adoption are aligning. Category viability threshold is being crossed.',
  'CAPITAL+KNOWLEDGE+MEDIA':       'Financial conviction, knowledge accumulation, and narrative permission are converging. The window for decisive action is narrowing.',
  'CAPITAL+LABOR+TECHNOLOGY':      'Capital availability, workforce formation, and infrastructure readiness are converging. Platform maturity conditions are forming.',
  'CAPITAL+MEDIA+TECHNOLOGY':      'Capital flow, narrative momentum, and technology adoption are aligning. Market formation is accelerating.',
  'KNOWLEDGE+LABOR+TECHNOLOGY':    'Intellectual momentum, workforce readiness, and infrastructure adoption are converging. Structural shift conditions are forming.',
  'CAPITAL+KNOWLEDGE+OWNERSHIP':   'Capital deployment, knowledge conviction, and ownership repositioning are converging. A reallocation event is forming.',
  'CAPITAL+LABOR+MEDIA':           'Capital pressure, workforce signals, and narrative momentum are aligning. Macro conditions are reaching inflection.',
  'KNOWLEDGE+MEDIA+TECHNOLOGY':    'Intellectual momentum, narrative permission, and technology convergence are aligning. Category definition is forming.',
  'LABOR+MEDIA+OWNERSHIP':         'Workforce pressure, narrative momentum, and ownership repositioning are converging simultaneously.',
  'CAPITAL+MEDIA+OWNERSHIP':       'Capital flow, narrative dominance, and ownership concentration are aligning. Position consolidation is accelerating.',
  'CAPITAL+KNOWLEDGE+LABOR+MEDIA': 'Four-domain simultaneous convergence detected. Capital, knowledge, labor, and media alignment is rare. Conviction threshold exceeded.',
};

function _synthesisText(domains) {
  const key = [...domains].sort().join('+');
  if (SYNTHESIS_MAP[key]) return SYNTHESIS_MAP[key];
  const last = domains[domains.length - 1];
  const rest = domains.slice(0, -1).join(', ');
  return `${rest} and ${last} are converging simultaneously. Multi-domain alignment indicates elevated signal certainty.`;
}

// synthesizeCrossDomain(domainStates)
//
// domainStates: [{ domain, convergenceLabel, fs }]
//   domain:           string  — one of TECHNOLOGY/CAPITAL/KNOWLEDGE/LABOR/MEDIA/OWNERSHIP
//   convergenceLabel: string  — from classifyConvergenceState() or proxy
//   fs:               number  — fidelity score 0–1
//
// Returns synthesis envelope or null if gate not met.
export function synthesizeCrossDomain(domainStates) {
  if (!Array.isArray(domainStates) || domainStates.length === 0) return null;

  const qualifying = domainStates.filter(
    d => d.convergenceLabel === BUILDING_LABEL && (d.fs ?? 0) >= MUNGER_FS_GATE
  );

  if (qualifying.length < MUNGER_MIN_DOMAINS) return null;

  const domains    = qualifying.map(d => d.domain);
  const mungerScore = parseFloat(
    (qualifying.reduce((s, d) => s + d.fs, 0) / qualifying.length).toFixed(3)
  );

  return {
    triggered:        true,
    convergingDomains: domains,
    domainCount:      qualifying.length,
    provenance:       qualifying.map(d => ({ domain: d.domain, convergenceLabel: d.convergenceLabel, fs: d.fs })),
    synthesis:        _synthesisText(domains),
    mungerScore,
    ts:               Date.now(),
  };
}

// ── WO-1331: VERDICT SYNTHESIS ───────────────────────────────────────────────

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
