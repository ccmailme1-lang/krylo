/**
 * src/ontology/SovereignGate.js
 *
 * WO-809: Sovereign Gate
 * Hard admission policy governing which nodes are permitted to enter the L1
 * core boundary (L1_APPROACH / L1_ANCHORED states).
 *
 * This gate runs BEFORE resolveStateV2 (WO-805). A node that fails admission
 * is locked to NORMAL state — its sovereignEntryTime is cleared and the spring
 * targets the outer ring, regardless of its combined score.
 *
 * Policy (three layers):
 *
 *   1. HARD FLOOR — minimum individual thresholds.
 *      A node below MIN_FS or MIN_COMBINED is structurally ineligible.
 *      No amount of proximity makes it sovereign.
 *
 *   2. OCCUPANCY CAP — at most MAX_OCCUPANCY nodes may be in L1 simultaneously.
 *      When demand exceeds the cap, the highest combined-score candidates win.
 *      Uses stateRef values from the previous frame (one-frame lag is acceptable).
 *
 *   3. INTEGRITY FILTER — shattered and zombie nodes are permanently excluded.
 *
 * Usage (spinemap.jsx useFrame, before main forEach):
 *   const admittedSet = computeAdmittedSet(stateRef);
 *   // then inside forEach, before sovereign detection:
 *   if (!admittedSet.has(node.index)) { [clear sovereign state, skip to NORMAL] }
 */

// ── Policy constants ─────────────────────────────────────────────────────────

export const GATE_POLICY = {
  MIN_FS:        0.60,  // minimum fidelity score — hard floor
  MIN_COMBINED:  0.65,  // minimum combined score (gc*0.3 + fs*0.7) — hard floor
  MAX_OCCUPANCY: 5,     // max simultaneous nodes in L1_APPROACH + L1_ANCHORED
};

// ── Admission computation ────────────────────────────────────────────────────

/**
 * computeAdmittedSet(stateRef)
 *
 * Pre-pass over all primary nodes. Applies hard floors, integrity filter,
 * and occupancy cap. Returns a Set<nodeIndex> of admitted nodes.
 *
 * Called once per frame BEFORE the main physics forEach.
 * Uses node.combined and node.fsVal from the previous frame — one-frame lag.
 *
 * @param {{ current: Array }} stateRef — physics state ref
 * @returns {Set<number>}
 */
export function computeAdmittedSet(stateRef) {
  const candidates = [];

  stateRef.current.forEach((node) => {
    // Integrity filter — zombies and shattered are never admitted
    if (!node.primary || node.isShattered || node.isZombie) return;

    // Hard floor — both thresholds must be met
    if ((node.fsVal   ?? 0) < GATE_POLICY.MIN_FS)       return;
    if ((node.combined ?? 0) < GATE_POLICY.MIN_COMBINED) return;

    candidates.push({ idx: node.index, combined: node.combined ?? 0 });
  });

  // Occupancy cap — highest combined score wins when demand exceeds MAX_OCCUPANCY
  candidates.sort((a, b) => b.combined - a.combined);
  const admitted = candidates.slice(0, GATE_POLICY.MAX_OCCUPANCY);

  return new Set(admitted.map(c => c.idx));
}

/**
 * rejectFromCore(node)
 *
 * Clears all sovereign tracking state on a node that failed admission.
 * Ensures it cannot drift into L1 even if its combined score momentarily
 * crosses SOVEREIGN_LIMIT between pre-pass and forEach execution.
 *
 * @param {Object} node — physics state node
 */
export function rejectFromCore(node) {
  node.sovereignEntryTime = null;
  node.anchorEntryTime    = null;
  node._l1RingFired       = false;
}
