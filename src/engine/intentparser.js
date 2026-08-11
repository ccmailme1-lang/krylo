// WO-1342 Phase A — Deterministic Intent Parser
// No LLM. Constrained grammar + regex + finite ontology.
// Determinism guarantee: same input + same PARSER_VERSION = same ParsedIntent always.

export const PARSER_VERSION = '1.0.0-phase-a';

const VERB_MAP = {
  TRACK:       ['track', 'follow', 'watch trend', 'observe over time'],
  INVESTIGATE: ['investigate', 'probe', 'examine', 'dig into', 'look into', 'research', 'find out'],
  COMPARE:     ['compare', 'contrast', 'versus', ' vs ', 'benchmark', 'diff', 'difference between'],
  MONITOR:     ['monitor', 'alert on', 'flag', 'scan for', 'watch for', 'keep eye'],
  HEDGE:       ['hedge', 'protect against', 'insure', 'mitigate', 'defend'],
  SECURE:      ['secure', 'lock in', 'anchor', 'stabilize', 'protect my'],
  AUDIT:       ['audit', 'review', 'verify', 'inspect', 'assess', 'evaluate', 'check'],
  ACCELERATE:  ['accelerate', 'speed up', 'increase rate', 'grow', 'expand', 'boost'],
  REPOSITION:  ['reposition', 'rotate', 'pivot', 'shift exposure', 'move out of', 'transfer'],
  VALIDATE:    ['validate', 'confirm', 'prove', 'test hypothesis', 'check if'],
};

const DOMAIN_MAP = {
  FINANCIAL:   ['fund', 'equity', 'capital', 'portfolio', 'stock', 'bond', 'asset', 'revenue', 'profit', 'loss', 'debt', 'liquidity', 'valuation', 'series', 'raise'],
  MARKET:      ['market', 'sector', 'industry', 'competitive', 'demand', 'supply', 'pricing', 'trend', 'share'],
  LEGAL:       ['legal', 'regulat', 'compliance', 'filing', 'disclosure', 'lawsuit', 'contract', 'enforcement', 'liability'],
  HEALTH:      ['health', 'medical', 'clinical', 'patient', 'drug', 'pharma', 'healthcare', 'hospital'],
  CAREER:      ['career', 'job', 'employment', 'hiring', 'salary', 'role', 'layoff', 'organization', 'workforce'],
  TECHNOLOGY:  ['tech', 'software', 'ai ', 'data', 'platform', 'digital', 'compute', 'model', 'algorithm', 'infrastructure'],
};

function matchVerb(lower) {
  for (const [verb, patterns] of Object.entries(VERB_MAP)) {
    for (const p of patterns) {
      if (lower.includes(p)) {
        return { verb, score: p.length / Math.max(lower.length, 1) };
      }
    }
  }
  return { verb: 'INVESTIGATE', score: 0 };
}

// Words that are only capitalized because they're a sentence-initial word or a
// form-label fragment (e.g. "Time Horizon:", "Risk Tolerance:") — never a real
// proper-noun entity. A candidate made ENTIRELY of these words is rejected;
// a candidate containing a real word not in this list (a company, place, ticker,
// product name) still passes untouched.
const ENTITY_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'this', 'that', 'these', 'those',
  'protect', 'avoid', 'loss', 'gain', 'time', 'horizon', 'short', 'term', 'long', 'medium',
  'asset', 'mix', 'risk', 'tolerance', 'very', 'low', 'high', 'moderate', 'years', 'year',
  'cash', 'stocks', 'bonds', 'capital', 'income', 'goal', 'goals', 'plan', 'planning',
  'target', 'strategy', 'budget', 'current', 'total', 'average', 'monthly', 'annual',
  'now', 'today', 'tomorrow', 'later', 'soon', 'never', 'always', 'also', 'just', 'only',
]);

// A single capitalized word is not a reliable proper-noun signal — ordinary mid-sentence
// nouns get capitalized too ("3 Kids", "My House"), and every one of those became a false
// "entity" chip. Real proper nouns are either quoted, or a genuine multi-word Title-Case
// sequence ("Federal Reserve", "New York") — the regex below requires 2+ consecutive
// capitalized words (`+`, not `*`), so a lone capitalized word never matches at all.
// Real prose never has a lowercase letter directly followed by an uppercase letter mid-word
// ("ProfileRisk", "SnapshotAge") — that pattern only occurs when whitespace was lost between
// two separate words, e.g. a section-header line pasted immediately against its first field
// with the line break stripped ("...Financial Snapshot" + "Age/Location: 42..." -> "Financial
// SnapshotAge/Location"). Treat that transition as an implicit word boundary before matching,
// so a collapsed pair splits back into its real words instead of surfacing as one broken word.
//
// A genuine camelCase brand name has the exact same shape ("PayPal", "YouTube") and would be
// wrongly split too — checked against this whitelist first so real brands stay whole. Bounded,
// curated, same pattern as ENTITY_STOPWORDS/SOURCE_LABELS elsewhere in this codebase — extend
// it when a real brand name gets reported broken, don't try to guess brands heuristically.
const KNOWN_CAMELCASE_BRANDS = new Set([
  'PayPal', 'YouTube', 'LinkedIn', 'iPhone', 'iPad', 'iCloud', 'eBay', 'WordPress',
  'TikTok', 'GoFundMe', 'DoorDash', 'PlayStation', 'MasterCard', 'FedEx', 'GitHub',
  'WeWork', 'SoFi', 'CarPlay', 'AirPods', 'AirBnb', 'Airbnb', 'YouGov', 'OpenAI',
]);

function splitCollapsedCompounds(text) {
  return text.replace(/\b[A-Za-z]+\b/g, word =>
    KNOWN_CAMELCASE_BRANDS.has(word) ? word : word.replace(/([a-z])([A-Z])/g, '$1 $2')
  );
}

function extractEntities(raw) {
  const quoted = [...raw.matchAll(/"([^"]+)"/g)].map(m => m[1].trim());
  const normalized = splitCollapsedCompounds(raw);
  const caps   = [...normalized.matchAll(/\b([A-Z][A-Za-z]{1,}(?:\s[A-Z][A-Za-z]{1,})+)\b/g)]
    .map(m => m[1])
    .filter(e => e.length > 2)
    .filter(e => !e.split(/\s+/).every(w => ENTITY_STOPWORDS.has(w.toLowerCase())));
  return [...new Set([...quoted, ...caps])].slice(0, 6);
}

function inferDomains(lower) {
  return Object.entries(DOMAIN_MAP)
    .filter(([, kws]) => kws.some(kw => lower.includes(kw)))
    .map(([domain]) => domain);
}

function ambiguityScore(verbScore, entityCount, domainCount) {
  let a = 1.0 - Math.min(verbScore * 12, 0.7);
  if (entityCount > 0) a *= 0.65;
  if (domainCount > 0) a *= 0.75;
  return parseFloat(Math.min(1.0, Math.max(0.0, a)).toFixed(3));
}

export function parseIntent(rawInput) {
  if (!rawInput || !rawInput.trim()) {
    return {
      raw_input:        '',
      normalized_verb:  'INVESTIGATE',
      entities:         [],
      domains:          [],
      ambiguity_score:  1.0,
      parser_version:   PARSER_VERSION,
    };
  }

  const lower    = rawInput.toLowerCase();
  const { verb, score } = matchVerb(lower);
  const entities = extractEntities(rawInput);
  const domains  = inferDomains(lower);

  return {
    raw_input:       rawInput,
    normalized_verb: verb,
    entities,
    domains,
    ambiguity_score: ambiguityScore(score, entities.length, domains.length),
    parser_version:  PARSER_VERSION,
  };
}
