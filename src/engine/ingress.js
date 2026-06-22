// WO-1702 — Single source of truth for ingress constants.
// Eliminates duplication between ingestionbuilder.jsx and analysisidlefield.jsx.
// All ingress components import from here. Edit once, propagates everywhere.

// Situation → lens mapping. User sees situation label; engine uses lens key.
export const SITUATIONS = [
  { label: 'BUYING A HOME',        lens: 'REALTOR'    },
  { label: 'PLANNING RETIREMENT',  lens: 'RETIREMENT' },
  { label: 'GROWING INCOME',       lens: 'INVESTOR'   },
  { label: 'CAREER MOVE',          lens: 'TRANSITION', secondaryLens: 'INVESTOR', lensWeight: 0.65, secondaryWeight: 0.35, signalKey: 'CAREER_MOVE' },
  { label: 'PROTECTING MY FAMILY', lens: 'FAMILY'     },
  { label: 'STARTING OUT',         lens: 'STUDENT'    },
  { label: 'STARTING OVER',        lens: 'RESTART'    },
  { label: 'HEALTH & COSTS',       lens: 'HEALTH'     },
  { label: 'BUILDING SOMETHING',   lens: 'SALES'      },
  { label: 'NOT SURE YET',         lens: 'OPEN'       },
  { label: 'REDUCING EXPENSES',    lens: 'EXPENSE'    },
];

// Signal domains — engine vocabulary (6-bay classification system).
export const LENS_DOMAIN_MAP = {
  REALTOR:    ['FINANCIAL', 'MARKET'],
  RETIREMENT: ['FINANCIAL'],
  INVESTOR:   ['FINANCIAL', 'MARKET'],
  ATHLETE:    ['CAREER', 'FINANCIAL'],
  FAMILY:     ['FINANCIAL'],
  STUDENT:    ['CAREER'],
  TRANSITION: ['FINANCIAL', 'LEGAL'],
  RESTART:    ['FINANCIAL', 'LEGAL'],
  HEALTH:     ['HEALTH'],
  SALES:      ['FINANCIAL', 'MARKET'],
  OPEN:       [],
  EXPENSE:    ['FINANCIAL', 'HEALTH'],
};

// Broker domain — deterministic product domain from lens. No free-text inference.
// Replaces detectDomain(seedQuery) at tensor construction time.
// OPEN → GENERAL triggers broker default candidate pool.
export const LENS_BROKER_DOMAIN_MAP = {
  REALTOR:    'HOME',
  RETIREMENT: 'INVESTMENTS',
  INVESTOR:   'INVESTMENTS',
  ATHLETE:    'CAREER',
  FAMILY:     'HOME',
  STUDENT:    'EDUCATION',
  TRANSITION: 'INVESTMENTS',
  RESTART:    'INVESTMENTS',
  HEALTH:     'HEALTH',
  SALES:      'BUSINESS',
  OPEN:       'GENERAL',
  EXPENSE:    'BUDGET',
};

export const FLOOR_RANGES = [
  { label: 'UNDER $1K',    value: 500    },
  { label: '$1K – $10K',   value: 5000   },
  { label: '$10K – $100K', value: 50000  },
  { label: '$100K+',       value: 150000 },
];

export const CONFIDENCE_THRESHOLD = 0.65;

// Protected entity registry — terms that lock routing to a domain before any
// keyword scoring runs. Prevents vocabulary contamination where generic words
// like "home", "funding", or "programs" override specific medical signals.
// A single match is sufficient to lock the domain — no scoring, no arbitration.
export const PROTECTED_ENTITY_REGISTRY = {
  HEALTH: [
    'hypotonia', 'cerebral palsy', 'autism', 'down syndrome', 'spina bifida',
    'muscular dystrophy', 'wheelchair', 'mobility aid', 'adaptive equipment',
    'occupational therapy', 'physical therapy', 'medicaid waiver', 'special needs',
    'disability', 'developmental delay', 'aba therapy', 'sensory processing',
    'adaptive mobility', 'pediatric therapy', 'adaptive program', 'cyshcn',
    'early intervention', 'iep ', ' iep', 'hcbs', 'dme funding',
    'nonprofit', '501c3', '501(c)(3)', 'foundation', 'donation', 'grant',
    'fundraising', 'charitable', 'endowment',
  ],
  CRISIS: [
    'eviction notice', 'foreclosure notice', 'suicidal', 'domestic abuse',
  ],
};

// Returns the locked domain if any protected entity is found in the query,
// null otherwise. Called as the first gate in detectDomain().
export function detectProtectedDomain(query) {
  const q = (query ?? '').toLowerCase();
  for (const [domain, terms] of Object.entries(PROTECTED_ENTITY_REGISTRY)) {
    for (const term of terms) {
      if (q.includes(term)) return domain;
    }
  }
  return null;
}

// Calibration signals keyed by lens. Observation only — no recommendations.
// confidence < CONFIDENCE_THRESHOLD = signal does not render.
export const CALIBRATION_SIGNALS = {
  REALTOR:    { observation: "Most buyers in this range found timeline — not capital — was the primary constraint.",                            confidence: 0.87 },
  RETIREMENT: { observation: "People planning retirement most often underestimate healthcare costs in the first decade.",                        confidence: 0.91 },
  INVESTOR:   { observation: "Investors at this stage most often prioritized liquidity access over yield maximization.",                         confidence: 0.84 },
  ATHLETE:    { observation: "Career transitions in this profile most often hinged on timing, not preparation.",                                 confidence: 0.82 },
  FAMILY:     { observation: "Families in this situation most often discovered insurance gaps before asset gaps.",                               confidence: 0.77 },
  STUDENT:    { observation: "People starting out most often found debt clarity was the prerequisite to everything else.",                       confidence: 0.85 },
  TRANSITION:  { observation: "People restructuring most often found income stability mattered more than asset division.",                        confidence: 0.79 },
  RESTART:     { observation: "People starting over most often found that reframing the asset side mattered more than the income side.",           confidence: 0.76 },
  CAREER_MOVE: { observation: "Career moves in this range most often stalled on timing and liquidity, not on the opportunity itself.",              confidence: 0.83 },
  HEALTH:     { observation: "Most people in this situation found coverage gaps before addressing cost exposure.",                               confidence: 0.71 },
  SALES:      { observation: "Builders in early stages most often found cash runway was the first constraint, not market fit.",                  confidence: 0.66 },
  OPEN:       { observation: "Most users in open mode found a more specific lens after their first run.",                                       confidence: 0.60 },
  EXPENSE:    { observation: "Most seniors on fixed income qualify for assistance programs they've never applied for.",                          confidence: 0.82 },
};

export const KEY_OPS = [
  'Source Entity', 'Severity Score', 'Origin Country', 'Signal Type', 'Fidelity Score',
  'Earning Phase', 'Sponsorship Value', 'Capital Burn', 'Governance Dissonance',
  'Disclosure Asymmetry', 'Regulatory Exposure', 'Occupancy Volatility', 'Asset Friction',
  'Conversion Velocity', 'Pipeline Friction', 'Accumulation Ratio', 'Longevity Risk', 'Debt Exposure',
];

export const OP_OPS = [
  'contains', 'is between', 'equals', 'does not contain', 'is greater than', 'is less than', 'is',
];

// Resolves weighted domain list for situations with a secondary lens.
// Falls back to primary lens domains for situations without weights.
export function resolveWeightedDomains(situation) {
  if (!situation) return [];
  const primary = LENS_DOMAIN_MAP[situation.lens] ?? [];
  if (!situation.secondaryLens) return primary;
  const secondary = LENS_DOMAIN_MAP[situation.secondaryLens] ?? [];
  const merged = [...new Set([...primary, ...secondary])];
  return merged;
}
