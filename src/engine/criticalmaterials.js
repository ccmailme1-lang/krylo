// WO-1738: Critical Materials Demand Signal (Lacaze Protocol)
// Derived from Amanda Lacaze, CEO Lynas Rare Earths — world's only major
// rare earth producer outside China.
//
// Phase A: T + C + O all > 55 → T_C_O_CONVERGENCE
// Phase B: MEDIA + OWNERSHIP both > 60 → MEDIA_OWNERSHIP_CONVERGENCE
// Phase C: OWNERSHIP > 65 → OWNERSHIP_ELEVATION
//
// Phase priority: B > C > A. Fs = mean(T_conf, C_conf, O_conf).
//
// WO-1745 cleanup: leadTime removed (conclusions belong to SYNTH).
// Phase names renamed from conclusion labels to observable state labels.

// WO-1745: observable state labels only — no conclusion-labeled phases
export const MATERIALS_PHASE = {
  NONE:                      'NONE',
  T_C_O_CONVERGENCE:         'T_C_O_CONVERGENCE',         // Phase A: T+C+O all >55
  MEDIA_OWNERSHIP_CONVERGENCE: 'MEDIA_OWNERSHIP_CONVERGENCE', // Phase B: M+O both >60
  OWNERSHIP_ELEVATION:       'OWNERSHIP_ELEVATION',       // Phase C: O>65
};

const TRIPLE_THRESHOLD = 55;  // Phase A: T + C + O all exceed
const GEO_THRESHOLD    = 60;  // Phase B: MEDIA + OWNERSHIP both exceed
const DEMAND_THRESHOLD = 65;  // Phase C: OWNERSHIP deal-flow acceleration
export const FS_GATE   = 0.70;

const NULL_RESULT = {
  triggered: false,
  phase: MATERIALS_PHASE.NONE,
  phaseA: false,
  phaseB: false,
  phaseC: false,
  technologyScore: 0,
  capitalScore: 0,
  ownershipScore: 0,
  mediaScore: 0,
  fs: 0,
  fsQualified: false,
  ts: 0,
};

export function detectCriticalMaterials(signals) {
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
  const med  = byDomain.MEDIA;

  const tScore = tech?.signal ?? 0;
  const cScore = cap?.signal  ?? 0;
  const oScore = own?.signal  ?? 0;
  const mScore = med?.signal  ?? 0;

  // Fs = mean confidence across three key domains; missing = 0 contribution
  const tConf = (tech?.confidence ?? 0) / 100;
  const cConf = (cap?.confidence  ?? 0) / 100;
  const oConf = (own?.confidence  ?? 0) / 100;
  const fs = (tConf + cConf + oConf) / 3;

  // Phase A: Western supply chain repositioning
  const phaseA = tScore > TRIPLE_THRESHOLD
              && cScore > TRIPLE_THRESHOLD
              && oScore > TRIPLE_THRESHOLD;

  // Phase B: Geopolitical supply risk — policy action imminent
  const phaseB = mScore > GEO_THRESHOLD && oScore > GEO_THRESHOLD;

  // Phase C: Demand pipeline — EDGAR mining/materials/defense deal flow
  const phaseC = oScore > DEMAND_THRESHOLD;

  // Priority: B > C > A
  let phase = MATERIALS_PHASE.NONE;
  if (phaseB)      phase = MATERIALS_PHASE.MEDIA_OWNERSHIP_CONVERGENCE;
  else if (phaseC) phase = MATERIALS_PHASE.OWNERSHIP_ELEVATION;
  else if (phaseA) phase = MATERIALS_PHASE.T_C_O_CONVERGENCE;

  const triggered   = phase !== MATERIALS_PHASE.NONE;
  const fsQualified = fs >= FS_GATE;

  return {
    triggered,
    phase,
    phaseA,
    phaseB,
    phaseC,
    technologyScore: tScore,
    capitalScore:    cScore,
    ownershipScore:  oScore,
    mediaScore:      mScore,
    fs,
    fsQualified,
    ts: Date.now(),
  };
}
