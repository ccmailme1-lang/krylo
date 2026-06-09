// WO-1329: Intent classifier — identifies NEGOTIATION context from free-text ingress

const NEGOTIATION_TRIGGERS = [
  /\bnegotiat/i, /\bsalary\b/i, /\bcompensation\b/i, /\boffer\b/i,
  /\bask\b/i, /\btc\b/i, /\btotal.comp/i, /\bbase.pay/i, /\bleverage\b/i,
];

const ROLE_PATTERNS = [
  /senior\s+engineer/i, /staff\s+engineer/i, /principal\s+engineer/i,
  /software\s+engineer/i, /engineering\s+manager/i, /product\s+manager/i,
  /data\s+scientist/i, /ml\s+engineer/i, /devops\s+engineer/i,
  /frontend\s+engineer/i, /backend\s+engineer/i, /fullstack\s+engineer/i,
];

const LOCATION_PATTERN = /([A-Z][a-z]+(?:\s+[A-Z]{2})?(?:,\s*[A-Z]{2})?)/g;
const SALARY_PATTERN   = /\$?([\d,]+)[Kk]?(?:\s*(?:base|salary|comp|compensation))?/g;

export function classifyIntent(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    return { intent: 'UNKNOWN', entities: {}, confidence: 0 };
  }

  const text = rawInput.trim();
  let score  = 0;

  // Trigger matching — each hit adds weight
  let triggerHits = 0;
  for (const re of NEGOTIATION_TRIGGERS) {
    if (re.test(text)) triggerHits++;
  }
  // Salary present = strong signal
  const salaryMatches = [...text.matchAll(SALARY_PATTERN)];
  if (salaryMatches.length > 0) triggerHits += 2;

  score = Math.min(triggerHits / (NEGOTIATION_TRIGGERS.length + 2), 1.0);

  // Role extraction
  let role = null;
  for (const re of ROLE_PATTERNS) {
    const m = text.match(re);
    if (m) { role = m[0]; break; }
  }
  // Fallback: first capitalized noun phrase before comma
  if (!role) {
    const fallback = text.match(/^([^,$\d]+)/);
    if (fallback) role = fallback[1].trim();
  }

  // Location extraction
  const locationMatches = [...text.matchAll(LOCATION_PATTERN)];
  const location = locationMatches.length > 0 ? locationMatches[0][1].trim() : null;

  // Salary extraction — take largest value as anchor
  const salaryValues = salaryMatches
    .map(m => parseFloat(m[1].replace(/,/g, '')) * (m[0].match(/[Kk]/) ? 1000 : 1))
    .filter(v => v > 1000);
  const salary = salaryValues.length > 0 ? Math.max(...salaryValues) : null;

  // Org type hint
  const orgType = /startup/i.test(text) ? 'STARTUP'
    : /enterprise/i.test(text) ? 'ENTERPRISE'
    : /faang|big.?tech/i.test(text) ? 'BIG_TECH'
    : 'UNKNOWN';

  const confidence = Math.min(0.60 + score * 0.40, 1.0);
  const intent     = confidence >= 0.90 ? 'NEGOTIATION'
    : confidence >= 0.65 ? 'NEGOTIATION_WEAK'
    : 'UNKNOWN';

  return {
    intent,
    confidence: parseFloat(confidence.toFixed(4)),
    entities: { role, location, salary, orgType },
    raw: text,
  };
}
