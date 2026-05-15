/* src/data/physicsConstants.js                                        */
/* WO-750 — Schema Evolution: Physics Category Definitions             */
/* category_id is a structural constant assigned at ingestion.         */
/* Governs: Mass, Friction, Escape Velocity in the Three.js engine.    */
/* Lens IDs (categoryMap.js) are separate — do not affect these values */

export const PHYSICS_CATEGORIES = {

  'CAT-01': {
    id:          'CAT-01',
    name:        'Infrastructure',
    mass:        1.0,
    description: 'High-trust, slow-moving logistical facts. Extremely hard to snap.',
  },

  'CAT-02': {
    id:          'CAT-02',
    name:        'Policy',
    mass:        0.8,
    description: 'Governance and legislation. Requires significant signal to migrate.',
  },

  'CAT-03': {
    id:          'CAT-03',
    name:        'General News',
    mass:        0.5,
    description: 'Standard daily reporting. Balanced elasticity.',
  },

  'CAT-04': {
    id:          'CAT-04',
    name:        'Human Interest',
    mass:        0.3,
    description: 'High-emotion, lower-fact weight. Faster ascent, easier to snap.',
  },

  'CAT-05': {
    id:          'CAT-05',
    name:        'Viral / Scandal',
    mass:        0.1,
    description: 'High-volatility rumors. Near-zero friction; snaps instantly at low trust.',
  },

};

// Convenience lookup: category_id string → mass coefficient
// Defaults to 0.5 (CAT-03 General News) if category_id is missing or unrecognized
export const getMass = (category_id) =>
  PHYSICS_CATEGORIES[category_id]?.mass ?? 0.5;

// ── Category Assignment Heuristic ─────────────────────────────────────────────
// Checked in priority order: CAT-05 → CAT-01 → CAT-02 → CAT-04 → CAT-03 (default)
const CATEGORY_KEYWORDS = [
  ['CAT-05', ['scandal', 'viral', 'controversy', 'outrage', 'shock', 'leaked',
              'exposed', 'rumor', 'allegation', 'arrest', 'fraud', 'fired',
              'resigns', 'affair', 'abuse', 'riot', 'protest']],
  ['CAT-01', ['infrastructure', 'utility', 'power', 'water', 'road', 'bridge',
              'transit', 'grid', 'pipeline', 'broadband', 'highway', 'dam',
              'airport', 'port', 'rail', 'energy']],
  ['CAT-02', ['policy', 'law', 'bill', 'legislation', 'congress', 'senate',
              'government', 'regulation', 'vote', 'election', 'federal',
              'governor', 'president', 'court', 'ruling', 'treaty', 'tariff']],
  ['CAT-04', ['family', 'community', 'school', 'charity', 'local', 'hero',
              'rescue', 'missing', 'cancer', 'child', 'mother', 'father',
              'veteran', 'teacher', 'dog', 'animal']],
];

// Assigns a category_id from title text. Returns CAT-03 if no keywords match.
export function assignCategory(text) {
  if (!text) return 'CAT-03';
  const lower = text.toLowerCase();
  for (const [id, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some(kw => lower.includes(kw))) return id;
  }
  return 'CAT-03';
}
