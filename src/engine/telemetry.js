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

export function emitTelemetry(event) {
  const stamped = { ...event, _emittedAt: Date.now() };
  _log.push(stamped);
  if (_log.length > MAX_EVENTS) _log.splice(0, _log.length - MAX_EVENTS);
  persistLog(_log);
  validateSystemEvent(stamped);
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
