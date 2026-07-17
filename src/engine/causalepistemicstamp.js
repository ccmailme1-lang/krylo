// causalepistemicstamp.js — KRYL-1074 slice 1. The epistemic "skin" over causal edges.
//
// Labels each causal edge on TWO ORTHOGONAL axes (§23) and never blends them:
//   AXIS 1 — mode:   ABDUCTION | DEDUCTION | INDUCTION   (asymmetry-weighted, Thorisson-Talbot 2018)
//   AXIS 2 — status: PROJECTED | CORROBORATED | CLOSED | CONFIRMED   (the survival ladder)
// Rollup carries a groundedness % (§18 H1: Σ observed / Σ all) computed SEPARATELY from status.
//
// HONEST SCOPE OF THIS SLICE (substrate reality, not aspiration):
//   The only causal substrate that exists today is the Causal Impact Map (KRYL-1011): static typed
//   edges carrying { source, grounded } but NO invariance history and NO reasoning-origin tag.
//   Therefore, on this substrate:
//     • groundedness IS available now — from the `grounded` flag (edge has real provenance).
//     • status cannot honestly rise above PROJECTED — CORROBORATED needs the invariance test
//       (α-present→β AND α-absent→¬β), which registry edges do not carry. Claiming CORROBORATED
//       off mere provenance-backing would be the fabrication trap. So the ladder floors at PROJECTED.
//     • mode is UNKNOWN — abduction/deduction/induction is derived from a reasoning-origin tag that
//       only AR (KRYL-1069) / EDL (KRYL-1071) produce. Until those land, mode is null, not guessed.
//
//   SPEC REFINEMENT (feed back to KRYL-1074): groundedness is decoupled from status. Provenance-
//   backing (observed → counts toward groundedness) and invariance survival (→ CORROBORATED) are
//   DIFFERENT claims. The draft coupled them; on a real substrate that would falsely report 0%
//   grounded for provenance-backed edges. Kept orthogonal here.
//
// FAIL-SAFE (§22): an edge with no derivable status is PROJECTED and contributes 0 to groundedness —
// never silently promoted. Missing provenance can only lower groundedness.

export const MODE   = Object.freeze({ ABDUCTION: 'ABDUCTION', DEDUCTION: 'DEDUCTION', INDUCTION: 'INDUCTION' });
export const STATUS = Object.freeze({ PROJECTED: 'PROJECTED', CORROBORATED: 'CORROBORATED', CLOSED: 'CLOSED', CONFIRMED: 'CONFIRMED' });

// §18 groundedness bands (locked): green > 70, amber 40–70, red < 40.
export function groundednessBand(pct) {
  if (pct > 70) return 'green';
  if (pct >= 40) return 'amber';
  return 'red';
}

/**
 * stampEdge(edge) — label one causal edge. Pure; no mutation of the input.
 * @param {Object} edge — a Causal Impact Map impact: { from, to, type, source, grounded, ... }
 * @returns {Object} { from, to, type, mode, status, provenanceBacked, reason }
 */
export function stampEdge(edge = {}) {
  const provenanceBacked = !!edge.grounded; // real source (not UNKNOWN/absent) — §22 tentative otherwise
  // Status: no invariance test on this substrate → cannot rise past PROJECTED honestly.
  const status = STATUS.PROJECTED;
  // Mode: no reasoning-origin tag on registry edges → unknown until AR/EDL exist.
  const mode = null;
  return {
    from: edge.from ?? null,
    to: edge.to ?? null,
    type: edge.type ?? null,
    mode,
    status,
    provenanceBacked,
    reason: provenanceBacked
      ? 'PROVENANCE_BACKED — observed source; invariance untested (status floors at PROJECTED)'
      : 'TENTATIVE — no provenance (§22 absence); PROJECTED, 0 groundedness',
  };
}

/**
 * stampChain(edges) — stamp a set of causal edges and roll up the two axes.
 * @param {Array} edges — impacts[] from buildImpactMap (or any {grounded,...}[])
 * @returns {Object} {
 *   edges[], count, provenanceBackedCount,
 *   groundedness, band,                 // AXIS-adjacent: observed fraction (§18 H1)
 *   statusFloor, modeProfile            // the two axes' rollup (both PROJECTED/unknown this slice)
 * }
 */
export function stampChain(edges = []) {
  const list = Array.isArray(edges) ? edges : [];
  const stamped = list.map(stampEdge);
  const count = stamped.length;
  const provenanceBackedCount = stamped.filter(e => e.provenanceBacked).length;

  // §18 H1: groundedness = Σ(observed weight) / Σ(all weight). Edges are unweighted here → counts.
  const groundedness = count === 0 ? 0 : Math.round((provenanceBackedCount / count) * 100);

  // Mode profile — all unknown until a reasoning stage tags origins.
  const modeProfile = { [MODE.ABDUCTION]: 0, [MODE.DEDUCTION]: 0, [MODE.INDUCTION]: 0, unknown: count };

  return {
    edges: stamped,
    count,
    provenanceBackedCount,
    groundedness,                 // 0 on empty (fail-safe): no edges → nothing observed
    band: groundednessBand(groundedness),
    statusFloor: STATUS.PROJECTED, // rises to CORROBORATED with invariance, CLOSED with completeness
    modeProfile,
  };
}
