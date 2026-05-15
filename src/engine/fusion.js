// WO-1000 — Fusion Engine
// Normalizes disparate signal inputs into the Canonical Signal Unit (CSU).
// Data contract: SU_Packet { id, origin, vector, raw_mass }

/**
 * FusionEngine
 *
 * Accepts a raw SU_Packet and returns a normalized Canonical Signal Unit (CSU).
 *
 * @param {Object} rawInput — SU_Packet { id?, origin, vector, raw_mass, domain, payload? }
 * @returns {Object}        — CSU { id, origin, vector, mass, domain, metadata }
 */
export function FusionEngine(rawInput) {
  return {
    id:       `CSU-${Math.random().toString(36).substr(2, 9)}`,
    origin:   rawInput.origin   ?? 'unknown',
    vector:   rawInput.vector   ?? [0, 0, 0],
    mass:     rawInput.raw_mass ?? rawInput.weight ?? 0.1,
    domain:   rawInput.domain   ?? 'general',
    metadata: rawInput.payload  ?? {},
  };
}
