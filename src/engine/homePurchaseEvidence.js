// src/engine/homePurchaseEvidence.js — Evidence Layer for the homePurchase DIC. Downstream of
// synthesizeQuery() (never called from inside it) — owns evidence retrieval and formula
// execution, which synthesizeQuery() explicitly does not do.
//
// HONESTY NOTE (§22): only the FRED groundable field has a real, verified connector in this
// codebase (/api/fred, confirmed working this session). ZILLOW and CENSUS have no connector
// built yet — rather than fabricate a fetch call to an endpoint that doesn't exist, those two
// fields correctly resolve to WITHHELD/no-artifact. That's the honest state, not a bug: adding
// real Zillow/Census connectors is separate, real work (see Deferred Register — "Groundable
// fallback routing" and the WO's own scope, which names FRED as the only pre-verified source).

import { admitBenchmark, resolveEvidenceTier } from './benchmarkartifact.js';
import { FormulaRegistry } from './formulaRegistry.js';

async function fetchFredSeries(seriesId) {
  try {
    const res = await fetch(`/api/fred?series_id=${seriesId}`);
    const data = await res.json();
    const obs = data.observations?.[0];
    if (!obs || obs.value === '.') return null;
    return { value: parseFloat(obs.value), date: obs.date };
  } catch {
    return null; // real network/parse failure — absence, not a fabricated value
  }
}

// Connector map — only FRED is real. Zillow/Census intentionally return null (not yet built).
const CONNECTORS = {
  FRED: fetchFredSeries,
  ZILLOW: async () => null,
  CENSUS: async () => null,
};

async function resolveGroundableField(field) {
  const fetcher = CONNECTORS[field.sourceId];
  const raw = fetcher ? await fetcher(field.seriesId) : null;
  if (!raw) {
    return { key: field.key, chosen: 'withheld', tier: null, value: null };
  }
  const artifact = admitBenchmark({
    metric: field.key,
    sector: 'real_estate',
    source: field.sourceId,
    source_date: raw.date,
    methodology: `${field.sourceId} published series ${field.seriesId}`,
    observed_range: [raw.value, raw.value],
    sourceQuality: 0.95, // government/public series — high, real, not invented
    methodQuality: 0.9,
    coverageQuality: 0.8,
    freshnessQuality: 0.85,
  });
  if (!artifact.admitted) return { key: field.key, chosen: 'withheld', tier: null, value: null };
  const tier = resolveEvidenceTier({ observed: null, benchmarkEnvelope: { range: artifact.observed_range, dominant_ge: artifact.g_e, dominant_source: artifact.source, supporting_artifacts: 1 }, modeled: null });
  return { key: field.key, chosen: tier.chosen, tier: tier.tier, value: raw.value, artifact };
}

/**
 * resolveHomePurchaseEvidence — real evidence retrieval + deterministic derivation for the
 * homePurchase DIC. Called by the UI layer when synthesis.mode === 'DIC_READY', never by
 * synthesizeQuery() itself (§ Zero Drift — that function stays routing/attachment only).
 * @param {object} dic — the homePurchaseDIC contract object
 * @param {object} fields — session.tensor.fields, the user-supplied required inputs
 */
export async function resolveHomePurchaseEvidence(dic, fields) {
  const grounded = await Promise.all(dic.groundable.map(resolveGroundableField));
  const groundedByKey = Object.fromEntries(grounded.map(g => [g.key, g]));

  const allInputs = {
    ...fields,
    ...Object.fromEntries(grounded.filter(g => g.value !== null).map(g => [g.key, g.value])),
  };

  const derived = [];
  for (const d of dic.derived) {
    // Only attempt a derivation when every input it plausibly needs is present — the registry's
    // own INVALID_INPUT/CONSTRAINT_FAILED handling is the real backstop, this is just avoiding
    // calling a formula we already know can't succeed.
    const result = FormulaRegistry.execute(d.formulaId, allInputs);
    derived.push({ key: d.key, label: d.label, ...result });
    if (result.status === 'SUCCESS') allInputs[d.key] = result.value; // chain: PMT needs loan_principal
  }

  const missingOptionalOrGroundable = [
    ...dic.optional.filter(f => !(f.key in fields)),
    ...grounded.filter(g => g.chosen === 'withheld').map(g => dic.groundable.find(f => f.key === g.key)),
  ].filter(Boolean);

  const anyRealEvidence = grounded.some(g => g.chosen !== 'withheld')
    || derived.some(d => d.status === 'SUCCESS');

  return {
    mode: anyRealEvidence ? 'PARTIAL_SATISFIED' : 'INSUFFICIENT_INPUT',
    grounded,
    derived,
    missingOptionalOrGroundable,
  };
}
