// src/engine/metasignals.js — WO-1743: Meta-Signal Registry & Detection Contract
//
// SINGLE SOURCE OF TRUTH for all meta-signal trigger definitions.
// Persona protocols may only subscribe to signals defined here.
// Trigger logic must never be duplicated inside a protocol file.
//
// Adding a new meta-signal: add an entry to META_SIGNALS, bump version.
// Removing a meta-signal: check all protocol subscriptions first.

export const META_SIGNALS = {
  PLATFORM_FORMATION: {
    trigger: 'BUILDING_CONVERGENCE + TECHNOLOGY + CAPITAL (both > 55, rising ≥14 days)',
    output:  'PLATFORM_FORMATION',
    version: '1.0',
  },
  DISRUPTION_ALERT: {
    trigger: 'TURBULENT_CONVERGENCE + primary domain = TECHNOLOGY',
    output:  'DISRUPTION_ALERT',
    version: '1.0',
  },
  NARRATIVE_PERMISSION: {
    trigger: 'BUILDING_CONVERGENCE + MEDIA + KNOWLEDGE (simultaneously)',
    output:  'NARRATIVE_PERMISSION',
    version: '1.0',
  },
};

export const META_SIGNAL_KEYS = Object.keys(META_SIGNALS);

// validateProtocol(proto)
// Call this at protocol loader startup for every persona protocol.
// Throws PROTOCOL_CONTRACT_VIOLATION if the protocol attempts to define
// trigger logic or subscribes to an unregistered meta-signal.
export function validateProtocol(proto) {
  if (!proto || typeof proto !== 'object') {
    throw new Error('validateProtocol: proto must be a non-null object');
  }

  const name = proto.name ?? 'unknown';

  if ('trigger' in proto) {
    throw new Error(
      `PROTOCOL_CONTRACT_VIOLATION: "${name}" illegally defines a trigger. ` +
      `All trigger logic must live in src/engine/metasignals.js. ` +
      `Protocols may only declare { subscriptions: [META_SIGNAL_KEY, ...] }.`
    );
  }

  if (proto.subscriptions !== undefined) {
    if (!Array.isArray(proto.subscriptions)) {
      throw new Error(
        `PROTOCOL_CONTRACT_VIOLATION: "${name}" subscriptions must be an array.`
      );
    }
    const invalid = proto.subscriptions.filter(s => !META_SIGNAL_KEYS.includes(s));
    if (invalid.length > 0) {
      throw new Error(
        `PROTOCOL_CONTRACT_VIOLATION: "${name}" subscribes to unknown meta-signals: [${invalid.join(', ')}]. ` +
        `Valid signals: [${META_SIGNAL_KEYS.join(', ')}].`
      );
    }
  }
}
