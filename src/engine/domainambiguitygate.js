// WO-1766 — Domain Ambiguity Gate
// Pre-resolution entropy scoring. Classifies query resolution state as
// HARD / SOFT / HOLD before any domain commitment fires.
//
// This module is domain-agnostic — it operates on a score map produced
// by the caller. It has no knowledge of specific domain labels.

const HARD_MARGIN    = 0.35;  // winner must exceed runner-up by this (normalized)
const MIN_CONFIDENCE = 0.25;  // winner must clear this absolute normalized score
const SOFT_BAND      = 0.35;  // any domain within this of winner is co-active
const ENTROPY_HARD   = 1.0;   // H below this → HARD eligible
const ENTROPY_HOLD   = 2.2;   // H above this → HOLD (too uniform to commit)

export const AMBIGUITY_THRESHOLDS = {
  HARD_MARGIN, MIN_CONFIDENCE, SOFT_BAND, ENTROPY_HARD, ENTROPY_HOLD,
};

/**
 * Classify domain resolution state from a raw hit-count score map.
 *
 * @param {Record<string, number>} domainScores — { DOMAIN_LABEL: hitCount }
 * @returns {{ state, entropy, winner, winnerScore, coActive, resolutionEligible }}
 *
 *   state              — 'HARD' | 'SOFT' | 'HOLD'
 *   entropy            — Shannon H over the normalized distribution
 *   winner             — top domain label; null when state is HOLD with no winner
 *   winnerScore        — normalized score of winner (0–1)
 *   coActive           — all other domains within SOFT_BAND of winner
 *   resolutionEligible — false on HOLD; caller must not commit a domain
 */
export function classifyAmbiguity(domainScores) {
  const entries = Object.entries(domainScores ?? {}).filter(([, v]) => v > 0);

  if (entries.length === 0) {
    return { state: 'HOLD', entropy: 0, winner: null, winnerScore: 0, coActive: [], resolutionEligible: false };
  }

  const total = entries.reduce((s, [, v]) => s + v, 0);
  entries.sort((a, b) => b[1] - a[1]);

  const [winnerDomain, winnerRaw] = entries[0];
  const winnerScore = winnerRaw / total;

  // Shannon entropy — guard log(0) with ε
  const H = -entries.reduce((s, [, v]) => {
    const p = v / total;
    return s + (p > 1e-12 ? p * Math.log2(p) : 0);
  }, 0);

  // Minimum absolute confidence gate
  if (winnerScore < MIN_CONFIDENCE) {
    return { state: 'HOLD', entropy: H, winner: null, winnerScore, coActive: [], resolutionEligible: false };
  }

  // High-entropy gate — distribution too uniform to commit
  if (H > ENTROPY_HOLD) {
    return { state: 'HOLD', entropy: H, winner: winnerDomain, winnerScore, coActive: [], resolutionEligible: false };
  }

  // Co-active domains: any domain whose normalized score is within SOFT_BAND of winner
  const coActive = entries.slice(1)
    .filter(([, v]) => (v / total) >= winnerScore - SOFT_BAND)
    .map(([d]) => d);

  const secondScore = entries.length > 1 ? entries[1][1] / total : 0;
  const margin = winnerScore - secondScore;

  // HARD: sufficient margin AND low entropy AND no co-active domains
  if (margin >= HARD_MARGIN && H < ENTROPY_HARD && coActive.length === 0) {
    return { state: 'HARD', entropy: H, winner: winnerDomain, winnerScore, coActive: [], resolutionEligible: true };
  }

  return { state: 'SOFT', entropy: H, winner: winnerDomain, winnerScore, coActive, resolutionEligible: true };
}
