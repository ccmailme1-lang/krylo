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

function extractEntities(raw) {
  const quoted = [...raw.matchAll(/"([^"]+)"/g)].map(m => m[1].trim());
  const caps   = [...raw.matchAll(/\b([A-Z][A-Za-z]{1,}(?:\s[A-Z][A-Za-z]{1,})*)\b/g)]
    .map(m => m[1])
    .filter(e => e.length > 2);
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
