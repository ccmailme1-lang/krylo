// WO-2046 Phase A — Capital Realization Connector
// Closes the intent → realization loop for named entities in the Capital domain.
// No API key. No UEI required. Name-based lookup via USASpending spending_over_time.
//
// Flow:
//   query string → subjectScope() → canonical entity → USASpending spending_over_time
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
//
// KRYL-1220 defect found + fixed here: this used to call entityresolution.js's bare
// resolve(query) directly on the full natural-language query string ("Lockheed Martin
// structural analysis"). That resolver has no query-window extraction and returns null on
// anything but a near-exact name, so it silently withheld on every real query -- confirmed:
// resolve('Lockheed Martin') resolves, resolve('Lockheed Martin structural analysis') did
// not. subjectScope() (subjectscope.js) already does the same resolution with the windowed
// name-candidate extraction built exactly for this case -- reused here, not reimplemented.

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';
import { subjectScope } from '../subjectscope.js';
// KRYL-1295 — CF-ECO's first live production consumer. Additive only: called AFTER the
// real dispatch below, never alters it, never throws into this function (the adapter
// swallows its own errors). See cfecoproductionadapter.js header for the honest gap this
// creates today (no naicsCode/entityTags on any real entity yet -- every call here will
// currently return { tagged: false, skipped: true }, which is correct, not broken).
import { tagObservationForCfEco } from '../cf/cfecoproductionadapter.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export async function runCapitalRealizationSync(query) {
  if (!query) return null;

  // Resolve entity from the full natural-language query — subjectScope() does the same
  // ERK resolution entityresolution.js's resolve() does, but through windowed name-candidate
  // extraction that actually handles a query longer than a bare name (KRYL-1220 defect fix).
  const scope = subjectScope(query);
  if (scope.kind !== 'ENTITY') return null; // no known entity in query — withhold, correct behavior
  const entity = { canonicalId: scope.canonicalId, canonicalName: scope.entity.name, domainTags: scope.entity.domainTags };

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

    // KRYL-1295 — CF-ECO consumption of this real, live-dispatched observation. Additive
    // only: runs after the real dispatch above, its result is not used by anything here,
    // and it cannot throw (the adapter catches its own errors). naicsCode/entityTags are
    // genuinely absent from this entity's real data — not fabricated to force a match.
    tagObservationForCfEco({
      entityIds: [entity.canonicalId],
      domain: 'CAPITAL',
      observedAt: ts,
      provenanceId: `usaspending_${entity.canonicalId}_${ts}`,
      sourceId: 'USASPENDING_ENTITY',
      naicsCode: null,
      entityTags: null,
    });

    return { entity, signal, trendRatio, amounts };
  } catch (err) {
    // Entity resolved but no award data, OR the fetch/API itself failed — these are NOT the
    // same state (legitimate absence vs. operational failure), and collapsing them into an
    // identical silent null is exactly the swallowed-exception pattern found during KRYL-1220
    // verification: a connector failing on every query looked identical to honest absence
    // until traced directly. Not building a formal failure-state taxonomy here (that's a
    // separate, larger provenance/absence-model question) — the minimal fix is: don't let
    // this be invisible. A real fetch/HTTP failure is logged distinguishably from the
    // legitimate "no award history"/"zero amounts" cases; the caller still only sees
    // withhold (null) either way, because WITHHOLD beats fabricate regardless of which case.
    const legitimateAbsence = err?.message === 'no award history' || err?.message === 'zero amounts';
    if (!legitimateAbsence) {
      console.warn(`[capitalrealizationconnector] operational failure for "${entity.canonicalName}" (${entity.canonicalId}):`, err?.message ?? err);
    }
    return null;
  }
}
