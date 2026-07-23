// src/engine/counterevidence.js
// KRYL-1113 — Counter-Evidence state contract (§20 direction honesty / §22 absence-is-signal).
//
// KRYLO must never transform "not observed" into "does not exist." Absence of counter-evidence
// may ONLY be asserted when contradiction detection actually ran. This function is the single
// authority for the counter-evidence state; the UI is a render-only sink (§18).

export const COUNTER_EVIDENCE_STATE = {
  FOUND:             'FOUND',              // contradictions detected — caller displays them
  SEARCHED_NO_MATCH: 'SEARCHED_NO_MATCH',  // detection ran, none above threshold
  NOT_EVALUATED:     'NOT_EVALUATED',      // detection did NOT run — no basis to claim absence
  WITHHELD:          'WITHHELD',           // detection blocked by a boundary (e.g. ungrounded)
};

// User-facing labels. NOT_EVALUATED and SEARCHED_NO_MATCH are deliberately DIFFERENT strings:
// "unavailable" (we didn't check) is not "none found" (we checked, found none).
const LABEL = {
  FOUND:             null, // caller renders the contradiction list, not a label
  SEARCHED_NO_MATCH: 'No qualifying contradictions found',
  NOT_EVALUATED:     'Unavailable — contradiction detection did not run',
  WITHHELD:          'Withheld',
};

/**
 * computeCounterEvidenceState — resolve counter-evidence to exactly one honest state.
 * Absence is asserted ONLY when evaluated === true. Any not-evaluated case returns
 * NOT_EVALUATED, never a negative assertion — even if the contradictions array is empty.
 *
 * @param {object} input
 * @param {boolean} input.evaluated        — did contradiction detection run for this analysis?
 * @param {Array}   [input.contradictions] — detected contradictions (opaque shape, passed through)
 * @param {string}  [input.withheldReason] — boundary that blocks assertion => WITHHELD
 * @returns {{ state:string, label:string|null, contradictions:Array }}
 */
export function computeCounterEvidenceState({ evaluated = false, contradictions = [], withheldReason = null } = {}) {
  const list = Array.isArray(contradictions) ? contradictions : [];
  let state;
  if (!evaluated)                 state = COUNTER_EVIDENCE_STATE.NOT_EVALUATED;
  else if (withheldReason)        state = COUNTER_EVIDENCE_STATE.WITHHELD;
  else if (list.length > 0)       state = COUNTER_EVIDENCE_STATE.FOUND;
  else                            state = COUNTER_EVIDENCE_STATE.SEARCHED_NO_MATCH;

  return {
    state,
    label: state === COUNTER_EVIDENCE_STATE.WITHHELD ? withheldReason : LABEL[state],
    contradictions: state === COUNTER_EVIDENCE_STATE.FOUND ? list : [],
  };
}
