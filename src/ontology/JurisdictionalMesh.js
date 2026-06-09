/**
 * src/ontology/JurisdictionalMesh.js
 *
 * WO-811: Jurisdictional Mesh
 * Tags signals with their geopolitical jurisdiction: US | EU | APAC | GLOBAL | UNKNOWN.
 *
 * This is a DIFFERENT axis from geoTier (local/regional/national = funnel depth).
 * geoTier answers "how far from center?" — jurisdiction answers "which bloc?"
 *
 * Classifies by:
 *   - Exchange names and index identifiers
 *   - Regulatory body names
 *   - Currency symbols and names
 *   - Geographic place names and country identifiers
 *   - TLD patterns in URLs embedded in signal text
 *
 * Output per signal:
 *   { primary: string, secondary: string[], confidence: number, indicators: string[] }
 *
 * JurisdictionMesh registry:
 *   A running distribution tracker for a population of signals.
 *   Call mesh.ingest(signal) for each signal, then mesh.distribution() for the breakdown.
 *   Used by RightRailHUD to show "42% US / 35% EU / 23% APAC" across the live feed.
 */

// ── Indicator tables ──────────────────────────────────────────────────────────

const INDICATORS = {
  US: [
    // Exchanges + indices
    'nyse', 'nasdaq', 'dow jones', 's&p 500', 's&p500', 'dow', 'russell 2000',
    // Regulators
    'sec', 'federal reserve', 'fed ', 'fdic', 'cftc', 'finra', 'occ', 'cfpb',
    // Currency
    'usd', ' dollar', ' $',
    // Geography
    'washington', 'new york', 'wall street', 'silicon valley', 'california',
    'texas', 'united states', ' u.s.', ' us ', 'american', 'congress', 'white house',
    // Entity markers
    ' inc.', ' corp.', ' llc', ' inc,',
  ],

  EU: [
    // Exchanges + indices
    'lse', 'euronext', 'xetra', 'dax', 'ftse', 'cac 40', 'ibex', 'stoxx',
    'london stock exchange',
    // Regulators
    'ecb', 'european central bank', 'eba', 'esma', 'bafin', 'fca ', 'pra ',
    // Currency
    'eur ', 'euro ', '€', 'gbp', 'pound sterling', ' pound',
    // Geography
    'frankfurt', 'london', 'paris', 'berlin', 'brussels', 'amsterdam', 'madrid',
    'rome', 'dublin', 'zurich', 'european union', 'europe', ' eu ', ' uk ',
    'britain', 'germany', 'france', 'italy', 'spain', 'netherlands',
    // TLD
    '.eu', '.co.uk', '.de', '.fr', '.it', '.es', '.nl',
  ],

  APAC: [
    // Exchanges + indices
    'nikkei', 'topix', 'hang seng', 'shanghai composite', 'shenzhen',
    'asx 200', 'kospi', 'bse sensex', 'nifty', 'straits times',
    'tokyo stock exchange', 'hong kong stock exchange',
    // Regulators
    'bank of japan', 'boj', 'pboc', "people's bank", 'rba', 'reserve bank of australia',
    'mas ', 'monetary authority', 'sebi',
    // Currency
    'jpy', ' yen', 'cny', ' yuan', 'rmb', 'aud ', 'hkd', 'sgd', 'krw', ' won',
    'rupee', 'inr ',
    // Geography
    'tokyo', 'beijing', 'shanghai', 'hong kong', 'singapore', 'sydney',
    'seoul', 'mumbai', 'delhi', 'taipei', 'bangkok', 'jakarta',
    'japan', 'china', 'australia', 'south korea', 'india', 'taiwan',
    'southeast asia', 'asia pacific', 'apac',
    // TLD
    '.jp', '.cn', '.au', '.hk', '.sg', '.kr', '.in', '.tw',
  ],
};

// ── Signal scorer ─────────────────────────────────────────────────────────────

function scoreText(text, keywords) {
  const matched = keywords.filter(kw => text.includes(kw));
  return { score: matched.length, matched };
}

// ── Classifier ────────────────────────────────────────────────────────────────

/**
 * classifyJurisdiction(signal)
 *
 * @param {Object|string} signal — signal object or raw string
 * @returns {{
 *   primary:     string,          // 'US' | 'EU' | 'APAC' | 'GLOBAL' | 'UNKNOWN'
 *   secondary:   string[],        // additional jurisdictions that scored above threshold
 *   confidence:  number,          // 0.0–1.0 dominance of primary
 *   indicators:  string[],        // matched keywords for primary
 * }}
 */
export function classifyJurisdiction(signal) {
  // If already tagged, respect the existing tag
  if (signal?.jurisdiction) {
    return {
      primary:    signal.jurisdiction,
      secondary:  [],
      confidence: 1.0,
      indicators: [],
    };
  }

  const raw = typeof signal === 'string'
    ? signal
    : [signal?.text, signal?.truth_statement, signal?.title, signal?.id]
        .filter(Boolean)
        .join(' ');

  const text = raw.toLowerCase();

  const us   = scoreText(text, INDICATORS.US);
  const eu   = scoreText(text, INDICATORS.EU);
  const apac = scoreText(text, INDICATORS.APAC);

  const scores = [
    { jx: 'US',   ...us   },
    { jx: 'EU',   ...eu   },
    { jx: 'APAC', ...apac },
  ];

  scores.sort((a, b) => b.score - a.score);

  const total  = us.score + eu.score + apac.score;
  const winner = scores[0];

  if (total === 0) {
    return { primary: 'UNKNOWN', secondary: [], confidence: 0, indicators: [] };
  }

  // GLOBAL: top two scores are within 1 of each other and both non-zero
  const isGlobal = scores[1].score > 0 && (winner.score - scores[1].score) <= 1;

  const primary    = isGlobal ? 'GLOBAL' : winner.jx;
  const confidence = isGlobal ? 0.5 : winner.score / total;
  const secondary  = scores
    .slice(1)
    .filter(s => s.score > 0)
    .map(s => s.jx);

  return {
    primary,
    secondary,
    confidence: Math.round(confidence * 1000) / 1000,
    indicators: isGlobal ? [...winner.matched, ...scores[1].matched] : winner.matched,
  };
}

// ── Jurisdiction metadata ────────────────────────────────────────────────────

export const JURISDICTION_META = {
  US: {
    label: 'US',
    fullName: 'United States',
    color: '#5599FF',   // blue
  },
  EU: {
    label: 'EU',
    fullName: 'European Union / UK',
    color: '#007FFF',
  },
  APAC: {
    label: 'APAC',
    fullName: 'Asia-Pacific',
    color: '#66FF00',   // lime
  },
  GLOBAL: {
    label: 'GLOBAL',
    fullName: 'Multi-Jurisdictional',
    color: 'rgba(255,255,255,0.7)',
  },
  UNKNOWN: {
    label: '—',
    fullName: 'Unclassified',
    color: 'rgba(255,255,255,0.25)',
  },
};

// ── JurisdictionMesh — population-level distribution tracker ─────────────────

/**
 * JurisdictionMesh
 * Tracks jurisdiction distribution across a population of signals.
 * Call .ingest(signals) with the full active signal array; call .distribution()
 * to get the current percentage breakdown for display.
 */
export class JurisdictionMesh {
  constructor() {
    this._counts = { US: 0, EU: 0, APAC: 0, GLOBAL: 0, UNKNOWN: 0 };
    this._total  = 0;
    this._cache  = null; // signals array from last ingest — identity check
  }

  /**
   * Ingest a full signals array. Re-classifies only when the array reference changes.
   * @param {Array} signals
   */
  ingest(signals) {
    if (signals === this._cache) return;
    this._cache  = signals;
    this._counts = { US: 0, EU: 0, APAC: 0, GLOBAL: 0, UNKNOWN: 0 };
    this._total  = 0;

    signals.forEach(sig => {
      const { primary } = classifyJurisdiction(sig);
      this._counts[primary] = (this._counts[primary] ?? 0) + 1;
      this._total++;
    });
  }

  /**
   * Returns the current percentage breakdown.
   * @returns {Array<{ jx: string, count: number, pct: number, meta: Object }>}
   */
  distribution() {
    if (this._total === 0) return [];
    return Object.entries(this._counts)
      .filter(([, count]) => count > 0)
      .map(([jx, count]) => ({
        jx,
        count,
        pct:  Math.round((count / this._total) * 100),
        meta: JURISDICTION_META[jx],
      }))
      .sort((a, b) => b.count - a.count);
  }
}
