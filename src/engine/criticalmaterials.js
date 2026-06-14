// WO-1738: Critical Materials Demand Signal (Lacaze Protocol)
// Derived from Amanda Lacaze, CEO Lynas Rare Earths — world's only major
// rare earth producer outside China.
//
// Phase A: T + C + O all > 55 → SUPPLY_CHAIN_REPOSITIONING (12–24 mo lead)
//          Western governments + manufacturers accelerating non-China sourcing
// Phase B: MEDIA + OWNERSHIP both > 60 → GEOPOLITICAL_SUPPLY_RISK (3–12 mo)
//          Policy action imminent: export controls, subsidies, emergency procurement
// Phase C: OWNERSHIP > 65 → DEMAND_PIPELINE (12–24 mo)
//          EDGAR deal flow in mining/materials/defense; rare earth demand follows
//
// Phase priority: B > C > A. Fs = mean(T_conf, C_conf, O_conf).

export const MATERIALS_PHASE = {
  NONE:                       'NONE',
  SUPPLY_CHAIN_REPOSITIONING: 'SUPPLY_CHAIN_REPOSITIONING', // Phase A
  DEMAND_PIPELINE:            'DEMAND_PIPELINE',             // Phase C
  GEOPOLITICAL_SUPPLY_RISK:   'GEOPOLITICAL_SUPPLY_RISK',   // Phase B
};

export const MATERIALS_LEAD_TIME = {
  SUPPLY_CHAIN_REPOSITIONING: { min: 12, max: 24, label: '12–24 MO' },
  GEOPOLITICAL_SUPPLY_RISK:   { min: 3,  max: 12, label: '3–12 MO'  },
  DEMAND_PIPELINE:            { min: 12, max: 24, label: '12–24 MO' },
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
  leadTime: null,
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
  if (phaseB)      phase = MATERIALS_PHASE.GEOPOLITICAL_SUPPLY_RISK;
  else if (phaseC) phase = MATERIALS_PHASE.DEMAND_PIPELINE;
  else if (phaseA) phase = MATERIALS_PHASE.SUPPLY_CHAIN_REPOSITIONING;

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
    leadTime: triggered ? MATERIALS_LEAD_TIME[phase] : null,
    ts: Date.now(),
  };
}
