// WO-2046 Phase A — Capital Realization Connector
// Closes the intent → realization loop for named entities in the Capital domain.
// No API key. No UEI required. Name-based lookup via USASpending spending_over_time.
//
// Flow:
//   query string → ERK resolve() → canonical name → USASpending spending_over_time
//   → FY award history → trend signal → CAPITAL dispatch
//
// Signal formula:
//   trend_ratio = fy_latest / fy_5yr_avg
//   signal = clamp(round(trend_ratio × 60), 0, 100)
//   trend_ratio 1.0 → signal 60 (on trend = confirmed realization)
//   trend_ratio 1.67 → signal 100 (accelerating awards = structural confirmation)
//
// Returns null and dispatches nothing when no entity resolves from the query.
// WITHHOLD beats fabricate — no entity = no signal.

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';
import { resolve } from '../entityresolution.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export async function runCapitalRealizationSync(query) {
  if (!query) return null;

  // Resolve entity from query — any word or phrase may name an entity
  const entity = resolve(query);
  if (!entity) return null; // no known entity in query — withhold

  const ts = Date.now();

  try {
    const name = encodeURIComponent(entity.canonicalName);
    const res  = await fetch(`/api/usaspending-entity?name=${name}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const results = json?.results ?? [];
    if (results.length === 0) throw new Error('no award history');

    // results: [{ time_period: { fiscal_year: 2024 }, aggregated_amount: 1234567890 }, ...]
    const amounts = results
      .map(r => Number(r.aggregated_amount ?? 0))
      .filter(v => v > 0);

    if (amounts.length === 0) throw new Error('zero amounts');

    const fyLatest  = amounts[0];                     // most recent FY first
    const fy5yrAvg  = mean(amounts.slice(0, 5));      // 5-year rolling avg
    const baseline  = fy5yrAvg > 0 ? fy5yrAvg : 1e9; // fallback: $1B baseline

    const trendRatio = fyLatest / baseline;
    const signal     = clamp(Math.round(trendRatio * 60), 0, 100);
    const conf       = Math.min(0.95, 0.60 + amounts.length * 0.05); // more history = higher conf

    surfaceRouter.dispatchBatch([{
      source:     'USASPENDING_ENTITY',
      domain:     'CAPITAL',
      signal,
      confidence: conf,
      ts,
      decay:      DECAY.DAILY,
      polarity:   signal >= 40 ? POLARITY.POSITIVE : POLARITY.NEGATIVE,
      meta: {
        canonicalId:  entity.canonicalId,
        canonicalName: entity.canonicalName,
        fyLatest,
        fy5yrAvg,
        trendRatio,
        yearsOfHistory: amounts.length,
        domainTags: entity.domainTags,
      },
    }]);

    return { entity, signal, trendRatio, amounts };
  } catch {
    // Entity resolved but no award data — withhold, no zero dispatch
    // (absence of federal awards is not a zero signal; entity may be private)
    return null;
  }
}
