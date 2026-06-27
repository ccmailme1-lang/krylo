// WO-2018 — Evidence Independence Metric (EIM)
// Measures structural diversity of evidence sources.
// PASS required for HP-3. HP-2 uses score as annotation only.

const MAX_DOMAINS      = 6; // TECHNOLOGY · CAPITAL · KNOWLEDGE · LABOR · MEDIA · OWNERSHIP
const INDEPENDENCE_THRESHOLD = 0.50;

export function computeIndependence(evidence) {
  const total = evidence.length;
  if (total === 0) return { independenceScore: 0, domainSpread: 0, dominantDomainRatio: 1, verdict: 'FAIL' };

  // Count per source domain
  const counts = {};
  for (const e of evidence) {
    const src = e.source ?? 'UNKNOWN';
    counts[src] = (counts[src] ?? 0) + 1;
  }

  const domainSpread        = Object.keys(counts).length;
  const dominantDomainCount = Math.max(...Object.values(counts));
  const dominantDomainRatio = dominantDomainCount / total;

  const independenceScore = Math.min(1, Math.max(0,
    (domainSpread / MAX_DOMAINS) * (1 - dominantDomainRatio)
  ));

  const verdict = independenceScore >= INDEPENDENCE_THRESHOLD ? 'PASS' : 'FAIL';

  return { independenceScore, domainSpread, dominantDomainRatio, verdict };
}
