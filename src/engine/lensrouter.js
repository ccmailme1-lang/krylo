// WO-1828 — Lens Routing Engine
// Phase A: static persona → LensProfile mapping + query signal elevation.
// Phase B (WO-1828): profile-aware routing — derives persona from role/goals/challenges
//   when session.profile is present. Job title alone is insufficient; decision context wins.
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
  INVESTOR:      { primary: 'CAPITAL_ALLOCATOR', secondary: 'GROWTH_SEEKER'    },
  REALTOR:       { primary: 'CAPITAL_ALLOCATOR', secondary: 'OPERATOR'          },
  ATHLETE:       { primary: 'DEFENDER',          secondary: 'GROWTH_SEEKER'     },
  SALES:         { primary: 'GROWTH_SEEKER',     secondary: 'OPERATOR'          },
  LEGAL:         { primary: 'RISK_MANAGER',      secondary: 'DEFENDER'          },
  RETIREMENT:    { primary: 'RISK_MANAGER',      secondary: 'CAPITAL_ALLOCATOR' },
  EXPENSE:       { primary: 'OPERATOR',          secondary: 'RISK_MANAGER'      },
  TRANSITION:    { primary: 'GROWTH_SEEKER',     secondary: 'RISK_MANAGER'      },
  RESTART:       { primary: 'GROWTH_SEEKER',     secondary: 'RISK_MANAGER'      },
  FAMILY:        { primary: 'RISK_MANAGER',      secondary: 'OPERATOR'          },
  HEALTH:        { primary: 'RISK_MANAGER',      secondary: 'OPERATOR'          },
  STUDENT:       { primary: 'GROWTH_SEEKER',     secondary: 'CAPITAL_ALLOCATOR' },
  GENERAL:       { primary: 'OPERATOR',          secondary: null                },
  OPEN:          { primary: 'OPERATOR',          secondary: null                },
  // WO-1835 — CEO: competitive positioning + capital allocation authority
  CEO:           { primary: 'DEFENDER',          secondary: 'CAPITAL_ALLOCATOR' },
  // WO-1834 — CFO: ROI proof + risk management over capital allocation
  CFO:           { primary: 'CAPITAL_ALLOCATOR', secondary: 'RISK_MANAGER'      },
  // WO-1832 — EA: operational execution, manages access to C-suite decision window
  EA:            { primary: 'OPERATOR',          secondary: 'RISK_MANAGER'      },
  // WO-1831 — COO / Manufacturing: operational pressure + adoption timing
  COO:           { primary: 'OPERATOR',          secondary: 'RISK_MANAGER'      },
  MANUFACTURING: { primary: 'OPERATOR',          secondary: 'RISK_MANAGER'      },
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

// WO-1828 Phase B — derives persona key from full profile when session.lens is absent or GENERAL.
// Decision context (goals, challenges, reporting line) overrides job title.
function detectPersonaFromProfile(profile) {
  if (!profile) return null;
  const role    = (profile.role    ?? '').toLowerCase();
  const goals   = (profile.goals   ?? '').toLowerCase();
  const line    = (profile.reportingLine ?? '').toLowerCase();

  if (/\bceo\b|chief executive|founder/i.test(role))                          return 'CEO';
  if (/\bcfo\b|chief financial|finance director/i.test(role))                 return 'CFO';
  if (/\bcoo\b|chief operating|operations director|manufacturing/i.test(role)) return 'COO';
  if (/executive assistant|\bea\b|assistant to the/i.test(role))               return 'EA';
  if (/invest|portfolio|fund|allocat|capital deploy/i.test(goals))             return 'INVESTOR';
  if (/realtor|real estate agent|property/i.test(role))                        return 'REALTOR';
  if (/board|c-suite|c suite/i.test(line))                                     return 'CEO';

  return null;
}

// WO-1829 — Guided Entry Path: returns true when profile signals low familiarity,
// time pressure, or integration barriers. Callers surface one signal, one action,
// one outcome — full console deferred until value is proven.
export function detectGuidedMode(profile) {
  if (!profile) return false;
  const ch = (profile.challenges ?? '').toLowerCase();
  return (
    /unfamiliar|new to|first time|don.t understand|learning|not sure how/i.test(ch) ||
    /limited time|too busy|no time|quick answer/i.test(ch) ||
    (/integrat|api|implement/i.test(ch) && /barrier|blocker|stuck/i.test(ch))
  );
}

// routeLens — returns LensProfile[] sorted by conviction desc.
// Phase A guarantees: max 2 profiles, no duplicates, only valid lensIds.
// Phase B (WO-1828): consults session.profile when lens key is absent or GENERAL.
export function routeLens(session) {
  const rawKey     = (session?.lens ?? 'GENERAL').toUpperCase();
  // Phase B: if persona is GENERAL or unset, derive from profile context
  const profileKey = (rawKey === 'GENERAL' || rawKey === 'OPEN')
    ? detectPersonaFromProfile(session?.profile)
    : null;
  const personaKey = profileKey ?? rawKey;

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
