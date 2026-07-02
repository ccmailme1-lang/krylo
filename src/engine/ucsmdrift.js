// WO-2073 — User Constraint Drift System
// Temporal layer over WO-2072 (ucsm.js). Tracks how each UCSM profile field was set
// (explicit vs. inferred) and when, decays confidence for stale INFERRED fields, and
// excludes fully-decayed fields entirely rather than defaulting them to a fabricated
// value. Never touches ucsm.js or availabilityfilter.js's evaluation logic — this only
// decides which raw profile fields are still trustworthy enough to hand to
// buildConstraintModel().

import { buildConstraintModel } from './ucsm.js';

const MAX_SESSIONS = 50; // prune cap — prevents unbounded growth, matches rfereconciler.js

// How long an INFERRED field stays fully trusted before its confidence starts decaying.
// EXPLICIT fields never decay — a user telling you something doesn't go stale on a timer.
const INFERRED_STALE_AFTER_MS = {
  maxCapital:          14 * 24 * 60 * 60 * 1000, // 14d — capital position changes slowly
  credentials:         365 * 24 * 60 * 60 * 1000, // 1y — licenses/accreditations don't drift fast
  jurisdictions:        90 * 24 * 60 * 60 * 1000, // 90d
  availableDays:         7 * 24 * 60 * 60 * 1000, // 7d — time windows move fast
  executionCapability:  14 * 24 * 60 * 60 * 1000, // 14d
  riskTolerance:        30 * 24 * 60 * 60 * 1000, // 30d
  informationalAccess:  30 * 24 * 60 * 60 * 1000, // 30d
};
const DEFAULT_STALE_MS = 14 * 24 * 60 * 60 * 1000;

// sessionId → { [field]: { value, source: 'EXPLICIT' | 'INFERRED', setAt } }
const _sessions = new Map();

function prune() {
  if (_sessions.size > MAX_SESSIONS) {
    const oldest = _sessions.keys().next().value;
    _sessions.delete(oldest);
  }
}

function confidenceOf(entry, now) {
  if (entry.source === 'EXPLICIT') return 1;
  const staleAfter = INFERRED_STALE_AFTER_MS[entry.field] ?? DEFAULT_STALE_MS;
  const age = now - entry.setAt;
  return Math.max(0, 1 - age / staleAfter);
}

// Explicit user update — the user directly stated this. Always overwrites, never decays.
export function setExplicit(sessionId, field, value) {
  if (!_sessions.has(sessionId)) _sessions.set(sessionId, {});
  _sessions.get(sessionId)[field] = { field, value, source: 'EXPLICIT', setAt: Date.now() };
  prune();
}

// Passive inference signal. Explicit always wins — inference never overwrites an
// explicit value; it only ever fills gaps or refreshes a prior inferred value.
export function setInferred(sessionId, field, value) {
  if (!_sessions.has(sessionId)) _sessions.set(sessionId, {});
  const existing = _sessions.get(sessionId)[field];
  if (existing?.source === 'EXPLICIT') return; // explicit is authoritative — inference does not override
  _sessions.get(sessionId)[field] = { field, value, source: 'INFERRED', setAt: Date.now() };
  prune();
}

// Resolves the session's live drift state into a profile object shaped for
// buildConstraintModel(). Fully-decayed fields (confidence <= 0) are OMITTED, not
// zeroed — a stale assumption returns to "unconstrained" (matches WO-2072/WO-2068's
// existing contract: no declared constraint = unconditional pass), never a fabricated bound.
export function getDriftedProfile(sessionId) {
  const fields = _sessions.get(sessionId);
  if (!fields) return {};
  const now = Date.now();
  const profile = {};
  for (const entry of Object.values(fields)) {
    if (confidenceOf(entry, now) > 0) profile[entry.field] = entry.value;
  }
  return profile;
}

// Convenience: drift-resolved profile straight into a constraintModel, for callers
// that don't need the intermediate profile shape.
export function getDriftedConstraintModel(sessionId) {
  return buildConstraintModel(getDriftedProfile(sessionId));
}

// Per-field confidence, for callers/UI that want to show "how fresh is this constraint"
// rather than a binary include/exclude. Returns null if the field was never set.
export function getFieldConfidence(sessionId, field) {
  const entry = _sessions.get(sessionId)?.[field];
  if (!entry) return null;
  return confidenceOf(entry, Date.now());
}

// Test/session-reset utility — mirrors the pattern other session stores expose.
export function clearSession(sessionId) {
  _sessions.delete(sessionId);
}
