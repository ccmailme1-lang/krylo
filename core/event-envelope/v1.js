// WO-1700 — EventEnvelope v1 shape definition + type guard
// schemaVersion '1.0.0' is the canonical identifier for this shape.
// Never change meaning of existing fields — deprecate and add new ones.

export const SCHEMA_VERSION_V1 = '1.0.0';

export function isEnvelopeV1(x) {
  return (
    x !== null &&
    typeof x === 'object' &&
    x.schemaVersion === SCHEMA_VERSION_V1 &&
    typeof x.eventId === 'string' &&
    typeof x.commitEvent === 'object'
  );
}
