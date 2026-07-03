// KRYL-974 — EntityStateLedger MVP
// Append-only, observational record of an entity's signal/metric state at a point in time.
// Locked contract: specs/KRYL-974-entity-state-ledger.md
//
// SCI/RBCS/convergence remain current-state evaluators, unaware this module exists. This
// file only RECORDS values callers already computed elsewhere — it never derives, adjusts,
// or recomputes a signal or metric, and nothing in the existing pipeline calls it yet.
// Wiring a call site into the Phase 3 boundary (spec §4) is a separate, later decision.

const STORE_KEY = 'krylo_entity_state_ledger_v1';

function readLedger() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]'); }
  catch { return []; }
}

function writeLedger(entries) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(entries)); }
  catch { /* storage unavailable — MVP degrades to no-op, never throws */ }
}

// Append a new entry. Enforces append-only (no update/delete API exists) and flags
// out-of-order writes per spec §5 rather than silently reordering — the caller decides
// what to do with a flagged entry; this module never rejects or corrects it.
// signalSnapshot/metricSnapshot must already be computed by the caller — this function
// never derives either one.
export function recordEntityState({ entityId, signalSnapshot, metricSnapshot, sourceHash, eventTriggerId = null }) {
  if (!entityId) throw new Error('recordEntityState: entityId is required');

  const timestamp = new Date().toISOString();
  const entries   = readLedger();
  const priorForEntity = entries.filter(e => e.entity_id === entityId);
  const lastTs    = priorForEntity.length ? priorForEntity[priorForEntity.length - 1].timestamp : null;
  const outOfOrder = lastTs !== null && timestamp < lastTs;

  const entry = {
    entity_id:        entityId,
    timestamp,
    signal_snapshot:  signalSnapshot ?? null,
    metric_snapshot:  metricSnapshot ?? null,
    source_hash:      sourceHash ?? null,
    event_trigger_id: eventTriggerId,
  };

  entries.push(entry);
  writeLedger(entries);

  return { entry, outOfOrder };
}

// Read-only queries — the only consumer-facing surface besides recordEntityState.

export function getEntityHistory(entityId) {
  return readLedger().filter(e => e.entity_id === entityId);
}

// Last known state at or before the given timestamp (inclusive) — for before/after windows.
export function getEntityStateAt(entityId, timestamp) {
  const history = getEntityHistory(entityId).filter(e => e.timestamp <= timestamp);
  return history.length ? history[history.length - 1] : null;
}

// Test/dev utility only — not part of the locked contract. Clearing the ledger is not a
// normal operation and must never be called from application code.
export function _clearLedger() {
  writeLedger([]);
}
