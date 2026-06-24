// WO-1828 — Lens Routing Engine
// Phase A: static persona → LensProfile mapping + query signal elevation.
// Phase B (WO-1828): profile-aware routing — derives persona from role/goals/challenges.
// Phase C (RFE-1): probabilistic axis routing via rolefieldengine.js.
// Phase D (WO-1861): RFE state reconciliation — hysteresis buffer, K=2/N=3.
// Output contract (frozen): { profiles: LensProfile[], rfe: RfeState | null }

import { classify, buildInputVector, AXIS_TO_LENS } from './rolefieldengine.js';
import { reconcile as reconcileRfe }                 from './rfereconciler.js';

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
  const role = (profile.role    ?? '').toLowerCase();
  const goals = (profile.goals  ?? '').toLowerCase();
  const line  = (profile.reportingLine ?? '').toLowerCase();

  if (/\bceo\b|chief executive|founder/i.test(role))                           return 'CEO';
  if (/\bcfo\b|chief financial|finance director/i.test(role))                  return 'CFO';
  if (/\bcoo\b|chief operating|operations director|manufacturing/i.test(role)) return 'COO';
  if (/executive assistant|\bea\b|assistant to the/i.test(role))                return 'EA';
  if (/invest|portfolio|fund|allocat|capital deploy/i.test(goals))              return 'INVESTOR';
  if (/realtor|real estate agent|property/i.test(role))                         return 'REALTOR';
  if (/board|c-suite|c suite/i.test(line))                                      return 'CEO';

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

// Phase C — converts RFE-1 classify() output to LensProfile[].
function buildProfilesFromRFE(rfe) {
  const dir    = rfe.sv_influence_vector.direction;
  const ranked = Object.entries(AXIS_TO_LENS)
    .map(([ax, lensId]) => ({ lensId, weight: dir[ax] || 0 }))
    .sort((a, b) => b.weight - a.weight);

  const profiles = [];
  profiles.push({ lensId: ranked[0].lensId, conviction: Math.round(65 + rfe.confidence * 27) });

  const second = ranked[1];
  if (second.weight >= 0.20 || rfe.state === 'MULTI_ROLE_OVERLAP') {
    const sec = Math.round(40 + second.weight * 140);
    profiles.push({ lensId: second.lensId, conviction: Math.min(sec, profiles[0].conviction - 8) });
  }

  return profiles.filter(p => VALID_LENS_IDS.has(p.lensId));
}

// Phase A/B — PERSONA_MAP + query signal profiles. Used as fallback and when
// reconciler holds stable state but fresh classify() returned UNCLASSIFIED.
function buildFallbackProfiles(session) {
  const rawKey     = (session?.lens ?? 'GENERAL').toUpperCase();
  const profileKey = (rawKey === 'GENERAL' || rawKey === 'OPEN')
    ? detectPersonaFromProfile(session?.profile)
    : null;
  const personaKey  = profileKey ?? rawKey;
  const query       = session?.query ?? '';
  const mapping     = PERSONA_MAP[personaKey] ?? PERSONA_MAP.GENERAL;
  const querySignal = detectQuerySignal(query);

  const profiles = [];
  profiles.push({ lensId: mapping.primary, conviction: 82 });

  if (querySignal && querySignal !== mapping.primary) {
    profiles.push({ lensId: querySignal, conviction: 62 });
  } else if (mapping.secondary && mapping.secondary !== mapping.primary) {
    profiles.push({ lensId: mapping.secondary, conviction: 55 });
  }

  return profiles.filter(p => VALID_LENS_IDS.has(p.lensId));
}

// routeLens — returns { profiles: LensProfile[], rfe: RfeState | null }
// rfe is null only when both fresh classify and reconciler yield UNCLASSIFIED/error.
// Phase D: reconciler absorbs transient UNCLASSIFIED (K=2) and degradation (N=3).
export function routeLens(session) {
  let freshClassify = null;
  let freshRfeData  = null;

  try {
    const inputVector = buildInputVector(session);
    freshClassify     = classify(inputVector);
    freshRfeData      = {
      state:      freshClassify.state,
      confidence: freshClassify.confidence,
      entropy:    freshClassify.entropy,
    };
  } catch (_) {
    // RFE-1 failure is non-fatal — freshRfeData stays null
  }

  // Pass fresh data (or null on error) through the reconciler.
  const stableRfe = reconcileRfe(session, freshRfeData);

  // Reconciler authorizes execution: stable state is non-UNCLASSIFIED.
  if (stableRfe && stableRfe.state !== 'UNCLASSIFIED') {
    // Use Phase C profiles when fresh classify succeeded with a valid state.
    // Fall back to Phase A/B profiles when fresh was UNCLASSIFIED but reconciler
    // is holding a prior stable state (hysteresis absorbing transient noise).
    const profiles = (freshClassify && freshClassify.state !== 'UNCLASSIFIED')
      ? buildProfilesFromRFE(freshClassify)
      : buildFallbackProfiles(session);
    return { profiles, rfe: stableRfe };
  }

  // Suppression path: stable is null or UNCLASSIFIED.
  return { profiles: buildFallbackProfiles(session), rfe: null };
}
