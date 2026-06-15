// WO-1737: HNW Client Convergence Overlay (Cornerstone Protocol)
// Derived from Cornerstone Group Silicon Valley (Morgan Stanley, Menlo Park).
// Serves tech executives, VC/PE partners, founders — concentrated-position management.
//
// Phase A: TECHNOLOGY + CAPITAL + OWNERSHIP all > 55 → PORTFOLIO_TIMING (rebalance window)
// Phase B: OWNERSHIP > 60 + CAPITAL < 45 → LIQUIDITY_EVENT (IPO window / private placement)
// Phase C: TECHNOLOGY − CAPITAL > 15 → SECTOR_ROTATION (tech-peak, capital rotating out)
//
// Phase priority: B > C > A. Fs = mean(T_conf, C_conf, O_conf).

// WO-1745 cleanup: renamed from conclusion labels to observable state labels.
// Old names: PORTFOLIO_TIMING / LIQUIDITY_EVENT / SECTOR_ROTATION (conclusions).
// New names: observable measurements of domain relationships.
export const HNW_PHASE = {
  NONE:                       'NONE',
  TRIPLE_CONVERGENCE:         'TRIPLE_CONVERGENCE',         // Phase A: T+C+O all >55
  OWNERSHIP_CAPITAL_DIVERGENCE: 'OWNERSHIP_CAPITAL_DIVERGENCE', // Phase B: O>60, C<45
  TECH_CAPITAL_SPREAD:        'TECH_CAPITAL_SPREAD',        // Phase C: T−C >15
};

const TRIPLE_THRESHOLD    = 55;   // Phase A: all three domains must exceed
const OWNERSHIP_SPIKE     = 60;   // Phase B: OWNERSHIP deal-flow threshold
const CAPITAL_COMPRESSION = 45;   // Phase B: CAPITAL compression ceiling
const TECH_CAP_DIVERGENCE = 15;   // Phase C: TECHNOLOGY − CAPITAL spread
export const FS_GATE      = 0.70; // Spec requirement: Fs ≥ 0.70

const NULL_RESULT = {
  triggered: false,
  phase: HNW_PHASE.NONE,
  phaseA: false,
  phaseB: false,
  phaseC: false,
  technologyScore: 0,
  capitalScore: 0,
  ownershipScore: 0,
  techCapitalDelta: 0,
  fs: 0,
  fsQualified: false,
  ts: 0,
};

export function detectHNWConvergence(signals) {
  if (!Array.isArray(signals) || signals.length === 0) {
    return { ...NULL_RESULT, ts: Date.now() };
  }

  const byDomain = {};
  for (const s of signals) {
    if (s?.domain && !byDomain[s.domain]) byDomain[s.domain] = s;
  }

  const tech = byDomain.TECHNOLOGY;
  const cap  = byDomain.CAPITAL;
  const own  = byDomain.OWNERSHIP;

  const tScore = tech?.signal ?? 0;
  const cScore = cap?.signal  ?? 0;
  const oScore = own?.signal  ?? 0;

  // Fs = mean confidence across all three key domains; missing = 0 contribution
  const tConf = (tech?.confidence ?? 0) / 100;
  const cConf = (cap?.confidence  ?? 0) / 100;
  const oConf = (own?.confidence  ?? 0) / 100;
  const fs = (tConf + cConf + oConf) / 3;

  // Phase A: triple convergence — portfolio rebalance window
  const phaseA = tScore > TRIPLE_THRESHOLD
              && cScore > TRIPLE_THRESHOLD
              && oScore > TRIPLE_THRESHOLD;

  // Phase B: OWNERSHIP deal-flow spike + CAPITAL compression = liquidity event
  const phaseB = oScore > OWNERSHIP_SPIKE && cScore < CAPITAL_COMPRESSION;

  // Phase C: TECHNOLOGY peaks, CAPITAL rotating out
  const techCapitalDelta = tScore - cScore;
  const phaseC = techCapitalDelta > TECH_CAP_DIVERGENCE;

  // Priority: B > C > A
  let phase = HNW_PHASE.NONE;
  if (phaseB)      phase = HNW_PHASE.OWNERSHIP_CAPITAL_DIVERGENCE;
  else if (phaseC) phase = HNW_PHASE.TECH_CAPITAL_SPREAD;
  else if (phaseA) phase = HNW_PHASE.TRIPLE_CONVERGENCE;

  const triggered    = phase !== HNW_PHASE.NONE;
  const fsQualified  = fs >= FS_GATE;

  return {
    triggered,
    phase,
    phaseA,
    phaseB,
    phaseC,
    technologyScore: tScore,
    capitalScore:    cScore,
    ownershipScore:  oScore,
    techCapitalDelta,
    fs,
    fsQualified,
    ts: Date.now(),
  };
}
