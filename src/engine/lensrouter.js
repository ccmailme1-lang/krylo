// WO-1828 — Lens Routing Engine
// Derives decision-context LensProfile from persona lens + query signal.
// Phase A: static mapping table. Phase B: full profile-driven routing.
// Output contract (frozen): LensProfile { lensId, conviction }

const VALID_LENS_IDS = new Set([
  'CAPITAL_ALLOCATOR',
  'RISK_MANAGER',
  'OPERATOR',
  'GROWTH_SEEKER',
  'DEFENDER',
]);

// Static persona → primary decision context mapping
const PERSONA_MAP = {
  INVESTOR:   { primary: 'CAPITAL_ALLOCATOR', secondary: 'GROWTH_SEEKER'  },
  REALTOR:    { primary: 'CAPITAL_ALLOCATOR', secondary: 'OPERATOR'        },
  ATHLETE:    { primary: 'DEFENDER',          secondary: 'GROWTH_SEEKER'   },
  SALES:      { primary: 'GROWTH_SEEKER',     secondary: 'OPERATOR'        },
  LEGAL:      { primary: 'RISK_MANAGER',      secondary: 'DEFENDER'        },
  RETIREMENT: { primary: 'RISK_MANAGER',      secondary: 'CAPITAL_ALLOCATOR' },
  GENERAL:    { primary: 'OPERATOR',          secondary: null               },
  OPEN:       { primary: 'OPERATOR',          secondary: null               },
};

// Query signal patterns — shift toward a specific context when detected
const QUERY_SIGNALS = [
  { re: /capital|allocat|deploy.*fund|portfolio|invest|position.*size|rebalance/, lensId: 'CAPITAL_ALLOCATOR' },
  { re: /risk|exposure|hedg|threat|volatility|protect|compliance|liability|downside|stress.test/, lensId: 'RISK_MANAGER' },
  { re: /compet|market.share|moat|erosion|disruption|rival|defend|encroach/, lensId: 'DEFENDER' },
  { re: /opportunit|expand|enter.*market|launch|scale|grow|acqui|partner|capture/, lensId: 'GROWTH_SEEKER' },
  { re: /cost|margin|efficienc|capacity|operations|workflow|process|execution|overhead/, lensId: 'OPERATOR' },
];

function detectQuerySignal(query) {
  const q = (query ?? '').toLowerCase();
  for (const { re, lensId } of QUERY_SIGNALS) {
    if (re.test(q)) return lensId;
  }
  return null;
}

// routeLens — returns LensProfile[] sorted by conviction desc.
// Phase A guarantees: max 2 profiles, no duplicates, only valid lensIds.
export function routeLens(session) {
  const personaKey = (session?.lens ?? 'GENERAL').toUpperCase();
  const query      = session?.query ?? '';

  const mapping     = PERSONA_MAP[personaKey] ?? PERSONA_MAP.GENERAL;
  const querySignal = detectQuerySignal(query);

  const profiles = [];

  // Primary from persona — baseline conviction
  profiles.push({ lensId: mapping.primary, conviction: 82 });

  // Query signal elevates or adds secondary
  if (querySignal && querySignal !== mapping.primary) {
    profiles.push({ lensId: querySignal, conviction: 62 });
  } else if (mapping.secondary && mapping.secondary !== mapping.primary) {
    profiles.push({ lensId: mapping.secondary, conviction: 55 });
  }

  // Guard: strip any invalid lensIds (defensive, should not fire in Phase A)
  return profiles.filter(p => VALID_LENS_IDS.has(p.lensId));
}
