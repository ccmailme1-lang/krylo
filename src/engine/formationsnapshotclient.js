// formationsnapshotclient.js — KRYL-1334, the client-side half of the automatic trigger.
// Fire-and-forget, same pattern as telemetry.js's flushPending(): a failed POST never blocks
// the guest's query, and this never re-derives the material-change decision client-side (that
// requires the last persisted state, which only the server has -- see as-diff/engine.js's
// handleFormationStateWrite).

import { buildCandidateRows } from './formationsnapshot.js';

/**
 * captureFormationSnapshots — call after a real query produces a structuralQuery with evidence.
 * One fire-and-forget POST per SUPPORTED relationship pair. Silent no-op when there's nothing
 * SUPPORTED (buildCandidateRows already filters to SUPPORTED-only -- never posts a NO_EVIDENCE
 * pair, matching the architectural invariant: persistence captures state, never manufactures it).
 * @param {object} structuralQuery — synthesis.structuralQuery (querysynthesis.js's output)
 * @param {{subject: string|null, fieldScope: string|null, formationScope: string|null}} scope
 */
export function captureFormationSnapshots(structuralQuery, scope) {
  if (structuralQuery?.state !== 'INTERPRETABLE') return;
  const candidates = buildCandidateRows(structuralQuery, scope);
  for (const candidate of candidates) {
    fetch('/v1/formation-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate }),
    }).catch(() => {
      // Offline or API down -- this snapshot is simply not captured this time. No local
      // fallback queue (unlike telemetry.js): a formation snapshot re-derives cleanly from the
      // next real query with the same evidence, so there's nothing irreplaceable to preserve.
    });
  }
}
