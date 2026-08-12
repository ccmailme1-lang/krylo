// Telemetry Injection Point Spec v1.0
// Single emitter for all system boundary events.
// UI layer must never call emitTelemetry for session/ingestion/oracle events.
// WO-1367: localStorage persistence — survives page reload, capped at 1000 events.

import { validateSystemEvent } from './driftmonitor.js';

const STORAGE_KEY = 'krylo_telemetry_log';
const MAX_EVENTS  = 1000;

function loadPersistedLog() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistLog(log) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    // Storage quota exceeded — trim oldest half and retry
    const trimmed = log.slice(Math.floor(log.length / 2));
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)); } catch { /* silent */ }
  }
}

const _log = loadPersistedLog();

// Centralized mirror — batched, fire-and-forget. localStorage stays the source
// of truth for this browser; the server copy is what lets tester activity be
// analyzed after the fact instead of being stuck on one device.
const SEND_INTERVAL_MS = 5_000;
let _pending = [];
let _flushTimer = null;

function scheduleFlush() {
  if (_flushTimer) return;
  _flushTimer = setTimeout(flushPending, SEND_INTERVAL_MS);
}

function flushPending() {
  _flushTimer = null;
  if (_pending.length === 0) return;
  const batch = _pending;
  _pending = [];
  fetch('/api/tester-telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: batch }),
  }).catch(() => {
    // Offline or API down — this batch stays local-only (already in localStorage above).
  });
}

export function emitTelemetry(event) {
  const stamped = { ...event, _emittedAt: Date.now() };
  _log.push(stamped);
  if (_log.length > MAX_EVENTS) _log.splice(0, _log.length - MAX_EVENTS);
  persistLog(_log);
  validateSystemEvent(stamped);
  _pending.push(stamped);
  scheduleFlush();
  if (typeof window !== 'undefined' && window.__KRYLO_TELEMETRY_DEBUG__) {
    console.debug('[telemetry]', stamped);
  }
}

export function clearTelemetryLog() {
  _log.splice(0, _log.length);
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* silent */ }
}

// Read-only access to the event log — for resolver and reconciliation engine.
export function getTelemetryLog() {
  return _log.slice();
}

// Query by sessionId — enables dispatched→resolved pairing.
export function getSessionEvents(sessionId) {
  return _log.filter(e => e.sessionId === sessionId);
}

// DOMAIN_PROVENANCE_EVENT — additive event type, same transport, same storage, same
// validation path as every other emitTelemetry() call. Observation only: does not touch
// aggregation, scoring, or rendering. Purpose: answer "which of the six domains lost data,
// at which connector boundary, and why" without needing DevTools access to the reporter's
// actual browser.
//
// Shape: { type: 'DOMAIN_PROVENANCE_EVENT', traceId, sessionId, stage, domain, connector,
//          status, inputCount, outputCount, score, reason, timestamp }
//   stage: 'dispatch' | 'resolve' | 'fail'
//   status (resolve/fail only): 'success' | 'error' | 'timeout'
let _traceCounter = 0;
export function nextTraceId() {
  _traceCounter += 1;
  return `trace-${Date.now()}-${_traceCounter}`;
}

export function emitDomainProvenance(fields) {
  emitTelemetry({ type: 'DOMAIN_PROVENANCE_EVENT', ...fields });
}

// Read-only — every DOMAIN_PROVENANCE_EVENT currently in the log, newest first.
export function getDomainProvenanceLog() {
  return _log.filter(e => e.type === 'DOMAIN_PROVENANCE_EVENT').slice().reverse();
}

// CHIP_INTERACTION_EVENT — additive event type, same transport/storage/validation as every
// other emitTelemetry() call. specs/SPEC-cice-phase2-behavioral-presentation-layer.md Phase 2
// step 1 (event capture) ONLY — this file does no aggregation, no ranking, no learning. It just
// records what happened so a future phase has real data to work from instead of none.
//
// Shape: { type: 'CHIP_INTERACTION_EVENT', action, query, domains, chips?, chipLabel?, source?,
//          timestamp }
//   action: 'render' (chips shown) | 'click' (chip selected)
//   source (per chip, where known): 'entity' | 'literal' | 'rewrite' | 'unknown'
export function emitChipInteraction(fields) {
  emitTelemetry({ type: 'CHIP_INTERACTION_EVENT', ...fields });
}

// Read-only — every CHIP_INTERACTION_EVENT currently in the log, newest first.
export function getChipInteractionLog() {
  return _log.filter(e => e.type === 'CHIP_INTERACTION_EVENT').slice().reverse();
}
