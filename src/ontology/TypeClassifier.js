/**
 * src/ontology/TypeClassifier.js
 *
 * WO-803: Base Mapping
 * Classifies a signal into one of three ontological base types:
 *
 *   ASSET    — Something with intrinsic value: a company, instrument, commodity,
 *              currency, IP, or resource that can be owned, priced, or depleted.
 *
 *   ENTITY   — An actor with agency: a person, organization, institution,
 *              or system that makes decisions and can be held accountable.
 *
 *   ANOMALY  — A deviation or event: a pattern break, behavioral irregularity,
 *              or incident that does not reduce to a stable Asset or Entity.
 *
 * This layer sits below epistemic classification (CATEGORY_MAP / categoricalAnchor).
 * It answers: "What IS this signal about?" before asking "What kind of evidence is it?"
 *
 * Wiring point for HysteresisBuffer (WO-804) — baseType gates permitted transitions.
 */

// ── Keyword tables ────────────────────────────────────────────────────────────

const ASSET_KEYWORDS = [
  // Instruments
  'stock', 'share', 'equity', 'bond', 'etf', 'fund', 'option', 'warrant',
  'futures', 'derivative', 'token', 'crypto', 'bitcoin', 'ethereum',
  // Commodity / resource
  'oil', 'gas', 'gold', 'silver', 'copper', 'wheat', 'commodity',
  'real estate', 'property', 'land', 'patent', 'license', 'trademark', 'ip',
  // Corporate identity as asset
  'ticker', 'ipo', 'acquisition', 'merger', 'valuation', 'market cap',
  'revenue', 'earnings', 'dividend', 'yield', 'price target', 'rating',
  // Currency
  'currency', 'forex', 'dollar', 'euro', 'yuan', 'yen',
];

const ENTITY_KEYWORDS = [
  // Titles / roles
  'ceo', 'cfo', 'coo', 'cto', 'founder', 'president', 'chairman', 'director',
  'officer', 'executive', 'minister', 'senator', 'governor', 'mayor',
  // Organizational markers
  'inc', 'corp', 'llc', 'ltd', 'company', 'firm', 'organization', 'agency',
  'committee', 'board', 'department', 'bureau', 'authority', 'institution',
  'government', 'administration', 'regulator', 'central bank', 'fed',
  // Agency / volition verbs (entity did something)
  'announced', 'stated', 'filed', 'signed', 'appointed', 'resigned',
  'sued', 'hired', 'fired', 'launched', 'denied', 'confirmed', 'pledged',
];

const ANOMALY_KEYWORDS = [
  // Pattern breaks
  'crash', 'spike', 'surge', 'collapse', 'plunge', 'flash', 'halt',
  'circuit breaker', 'black swan', 'outlier', 'deviation', 'irregularity',
  // Security / integrity events
  'breach', 'hack', 'leak', 'exploit', 'vulnerability', 'zero-day',
  'fraud', 'scandal', 'misconduct', 'manipulation', 'investigation',
  // Temporal urgency markers
  'breaking', 'unexpected', 'unprecedented', 'sudden', 'overnight',
  'record high', 'record low', 'all-time', 'historic',
  // Quantitative deviation
  'miss', 'beat', 'surprise', 'vs expected', 'worse than', 'better than',
  'above consensus', 'below consensus',
];

// ── Scorer ────────────────────────────────────────────────────────────────────

/**
 * Scores text against a keyword list.
 * Returns { score, matched } — score = matched count / list length (density-normalized).
 */
function score(text, keywords) {
  const matched = keywords.filter(kw => text.includes(kw));
  return {
    score:   matched.length / keywords.length,
    matched,
  };
}

// ── Classifier ────────────────────────────────────────────────────────────────

/**
 * classifySignal(signal)
 *
 * @param {Object|string} signal — a signal object (with .text, .truth_statement, .title)
 *                                  or a raw string.
 * @returns {{ baseType: string, confidence: number, matched: string[] }}
 *
 * baseType: 'ASSET' | 'ENTITY' | 'ANOMALY' | 'UNKNOWN'
 * confidence: 0.0 – 1.0 (normalized against winning score)
 * matched: keyword array that drove the classification
 */
export function classifySignal(signal) {
  const raw = typeof signal === 'string'
    ? signal
    : [signal.text, signal.truth_statement, signal.title, signal.id]
        .filter(Boolean)
        .join(' ');

  const text = raw.toLowerCase();

  const asset   = score(text, ASSET_KEYWORDS);
  const entity  = score(text, ENTITY_KEYWORDS);
  const anomaly = score(text, ANOMALY_KEYWORDS);

  const candidates = [
    { baseType: 'ASSET',   ...asset   },
    { baseType: 'ENTITY',  ...entity  },
    { baseType: 'ANOMALY', ...anomaly },
  ];

  // Sort descending by score
  candidates.sort((a, b) => b.score - a.score);

  const winner = candidates[0];

  // No keywords matched at all → UNKNOWN
  if (winner.score === 0) {
    return { baseType: 'UNKNOWN', confidence: 0, matched: [] };
  }

  // Confidence = winner score / (sum of all scores) — winner dominance ratio
  const total      = asset.score + entity.score + anomaly.score;
  const confidence = total > 0 ? winner.score / total : 0;

  return {
    baseType:   winner.baseType,
    confidence: Math.round(confidence * 1000) / 1000,
    matched:    winner.matched,
  };
}

// ── Base type metadata ────────────────────────────────────────────────────────

export const BASE_TYPE_META = {
  ASSET: {
    label:       'ASSET',
    description: 'A priced, ownable thing — instrument, commodity, or resource.',
    color:       '#007FFF',
  },
  ENTITY: {
    label:       'ENTITY',
    description: 'An actor with agency — person, organization, or institution.',
    color:       '#5599FF',  // blue (local zone color)
  },
  ANOMALY: {
    label:       'ANOMALY',
    description: 'A deviation or event — pattern break, incident, or irregularity.',
    color:       '#FF3B3B',  // red
  },
  UNKNOWN: {
    label:       'UNKNOWN',
    description: 'Insufficient signal to classify.',
    color:       'rgba(255,255,255,0.3)',
  },
};
