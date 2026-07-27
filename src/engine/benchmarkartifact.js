// benchmarkartifact.js — Benchmark Evidence Facet (external reference evidence, bounded)
// KRYL-RSCH-2026-07 lineage. NOT a marketing-intelligence layer, NOT a prediction/recommendation
// engine. Imports externally-sourced historical reference measurements with provenance; never
// creates formations, edges, or signals; never overrides tenant-observed evidence (§22/§18).
//
// Evidence hierarchy (locked): g_e,observed > g_e,benchmark > g_e,modeled. A benchmark can never
// outrank a real tenant observation — enforced by admitBenchmark(), not by convention.
//
// LANGUAGE LOCK: this module has no "predicted_X"/"expected_X"/"recommended_X"/"optimal_X" fields
// anywhere, by design. Only observed_range / historical_range / benchmark_reference.

const clamp01 = (x) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));

/**
 * computeArtifactGroundedness — g_e = Q_source × Q_method × Q_coverage × Q_freshness.
 * Multiplicative (§18) — a benchmark cannot self-declare confidence; it earns g_e from four
 * independently-scored quality dimensions. No single dimension can compensate for another.
 */
export function computeArtifactGroundedness({ sourceQuality, methodQuality, coverageQuality, freshnessQuality }) {
  return clamp01(clamp01(sourceQuality) * clamp01(methodQuality) * clamp01(coverageQuality) * clamp01(freshnessQuality));
}

/**
 * admitBenchmark — the admissibility gate. A source does not get trusted because it arrived first;
 * it earns a bounded evidence position. Returns a frozen BenchmarkArtifact or a withheld reason.
 * @param {{ metric, sector, geography, time_period, sample_size, methodology, source, source_date,
 *   observed_range: [number, number], sourceQuality, methodQuality, coverageQuality, freshnessQuality }} input
 */
export function admitBenchmark(input) {
  const required = ['metric', 'sector', 'source', 'source_date', 'methodology', 'observed_range'];
  const missing = required.filter((k) => input[k] == null);
  if (missing.length) return { admitted: false, reason: `MISSING_FIELDS: ${missing.join(',')}` };
  if (!Array.isArray(input.observed_range) || input.observed_range.length !== 2) {
    return { admitted: false, reason: 'INVALID_RANGE' };
  }

  const g_e = computeArtifactGroundedness(input);
  // Tier 2 ceiling — a benchmark, however well-sourced, never reaches Tier-1 (tenant-observed)
  // groundedness. Enforced numerically, not just by label.
  const TIER2_CEILING = 0.85;
  const boundedGe = Math.min(g_e, TIER2_CEILING);

  return Object.freeze({
    admitted: true,
    metric: input.metric,
    sector: input.sector,
    geography: input.geography ?? null,
    time_period: input.time_period ?? null,
    sample_size: input.sample_size ?? null,
    methodology: input.methodology,
    source: input.source,
    source_date: input.source_date,
    observed_range: Object.freeze([...input.observed_range]),
    g_e: boundedGe,
    tier: 'TIER_2_BENCHMARK',
    interpretation: `Historical benchmark reference indicates ${input.metric} conditions observed among comparable entities (${input.sector}).`,
  });
}

/**
 * combineBenchmarks — weighted BOUNDED ENVELOPE, never a naive average (three weak sources must
 * never outvote one strong one). w_i = g_e,i / Σg_e. Returns [min, max], not a single scalar.
 * @param {ReturnType<typeof admitBenchmark>[]} artifacts — admitted artifacts only
 */
export function combineBenchmarks(artifacts = []) {
  const valid = artifacts.filter((a) => a?.admitted);
  if (!valid.length) return null;
  const totalGe = valid.reduce((s, a) => s + a.g_e, 0);
  if (totalGe <= 0) return null;
  const min = valid.reduce((s, a) => s + (a.g_e / totalGe) * a.observed_range[0], 0);
  const max = valid.reduce((s, a) => s + (a.g_e / totalGe) * a.observed_range[1], 0);
  const dominant = [...valid].sort((a, b) => b.g_e - a.g_e)[0];
  return Object.freeze({
    range: [Math.round(min), Math.round(max)],
    supporting_artifacts: valid.length,
    dominant_source: dominant.source,
    dominant_ge: dominant.g_e,
  });
}

/**
 * resolveEvidenceTier — enforces g_e,observed > g_e,benchmark > g_e,modeled. A tenant-observed
 * value always wins over a benchmark, regardless of the benchmark's own g_e.
 * @returns { chosen: 'observed'|'benchmark'|'modeled', value, g_e, tier }
 */
export function resolveEvidenceTier({ observed, benchmarkEnvelope, modeled }) {
  if (observed && Number.isFinite(observed.value) && observed.g_e > 0) {
    return { chosen: 'observed', value: observed.value, g_e: observed.g_e, tier: 'TIER_1_OBSERVED' };
  }
  if (benchmarkEnvelope) {
    return { chosen: 'benchmark', value: benchmarkEnvelope.range, g_e: benchmarkEnvelope.dominant_ge, tier: 'TIER_2_BENCHMARK' };
  }
  return { chosen: 'modeled', value: modeled?.value ?? null, g_e: modeled?.g_e ?? 0, tier: 'TIER_4_MODELED' };
}
