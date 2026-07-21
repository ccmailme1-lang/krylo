// causalepistemicstamp.js — KRYL-1074 slice 1 + KRYL-1095. The epistemic "skin" over causal edges.
//
// Labels each causal edge on TWO ORTHOGONAL axes (§23) and never blends them:
//   AXIS 1 — mode:   ABDUCTION | DEDUCTION | INDUCTION   (asymmetry-weighted, Thorisson-Talbot 2018)
//   AXIS 2 — status: PROJECTED | CORROBORATED | CLOSED | CONFIRMED   (the survival ladder)
// Rollup carries a groundedness % (§18 H1: Σ observed / Σ all) computed SEPARATELY from status.
//
// HONEST SCOPE OF THIS SLICE (substrate reality, not aspiration):
//   The base Causal Impact Map (KRYL-1011) carries static typed edges with { source, grounded } but
//   NO invariance history. Therefore, on that substrate:
//     • groundedness IS available now — from the `grounded` flag (edge has real provenance).
//     • status cannot honestly rise above PROJECTED — CORROBORATED needs the invariance test
//       (α-present→β AND α-absent→¬β), which registry edges do not carry. Claiming CORROBORATED
//       off mere provenance-backing would be the fabrication trap. So the ladder floors at PROJECTED.
//
//   MODE — REASONING-ORIGIN ATTRIBUTION (KRYL-1095): mode is the logical operator the PRODUCING
//   reasoning mechanism used to derive the edge. It is EMITTED AT SOURCE on edge.mode — never
//   inferred, guessed, or recomputed here (Rule 1). An edge whose mechanism does not declare a mode,
//   or declares a value outside the MODE enum, is stamped null — null means "the originating
//   mechanism did not declare a reasoning operator," NOT unknown / low-confidence / failed (Rule 2/3).
//   mode is ORTHOGONAL (§23): it never touches provenance, invariance, status, or groundedness (Rule 5).
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

// The only legal reasoning operators. Anything else on edge.mode is treated as undeclared (→ null).
const VALID_MODES = new Set([MODE.ABDUCTION, MODE.DEDUCTION, MODE.INDUCTION]);

/**
 * normalizeMode(m) — KRYL-1095 Rule 2/3. Pass through a declared, recognized reasoning operator;
 * everything else (undefined, null, or any value outside the MODE enum) → null. Never guesses,
 * never defaults to a mode. Null is an explicit "not declared" state, not an error or "unknown".
 */
function normalizeMode(m) {
  return VALID_MODES.has(m) ? m : null;
}

// §18 groundedness bands (locked): green > 70, amber 40–70, red < 40.
export function groundednessBand(pct) {
  if (pct > 70) return 'green';
  if (pct >= 40) return 'amber';
  return 'red';
}

// Ladder order (low → high). CLOSED and CONFIRMED are reachable only by later organs (completeness
// justification / intervention); this module can promote no higher than CORROBORATED.
const LADDER = [STATUS.PROJECTED, STATUS.CORROBORATED, STATUS.CLOSED, STATUS.CONFIRMED];

/**
 * invariance(record) — the Clark-completion / paper-fn-2 observational test. THRESHOLD-FREE (strict):
 * the biconditional α ↔ β holds iff, across the record, α-present ALWAYS carried the effect AND
 * α-absent NEVER did, on non-empty samples of both. Any noise tolerance is a RUNTIME_POLICY concern,
 * NEVER baked into this core invariant (§11a: invariants have no knobs).
 * @param {Object|null} record — { presentTotal, presentWithEffect, absentTotal, absentWithEffect }
 * @returns {Object} { holds, necessary, sufficient, reason? }
 */
export function invariance(record) {
  if (!record) return { holds: false, reason: 'NO_RECORD' };
  const { presentTotal = 0, presentWithEffect = 0, absentTotal = 0, absentWithEffect = 0 } = record;
  if (presentTotal <= 0 || absentTotal <= 0) return { holds: false, reason: 'INSUFFICIENT_SAMPLE' };
  const sufficient = presentWithEffect === presentTotal; // α present → effect present
  const necessary  = absentWithEffect === 0;             // α absent  → effect absent
  return { holds: sufficient && necessary, necessary, sufficient };
}

/**
 * stampEdge(edge, record) — label one causal edge. Pure; no mutation of the input.
 * @param {Object} edge   — a Causal Impact Map impact: { from, to, type, source, grounded, mode?, ... }
 *                          edge.mode (optional) is the reasoning operator declared by the producing
 *                          mechanism (KRYL-1095). Absent/unrecognized → null (never guessed).
 * @param {Object|null} record — optional present/absent record for the invariance test (default null)
 * @returns {Object} { from, to, type, mode, status, provenanceBacked, invariance, reason }
 */
export function stampEdge(edge = {}, record = null) {
  const provenanceBacked = !!edge.grounded; // real source (not UNKNOWN/absent) — §22 tentative otherwise
  const inv = invariance(record);           // null record → { holds:false } → floors at PROJECTED (fail-safe)
  // Evidence-tier cap (Founder doctrine): CORROBORATED needs authoritative/commercial evidence (Tier ≤ 2).
  // Tier-3 (crowd/observational, e.g. Gas Go) can only POINT attention, never corroborate. Unmarked (null)
  // is not assumed crowd — mark crowd feeds Tier 3 to invoke the cap. "Observe, don't assert."
  const evidenceTier = record && record.evidenceTier != null ? record.evidenceTier : null;
  const authoritative = evidenceTier == null || evidenceTier <= 2;
  const tier3Candidate = inv.holds && !authoritative; // invariance holds but only on Tier-3 data
  const status = (inv.holds && authoritative) ? STATUS.CORROBORATED : STATUS.PROJECTED;
  // Mode (KRYL-1095): source-emitted reasoning operator, validated to the MODE enum. Orthogonal to
  // status — a null mode never changes the ladder, and a declared mode never promotes it.
  const mode = normalizeMode(edge.mode);
  return {
    from: edge.from ?? null,
    to: edge.to ?? null,
    type: edge.type ?? null,
    mode,
    status,
    provenanceBacked,
    invariance: record ? inv : null,
    evidenceTier,
    tier3Candidate,
    reason: (inv.holds && authoritative)
      ? 'CORROBORATED — invariance holds (present→effect AND absent→¬effect), Tier ≤ 2 evidence'
      : tier3Candidate
        ? 'TIER3_CANDIDATE — invariance holds on Tier-3 (crowd/observational) data only; a look-here signal, validate with an authoritative source before asserting'
        : provenanceBacked
          ? 'PROVENANCE_BACKED — observed source; invariance untested/failed → PROJECTED'
          : 'TENTATIVE — no provenance (§22 absence); PROJECTED, 0 groundedness',
  };
}

/**
 * stampChain(edges, opts) — stamp a set of causal edges and roll up the two axes.
 * @param {Array} edges — impacts[] from buildImpactMap (or any {grounded,...}[])
 * @param {Object} [opts] — { recordFor: (edge) => record|null } supplies invariance records per edge
 * @returns {Object} {
 *   edges[], count, provenanceBackedCount, corroboratedCount,
 *   groundedness, band,     // observed fraction (§18 H1) — DECOUPLED from status
 *   statusFloor, modeProfile
 * }
 */
export function stampChain(edges = [], { recordFor = null } = {}) {
  const list = Array.isArray(edges) ? edges : [];
  const stamped = list.map(e => stampEdge(e, recordFor ? recordFor(e) : null));
  const count = stamped.length;
  const provenanceBackedCount = stamped.filter(e => e.provenanceBacked).length;
  const corroboratedCount     = stamped.filter(e => e.status === STATUS.CORROBORATED).length;
  const tier3CandidateCount   = stamped.filter(e => e.tier3Candidate).length; // look-here signals, not corroboration

  // §18 H1: groundedness = Σ(observed weight) / Σ(all weight). Edges unweighted → counts. Observed =
  // provenance-backed (NOT status): provenance-backing and invariance-survival are different claims (§23).
  const groundedness = count === 0 ? 0 : Math.round((provenanceBackedCount / count) * 100);

  // Status floor = the lowest rung present (PROJECTED unless every edge cleared invariance).
  const statusFloor = count === 0
    ? STATUS.PROJECTED
    : LADDER[Math.min(...stamped.map(e => LADDER.indexOf(e.status)))];

  // Mode profile (KRYL-1095): the REAL distribution of declared reasoning operators. `unknown` counts
  // edges whose producing mechanism did not declare a mode — never a blanket `count` default.
  const modeProfile = { [MODE.ABDUCTION]: 0, [MODE.DEDUCTION]: 0, [MODE.INDUCTION]: 0, unknown: 0 };
  for (const e of stamped) {
    if (e.mode && VALID_MODES.has(e.mode)) modeProfile[e.mode] += 1;
    else modeProfile.unknown += 1;
  }

  return {
    edges: stamped,
    count,
    provenanceBackedCount,
    corroboratedCount,
    tier3CandidateCount,
    groundedness,                 // 0 on empty (fail-safe): no edges → nothing observed
    band: groundednessBand(groundedness),
    statusFloor,
    modeProfile,
  };
}
