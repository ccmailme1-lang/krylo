// ontologycontracts.js — KRYL-Lean-Ontology T/SO/ST formalization
//
// Per architecture-recon/009 (implementation spec): this is a naming/contract
// reconciliation, not new machinery. It does not duplicate anything that already works —
// it documents and exposes the canonical shape for T, unifies SO field-naming across O/E/R
// into one accessor, and states the decision on ST (CanonicalEvent.status vs
// entitystateledger.js) explicitly rather than leaving it implicit.

import { toMillis, intervalsOverlap } from './gwrealiser.js';
import { recordEntityState } from './entitystateledger.js';

// ── T — canonical window contract ───────────────────────────────────────────────
// The one implementation is gwrealiser.js's toMillis/intervalsOverlap (re-exported here,
// not reimplemented — avoids the exact "second parallel graph" failure mode already
// documented as a live bug in entitytopologyregistry.js's v1/v2 split, audit 004).
export { toMillis, intervalsOverlap };

/**
 * makeWindow(start, end) → { start: ms, end: ms }
 * Canonical W = [t1, t2] constructor. end=null/undefined means "open, through now" —
 * resolved to Date.now() at call time, matching gwrealiser.js's existing convention
 * (not a new one).
 */
export function makeWindow(start, end) {
  return { start: toMillis(start) ?? -Infinity, end: end != null ? (toMillis(end) ?? Date.now()) : Date.now() };
}

export function windowOverlaps(a, b) {
  return intervalsOverlap(a.start, a.end, b.start, b.end);
}

// ── SO — unified source accessor ────────────────────────────────────────────────
// What exists today (audit 002/004): evidence-type descriptors on E (evidencetiers.js:
// epistemicClass/evidenceType) and a plain `source` string field on R (entitytopology-
// registry.js edges, e.g. 'SEC_13D_13G'). Two different field names for the same Lean
// concept ("where did this observation come from"). This does not rename either existing
// field (would break live callers — chokepointedges.js, secownershipconnector.js,
// edgar8kevidence.js all read/write these field names today) — it provides one read path
// that normalizes both into the same shape for anything that needs SO generically.
//
/**
 * getSourceOf(element) → { sourceType: 'E'|'R', sourceLabel: string }
 * element: an EvidenceNode (has .evidenceType) or a TYPED_EDGES entry (has .source).
 * Returns null if neither shape matches — never guesses.
 */
export function getSourceOf(element) {
  if (!element) return null;
  if (typeof element.evidenceType === 'string') {
    return { sourceType: 'E', sourceLabel: element.evidenceType };
  }
  if (typeof element.source === 'string') {
    return { sourceType: 'R', sourceLabel: element.source };
  }
  return null;
}

// ── ST — explicit decision, not left implicit ───────────────────────────────────
// Two ST mechanisms exist (audit 001/003) and are NOT unified into one, because they
// serve two different Lean primitives:
//   - CanonicalEvent.status (identitykernel.js) — ST-of-E. Two-value (ACTIVE/FRAGMENTED),
//     tightly coupled to WO-2004's merge/split logic. Stays exactly as-is — it is load-
//     bearing for shouldMerge/shouldSplit/resolveIdentity and must not be touched here.
//   - entitystateledger.js (KRYL-974) — ST-of-O. Append-only, timestamped, richer, but
//     had zero confirmed live callers as of audit 003.
//
// DECISION (per spec 009's instruction to decide, not leave open): entitystateledger.js
// is the ST mechanism for O. It is wired in here — not retired — because it already
// matches what O's lifecycle extension (entityresolution.js's createEntity/upsertEntity/
// mergeEntity, added in this same implementation pass) needs: a timestamped record of an
// entity's state changes over time, which createdAt/updatedAt alone don't provide.
//
// recordEntityLifecycleState — thin wrapper, not a reimplementation. entitystateledger.js
// itself only touches localStorage inside its own function bodies (readLedger/
// writeLedger), never at module load, so importing it statically here is safe even for
// callers that never invoke this specific function.
export function recordEntityLifecycleState({ entityId, priorStatus, newStatus, sourceHash = null, eventTriggerId = null }) {
  if (!entityId || !newStatus) return null;
  return recordEntityState({
    entityId,
    signalSnapshot: null,
    metricSnapshot: { priorStatus, newStatus },
    sourceHash,
    eventTriggerId,
  });
}
