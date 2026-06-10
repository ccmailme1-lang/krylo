// WO-1709 — Editorial Contract Layer
// Declarative suppression + surface cap keyed by session.lens.
// Applied after synthesis, before render. Zero UI changes required.
//
// CONTRACT AUTHORITY: this file (editorialgate.js) is the single source of truth.
// /config/editorial_contracts.yaml was a spec reference artifact — it does not exist
// on disk and should not be created. Edit contracts here only.
//
// Tag vocabulary maps to the `tag` field on each action card
// produced by the domain synthesizers in querysynthesis.js.

// Text-intent override threshold. When detectDomain() confidence >= this value,
// the detected domain overrides the user's chip selection.
export const INTENT_OVERRIDE_THRESHOLD = 0.80;

const CONTRACTS = {
  EXPENSE: {
    suppressedTags: ['CONTRIBUTIONS'],
    maxSurface:     5,
    heroField:      'impact',
    notes:          'Fixed-income contract. Retirement accumulation never surfaces.',
  },
  RETIREMENT: {
    suppressedTags: ['FOOD', 'UTILITIES', 'HOUSING', 'PRESCRIPTIONS', 'CASH FLOW'],
    maxSurface:     7,
    heroField:      'impact',
    notes:          'Includes retirement-linked medical planning only (HEALTHCARE tag = Medicare enrollment, HSA). Does not suppress generic healthcare costs — that is deliberate policy, not omission.',
  },
  REALTOR: {
    suppressedTags: ['CONTRIBUTIONS', 'FOOD', 'UTILITIES', 'HOUSING', 'PRESCRIPTIONS'],
    maxSurface:     6,
    heroField:      'impact',
  },
  ATHLETE: {
    suppressedTags: ['CONTRIBUTIONS', 'FOOD', 'UTILITIES', 'HOUSING', 'PRESCRIPTIONS'],
    maxSurface:     5,
    heroField:      'impact',
  },
  FAMILY: {
    suppressedTags: ['FOOD', 'UTILITIES'],
    maxSurface:     5,
    heroField:      'impact',
  },
  STUDENT: {
    suppressedTags: ['CONTRIBUTIONS', 'FOOD', 'UTILITIES', 'HOUSING', 'PRESCRIPTIONS'],
    maxSurface:     5,
    heroField:      'impact',
  },
  TRANSITION: {
    suppressedTags: ['CONTRIBUTIONS'],
    maxSurface:     6,
    heroField:      'impact',
  },
  HEALTH: {
    suppressedTags: ['CONTRIBUTIONS'],
    maxSurface:     5,
    heroField:      'impact',
  },
  SALES: {
    suppressedTags: ['CONTRIBUTIONS', 'FOOD', 'UTILITIES', 'HOUSING', 'PRESCRIPTIONS'],
    maxSurface:     6,
    heroField:      'impact',
  },
  OPEN: {
    suppressedTags: [], // wildcard — pass all domains
    maxSurface:     6,
    heroField:      'impact',
    notes:          'Open lane. No suppression; low cap to avoid overwhelm.',
  },
  INVESTOR: {
    suppressedTags: ['CONTRIBUTIONS', 'FOOD', 'UTILITIES', 'HOUSING', 'PRESCRIPTIONS'],
    maxSurface:     5,
    heroField:      'impact',
  },
};

// Maps detected domain → authoritative lens key.
// Text-intent confidence > 0.80 overrides chip selection (the grandmother rule).
const DOMAIN_TO_LENS = {
  EXPENSE_REDUCTION: 'EXPENSE',
  RETIREMENT:        'RETIREMENT',
  REAL_ESTATE:       'REALTOR',
  CAREER:            'ATHLETE',
  HEALTH:            'HEALTH',
  STARTUP_FINANCE:   'SALES',
  INVESTOR:          'INVESTOR',
};

const FALLBACK_CONTRACT = { suppressedTags: [], maxSurface: 6, heroField: 'impact' };
const COLUMNS = ['IMMEDIATE', 'SHORT_TERM', 'STRUCTURAL'];

// getVisibleCards — schema adapter for consumers and QA harnesses.
// Flattens actions into a ranked list, preserving horizon context on each card.
// Use this instead of accessing result.actions.IMMEDIATE/SHORT_TERM/STRUCTURAL directly.
export function getVisibleCards(actions) {
  if (!actions) return [];
  return COLUMNS
    .flatMap(h => (actions[h] ?? []).map(c => ({ ...c, _horizon: h })))
    .sort((a, b) => b.impact - a.impact);
}

// resolveContractLens — pick the authoritative lens for editorial gating.
// Detected domain wins when it maps cleanly; session.lens is the fallback.
export function resolveContractLens(detectedDomain, sessionLens) {
  return DOMAIN_TO_LENS[detectedDomain] ?? sessionLens ?? 'OPEN';
}

// applyEditorialGate — filters, ranks, and caps the action bundle.
// Input:  actions = { IMMEDIATE: [...], SHORT_TERM: [...], STRUCTURAL: [...] }
// Output: same structure, suppressed tags removed, capped at maxSurface total.
export function applyEditorialGate(actions, lens) {
  if (!actions) return actions;

  const contract = CONTRACTS[lens] ?? FALLBACK_CONTRACT;
  const { suppressedTags, maxSurface, heroField } = contract;

  // 1. Filter suppressed tags and sort by hero field within each column
  const filtered = {};
  for (const col of COLUMNS) {
    filtered[col] = (actions[col] ?? [])
      .filter(card => !suppressedTags.includes(card.tag))
      .sort((a, b) => b[heroField] - a[heroField]);
  }

  // 2. Rank all surviving cards globally; take top maxSurface
  const ranked = COLUMNS
    .flatMap(col => filtered[col].map(card => ({ ...card, _col: col })))
    .sort((a, b) => b[heroField] - a[heroField])
    .slice(0, maxSurface);

  // 3. Redistribute back to columns, preserving descending impact order
  const result = { IMMEDIATE: [], SHORT_TERM: [], STRUCTURAL: [] };
  for (const { _col, ...card } of ranked) {
    result[_col].push(card);
  }
  // Re-sort within each column after redistribution
  for (const col of COLUMNS) {
    result[col].sort((a, b) => b[heroField] - a[heroField]);
  }

  return result;
}
