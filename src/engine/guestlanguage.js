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
  EXPORT_BLOCKED_ABSENCE: 'Add a specific decision, dollar amount, or timeline to get a grounded answer.',
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
