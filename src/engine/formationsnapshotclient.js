// formationsnapshotclient.js — KRYL-1334, the client-side half of the automatic trigger.
// Fire-and-forget, same pattern as telemetry.js's flushPending(): a failed POST never blocks
// the guest's query, and this never re-derives the material-change decision client-side (that
// requires the last persisted state, which only the server has -- see as-diff/engine.js's
// handleFormationStateWrite).

import { buildCandidateRows, buildCanonicalCandidateRows } from './formationsnapshot.js';

// Mirrors as-diff/engine.js's FORMATION_BATCH_MAX (= secownershipconnector.js's MAX_HITS).
const BATCH_MAX = 100;

/**
 * captureCanonicalFormationSnapshots — KRYL-1350 (route B). Called when canonical ρ has just been
 * admitted for a resolved entity subject: ONE batch POST (chunked only past the server ceiling)
 * carrying a candidate per admitted relationship. The server stamps captured_at and decides what
 * is a material change -- this never decides that client-side. Never rejects: a failed capture
 * must not block the guest. Resolves once the writes have landed, so a caller can signal readers.
 * @param {string} subject — the entity's canonicalId
 * @param {object[]} relationships — admitted ρ touching it (findAdmittedRelationshipsFor)
 * @param {(id: string) => object|null} evidenceOf — latestEvidenceFor
 */
export async function captureCanonicalFormationSnapshots(subject, relationships, evidenceOf) {
  const candidates = buildCanonicalCandidateRows(subject, relationships, evidenceOf);
  const posts = [];
  for (let i = 0; i < candidates.length; i += BATCH_MAX) {
    posts.push(
      fetch('/v1/formation-state/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates: candidates.slice(i, i + BATCH_MAX) }),
      }).catch(() => { /* offline or API down -- this capture is simply skipped this time */ })
    );
  }
  await Promise.all(posts);
}

/**
 * fetchSubjectFormationHistory — KRYL-1350 read side: every persisted snapshot for one resolved
 * subject (all its canonical formations), oldest first, in ONE request. Empty on any failure.
 */
export async function fetchSubjectFormationHistory(subject) {
  if (!subject) return [];
  try {
    const r = await fetch(`/v1/formation-state?subject=${encodeURIComponent(subject)}&_=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return [];
    return (await r.json()).rows ?? [];
  } catch { return []; }
}

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
