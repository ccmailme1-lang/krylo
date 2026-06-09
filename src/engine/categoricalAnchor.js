/* src/engine/categoricalAnchor.js */
/* WO-268 — Categorical anchor: classifies raw input against CATEGORY_MAP */

import { CATEGORY_MAP } from '../data/categoryMap.js';

/**
 * anchorArtifact(rawInput)
 * Classifies a raw input string against CATEGORY_MAP.
 * Returns the input augmented with metadata.categoryAnchor,
 * metadata.cat_id, and metadata.weight_bias.
 * Falls back to SILENCE on no keyword match.
 * Tie-breaker: highest keyword density wins;
 * first occurrence in CATEGORY_MAP key order if tied.
 */
export function anchorArtifact(rawInput) {
  const text = (typeof rawInput === 'string' ? rawInput : rawInput?.text ?? '')
    .toLowerCase();

  const scores = {};

  for (const [key, category] of Object.entries(CATEGORY_MAP)) {
    let count = 0;
    for (const kw of category.keywords) {
      if (text.includes(kw.toLowerCase())) count++;
    }
    scores[key] = count;
  }

  // Find winner: highest density, first occurrence on tie
  let winner = null;
  let topScore = 0;

  for (const key of Object.keys(CATEGORY_MAP)) {
    if (scores[key] > topScore) {
      topScore = scores[key];
      winner = key;
    }
  }

  // SILENCE fallback on no match
  const anchor = winner ?? 'SILENCE';
  const category = CATEGORY_MAP[anchor];

  const artifact = typeof rawInput === 'string'
    ? { text: rawInput }
    : { ...rawInput };

  artifact.metadata = {
    ...(artifact.metadata ?? {}),
    categoryAnchor: category,
    cat_id:         anchor,
    weight_bias:    category.bias,
  };

  return artifact;
}
