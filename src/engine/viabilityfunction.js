// WO-2017 — Viability Function (HP Stress Gate)
// Computes pre/post-stress viability of an HP candidate.
// POWER_DISCONTINUITY stress suppresses structural domain evidence by 70%.
// PASS required for HP-2 and HP-3 qualification.

const STRUCTURAL_DOMAINS = new Set(['TECHNOLOGY', 'CAPITAL', 'OWNERSHIP']);
const STRESS_SUPPRESSION = 0.70; // structural evidence suppressed 70% under POWER_DISCONTINUITY
const VIABILITY_THRESHOLD = 0.50;

export function computeViability(evidence, hpScore) {
  const total = evidence.length;
  if (total === 0) return { viability: 0, stressedViability: 0, viabilityRatio: 1, verdict: 'PASS' };

  const structuralCount    = evidence.filter(e => STRUCTURAL_DOMAINS.has(e.source)).length;
  const nonStructuralCount = total - structuralCount;

  // Pre-stress viability: normalized HP peak score (0–1)
  const viability = Math.min(1, Math.max(0, (hpScore ?? 0) / 100));

  // Post-stress: structural sources suppressed by 70%, non-structural unchanged
  // Effective weight after stress = structuralCount×0.30 + nonStructuralCount×1.0
  const stressedWeight  = (structuralCount * (1 - STRESS_SUPPRESSION)) + nonStructuralCount;
  const stressedRatio   = total > 0 ? stressedWeight / total : 1;
  const stressedViability = viability * stressedRatio;

  const viabilityRatio = viability > 0 ? stressedViability / viability : 1;
  const verdict = viabilityRatio >= VIABILITY_THRESHOLD ? 'PASS' : 'FAIL';

  return { viability, stressedViability, viabilityRatio, verdict };
}
