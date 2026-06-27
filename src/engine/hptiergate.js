// WO-2011 — HP Tier Gate (Final Arbiter)
// WO-2017 — Viability Function (stress gate for HP-2+)
// WO-2018 — Evidence Independence Metric (independence gate for HP-3)

import { computeViability }    from './viabilityfunction.js';
import { computeIndependence } from './evidenceindependence.js';

const STRUCTURAL_DOMAINS = new Set(['TECHNOLOGY', 'CAPITAL', 'OWNERSHIP']);

export function arbitrateHP(engineState, synthesis) {
  const rawHp = engineState?.happyPath ?? null;

  if (!rawHp?.qualified) {
    return { ...(rawHp ?? {}), qualified: false, tier: 'HP-0', tierReason: 'No engine qualification' };
  }

  const evidence      = synthesis?.evidence ?? [];
  const sourceDomains = new Set(evidence.map(e => e.source).filter(Boolean));
  const qualDomains   = rawHp.domains ?? [];
  const structCount   = [...sourceDomains].filter(s => STRUCTURAL_DOMAINS.has(s)).length;

  if (sourceDomains.size <= 1) {
    return { ...rawHp, qualified: false, tier: 'HP-0', tierReason: 'Insufficient evidence diversity' };
  }

  if (structCount === 0) {
    return { ...rawHp, qualified: false, tier: 'HP-1', tierReason: 'No structural domain in evidence' };
  }

  // WO-2017: viability gate — required for HP-2+
  const vr = computeViability(evidence, rawHp.peakScore ?? rawHp.score ?? 0);
  if (vr.verdict === 'FAIL') {
    return { ...rawHp, qualified: false, tier: 'HP-1',
      tierReason: `Viability gate FAIL — stress ratio ${vr.viabilityRatio.toFixed(2)}` };
  }

  if (qualDomains.length >= 3 && sourceDomains.size >= 3) {
    // WO-2018: independence gate — required for HP-3
    const eim = computeIndependence(evidence);
    if (eim.verdict === 'FAIL') {
      return { ...rawHp, qualified: true, tier: 'HP-2',
        tierReason: `Independence gate FAIL — score ${eim.independenceScore.toFixed(2)}` };
    }
    return { ...rawHp, qualified: true, tier: 'HP-3',
      tierReason: 'Full structural authority', viability: vr, independence: eim };
  }

  if (qualDomains.length >= 2) {
    return { ...rawHp, qualified: true, tier: 'HP-2',
      tierReason: 'Structural convergence confirmed', viability: vr };
  }

  return { ...rawHp, qualified: false, tier: 'HP-1', tierReason: 'Insufficient qualified domains' };
}
