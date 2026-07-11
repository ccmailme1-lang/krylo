// KRYL-1026 — SES Phase 2: Relevance Broker (Part B, engine slice 1).
// Given a detected condition (SES) + the live signal array, rank each signal by
// decision-value TO that condition. Pure, read-only: consumes STSE (condition) and
// the field signals, mutates neither; owns strategic relevance weighting only.
// It does NOT detect state, evaluate truth, recommend, or ingest. Spec:
// specs/KRYL-1026-relevance-broker-spec.md.

import { getQueryDomainPressure } from './domaingravity.js';

// Calibration parameters (WO-2062 tunes these; never hand-edit ad hoc).
const W = { domain: 0.30, magnitude: 0.25, recency: 0.15, contradiction: 0.15, earliness: 0.15 };
const W_SUM = Object.values(W).reduce((a, b) => a + b, 0);
const HALF_LIFE_MS     = 6 * 60 * 60 * 1000; // recency half-life: 6h
const EARLY_SATURATION = 20;                 // domain signalCount at which "earliness" → 0

// Evidence classes the condition expects (Founder brainstorm doc).
const EXPECTED_DIMENSIONS = ['CRITICAL_SIGNAL', 'LEADING_INDICATOR', 'CONTRADICTION', 'OPPORTUNITY_RISK'];

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// groundedness = mean of the present fidelity sub-fields (real observed fraction, §18);
// falls back to fs when fidelity is absent.
function groundednessOf(s) {
  const f = s.fidelity;
  if (f && typeof f === 'object') {
    const vals = Object.values(f).filter(v => typeof v === 'number');
    if (vals.length) return clamp01(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  return clamp01(s.fs ?? 0);
}

function signalTs(s) {
  if (typeof s.ts === 'number') return s.ts;
  const t = Date.parse(s.metadata?.timestamp ?? s.timestamp ?? '');
  return Number.isNaN(t) ? Date.now() : t;
}

function servedDimension({ domainMatch, magnitude, contradiction, earliness }) {
  if (contradiction) return 'CONTRADICTION';
  if (earliness > 0.6) return 'LEADING_INDICATOR';
  if (magnitude >= 0.6 && domainMatch >= 1) return 'CRITICAL_SIGNAL';
  return 'OPPORTUNITY_RISK';
}

// computeRelevance(condition, signals) → { ranked: CandidateRelevance[], absence: Absence[] }
// Pure & read-only. `signals` is returned unmutated.
export function computeRelevance(condition = {}, signals = [], now = Date.now()) {
  const domains = Array.isArray(condition.domains) ? condition.domains : [];
  const ranked = [];

  for (let i = 0; i < signals.length; i++) {
    const s = signals[i];
    const magnitude = clamp01(s?.fs ?? NaN);
    // Withhold gate (§19): no grounded strength → never surfaced as relevant.
    if (!Number.isFinite(magnitude) || magnitude === 0) {
      ranked.push({
        signalId: s?.id ?? `sig_${i}`, relevanceScore: null, servedDimension: null,
        groundedness: 0, reason: 'withheld — no grounded signal strength (§19)', withheld: true,
      });
      continue;
    }

    const pressure    = s?.domain ? getQueryDomainPressure(s.domain) : { polarity: 'constructive', signalCount: 0 };
    const domainMatch = domains.length && s?.domain ? (domains.includes(s.domain) ? 1 : 0) : 0;
    const recency     = Math.pow(0.5, Math.max(0, now - signalTs(s)) / HALF_LIFE_MS);
    const contradiction = pressure.polarity === 'fracture' && pressure.signalCount > 0 ? 1 : 0;
    const earliness   = 1 - clamp01((pressure.signalCount ?? 0) / EARLY_SATURATION);

    const raw = W.domain * domainMatch + W.magnitude * magnitude + W.recency * recency
              + W.contradiction * contradiction + W.earliness * earliness;
    const relevanceScore = Math.round((100 * raw) / W_SUM);
    const dimension = servedDimension({ domainMatch, magnitude, contradiction, earliness });

    ranked.push({
      signalId: s?.id ?? `sig_${i}`,
      relevanceScore,
      servedDimension: dimension,
      groundedness: groundednessOf(s),
      reason: `domain ${domainMatch ? 'match' : 'off'} · fs ${magnitude.toFixed(2)}`
            + ` · ${contradiction ? 'fracture' : 'constructive'} · earliness ${earliness.toFixed(2)}`,
      withheld: false,
    });
  }

  // Rank: real scores desc; withheld sink to the bottom.
  ranked.sort((a, b) => {
    if (a.withheld !== b.withheld) return a.withheld ? 1 : -1;
    return (b.relevanceScore ?? -1) - (a.relevanceScore ?? -1);
  });

  // Absence (§22): a dimension the condition expects but no live signal serves is a
  // classified state, not silence. STRUCTURAL when the field is empty, else TEMPORAL.
  const served = new Set(ranked.filter(r => !r.withheld).map(r => r.servedDimension));
  const absence = EXPECTED_DIMENSIONS
    .filter(d => !served.has(d))
    .map(d => ({ dimension: d, absenceClass: signals.length ? 'TEMPORAL' : 'STRUCTURAL' }));

  return { ranked, absence };
}
