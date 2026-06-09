// WO-1700 — Replay Engine
// Pure function: replay(envelope) → UISnapshot
// INVARIANT: never invokes LEV-02, never reads external state, no network, no time dependency.
// INVARIANT: candidateId must exist in survivors (OAI constraint).

import { replay as dispatchReplay } from '../../core/event-envelope/index.js';

export const CORRUPTION_CODES = Object.freeze({
  MISSING_SCHEMA_VERSION:    'MISSING_SCHEMA_VERSION',
  MISSING_EVENT_ID:          'MISSING_EVENT_ID',
  MISSING_COMMIT_EVENT:      'MISSING_COMMIT_EVENT',
  MISSING_SURVIVORS:         'MISSING_SURVIVORS',
  CANDIDATE_NOT_IN_SURVIVORS:'CANDIDATE_NOT_IN_SURVIVORS',
});

export class ReplayCorruption extends Error {
  constructor(code, detail) {
    super(`REPLAY_CORRUPTION [${code}]: ${detail}`);
    this.name = 'ReplayCorruption';
    this.code = code;
  }
}

export function validateReplay(envelope) {
  if (!envelope?.schemaVersion) {
    throw new ReplayCorruption(
      CORRUPTION_CODES.MISSING_SCHEMA_VERSION,
      'envelope.schemaVersion is absent'
    );
  }
  if (!envelope?.eventId) {
    throw new ReplayCorruption(
      CORRUPTION_CODES.MISSING_EVENT_ID,
      'envelope.eventId is absent'
    );
  }
  if (!envelope?.commitEvent || typeof envelope.commitEvent !== 'object') {
    throw new ReplayCorruption(
      CORRUPTION_CODES.MISSING_COMMIT_EVENT,
      'envelope.commitEvent is absent or not an object'
    );
  }
  const survivors = envelope?.recommendationPayloadSnapshot?.survivors;
  if (!Array.isArray(survivors) || survivors.length === 0) {
    throw new ReplayCorruption(
      CORRUPTION_CODES.MISSING_SURVIVORS,
      'recommendationPayloadSnapshot.survivors is empty or absent'
    );
  }
  const { candidateId } = envelope.commitEvent;
  const inSurvivors = survivors.some(s => s.id === candidateId);
  if (!inSurvivors) {
    throw new ReplayCorruption(
      CORRUPTION_CODES.CANDIDATE_NOT_IN_SURVIVORS,
      `candidateId "${candidateId}" not found in survivors — OAI violation`
    );
  }
}

export function replay(envelope) {
  validateReplay(envelope);
  return dispatchReplay(envelope);
}
