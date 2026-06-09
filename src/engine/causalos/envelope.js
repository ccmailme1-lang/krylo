// WO-1336 — Universal Event Envelope
// Immutable after creation. All subsystems communicate through this contract.
// provenance_hash computed from substrate_time + causality_epoch + payload.

let _seq = 0n;

function hashPayload(substrate_time, causality_epoch, payload) {
  // BigInt-safe serializer — JSON.stringify throws on BigInt values
  const safe = JSON.stringify(payload, (_, v) => typeof v === 'bigint' ? v.toString() : v);
  const str = `${substrate_time}|${causality_epoch}|${safe}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function createEnvelope({
  event_type,
  subsystem,
  node_id,
  version,
  payload,
  substrate_time,
  causality_epoch,
  replay_context = 'LIVE',
  emergence_time = undefined,
}) {
  if (typeof substrate_time !== 'bigint') {
    throw new Error('substrate_time must be BigInt — wall-clock substitution forbidden');
  }

  const event_id = `${event_type}:${(++_seq).toString(16).padStart(8,'0')}`;
  const provenance_hash = hashPayload(substrate_time, causality_epoch, payload);

  const envelope = Object.freeze({
    event_id,
    event_type,
    substrate_time,
    ingestion_time: BigInt(Date.now()),
    emergence_time: emergence_time != null ? BigInt(emergence_time) : undefined,
    causality_epoch,
    replay_context,
    source: Object.freeze({ subsystem, node_id, version }),
    payload: Object.freeze({ ...payload }),
    provenance_hash,
  });

  return envelope;
}

export function validateEnvelope(env) {
  if (!env || typeof env !== 'object') return { valid: false, reason: 'null_envelope' };
  if (typeof env.substrate_time !== 'bigint') return { valid: false, reason: 'substrate_time_not_bigint' };
  if (!env.event_id || !env.event_type) return { valid: false, reason: 'missing_identity' };
  if (!env.provenance_hash) return { valid: false, reason: 'missing_provenance_hash' };
  if (env.replay_context !== 'LIVE' && env.replay_context !== 'REPLAY') {
    return { valid: false, reason: 'invalid_replay_context' };
  }
  return { valid: true };
}
