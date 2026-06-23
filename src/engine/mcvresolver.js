// WO-1841 — Market Context Vector Primitive
// Pure function. No imports. No side effects. No geography.
// Phase A: intent-space behavioral priors only.
// Phase B: emitter-grounded measured state (separate WO).

const ANCHORS = {
  REAL_ESTATE: { price_regime: 60, inventory_pressure: 65, credit_tightness: 60, demand_intensity: 50, liquidity_flow: 50, policy_sensitivity: 65 },
  AUTO:        { price_regime: 50, inventory_pressure: 45, credit_tightness: 45, demand_intensity: 50, liquidity_flow: 60, policy_sensitivity: 35 },
  CAREER:      { price_regime: 55, inventory_pressure: 50, credit_tightness: 20, demand_intensity: 50, liquidity_flow: 70, policy_sensitivity: 30 },
  RETIREMENT:  { price_regime: 45, inventory_pressure: 30, credit_tightness: 35, demand_intensity: 50, liquidity_flow: 40, policy_sensitivity: 70 },
  GENERAL:     { price_regime: 50, inventory_pressure: 50, credit_tightness: 40, demand_intensity: 50, liquidity_flow: 55, policy_sensitivity: 40 },
};

function detectTransactionClass(query, lens) {
  if ((lens ?? '').toUpperCase() === 'REALTOR') return 'REAL_ESTATE';
  const q = query ?? '';
  if (/\bhouse\b|\bproperty\b|\bcondo\b|\bapartment\b|\breal estate\b|\blisting\b|\bmortgage\b/i.test(q)) return 'REAL_ESTATE';
  if (/\bhome\b/i.test(q) && /\b(buy|purchase|mortgage|afford|equity|loan|down payment)\b/i.test(q))    return 'REAL_ESTATE';
  if (/\bcar\b|\bvehicle\b|\bauto\b|\btruck\b|\bsuv\b|\blease\b.*\bcar\b/i.test(q))                                                               return 'AUTO';
  if (/\bsalary\b|\bjob\b|\bhire\b|\bnegotiat\b|\boffer\b.*\b(accept|counter)\b|\bcompensation\b/i.test(q))                                       return 'CAREER';
  if (/\bretire(ment|d)?\b|\b401k\b|\bpension\b|\bsocial security\b|\brmds?\b/i.test(q))                                                             return 'RETIREMENT';
  return 'GENERAL';
}

function detectBudgetBand(query) {
  const q = query ?? '';
  if (/\$\s*[1-9]\d{6,}|\b[1-9]\d*\.?\d*\s*m(illion)?\b/i.test(q))            return 'LUXURY';  // > $1M
  if (/\$\s*[6-9]\d{5}|\b[6-9]\d{2}\s*k\b/i.test(q))                           return 'HIGH';    // $600k–$1M
  if (/\$\s*[2-5]\d{5}|\b[2-5]\d{2}\s*k\b/i.test(q))                           return 'MID';     // $200k–$600k
  if (/\$\s*\d{1,5}(?!\d)|\b[1-9]\d?\s*k\b|\bafford\b|\bentry.level\b/i.test(q)) return 'ENTRY'; // < $200k
  return 'NONE';
}

function detectUrgency(query) {
  const q = query ?? '';
  if (/\bneed to\b|\bhave to\b|\bmust\b|\bnow\b|\burgent\b|\bdeadline\b|\bclosing\b|\bimmediately\b/i.test(q)) return 'HIGH';
  if (/\bwant to\b|\blooking to\b|\bplanning\b|\bconsidering\b/i.test(q))                                      return 'MEDIUM';
  if (/\bthinking about\b|\bexploring\b|\bcurious\b|\beventually\b|\bsomeday\b/i.test(q))                      return 'LOW';
  return 'NONE';
}

function detectLeverageIntent(query) {
  const q = query ?? '';
  if (/\bhave to move\b|\bforced\b|\brelocation\b|\bdivorce\b|\bcan't afford\b|\bno choice\b/i.test(q))      return 'NECESSITY';
  if (/\bgood time\b|\bmarket dip\b|\bdeal\b|\bopportunity\b|\binvestment\b|\btiming\b/i.test(q))             return 'OPPORTUNISTIC';
  return 'NEUTRAL';
}

function applyDeltas(anchor, budgetBand, urgency, leverageIntent) {
  const d = { ...anchor };

  // price_regime ← budget band
  const priceD = { LUXURY: 20, HIGH: 10, MID: 0, ENTRY: -15, NONE: 0 };
  d.price_regime += priceD[budgetBand] ?? 0;

  // inventory_pressure ← urgency
  const invD = { HIGH: 10, MEDIUM: 0, LOW: -10, NONE: 0 };
  d.inventory_pressure += invD[urgency] ?? 0;

  // credit_tightness ← budget band
  const creditD = { LUXURY: 10, HIGH: 5, MID: 0, ENTRY: 5, NONE: 0 };
  d.credit_tightness += creditD[budgetBand] ?? 0;

  // demand_intensity ← urgency + leverage intent (additive)
  const demandUrgD   = { HIGH: 20, MEDIUM: 5, LOW: -15, NONE: 0 };
  const demandLevD   = { NECESSITY: 15, OPPORTUNISTIC: 5, NEUTRAL: 0 };
  d.demand_intensity += (demandUrgD[urgency] ?? 0) + (demandLevD[leverageIntent] ?? 0);

  // liquidity_flow ← budget band + leverage intent (additive)
  const liqBudD = { LUXURY: 10, HIGH: 0, MID: 0, ENTRY: -10, NONE: 0 };
  const liqLevD = { NECESSITY: -10, OPPORTUNISTIC: 5, NEUTRAL: 0 };
  d.liquidity_flow += (liqBudD[budgetBand] ?? 0) + (liqLevD[leverageIntent] ?? 0);

  // policy_sensitivity — structural only, no deltas

  // Clamp all to [0, 100]
  for (const key of Object.keys(d)) {
    d[key] = Math.max(0, Math.min(100, Math.round(d[key])));
  }

  return d;
}

export function resolveMCV(query, session) {
  const transactionClass = detectTransactionClass(query, session?.lens);
  const budgetBand       = detectBudgetBand(query);
  const urgency          = detectUrgency(query);
  const leverageIntent   = detectLeverageIntent(query);

  const anchor = ANCHORS[transactionClass] ?? ANCHORS.GENERAL;
  const fields = applyDeltas(anchor, budgetBand, urgency, leverageIntent);

  return {
    ...fields,
    _meta: {
      transactionClass,
      budgetBand,
      urgency,
      leverageIntent,
      phase: 'A',
    },
  };
}
