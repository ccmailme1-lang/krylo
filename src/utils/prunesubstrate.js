/* src/utils/prunesubstrate.js                                          */
/* WO-748 — Spaghetti Reduction Protocol                                */
/*                                                                      */
/* Universal cluster rule — applies to ALL ETRs (local or national):   */
/*   category_id + fs_band + age_band + proximity = true → eligible    */
/*   Cluster min=3, max=5 (enforced at pairing stage in spinemap.jsx)  */
/*                                                                      */
/* Proximity is derived from fs_band (news impact research):           */
/*   Band 0 — Individual impact   ~100 mi → 0.8 world units            */
/*   Band 1 — Deliberative impact ~250 mi → 2.1 world units            */
/*   Band 2 — Substantive impact  ~500 mi → 4.2 world units            */
/*   (trifecta guarantee: both nodes in a pair share the same fs_band) */
/*                                                                      */
/* Emergent Unicorn Detection (post-filter pass):                       */
/*   1. Categorical Saturation — hits max cluster connections (4+)      */
/*   2. Trust Threshold        — at least one connection avgTrust < 0   */
/*   Result: bloom=true on all pairs touching that node                 */

const PROXIMITY_BY_BAND = {
  0: 0.8,  // Individual impact  — ~100 miles
  1: 2.1,  // Deliberative impact — ~250 miles
  2: 4.2,  // Substantive impact  — ~500 miles
};

const fsBand = fs => fs < 0.33 ? 0 : fs < 0.66 ? 1 : 2;

export function pruneSubstrate(allLinks, primaries) {
  if (!allLinks.length) return { pairs: [], unicornCount: 0 };

  // Sort by strength — high-value links survive first
  const sorted = [...allLinks].sort((a, b) => b.strength - a.strength);

  // Universal gate: impact-radius proximity (trifecta enforced at pairing stage)
  // Both nodes share the same fs_band by trifecta guarantee — use source node's band
  const filtered = sorted.filter(link => {
    const s = primaries[link.idxA];
    const t = primaries[link.idxB];
    if (!s || !t) return false;

    const radius = PROXIMITY_BY_BAND[fsBand(s.fs)] ?? 2.1;
    const dx     = s.pos.x - t.pos.x;
    const dz     = s.pos.z - t.pos.z;
    return Math.sqrt(dx * dx + dz * dz) <= radius;
  });

  // ── Emergent Unicorn Detection ────────────────────────────────────────
  const connCounts    = new Map();
  const negTrustNodes = new Set();

  filtered.forEach(link => {
    connCounts.set(link.idxA, (connCounts.get(link.idxA) ?? 0) + 1);
    connCounts.set(link.idxB, (connCounts.get(link.idxB) ?? 0) + 1);
    if (link.avgTrust < 0) {
      negTrustNodes.add(link.idxA);
      negTrustNodes.add(link.idxB);
    }
  });

  // Unicorn: max cluster connections (4+ = full cluster of 5) + negative trust
  const unicornNodes = new Set();
  for (const [idx, count] of connCounts) {
    if (count >= 4 && negTrustNodes.has(idx)) {
      unicornNodes.add(idx);
    }
  }

  const pairs = filtered.map(link => ({
    ...link,
    bloom: unicornNodes.has(link.idxA) || unicornNodes.has(link.idxB),
  }));

  return { pairs, unicornCount: unicornNodes.size };
}
