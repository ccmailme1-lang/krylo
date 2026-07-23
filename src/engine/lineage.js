// WO-1700 — Lineage Reconstruction Engine: Storage Layer
// Append-only IndexedDB store for EventEnvelopes.
// buildEnvelope() freezes arbitration state at CommitEvent time.
// storeEnvelope() uses add() not put() — no mutation permitted.

import { sealAllOpen } from './convergencefingerprint.js';

const DB_NAME    = 'krylo_lineage';
const DB_VERSION = 1;
const STORE_NAME = 'envelopes';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available in this environment'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'eventId' });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

export async function storeEnvelope(envelope) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).add(envelope); // add — not put
    req.onsuccess = () => resolve(envelope.eventId);
    req.onerror   = e => reject(e.target.error);
  });
}

export async function loadEnvelope(eventId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(eventId);
    req.onsuccess = e => {
      if (!e.target.result) reject(new Error(`Envelope not found: ${eventId}`));
      else resolve(e.target.result);
    };
    req.onerror = e => reject(e.target.error);
  });
}

// Freezes arbitration state at CommitEvent time.
// Called immediately after CommitEvent is emitted — never deferred.
export function buildEnvelope(tensor, commitEvent) {
  const arb = tensor.arbitration;
  if (!arb) throw new Error('buildEnvelope: tensor.arbitration is missing');
  if (!arb.requestId) throw new Error('buildEnvelope: arbitration.requestId is missing');

  // KRYL-1097 — seal trigger + replay exposure. Commit is the completion event: freeze the
  // convergence trajectories observed during the session and attach them to the (immutable)
  // replay envelope as read-only metadata (FR-6). analysisId links each fingerprint to this
  // analysis. Seals only what the producer already recorded; adds no convergence computation.
  const convergenceFingerprints = sealAllOpen({ analysisId: arb.requestId });

  return Object.freeze({
    schemaVersion: '1.0.0',
    eventId:  arb.requestId,
    version:  arb.modelVersion,
    storedAt: new Date().toISOString(),
    commitEvent: Object.freeze({
      type:        commitEvent.type,
      requestId:   commitEvent.requestId,
      candidateId: commitEvent.candidateId,
      score:       commitEvent.score,
      nextBest:    commitEvent.nextBest,
      timestamp:   commitEvent.timestamp,
    }),
    recommendationPayloadSnapshot: Object.freeze({
      survivors:         Object.freeze(arb.survivors.map(s => Object.freeze({ ...s }))),
      featureVectorHash: arb.featureVectorHash,
      scoreVector:       Object.freeze([...arb.scoreVector]),
    }),
    context: Object.freeze({
      query:   tensor.seedQuery ?? '',
      lens:    tensor.lens      ?? '',
      domain:  tensor.domain    ?? '',
      horizon: tensor.horizon   ?? 'MED',
      floor:   tensor.floor     ?? 0,
      domains: Object.freeze([...(tensor.domains ?? [])]),
    }),
    // KRYL-1097 — read-only convergence provenance (already-frozen fingerprints)
    convergenceFingerprints: Object.freeze(convergenceFingerprints),
  });
}
