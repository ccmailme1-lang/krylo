/* src/utils/getSynthesis.js */
/* WO-283 — Synthesis generator: deterministic string from pillars + category */

const FALLBACK = 'Insufficient signal data for synthesis.';

/**
 * getSynthesis(pillars, anchorId, categoryMap)
 * Returns a deterministic synthesis string driven by the dominant pillar
 * and the active category anchor.
 *
 * Dominance threshold: a pillar must lead the next-highest by ≥ 15 points
 * to be considered dominant. If no pillar clears the threshold, the
 * category meaning is used as the synthesis. Falls back to FALLBACK if
 * anchorId or categoryMap are absent.
 */
export function getSynthesis(pillars, anchorId, categoryMap) {
  if (!pillars || !anchorId || !categoryMap) return FALLBACK;

  const category = categoryMap[anchorId];
  if (!category) return FALLBACK;

  const entries = Object.entries(pillars);
  if (!entries.length) return FALLBACK;

  // Sort descending by score
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const [topKey, topScore] = sorted[0];
  const [, secondScore]    = sorted[1] ?? [null, 0];

  const dominant = topScore - secondScore >= 15 ? topKey : null;

  const templates = {
    trust: `${category.meaning} The signal carries verified weight — deception here is structurally unlikely.`,
    accuracy: `${category.meaning} The data resolves with high fidelity. What is stated can be tested.`,
    gap: `${category.meaning} The absence is the signal. What is missing here speaks louder than what is present.`,
    velocity: `${category.meaning} This is moving fast. The window for interpretation is narrow.`,
    expiration: `${category.meaning} This signal is decaying. Act on it or archive it — do not sit with it.`,
    strength: `${category.meaning} The signal is unusually strong. Weight it accordingly.`,
    alignment: `${category.meaning} Multiple vectors converge here. This is not noise.`,
  };

  if (dominant && templates[dominant]) {
    return templates[dominant];
  }

  // No dominant pillar — return category meaning as synthesis
  return category.meaning ?? FALLBACK;
}
