// WO-1700 — Projector dispatch table
// schemaVersion selects the decoder — never interpretation logic.
// Replay contract: EnvelopeVx → Snapshot only. Never EnvelopeVx → EnvelopeVy → Snapshot.
// Add new projector imports here when schemaVersion increments.

import { isEnvelopeV1 } from './v1.js';
import { replayV1 }     from './projectors/v1projector.js';

export function replay(envelope) {
  if (isEnvelopeV1(envelope)) return replayV1(envelope);
  throw new Error(
    `[WO-1700] Unknown envelope schemaVersion: "${envelope?.schemaVersion ?? 'undefined'}"`
  );
}

export { isEnvelopeV1, SCHEMA_VERSION_V1 } from './v1.js';
