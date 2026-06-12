// WO-BAY-LOGIC-002 — Bay Transformation Layer
// Transforms intentMagnitude × domain → concrete search constraints.
// Engine is sole authority. UI never runs search logic.

const TIER_BANDS = [
  { name: 'EXPLORATORY',    min: 0,  max: 24,  midpoint: 12 },
  { name: 'OPEN_LEANING',   min: 25, max: 49,  midpoint: 37 },
  { name: 'FOCUSED',        min: 50, max: 74,  midpoint: 62 },
  { name: 'HIGH_CONVICTION',min: 75, max: 100, midpoint: 87 },
];

const FEASIBILITY_GATE = 0.60;

// Per-domain feasibility by tier [T0, T1, T2, T3]
// Values below FEASIBILITY_GATE trigger descent to next tier.
const DOMAIN_FEASIBILITY = {
  HOME:        [0.95, 0.90, 0.78, 0.62],
  INVESTMENTS: [0.95, 0.88, 0.75, 0.55],
  CAREER:      [0.95, 0.87, 0.72, 0.50],
  EDUCATION:   [0.93, 0.85, 0.70, 0.52],
  HEALTH:      [0.94, 0.84, 0.69, 0.45],
  BUSINESS:    [0.90, 0.80, 0.65, 0.38],
  BUDGET:      [0.96, 0.90, 0.78, 0.58],
  GENERAL:     [0.95, 0.88, 0.75, 0.60],
};

// Domain-specific constraint schema per tier [T0, T1, T2, T3]
const DOMAIN_CONSTRAINTS = {
  HOME: [
    { priceMax: null,    listingAgeDays: 180, proximityMi: 30, minBed: null },
    { priceMax: 1000000, listingAgeDays: 90,  proximityMi: 20, minBed: 2   },
    { priceMax: 2000000, listingAgeDays: 45,  proximityMi: 10, minBed: 3   },
    { priceMax: null,    listingAgeDays: 14,  proximityMi: 5,  minBed: 4   },
  ],
  INVESTMENTS: [
    { returnTarget: 0.00, riskTier: 'ANY',        timeHorizon: 'ANY',    minCapital: 0      },
    { returnTarget: 0.05, riskTier: 'MODERATE',   timeHorizon: 'LONG',   minCapital: 5000   },
    { returnTarget: 0.10, riskTier: 'MODERATE',   timeHorizon: 'MEDIUM', minCapital: 25000  },
    { returnTarget: 0.20, riskTier: 'AGGRESSIVE', timeHorizon: 'SHORT',  minCapital: 100000 },
  ],
  CAREER: [
    { salaryMin: 0,      expYrs: 0, locationFlex: true,  titleLevel: 'ANY'    },
    { salaryMin: 50000,  expYrs: 1, locationFlex: true,  titleLevel: 'MID'    },
    { salaryMin: 90000,  expYrs: 3, locationFlex: false, titleLevel: 'SENIOR' },
    { salaryMin: 150000, expYrs: 5, locationFlex: false, titleLevel: 'LEAD'   },
  ],
  EDUCATION: [
    { costMax: null,  duration: 'ANY', credentialType: 'ANY',         accredited: false },
    { costMax: 20000, duration: '4yr', credentialType: 'CERT_DEGREE', accredited: true  },
    { costMax: 10000, duration: '2yr', credentialType: 'DEGREE',      accredited: true  },
    { costMax: 5000,  duration: '1yr', credentialType: 'DEGREE',      accredited: true  },
  ],
  HEALTH: [
    { coverageType: 'ANY',           premiumMax: null, deductibleMax: null, network: 'ANY'         },
    { coverageType: 'PARTIAL',       premiumMax: 500,  deductibleMax: 6000, network: 'PPO'         },
    { coverageType: 'COMPREHENSIVE', premiumMax: 350,  deductibleMax: 3000, network: 'PPO'         },
    { coverageType: 'COMPREHENSIVE', premiumMax: 200,  deductibleMax: 1500, network: 'PPO_PREMIUM' },
  ],
  BUSINESS: [
    { revenueMin: 0,      marginMin: 0.00, stage: 'ANY',     mrr: 0    },
    { revenueMin: 10000,  marginMin: 0.10, stage: 'REVENUE', mrr: 833  },
    { revenueMin: 50000,  marginMin: 0.20, stage: 'GROWTH',  mrr: 4167 },
    { revenueMin: 100000, marginMin: 0.30, stage: 'SCALE',   mrr: 8333 },
  ],
  BUDGET: [
    { savingsTarget: 0,    debtMax: null,  cutDepth: 'ANY',      monthlyMin: 0   },
    { savingsTarget: 500,  debtMax: 20000, cutDepth: 'LIGHT',    monthlyMin: 50  },
    { savingsTarget: 2000, debtMax: 10000, cutDepth: 'MODERATE', monthlyMin: 200 },
    { savingsTarget: 5000, debtMax: 5000,  cutDepth: 'DEEP',     monthlyMin: 500 },
  ],
  GENERAL: [
    { signalMinScore: 0.0, maxAge: 'ANY', sourceCount: 1, requireCorroboration: false },
    { signalMinScore: 0.3, maxAge: '90d', sourceCount: 2, requireCorroboration: false },
    { signalMinScore: 0.5, maxAge: '45d', sourceCount: 3, requireCorroboration: true  },
    { signalMinScore: 0.7, maxAge: '14d', sourceCount: 5, requireCorroboration: true  },
  ],
};

function getTierIndex(intentMagnitude) {
  const t = Math.max(0, Math.min(100, intentMagnitude));
  for (let i = TIER_BANDS.length - 1; i >= 0; i--) {
    if (t >= TIER_BANDS[i].min) return i;
  }
  return 0;
}

function getFeasibility(domain, tierIdx) {
  const profile = DOMAIN_FEASIBILITY[domain] ?? DOMAIN_FEASIBILITY.GENERAL;
  return profile[Math.max(0, Math.min(3, tierIdx))] ?? 0.50;
}

function buildConstraints(domain, tierIdx) {
  const map = DOMAIN_CONSTRAINTS[domain] ?? DOMAIN_CONSTRAINTS.GENERAL;
  return { ...map[Math.max(0, Math.min(3, tierIdx))] };
}

// Adaptive threshold descent: try requested tier first, walk down until feasible.
// Returns { resolvedThreshold, closestResolved, constraints, tierName, tierIdx, feasibility, score }
export function adaptiveThresholdDescent(intentMagnitude, domain) {
  const requestedTierIdx = getTierIndex(intentMagnitude);
  const norm = domain ?? 'GENERAL';

  for (let i = requestedTierIdx; i >= 0; i--) {
    const feasibility = getFeasibility(norm, i);
    if (feasibility >= FEASIBILITY_GATE) {
      const tier = TIER_BANDS[i];
      const descents = requestedTierIdx - i;
      return {
        resolvedThreshold: tier.midpoint,
        closestResolved:   descents > 0 ? intentMagnitude : null,
        constraints:       buildConstraints(norm, i),
        tierName:          tier.name,
        tierIdx:           i,
        feasibility,
        score: descents === 0 ? 1.0
             : descents === 1 ? 0.75
             : descents === 2 ? 0.50
             : 0.30,
      };
    }
  }

  // EXPLORATORY always resolves — guaranteed floor
  return {
    resolvedThreshold: TIER_BANDS[0].midpoint,
    closestResolved:   intentMagnitude,
    constraints:       buildConstraints(norm, 0),
    tierName:          'EXPLORATORY',
    tierIdx:           0,
    feasibility:       getFeasibility(norm, 0),
    score:             0.20,
  };
}

export function transformIntentToConstraints(intentMagnitude, domain) {
  return adaptiveThresholdDescent(intentMagnitude ?? 50, domain ?? 'GENERAL');
}
