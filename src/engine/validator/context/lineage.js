// lineage.js — ValidationContext provider: ℒ (provenance/lineage trace).
// Implements SPEC-relationship-validator-operator-contract.md §3 `lineage`.
//
// NOT LIVE-WIRED — genuine gap, not an oversight. causalos/provenance.js's ProvenanceDAG is a
// class requiring an instance; this codebase has no global singleton instance, and its nodes
// are keyed by application-assigned event_id, not by RelationCore.provenanceHash — there is no
// verified mapping from one to the other. Guessing that provenanceHash IS an event_id would be
// fabrication, not adaptation (§27 — no contract inference from similar shape/naming alone).
//
// Per §22, returns null (STRUCTURAL ABSENCE) by default. A caller holding a real ProvenanceDAG
// instance plus a genuine hash→event_id mapping may inject both.

// getLineage(candidate, { dag, resolveEventId } = {}) → LineageTrace | null
//   dag?:            a ProvenanceDAG instance
//   resolveEventId?: (provenanceHash: string) => string | null — the missing mapping; supplying
//                    it is a real design decision for whoever wires this provider, not a default
//                    this module may invent.
export function getLineage(candidate, { dag, resolveEventId } = {}) {
  if (!candidate?.provenanceHash) return null;
  if (!dag || typeof resolveEventId !== 'function') return null;
  const eventId = resolveEventId(candidate.provenanceHash);
  if (!eventId || !dag.has(eventId)) return null;
  return Object.freeze(dag.trace(eventId));
}
