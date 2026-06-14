// WO-1739: AI Infrastructure Demand Signal (Khoo Protocol)
// Derived from Jamie Khoo, CEO DayOne Data Centers (Singapore) — 350MW / 14 DCs.
//
// CONTRACT (WO-1745): Protocols produce evidence and signals only.
//   No conclusions. No predictions. No narratives. No leadTime.
//   Output feeds upward to WEAK → NC → SYNTH.
//
// Observable detection thresholds:
//   TECHNOLOGY > 65  — compute demand pressure elevated
//   CAPITAL    > 50  — debt financing window open (FRED rate-regime proxy via WO-1719)
//   OWNERSHIP  > 60  — EDGAR infrastructure commitment flow accelerating (WO-1720)

export const KHOO_PROTOCOL = 'KHOO';

export const EVIDENCE_TYPES = {
  COMPUTE_DEMAND_PRESSURE:        'COMPUTE_DEMAND_PRESSURE',
  FINANCING_REGIME:               'FINANCING_REGIME',
  INFRASTRUCTURE_COMMITMENT_FLOW: 'INFRASTRUCTURE_COMMITMENT_FLOW',
};

const COMPUTE_THRESHOLD    = 65;
const FINANCING_THRESHOLD  = 50;
const COMMITMENT_THRESHOLD = 60;

export const FS_GATE = 0.70;

function evidenceItem(type, domain, score, threshold) {
  const active = score > threshold;
  return { type, domain, score, threshold, state: active ? 'ELEVATED' : 'BELOW_THRESHOLD', active };
}

function signalItem(domain, score, threshold) {
  return { domain, score, state: score > threshold ? 'ACTIVE' : 'INACTIVE', active: score > threshold };
}

const EMPTY = {
  protocol: KHOO_PROTOCOL,
  triggered: false,
  evidence: [],
  signals: [],
  provenance: [],
  fs: 0,
  fsQualified: false,
  ts: 0,
};

export function detectAIInfrastructureDemand(signals) {
  if (!Array.isArray(signals) || signals.length === 0) {
    return { ...EMPTY, ts: Date.now() };
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

  // Fs = mean confidence across T + C + O; missing domain = 0 contribution
  const fs = ((tech?.confidence ?? 0) + (cap?.confidence ?? 0) + (own?.confidence ?? 0)) / 300;
  const fsQualified = fs >= FS_GATE;

  // Observable evidence items — detected states, not conclusions
  const evidence = [
    evidenceItem(EVIDENCE_TYPES.COMPUTE_DEMAND_PRESSURE,        'TECHNOLOGY', tScore, COMPUTE_THRESHOLD),
    evidenceItem(EVIDENCE_TYPES.FINANCING_REGIME,               'CAPITAL',    cScore, FINANCING_THRESHOLD),
    evidenceItem(EVIDENCE_TYPES.INFRASTRUCTURE_COMMITMENT_FLOW, 'OWNERSHIP',  oScore, COMMITMENT_THRESHOLD),
  ];

  // Signal items for WEAK / NC / SYNTH consumption
  const outputSignals = [
    signalItem('TECHNOLOGY', tScore, COMPUTE_THRESHOLD),
    signalItem('CAPITAL',    cScore, FINANCING_THRESHOLD),
    signalItem('OWNERSHIP',  oScore, COMMITMENT_THRESHOLD),
  ];

  // Provenance — source WO attribution per domain
  const provenance = [];
  if (cap)  provenance.push({ source: 'WO-1719', domain: 'CAPITAL',    ts: cap.ts  ?? Date.now() });
  if (own)  provenance.push({ source: 'WO-1720', domain: 'OWNERSHIP',  ts: own.ts  ?? Date.now() });
  if (tech) provenance.push({ source: 'KALSHI',  domain: 'TECHNOLOGY', ts: tech.ts ?? Date.now() });

  const triggered = evidence.some(e => e.active);

  return {
    protocol: KHOO_PROTOCOL,
    triggered,
    evidence,
    signals: outputSignals,
    provenance,
    fs,
    fsQualified,
    ts: Date.now(),
  };
}
