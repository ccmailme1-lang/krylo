// WO-2007.4 — Happy Path Genome Extractor
// Reads path records from pathstore.js (read-only consumer).
// Genome = structural_path + regime_conditions + outcome_lag_distribution.
// Requires n ≥ 5 per route key before emitting — silence beats fabrication.

import { makeRouteKey } from './pathstore.js';

const MIN_GENOME_N = 5;

// extractGenomes — groups path records by route key, returns genomes above threshold
export function extractGenomes(pathRecords = []) {
  const groups = new Map();
  for (const r of pathRecords) {
    if (!r.domains?.length || !r.stateLabel) continue;
    const key = makeRouteKey({ domain: r.queryDomain, stateLabel: r.stateLabel, lens: r.lens });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const genomes = [];
  for (const [routeKey, records] of groups) {
    if (records.length < MIN_GENOME_N) continue;

    const structural_path    = _mostCommonPath(records);
    const regimeLabels       = [...new Set(records.map(r => r.stateLabel).filter(Boolean))];
    const regime_conditions  = regimeLabels.map(label => ({ label, features: [label] }));

    // outcome_lag_distribution — only from records with closed outcomes
    const resolved = records.filter(r => r.outcomeLoggedAt && r.ts);
    const lagDays  = resolved
      .map(r => Math.round((r.outcomeLoggedAt - r.ts) / 86400000))
      .filter(d => d >= 0)
      .sort((a, b) => a - b);

    const outcome_lag_distribution = lagDays.length >= 3
      ? { p25: _pct(lagDays, 0.25), p50: _pct(lagDays, 0.50), p75: _pct(lagDays, 0.75), n: lagDays.length }
      : null;

    const lrPrior = _lrPrior(records);

    genomes.push({ routeKey, structural_path, regime_conditions, outcome_lag_distribution, n: records.length, lrPrior });
  }

  return genomes;
}

// getGenome — returns genome for a specific route key, or null
export function getGenome(pathRecords, routeKey) {
  return extractGenomes(pathRecords).find(g => g.routeKey === routeKey) ?? null;
}

function _mostCommonPath(records) {
  const counts = new Map();
  for (const r of records) {
    const key = [...(r.domains ?? [])].sort().join('→');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best = null, bestN = 0;
  for (const [path, n] of counts) { if (n > bestN) { best = path; bestN = n; } }
  return best ? best.split('→') : [];
}

function _pct(sorted, p) {
  return sorted[Math.min(Math.floor(sorted.length * p), sorted.length - 1)];
}

function _lrPrior(records) {
  const resolved = records.filter(r => typeof r.lr === 'number');
  if (resolved.length < MIN_GENOME_N) return null;
  return { value: resolved.reduce((s, r) => s + r.lr, 0) / resolved.length, n: resolved.length };
}
