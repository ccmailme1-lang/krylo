// relationhistory.js — ValidationContext provider: R_t (this candidate's own dynamics/event
// history). Implements SPEC-relationship-validator-operator-contract.md §3 `relationHistory`.
//
// NOT LIVE-WIRED — genuine gap. relationdynamics.js exports pure functions (updateDynamics,
// detectEvent) that operate on a prev/next pair the CALLER already holds; there is no
// persistent store anywhere in this codebase that keeps a RelationDynamics/RelationEvent
// history keyed by relation id for later lookup. Recurrence, Stability, and Lag (per the
// implementation WO's Phase 3) all need this and will need that store built or an equivalent
// caller-supplied history — not invented here as a side effect of writing a context provider.
//
// Per §22, returns null (STRUCTURAL ABSENCE) by default.

// getRelationHistory(candidate, { store } = {}) → { dynamics: RelationDynamics[], events: RelationEvent[] } | null
//   store?: { getDynamics(id): RelationDynamics[], getEvents(id): RelationEvent[] } — injection
//   point for whatever history store Phase 3 ends up needing.
export function getRelationHistory(candidate, { store } = {}) {
  if (!candidate?.id) return null;
  if (!store || typeof store.getDynamics !== 'function' || typeof store.getEvents !== 'function') {
    return null;
  }
  const dynamics = store.getDynamics(candidate.id) ?? [];
  const events   = store.getEvents(candidate.id) ?? [];
  if (dynamics.length === 0 && events.length === 0) return null;
  return Object.freeze({ dynamics: Object.freeze([...dynamics]), events: Object.freeze([...events]) });
}
