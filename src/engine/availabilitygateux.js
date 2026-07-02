// WO-2081 — Availability Gate UX Semantics Layer
// User-facing states for WO-2068/2072's Availability Filter output: what a consumer UI
// shows when a candidate is blocked, partially available, or fully clear. Read-only over
// filterCandidateSet()/applyAvailabilityFilter() output — adds no new filtering logic,
// computes no new pass/fail decisions, invents no rejection reasons (reuses the ones
// ucsm.js's evaluators already produced).

export const GATE_UX_STATE = {
  AVAILABLE: 'AVAILABLE', // no rejections, no advisories
  PARTIAL:   'PARTIAL',   // passed, but 1+ advisories — proceed with caution
  BLOCKED:   'BLOCKED',   // 1+ enforced rejections — eliminated
};

// Classifies one applyAvailabilityFilter()-shaped result into a UX state + copy.
export function classifyGateUx({ passed, rejections = [], advisories = [] }) {
  if (!passed) {
    return {
      state:         GATE_UX_STATE.BLOCKED,
      headline:      'Not available under your current constraints',
      reasons:       rejections.map(r => r.reason),
      recoveryPaths: rejections.map(r =>
        `Adjust your ${r.category.replace(/_/g, ' ').toLowerCase()} constraint, or revisit once it changes.`
      ),
    };
  }
  if (advisories.length > 0) {
    return {
      state:         GATE_UX_STATE.PARTIAL,
      headline:      'Available, with caveats',
      reasons:       advisories.map(a => a.reason),
      recoveryPaths: [],
    };
  }
  return { state: GATE_UX_STATE.AVAILABLE, headline: 'Available', reasons: [], recoveryPaths: [] };
}

function mostFrequentCategory(eliminated) {
  const counts = {};
  for (const e of eliminated) {
    for (const r of e.rejections) counts[r.category] = (counts[r.category] ?? 0) + 1;
  }
  const entries = Object.entries(counts);
  return entries.length ? entries.sort((a, b) => b[1] - a[1])[0][0] : null;
}

// Batch version, over filterCandidateSet()'s { passed, eliminated } shape.
// Dead-end prevention: when literally everything is blocked, names the single most
// common blocking category across all eliminations, so the user gets ONE lever to
// pull instead of a wall of per-candidate rejections with no unifying next step.
export function classifyGateUxBatch({ passed, eliminated }) {
  const cleared = passed.map(p => classifyGateUx({ passed: true, advisories: p.advisories }));
  const blocked = eliminated.map(e => classifyGateUx({ passed: false, rejections: e.rejections }));
  const allBlocked = cleared.length === 0 && blocked.length > 0;

  return {
    cleared,
    blocked,
    allBlocked,
    mostCommonBlocker: allBlocked ? mostFrequentCategory(eliminated) : null,
  };
}
