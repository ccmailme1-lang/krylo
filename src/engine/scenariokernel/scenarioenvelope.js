// KRYL-1126 — Scenario Envelope: the sealed, immutable handoff between the Structural Integrity
// Layer (frozen v0.2, src/engine/structuralintegrity.js — READ-ONLY here, never modified, never
// imported for mutation) and the Analytical Plane. One-way: Integrity -> Analytical, no return path.
//
// AC-002/AC-003: this is the ONLY object the Analytical Plane may receive — never the raw scenario
// object, never a live reference into Integrity state. Object.freeze() enforces immutability;
// attempting to write a sealed field must throw in strict mode, never silently no-op.

let _seq = 0;

// beta: the frozen output of structuralintegrity.js's computeBeta() — passed in, never recomputed
// here. assumptionLedgerEntries: [{ field, value, origin, immutable: true }, ...] — already-recorded
// entries, this module does not create or mutate ledger entries, only seals a reference to them.
export function sealScenarioEnvelope({ scenarioId, intentClass, beta, assumptionLedgerEntries = [], exportGateState }) {
  _seq += 1;
  const id = scenarioId ?? `SCN-${String(_seq).padStart(5, '0')}`;

  if (!Object.isFrozen(beta)) {
    // structuralintegrity.js's computeBeta() already returns Object.freeze()'d output — if it
    // isn't frozen, something upstream bypassed the real Integrity Plane. Refuse to seal.
    throw new Error('sealScenarioEnvelope: beta must be the frozen output of computeBeta() — refusing to seal an unverified integrity state');
  }

  const ledgerHash = hashLedger(assumptionLedgerEntries);

  const envelope = {
    scenario_id: id,
    integrity_status: 'SEALED',
    intent_class: intentClass ?? 'PROJECTION',
    provenance_state: beta.sci == null && beta.isi == null && beta.rcc == null ? 'STRUCTURAL_ABSENCE' : 'OBSERVED',
    export_gate: exportGateState ?? 'LOCKED',
    beta: Object.freeze({ ...beta }), // frozen copy — Analytical Plane reads, never mutates
    ledger_hash: ledgerHash,
    assumption_count: assumptionLedgerEntries.length,
    sealed_at: new Date().toISOString(),
  };

  return Object.freeze(envelope);
}

// Deterministic, content-based — same ledger entries always produce the same hash (replay
// determinism, AC-005). Not cryptographic; canonical-order string hash is sufficient here since
// this is an equality check, not a security boundary.
function hashLedger(entries) {
  const canonical = entries
    .map(e => `${e.field}:${e.value}:${e.origin}`)
    .sort()
    .join('|');
  let hash = 0;
  for (let i = 0; i < canonical.length; i++) {
    hash = (hash * 31 + canonical.charCodeAt(i)) >>> 0;
  }
  return `envelope_${hash.toString(16)}`;
}

export function isSealed(envelope) {
  return Object.isFrozen(envelope) && envelope?.integrity_status === 'SEALED';
}
