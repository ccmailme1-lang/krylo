// WO-1736: Regulatory Convergence Window (Gass-Benecke Protocol)
// Derived from Andy Gass (Latham & Watkins) + Danielle Benecke (Baker McKenzie).
// Signals regulatory formation 6–18 months before legislation reaches draft stage.
//
// Phase A: KNOWLEDGE + MEDIA dual convergence > 50 → WINDOW_FORMING
// Phase B: MEDIA > 65 + TECHNOLOGY > 55 → MULTI_JURISDICTION (cross-border alignment)
// Phase C: KNOWLEDGE > CAPITAL + 20 → ENFORCEMENT_AHEAD (enforcement outpacing investment)
//
// Phase priority: C > B > A

export const REGULATORY_PHASE = {
  NONE: 'NONE',
  WINDOW_FORMING: 'WINDOW_FORMING',
  MULTI_JURISDICTION: 'MULTI_JURISDICTION',
  ENFORCEMENT_AHEAD: 'ENFORCEMENT_AHEAD',
};

export const REGULATORY_LEAD_TIME = {
  WINDOW_FORMING:    { min: 6,  max: 18, label: '6–18 MO' },
  MULTI_JURISDICTION:{ min: 3,  max: 12, label: '3–12 MO' },
  ENFORCEMENT_AHEAD: { min: 1,  max: 6,  label: '1–6 MO'  },
};

const PHASE_A_THRESHOLD    = 50;   // KNOWLEDGE + MEDIA must both exceed this
const PHASE_B_MEDIA        = 65;   // MEDIA threshold for multi-jurisdiction
const PHASE_B_TECH         = 55;   // TECHNOLOGY threshold for multi-jurisdiction
const PHASE_C_SPREAD       = 20;   // KNOWLEDGE must exceed CAPITAL by this margin

const NULL_RESULT = {
  triggered: false,
  phase: REGULATORY_PHASE.NONE,
  phaseA: false,
  phaseB: false,
  phaseC: false,
  knowledgeScore: 0,
  mediaScore: 0,
  technologyScore: 0,
  capitalScore: 0,
  enforcementDelta: 0,
  fs: 0,
  leadTime: null,
  ts: 0,
};

export function detectRegulatoryWindow(signals) {
  if (!Array.isArray(signals) || signals.length === 0) {
    return { ...NULL_RESULT, ts: Date.now() };
  }

  // First-match wins per domain
  const byDomain = {};
  for (const s of signals) {
    if (s?.domain && !byDomain[s.domain]) byDomain[s.domain] = s;
  }

  const k = byDomain.KNOWLEDGE;
  const m = byDomain.MEDIA;
  const t = byDomain.TECHNOLOGY;
  const c = byDomain.CAPITAL;

  const kScore = k?.signal ?? 0;
  const mScore = m?.signal ?? 0;
  const tScore = t?.signal ?? 0;
  const cScore = c?.signal ?? 0;

  // Fs = mean confidence of the two primary trigger domains (KNOWLEDGE + MEDIA)
  const kConf = (k?.confidence ?? 0) / 100;
  const mConf = (m?.confidence ?? 0) / 100;
  const fs = k && m ? (kConf + mConf) / 2
           : k ? kConf
           : m ? mConf
           : 0;

  // Phase A — regulatory awareness precursor
  const phaseA = kScore > PHASE_A_THRESHOLD && mScore > PHASE_A_THRESHOLD;

  // Phase B — multi-jurisdiction momentum (stronger MEDIA + TECHNOLOGY pressure)
  const phaseB = mScore > PHASE_B_MEDIA && tScore > PHASE_B_TECH;

  // Phase C — enforcement posture gate: regulators outpacing capital markets
  const enforcementDelta = kScore - cScore;
  const phaseC = enforcementDelta > PHASE_C_SPREAD;

  // Priority: C > B > A
  let phase = REGULATORY_PHASE.NONE;
  if (phaseC)      phase = REGULATORY_PHASE.ENFORCEMENT_AHEAD;
  else if (phaseB) phase = REGULATORY_PHASE.MULTI_JURISDICTION;
  else if (phaseA) phase = REGULATORY_PHASE.WINDOW_FORMING;

  const triggered = phase !== REGULATORY_PHASE.NONE;

  return {
    triggered,
    phase,
    phaseA,
    phaseB,
    phaseC,
    knowledgeScore: kScore,
    mediaScore: mScore,
    technologyScore: tScore,
    capitalScore: cScore,
    enforcementDelta,
    fs,
    leadTime: triggered ? REGULATORY_LEAD_TIME[phase] : null,
    ts: Date.now(),
  };
}
