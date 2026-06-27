// WO-2011 — HP Tier Gate (Final Arbiter)
// STRUCTURAL_DOMAINS: real economic infrastructure.
// MEDIA + KNOWLEDGE alone = narrative convergence, not structural.
// HP qualification requires ≥1 structural domain in evidence.

const STRUCTURAL_DOMAINS = new Set(['TECHNOLOGY', 'CAPITAL', 'OWNERSHIP']);

export function arbitrateHP(engineState, synthesis) {
  const rawHp = engineState?.happyPath ?? null;

  if (!rawHp?.qualified) {
    return { ...(rawHp ?? {}), qualified: false, tier: 'HP-0', tierReason: 'No engine qualification' };
  }

  const evidence       = synthesis?.evidence ?? [];
  const sourceDomains  = new Set(evidence.map(e => e.source).filter(Boolean));
  const qualDomains    = rawHp.domains ?? [];
  const structCount    = [...sourceDomains].filter(s => STRUCTURAL_DOMAINS.has(s)).length;

  if (sourceDomains.size <= 1) {
    return { ...rawHp, qualified: false, tier: 'HP-0', tierReason: 'Insufficient evidence diversity' };
  }

  if (structCount === 0) {
    return { ...rawHp, qualified: false, tier: 'HP-1', tierReason: 'No structural domain in evidence' };
  }

  if (qualDomains.length >= 3 && sourceDomains.size >= 3) {
    return { ...rawHp, qualified: true, tier: 'HP-3', tierReason: 'Full structural authority' };
  }

  if (qualDomains.length >= 2) {
    return { ...rawHp, qualified: true, tier: 'HP-2', tierReason: 'Structural convergence confirmed' };
  }

  return { ...rawHp, qualified: false, tier: 'HP-1', tierReason: 'Insufficient qualified domains' };
}
