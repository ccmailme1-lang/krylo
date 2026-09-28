// KRYL-1143 — Guest-Facing Withhold Language
//
// Presentation-layer translation only. The engine's withhold/absence logic (§22 absence-is-signal,
// WT_STATE in whytraceresolver.js, the Fs export gate in consultingexport.js) is UNCHANGED — this
// module never softens, hides, or fabricates around a real absence. It only replaces the internal
// state name/jargon shown on screen with plain, actionable copy. See
// specs/krylo_guest_facing_withhold_language_ticket.csv.
//
// Any new render point for a withhold/low-confidence state should look up its copy here rather
// than inlining a new string — keeps the guest-facing vocabulary consistent and in one place.

export const GUEST_WITHHOLD_COPY = Object.freeze({
  // whytraceresolver.js WT_STATE — provenance trace withheld/absent
  STRUCTURAL_ABSENCE: 'No verified record found for this yet. Add a specific decision, dollar amount, or timeline to get a grounded answer.',
  TRACE_ERROR:        'This record exists but can’t be shown yet — the evidence didn’t pass our verification check.',

  // consultingexport.js export-gate states
  // KRYL-1332 (Founder, 2026-09-27/28): the ORIGINAL text here ('GROUNDED ANSWERS REQUIRE A
  // SUBJECT, DECISION CONTEXT, AND BOUNDED PARAMETERS') was wrong on its own terms too, but a
  // first attempt at fixing it (2026-09-27, 'SUBJECT NOT ESTABLISHED...') was ALSO wrong -- it
  // named the wrong condition. This copy renders when `structuralAbsence` is true, i.e.
  // whyTrace.state === WT_STATE.STRUCTURAL_ABSENCE (intelligencebrief.jsx) -- a subject can be
  // fully resolved and this still fires, because it means no verified structural trace record
  // was found for THIS EXPORT, not that no subject was established. Found live (2026-09-28):
  // Alphabet resolved, 22 subject-bound observations admitted, and this line still claimed
  // 'subject not established' -- a false, checkable claim. Mirrors STRUCTURAL_ABSENCE's own
  // honest wording instead of inventing a second description of the same real state.
  EXPORT_BLOCKED_ABSENCE: 'No verified structural record found for this export yet.',
  EXPORT_BELOW_GATE:      'grounded so far — keep refining to unlock export.',
  EXPORT_READY:           'verified evidence found — ready to export.',

  // short-form pill/tag variant — same meaning as EXPORT_BLOCKED_ABSENCE / STRUCTURAL_ABSENCE,
  // used wherever a metric value is replaced inline (metricstrip.jsx, targetpacket.jsx) and there
  // isn't room for a full sentence. Keep to 2 words, same visual weight as sibling tags like
  // 'MODELED'.
  UNGROUNDED_TAG: 'NEEDS INPUT',
});

export function guestWithholdCopy(key, fallback = '') {
  return GUEST_WITHHOLD_COPY[key] ?? fallback;
}
