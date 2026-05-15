// WO-1121 — Normalizer
// Deterministic Schema Projection Layer — no semantic inference
// Role: structured mapping + validation ONLY. Not an interpreter.
// Signals are derived exclusively from lookup tables. No free-text reasoning.

// PROJECTION_MODE is exported so CHL can assert this module's contract at runtime.
export const PROJECTION_MODE = 'DETERMINISTIC_LOOKUP_ONLY';

export const SUPPORTED_DOMAINS = [
  'admissions', 'investment', 'realestate', 'athletics',
  'sales', 'legal', 'procurement', 'general',
];

// Lookup table — keyword → domain. Pure membership check, no weighting logic.
const DOMAIN_KEYWORDS = {
  admissions:   ['gpa', 'college', 'university', 'harvard', 'acceptance', 'application', 'degree', 'enrollment', 'major', 'sat', 'act', 'admit'],
  investment:   ['stock', 'equity', 'valuation', 'revenue', 'burn', 'cac', 'ltv', 'arr', 'series', 'funding', 'ipo', 'portfolio', 'return'],
  realestate:   ['property', 'mortgage', 'listing', 'zillow', 'cap rate', 'noi', 'appraisal', 'escrow', 'deed', 'zoning', 'rent', 'lease'],
  athletics:    ['draft', 'combine', 'stats', 'roster', 'contract', 'agent', 'injury', 'scouting', 'performance', 'season', 'nfl', 'nba', 'mlb'],
  sales:        ['pipeline', 'deal', 'quota', 'close', 'prospect', 'crm', 'outreach', 'conversion', 'mrr', 'churn', 'upsell', 'account'],
  legal:        ['contract', 'litigation', 'compliance', 'regulation', 'clause', 'jurisdiction', 'statute', 'precedent', 'liability', 'settlement'],
  procurement:  ['vendor', 'rfp', 'supply chain', 'bid', 'sourcing', 'logistics', 'inventory', 'sku', 'lead time', 'purchase order'],
};

// Lookup table — keyword → signal type. Pure membership check, no weighting logic.
const SIGNAL_KEYWORD_MAP = {
  academic_strength:     ['gpa', 'grade', 'academic', 'score', 'test', 'sat', 'act', 'rank'],
  org_strength:          ['leadership', 'president', 'founder', 'captain', 'director', 'chair'],
  network_reach:         ['connection', 'referral', 'alumni', 'network', 'recommendation', 'reference'],
  financial_pressure:    ['scholarship', 'aid', 'loan', 'debt', 'funding', 'cost', 'afford'],
  temporal_urgency:      ['deadline', 'early', 'rolling', 'semester', 'cycle', 'window', 'soon'],
  geographic_signal:     ['state', 'region', 'country', 'local', 'national', 'international', 'city'],
  demographic_signal:    ['first generation', 'underrepresented', 'legacy', 'international', 'transfer'],
  competitive_signal:    ['rank', 'percentile', 'average', 'median', 'competitive', 'selective', 'yield'],
};

function extractEntities(text) {
  const tokens = text.split(/\s+/);
  const entities = [];

  for (const token of tokens) {
    const clean = token.replace(/[^A-Za-z0-9]/g, '');
    if (clean.length >= 3 && clean === clean.toUpperCase() && isNaN(clean)) {
      entities.push(clean);
    } else if (clean.length >= 4 && /^[A-Z][a-z]/.test(clean)) {
      entities.push(clean.toUpperCase());
    }
  }

  return [...new Set(entities)];
}

function detectDomain(text) {
  const lower = text.toLowerCase();
  const scores = {};

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    scores[domain] = keywords.filter(kw => lower.includes(kw)).length;
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topScore = best[0][1];

  if (topScore === 0) return { domain: 'general', confidence: 0.30 };

  const topCount = best.filter(([, s]) => s === topScore).length;
  const confidence = topCount === 1
    ? Math.min(0.50 + topScore * 0.12, 0.95)
    : Math.min(0.40 + topScore * 0.08, 0.70);

  return { domain: best[0][0], confidence };
}

// Pure keyword table lookup — no inference, no reasoning, no weighting.
// A signal is present if and only if a keyword from its table appears in the input.
function extractSignals(text) {
  const lower = text.toLowerCase();
  const matched = [];

  for (const [signal, keywords] of Object.entries(SIGNAL_KEYWORD_MAP)) {
    const hits = keywords.filter(kw => lower.includes(kw)).length;
    if (hits > 0) matched.push({ signal, hits });
  }

  return matched
    .sort((a, b) => b.hits - a.hits)
    .map(m => m.signal);
}

function validateSchema(payload) {
  const errors = [];

  if (!payload.entity && !payload.domain) {
    errors.push('MISSING_ENTITY_AND_DOMAIN');
  }

  if (payload.domain && !SUPPORTED_DOMAINS.includes(payload.domain)) {
    errors.push(`UNSUPPORTED_DOMAIN: ${payload.domain}`);
  }

  if (!Array.isArray(payload.signals) || payload.signals.length === 0) {
    errors.push('NO_SIGNALS_EXTRACTED');
  }

  if (typeof payload.confidence !== 'number' || payload.confidence < 0 || payload.confidence > 1) {
    errors.push('INVALID_CONFIDENCE_RANGE');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function buildNormalizedPayload(rawText) {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    return {
      valid: false,
      rejection_reason: 'EMPTY_INPUT',
      confidence: 0,
      translation_ambiguity: 1.0,
    };
  }

  const entities  = extractEntities(rawText);
  const { domain, confidence: domainConf } = detectDomain(rawText);
  const signals   = extractSignals(rawText);

  const signalConf = signals.length === 0 ? 0 : Math.min(0.40 + signals.length * 0.10, 0.90);
  const finalConf  = Math.round(((domainConf + signalConf) / 2) * 100) / 100;
  const ambiguity  = Math.round((1 - finalConf) * 100) / 100;

  const payload = {
    entity:                entities[0] || null,
    entities,
    domain,
    signals,
    confidence:            finalConf,
    translation_ambiguity: ambiguity,
    mapping_origin:        `${domain}_template_v1`,
  };

  const { valid, errors } = validateSchema(payload);

  return {
    ...payload,
    valid,
    rejection_reason: valid ? null : errors.join('; '),
  };
}

export function normalizeForRenderer(payload) {
  if (!payload.valid) return null;

  return {
    entity:        payload.entity,
    domain:        payload.domain,
    signal_vector: payload.signals.slice(0, 4),
    confidence:    payload.confidence,
    epoch_request: Date.now(),
  };
}
