// domainflow.js — Flow lens dataset: KRYLO's real cross-domain relationships → the directional
// edge list a Flourish chord consumes (Source, Target, Count). No fabricated numbers — the caller
// supplies REAL relationship edges (causal edges / co-occurrences) and this aggregates them by
// domain pair. §22: a domain pair with no observed relationship is 0/absent, never invented.
//
// Output matches the confirmed Flourish structure exactly:
//   Source, Target, Count   (directional: A→B and B→A are distinct rows)

import { CANONICAL_DOMAINS } from './canonicalontology.js';

const DOMAINS = (CANONICAL_DOMAINS ?? ['CAPITAL', 'OWNERSHIP', 'LABOR', 'MEDIA', 'TECHNOLOGY', 'KNOWLEDGE'])
  .map(d => String(d).toUpperCase());

const up = d => String(d ?? '').toUpperCase();

/**
 * computeDomainFlow(edges, { minCount }) → [{ source, target, count }]
 * @param edges [{ sourceDomain, targetDomain, weight? }] — REAL cross-domain relationships
 *   (e.g. causalMap edges keyed to domains, or co-occurrence pairs). weight defaults to 1 (a count).
 * @returns directional domain→domain rows, self-loops dropped, sorted by count desc.
 *   Only pairs with an observed relationship appear (§22 — no zero-fill fabrication).
 */
export function computeDomainFlow(edges = [], { minCount = 1 } = {}) {
  const agg = new Map(); // `${src}>${tgt}` → count
  for (const e of edges) {
    const s = up(e?.sourceDomain), t = up(e?.targetDomain);
    if (!DOMAINS.includes(s) || !DOMAINS.includes(t) || s === t) continue; // canonical only, no self-loop
    const w = Number(e?.weight ?? 1);
    if (!Number.isFinite(w) || w <= 0) continue;
    const k = `${s}>${t}`;
    agg.set(k, (agg.get(k) ?? 0) + w);
  }
  return [...agg.entries()]
    .map(([k, count]) => { const [source, target] = k.split('>'); return { source, target, count: Math.round(count) }; })
    .filter(r => r.count >= minCount)
    .sort((a, b) => b.count - a.count);
}

/**
 * toFlowCSV(rows) → "Source,Target,Count\n..." — the exact CSV a Flourish chord Live feed reads.
 */
export function toFlowCSV(rows = []) {
  const lines = ['Source,Target,Count'];
  for (const r of rows) lines.push(`${r.source},${r.target},${r.count}`);
  return lines.join('\n');
}

export { DOMAINS as FLOW_DOMAINS };
