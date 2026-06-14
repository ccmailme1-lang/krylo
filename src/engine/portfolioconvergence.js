// src/engine/portfolioconvergence.js — WO-1728: Full-Field Portfolio Convergence (Bezos Protocol)
//
// Phase A: 6-domain aggregate convergence score — when operator spans all 6 domains,
//          surface aggregate score alongside individual readings.
// Phase B: domain interdependency map — causal links between cones for a given operator.
// Phase C: platform inflection alert — 3+ domains at BUILDING CONVERGENCE simultaneously.
//
// Pass criteria: aggregate score visible, interdependency map renders,
//               platform inflection fires at ≥3 simultaneous convergences, Fs≥0.70.
// Depends on: WO-1725 Phase A (COMPLETE), WO-1126A (COMPLETE), WO-1336 (COMPLETE).

const ALL_DOMAINS       = ['TECHNOLOGY', 'CAPITAL', 'KNOWLEDGE', 'LABOR', 'MEDIA', 'OWNERSHIP'];
const BUILDING_GATE     = 50;   // signal > 50 = BUILDING CONVERGENCE proxy
const CONFIDENCE_GATE   = 0.70; // Fs gate per WO spec
const INFLECTION_DOMAINS = 3;   // minimum simultaneous convergences for platform bet

// Phase B: static domain interdependency map.
// Edge: { from, to, label } — directional causal link.
// Phase B live: operator-profile-driven dynamic weights.
export const DOMAIN_INTERDEPENDENCIES = [
  { from: 'LABOR',      to: 'CAPITAL',    label: 'labor dislocation → capital reallocation' },
  { from: 'TECHNOLOGY', to: 'CAPITAL',    label: 'tech adoption → capital formation' },
  { from: 'KNOWLEDGE',  to: 'TECHNOLOGY', label: 'knowledge accumulation → infrastructure demand' },
  { from: 'MEDIA',      to: 'CAPITAL',    label: 'narrative momentum → investment flow' },
  { from: 'CAPITAL',    to: 'OWNERSHIP',  label: 'capital concentration → ownership shift' },
  { from: 'TECHNOLOGY', to: 'LABOR',      label: 'automation pressure → labor displacement' },
  { from: 'MEDIA',      to: 'KNOWLEDGE',  label: 'narrative saturation → knowledge formation' },
  { from: 'OWNERSHIP',  to: 'CAPITAL',    label: 'asset repositioning → capital availability' },
];

// computePortfolioConvergence(signals)
//
// signals: [{ domain, signal, confidence }]
//
// Phase A — returns:
// {
//   aggregateScore:    number   — weighted avg convergence across all 6 domains (0–100)
//   domainScores:      [{ domain, score, confidence, active }]
//   activeDomains:     number   — domains with signal data present
//   fullField:         boolean  — all 6 domains have readings
//   fs:                number   — mean confidence across active domains
// }
export function computePortfolioConvergence(signals) {
  if (!Array.isArray(signals) || signals.length === 0) {
    return { aggregateScore: 0, domainScores: [], activeDomains: 0, fullField: false, fs: 0 };
  }

  const domainScores = ALL_DOMAINS.map(domain => {
    const s = signals.find(sig => sig.domain === domain);
    return {
      domain,
      score:      s ? (s.signal ?? 0) : 0,
      confidence: s ? (s.confidence ?? 0) / 100 : 0,
      active:     !!s,
    };
  });

  const active       = domainScores.filter(d => d.active);
  const activeDomains = active.length;
  const fullField    = activeDomains === ALL_DOMAINS.length;

  const aggregateScore = activeDomains > 0
    ? parseFloat((active.reduce((sum, d) => sum + d.score, 0) / activeDomains).toFixed(1))
    : 0;

  const fs = activeDomains > 0
    ? parseFloat((active.reduce((sum, d) => sum + d.confidence, 0) / activeDomains).toFixed(3))
    : 0;

  return { aggregateScore, domainScores, activeDomains, fullField, fs };
}

// detectPlatformInflection(signals)
//
// Phase C — fires when ≥3 domains simultaneously exceed BUILDING_GATE with Fs≥CONFIDENCE_GATE.
//
// Returns:
// {
//   triggered:          boolean
//   convergingDomains:  string[]
//   convergenceCount:   number
//   inflectionScore:    number   — avg signal of converging domains
//   fs:                 number
// }
export function detectPlatformInflection(signals) {
  if (!Array.isArray(signals) || signals.length === 0) {
    return { triggered: false, convergingDomains: [], convergenceCount: 0, inflectionScore: 0, fs: 0 };
  }

  const converging = signals.filter(
    s => (s.signal ?? 0) > BUILDING_GATE && (s.confidence ?? 0) / 100 >= CONFIDENCE_GATE
  );

  const triggered        = converging.length >= INFLECTION_DOMAINS;
  const convergingDomains = converging.map(s => s.domain);
  const inflectionScore  = converging.length > 0
    ? parseFloat((converging.reduce((sum, s) => sum + (s.signal ?? 0), 0) / converging.length).toFixed(1))
    : 0;
  const fs = converging.length > 0
    ? parseFloat((converging.reduce((sum, s) => sum + (s.confidence ?? 0) / 100, 0) / converging.length).toFixed(3))
    : 0;

  return { triggered, convergingDomains, convergenceCount: converging.length, inflectionScore, fs };
}
