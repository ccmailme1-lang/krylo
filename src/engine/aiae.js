// WO-LEV-02: Adaptive Insight Arbitration Engine (AIAE)
// Authority: ranking + survival only.
// handleExecute builds tensor → arbitrate() → TargetPacket renders.
// No reverse dependency permitted.

// RecommendationPayload v1 — model version sentinel
export const AIAE_VERSION = '1.0.0';

// ── Deterministic structural fingerprint (FNV-1a 32-bit) ──────────────────────
// Non-cryptographic. Purpose: inference integrity / desync detection only.
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// Stable JSON stringify (sorted keys) — required for deterministic hashing
function stableStringify(obj) {
  if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(obj).sort().map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

function generateRequestId() {
  try { return crypto.randomUUID(); } catch { return fnv1a(String(Date.now())) + '-' + fnv1a(String(Math.random())); }
}

// ── Domain weight profiles (sum to 1.0) ───────────────────────────────────────
const DOMAIN_WEIGHTS = {
  REAL_ESTATE:     { impact: 0.25, confidence: 0.20, novelty: 0.10, actionability: 0.20, timeToValue: 0.15, evidenceStrength: 0.10 },
  AUTO:            { impact: 0.20, confidence: 0.25, novelty: 0.10, actionability: 0.25, timeToValue: 0.10, evidenceStrength: 0.10 },
  CAREER:          { impact: 0.25, confidence: 0.15, novelty: 0.20, actionability: 0.20, timeToValue: 0.10, evidenceStrength: 0.10 },
  RETIREMENT:      { impact: 0.30, confidence: 0.25, novelty: 0.05, actionability: 0.15, timeToValue: 0.15, evidenceStrength: 0.10 },
  STARTUP_FINANCE: { impact: 0.30, confidence: 0.13, novelty: 0.04, actionability: 0.27, timeToValue: 0.21, evidenceStrength: 0.05 },
  GENERAL:         { impact: 0.20, confidence: 0.20, novelty: 0.15, actionability: 0.20, timeToValue: 0.15, evidenceStrength: 0.10 },
};

// ── TTV bucket multipliers ─────────────────────────────────────────────────────
const TTV_MULTIPLIER = {
  NOW:   1.00,
  SHORT: 0.65,
  MED:   0.30,
  LONG:  0.15,
};

const DIMS = ['impact', 'confidence', 'novelty', 'actionability', 'timeToValue', 'evidenceStrength'];

// ── Confidence floor gate ──────────────────────────────────────────────────────
// Capital floor presence tightens the gate — stakes are higher.
function confidenceGate(tensor) {
  return (tensor.floor ?? 0) > 0 ? 0.40 : 0.20;
}

// ── Score a single candidate ───────────────────────────────────────────────────
function scoreCandidate(candidate, weights, ttvMult, confFloor) {
  const f = candidate.features;
  if ((f.confidence ?? 0) < confFloor) return 0;
  return Math.min(
    weights.impact           * (f.impact           ?? 0) +
    weights.confidence       * (f.confidence       ?? 0) +
    weights.novelty          * (f.novelty          ?? 0) +
    weights.actionability    * (f.actionability    ?? 0) +
    weights.timeToValue      * (f.timeToValue      ?? 0) * ttvMult +
    weights.evidenceStrength * (f.evidenceStrength ?? 0),
    1.0,
  );
}

// ── Pareto dominance ───────────────────────────────────────────────────────────
// A dominates B: A >= B on all dims, A > B on at least one.
function dominates(a, b) {
  let strictlyBetter = false;
  for (const d of DIMS) {
    const af = a.features[d] ?? 0;
    const bf = b.features[d] ?? 0;
    if (af < bf) return false;
    if (af > bf) strictlyBetter = true;
  }
  return strictlyBetter;
}

function paretoFrontier(candidates) {
  return candidates.filter(a => !candidates.some(b => b !== a && dominates(b, a)));
}

// ── Candidate Generation Layer — Phase B ──────────────────────────────────────
// Derives candidates from tensor.synthesis (real query output).
// Domain pool supplements synthesis-derived candidates.
// Static base pool is eliminated — fallback only when synthesis is empty.
export function generateCandidates(tensor) {
  const domain    = tensor.domain    ?? 'GENERAL';
  const synthesis = tensor.synthesis ?? null;
  const conf      = Math.min(synthesis?.confidence ?? tensor.confidence ?? 0.5, 1);
  const fs        = Math.min(tensor.fs ?? 0.5, 1);
  const ttvMult   = TTV_MULTIPLIER[tensor.horizon ?? 'MED'] ?? 0.30;

  const pool = [];

  // Primary insight
  if (synthesis?.primaryInsight) {
    pool.push({
      id: 'syn-primary', type: 'insight', content: synthesis.primaryInsight,
      features: { impact: 0.75, confidence: conf, novelty: 0.60, actionability: 0.55, timeToValue: ttvMult, evidenceStrength: fs },
    });
  }

  // Opportunities (up to 3)
  (synthesis?.opportunities ?? []).slice(0, 3).forEach((opp, i) => {
    const content = typeof opp === 'string' ? opp : (opp.label ?? '');
    if (!content) return;
    pool.push({
      id: `syn-opp-${i}`, type: 'opportunity', content,
      features: { impact: 0.70, confidence: conf, novelty: 0.65, actionability: 0.60, timeToValue: ttvMult, evidenceStrength: fs },
    });
  });

  // Threats (up to 2)
  (synthesis?.threats ?? []).slice(0, 2).forEach((threat, i) => {
    const content = typeof threat === 'string' ? threat : (threat.label ?? '');
    if (!content) return;
    pool.push({
      id: `syn-threat-${i}`, type: 'risk', content,
      features: { impact: 0.65, confidence: conf, novelty: 0.40, actionability: 0.45, timeToValue: ttvMult, evidenceStrength: Math.min(fs * 0.85, 1) },
    });
  });

  // Primary action
  const pa = synthesis?.actions?.primary;
  if (pa?.rationale || pa?.label) {
    pool.push({
      id: 'syn-action-primary', type: 'action', content: pa.rationale ?? pa.label,
      features: { impact: Math.min(pa.impact ?? 0.80, 1), confidence: conf, novelty: 0.40, actionability: 0.90, timeToValue: 0.90, evidenceStrength: fs },
    });
  }

  // Secondary action
  const sa = synthesis?.actions?.secondary;
  if (sa?.rationale || sa?.label) {
    pool.push({
      id: 'syn-action-secondary', type: 'action', content: sa.rationale ?? sa.label,
      features: { impact: Math.min(sa.impact ?? 0.65, 1), confidence: conf, novelty: 0.35, actionability: 0.85, timeToValue: 0.80, evidenceStrength: fs },
    });
  }

  // Context actions (up to 2)
  (synthesis?.actions?.context ?? []).slice(0, 2).forEach((act, i) => {
    const content = act.rationale ?? act.label;
    if (!content) return;
    pool.push({
      id: `syn-action-ctx-${i}`, type: 'action', content,
      features: { impact: Math.min(act.impact ?? 0.55, 1), confidence: conf, novelty: 0.30, actionability: 0.80, timeToValue: ttvMult, evidenceStrength: fs },
    });
  });

  // Alternative view
  if (synthesis?.alternativeView) {
    pool.push({
      id: 'syn-alt', type: 'insight', content: synthesis.alternativeView,
      features: { impact: 0.55, confidence: Math.min(conf * 0.85, 1), novelty: 0.80, actionability: 0.35, timeToValue: ttvMult, evidenceStrength: Math.min(fs * 0.75, 1) },
    });
  }

  const domainPool = {
    REAL_ESTATE: [
      {
        id: 're-rate-lock',
        type: 'action',
        content: 'Rate lock before offer eliminates cost drift during escrow. 45-day window is standard.',
        features: { impact: 0.90, confidence: 0.88, novelty: 0.40, actionability: 0.95, timeToValue: 0.95, evidenceStrength: 0.85 },
      },
      {
        id: 're-inventory-shift',
        type: 'insight',
        content: 'Rising inventory shifts negotiation leverage toward buyer. Seller concessions now viable.',
        features: { impact: 0.75, confidence: 0.80, novelty: 0.60, actionability: 0.70, timeToValue: 0.70, evidenceStrength: 0.75 },
      },
      {
        id: 're-appraisal-gap',
        type: 'risk',
        content: 'Offer above comps forces buyer to cover appraisal gap in cash. Pre-verify comp range.',
        features: { impact: 0.80, confidence: 0.72, novelty: 0.50, actionability: 0.65, timeToValue: 0.85, evidenceStrength: 0.68 },
      },
      {
        id: 're-buydown',
        type: 'opportunity',
        content: '1-point rate buy-down is NPV positive at 7yr+ hold. Request as seller concession.',
        features: { impact: 0.70, confidence: 0.78, novelty: 0.65, actionability: 0.60, timeToValue: 0.40, evidenceStrength: 0.72 },
      },
      {
        id: 're-breakeven',
        type: 'insight',
        content: 'Break-even on closing costs requires 4–6 year hold. Mobility risk must be priced into decision.',
        features: { impact: 0.65, confidence: 0.85, novelty: 0.45, actionability: 0.50, timeToValue: 0.30, evidenceStrength: 0.80 },
      },
    ],
    AUTO: [
      {
        id: 'auto-invoice',
        type: 'action',
        content: 'Negotiate from invoice, not MSRP. Dealer margin is compressible 3–8% on most trim levels.',
        features: { impact: 0.75, confidence: 0.82, novelty: 0.55, actionability: 0.90, timeToValue: 0.95, evidenceStrength: 0.78 },
      },
      {
        id: 'auto-financing',
        type: 'insight',
        content: 'Dealer financing is a second profit center. Pre-approved external rate must be your floor.',
        features: { impact: 0.80, confidence: 0.88, novelty: 0.60, actionability: 0.85, timeToValue: 0.90, evidenceStrength: 0.82 },
      },
      {
        id: 'auto-timing',
        type: 'opportunity',
        content: 'End-of-month timing compresses dealer willingness. Target last 3 days of month.',
        features: { impact: 0.65, confidence: 0.70, novelty: 0.70, actionability: 0.75, timeToValue: 0.80, evidenceStrength: 0.65 },
      },
    ],
    CAREER: [
      {
        id: 'career-anchor',
        type: 'action',
        content: 'Lead with a number 13–15% above target. First number anchors the range.',
        features: { impact: 0.85, confidence: 0.80, novelty: 0.55, actionability: 0.95, timeToValue: 0.95, evidenceStrength: 0.75 },
      },
      {
        id: 'career-market',
        type: 'insight',
        content: 'Total comp is below market median. Market data is your objective anchor — cite it explicitly.',
        features: { impact: 0.80, confidence: 0.75, novelty: 0.65, actionability: 0.80, timeToValue: 0.85, evidenceStrength: 0.70 },
      },
      {
        id: 'career-silence',
        type: 'action',
        content: 'After stating your number, stop. Silence forces counter. First to speak concedes position.',
        features: { impact: 0.70, confidence: 0.85, novelty: 0.75, actionability: 0.95, timeToValue: 0.95, evidenceStrength: 0.80 },
      },
    ],
    STARTUP_FINANCE: [
      {
        id: 'startup-401k-penalty',
        type: 'risk',
        content: '401k early withdrawal: 10% penalty + income tax = 40–50% effective cost. At $150k liquidated, $60–75k is destroyed before it reaches operations. Exhaust all alternatives first.',
        features: { impact: 0.99, confidence: 0.99, novelty: 0.20, actionability: 0.99, timeToValue: 0.99, evidenceStrength: 0.99 },
      },
      {
        id: 'startup-cloud-downgrade',
        type: 'action',
        content: 'Execute immediate cloud infrastructure downgrade. Right-size instances to minimum viable compute. Savings: 40–70% of cloud spend, realizable within 48 hours.',
        features: { impact: 0.78, confidence: 0.90, novelty: 0.50, actionability: 0.98, timeToValue: 0.99, evidenceStrength: 0.85 },
      },
      {
        id: 'startup-hardware-po-pause',
        type: 'action',
        content: 'Pause all pending hardware POs immediately. AI hardware depreciates fast — leased cloud GPU is lower burn than owned hardware at pre-revenue stage.',
        features: { impact: 0.72, confidence: 0.92, novelty: 0.40, actionability: 0.99, timeToValue: 0.99, evidenceStrength: 0.88 },
      },
      {
        id: 'startup-bridge-alternatives',
        type: 'opportunity',
        content: 'Before touching retirement capital: SAFE note (existing investors), revenue-based financing, founder personal loan to entity, or AR factoring. Each preserves the $60–75k penalty that liquidation destroys.',
        features: { impact: 0.90, confidence: 0.70, novelty: 0.80, actionability: 0.75, timeToValue: 0.85, evidenceStrength: 0.65 },
      },
      {
        id: 'startup-burn-rate',
        type: 'insight',
        content: 'Quantify exact monthly burn: payroll + infrastructure + hardware servicing. Runway = cash / burn. 6-week runway means burn reduction extends runway multiplicatively — every 10% cut adds 0.6 weeks.',
        features: { impact: 0.82, confidence: 0.88, novelty: 0.50, actionability: 0.80, timeToValue: 0.97, evidenceStrength: 0.85 },
      },
      {
        id: 'startup-payroll-defer',
        type: 'action',
        content: 'Negotiate payroll deferral with team. Document as promissory notes. Converts cash obligation to future equity/repayment event — preserves runway without dilution.',
        features: { impact: 0.70, confidence: 0.78, novelty: 0.65, actionability: 0.90, timeToValue: 0.95, evidenceStrength: 0.72 },
      },
      {
        id: 'startup-series-a',
        type: 'action',
        content: 'Begin Series A roadshow.',
        features: { impact: 0.60, confidence: 0.35, novelty: 0.20, actionability: 0.25, timeToValue: 0.05, evidenceStrength: 0.30 },
      },
    ],
    RETIREMENT: [
      {
        id: 'ret-gap',
        type: 'insight',
        content: 'Retirement gap exceeds sustainable withdrawal threshold. Close gap before compounding window narrows.',
        features: { impact: 0.90, confidence: 0.85, novelty: 0.40, actionability: 0.65, timeToValue: 0.35, evidenceStrength: 0.80 },
      },
      {
        id: 'ret-sequence',
        type: 'risk',
        content: 'Sequence-of-returns risk elevated near target date. Reduce equity exposure 5–7 years prior.',
        features: { impact: 0.80, confidence: 0.78, novelty: 0.55, actionability: 0.60, timeToValue: 0.40, evidenceStrength: 0.75 },
      },
      {
        id: 'ret-roth',
        type: 'opportunity',
        content: 'Roth conversion window active while income is below inflection. Tax-free growth locks at current rate.',
        features: { impact: 0.75, confidence: 0.72, novelty: 0.70, actionability: 0.70, timeToValue: 0.45, evidenceStrength: 0.68 },
      },
    ],
  };

  // Domain pool supplements synthesis-derived candidates
  const supplements = domainPool[domain] ?? [];

  // True fallback — only when synthesis produced nothing
  const fallback = pool.length === 0 ? [{
    id: 'fallback-insufficient', type: 'risk',
    content: 'Insufficient signal to generate synthesis-grounded paths. Add a specific decision, amount, or timeline.',
    features: { impact: 0.20, confidence: 0.30, novelty: 0.05, actionability: 0.25, timeToValue: 0.50, evidenceStrength: 0.10 },
  }] : [];

  return [...pool, ...supplements, ...fallback].map(c => ({
    ...c,
    id:      c.id   ?? `gen-${Math.random().toString(36).slice(2, 9)}`,
    type:    c.type ?? 'insight',
    content: typeof c.content === 'string' ? c.content
           : (c.content?.label ?? c.content?.insight ?? c.content?.text ?? String(c.content ?? '')),
  }));
}

// ── Main arbitration function ──────────────────────────────────────────────────
// Input:  tensor { domain, horizon, floor, ... }
// Output: RankedCandidateSet + arbitration metadata
export function arbitrate(tensor, candidatePool = null, topK = 5) {
  const domain    = tensor.domain ?? 'GENERAL';
  const weights   = DOMAIN_WEIGHTS[domain] ?? DOMAIN_WEIGHTS.GENERAL;
  const ttvMult   = TTV_MULTIPLIER[tensor.horizon ?? 'MED'] ?? 0.65;
  const confFloor = confidenceGate(tensor);

  // Fragility TTV cap — PHASE_2/3/4 collapses LONG+MED credit (max SHORT=0.65)
  const FRAGILITY_TTV_CAP = { PHASE_2_MARANGONI: 0.65, PHASE_3_TENUOUS: 0.65, PHASE_4_SNAP: 0.65 };
  const fragilityLabel     = tensor.fragilityPhase?.label;
  const effectiveTtvMult   = (fragilityLabel && FRAGILITY_TTV_CAP[fragilityLabel])
    ? Math.max(ttvMult, FRAGILITY_TTV_CAP[fragilityLabel])
    : ttvMult;

  const pool = candidatePool ?? generateCandidates(tensor);

  const scored = pool
    .map(c => ({
      ...c,
      score: parseFloat(scoreCandidate(c, weights, effectiveTtvMult, confFloor).toFixed(4)),
    }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score);

  const topKSet  = scored.slice(0, topK);
  const topKIds  = new Set(topKSet.map(c => c.id));
  const pareto   = paretoFrontier(scored).filter(c => !topKIds.has(c.id));

  const survivors = [...topKSet, ...pareto].map((c, i) => ({
    ...c,
    dominanceRank: i + 1,
  }));

  const topCandidate      = topKSet[0] ?? null;
  const requestId         = generateRequestId();
  const scoreVector       = topKSet.map(c => parseFloat((c.score * 100).toFixed(1)));
  const featureVectorHash = topCandidate ? fnv1a(stableStringify(topCandidate.features)) : '00000000';

  return {
    survivors,
    topK:            topKSet,
    paretoAdditions: pareto,
    dominated:       scored.length - survivors.length,
    total:           pool.length,
    passed:          scored.length,
    domain,
    weights,
    ttvMultiplier:   effectiveTtvMult,
    fragilityTtvCapped: effectiveTtvMult !== ttvMult,
    confidenceFloor: confFloor,
    // RecommendationPayload v1
    requestId,
    topCandidateId:     topCandidate?.id ?? null,
    scoreVector,
    featureVectorHash,
    modelVersion:       AIAE_VERSION,
    generatedAt:        new Date().toISOString(),
  };
}
