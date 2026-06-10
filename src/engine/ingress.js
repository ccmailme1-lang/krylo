// WO-1702 — Single source of truth for ingress constants.
// Eliminates duplication between ingestionbuilder.jsx and analysisidlefield.jsx.
// All ingress components import from here. Edit once, propagates everywhere.

// Situation → lens mapping. User sees situation label; engine uses lens key.
export const SITUATIONS = [
  { label: 'BUYING A HOME',        lens: 'REALTOR'    },
  { label: 'PLANNING RETIREMENT',  lens: 'RETIREMENT' },
  { label: 'GROWING INCOME',       lens: 'INVESTOR'   },
  { label: 'CAREER MOVE',          lens: 'ATHLETE'    },
  { label: 'PROTECTING MY FAMILY', lens: 'FAMILY'     },
  { label: 'STARTING OUT',         lens: 'STUDENT'    },
  { label: 'STARTING OVER',        lens: 'TRANSITION' },
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

// Calibration signals keyed by lens. Observation only — no recommendations.
// confidence < CONFIDENCE_THRESHOLD = signal does not render.
export const CALIBRATION_SIGNALS = {
  REALTOR:    { observation: "Most buyers in this range found timeline — not capital — was the primary constraint.",                            confidence: 0.87 },
  RETIREMENT: { observation: "People planning retirement most often underestimate healthcare costs in the first decade.",                        confidence: 0.91 },
  INVESTOR:   { observation: "Investors at this stage most often prioritized liquidity access over yield maximization.",                         confidence: 0.84 },
  ATHLETE:    { observation: "Career transitions in this profile most often hinged on timing, not preparation.",                                 confidence: 0.82 },
  FAMILY:     { observation: "Families in this situation most often discovered insurance gaps before asset gaps.",                               confidence: 0.77 },
  STUDENT:    { observation: "People starting out most often found debt clarity was the prerequisite to everything else.",                       confidence: 0.85 },
  TRANSITION: { observation: "People restructuring most often found income stability mattered more than asset division.",                        confidence: 0.79 },
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
