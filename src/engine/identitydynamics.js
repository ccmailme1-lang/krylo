// WO-2008 — Identity Formation Dynamics
// Pure temporal analysis over the lineage event stream.
// Answers: not what the system believes, but HOW FAST and IN WHAT DIRECTION it is forming belief.
//
// Three field-level computations:
//   fractureDensity  — ratio of FRAGMENTED to total events; system-wide destabilization signal
//   mergePressure    — ratio of MERGED to total events; over-consolidation tendency
//
// Two per-identity computations:
//   stabilityVelocity — Δstability / Δt; direction: FORMING | STABLE | FRACTURING
//   truthLifecycle    — phase: NASCENT | FORMING | CONSOLIDATING | FRACTURING | RESOLVED
//
// Suite entry point:
//   computeTruthDynamics(identityId, windowMs) — all four, convergence-ready
//
// Convergence point (read-only — no scoring):
//   SCI (structuralconfirmation.js) = present truth density
//   SPS (pathstore.js)              = historical structural causality prior
//   velocity + lifecycle (here)     = rate and direction of current truth formation
//
// OBSERVATION BOUNDARY: never import this file from scoring modules.
// See identitylineage.js §OBSERVATION BOUNDARY.

import { getHistory } from './identitylineage.js';

const DEFAULT_WINDOW_MS  = 30 * 24 * 60 * 60 * 1000; // 30 days
const RESOLVED_SILENCE_MS =  7 * 24 * 60 * 60 * 1000; // 7 days of no events

// Velocity thresholds: below ABS_THRESHOLD the identity is considered stable.
const VELOCITY_FORMING_THRESHOLD    =  0.02;
const VELOCITY_FRACTURING_THRESHOLD = -0.02;

// ── Stability Velocity ────────────────────────────────────────────────────────
// Per-identity rate of stability change over a rolling window.
// velocity > 0.02  → FORMING    (structural evidence accumulating, truth consolidating)
// velocity < -0.02 → FRACTURING (fragmentation pressure, identity under stress)
// in between       → STABLE     (no significant drift)

export function computeStabilityVelocity(identityId, windowMs = DEFAULT_WINDOW_MS) {
  const now    = Date.now();
  const cutoff = now - windowMs;

  const events = getHistory(identityId)
    .filter(e => e.ts >= cutoff)
    .sort((a, b) => a.ts - b.ts);

  if (events.length < 2) return null;

  // Pairwise Δstability / Δt, normalized to per-window-unit to keep values comparable
  // across different window sizes.
  const deltas = [];
  for (let i = 1; i < events.length; i++) {
    const dt = events[i].ts - events[i - 1].ts;
    if (dt === 0) continue;
    const ds = events[i].stabilityAfter - events[i - 1].stabilityAfter;
    deltas.push(ds / (dt / windowMs));
  }

  if (deltas.length === 0) return null;

  const velocity  = parseFloat((deltas.reduce((s, d) => s + d, 0) / deltas.length).toFixed(4));
  const direction = velocity > VELOCITY_FORMING_THRESHOLD
    ? 'FORMING'
    : velocity < VELOCITY_FRACTURING_THRESHOLD
      ? 'FRACTURING'
      : 'STABLE';

  return {
    identityId,
    velocity,
    direction,
    eventCount: events.length,
    windowMs,
    spanMs:     events[events.length - 1].ts - events[0].ts,
  };
}

// ── Fracture Density ─────────────────────────────────────────────────────────
// System-wide: ratio of FRAGMENTED events to total in window.
// High density = multiple identities destabilizing concurrently.
// Do not conflate with per-identity FRACTURING velocity — these are different planes.

export function computeFractureDensity(windowMs = DEFAULT_WINDOW_MS) {
  const now    = Date.now();
  const cutoff = now - windowMs;
  const all    = getHistory().filter(e => e.ts >= cutoff);

  if (all.length === 0) return { density: 0, count: 0, total: 0, windowMs };

  const count   = all.filter(e => e.type === 'FRAGMENTED').length;
  const density = parseFloat((count / all.length).toFixed(3));

  return { density, count, total: all.length, windowMs };
}

// ── Merge Pressure ───────────────────────────────────────────────────────────
// System-wide: ratio of MERGED events to total in window.
// High pressure = over-consolidation tendency. Consult before trusting SCI on
// high-merge periods — merges expand covered types, which inflates SCI unless the
// merged graphs were genuinely independent.

export function computeMergePressure(windowMs = DEFAULT_WINDOW_MS) {
  const now    = Date.now();
  const cutoff = now - windowMs;
  const all    = getHistory().filter(e => e.ts >= cutoff);

  if (all.length === 0) return { pressure: 0, count: 0, total: 0, windowMs };

  const count    = all.filter(e => e.type === 'MERGED').length;
  const pressure = parseFloat((count / all.length).toFixed(3));

  return { pressure, count, total: all.length, windowMs };
}

// ── Truth Lifecycle ──────────────────────────────────────────────────────────
// Phase classification for a single CanonicalEvent based on its event sequence.
//
// NASCENT       — CREATED only; no reinforcement yet (no NODE_ADDED, no FRAGMENTED)
// FORMING       — NODE_ADDED events present; stability hasn't reached consolidation threshold
// CONSOLIDATING — stability ≥ 0.70, recent events still arriving (active reinforcement)
// FRACTURING    — FRAGMENTED event present OR most recent velocity is negative
// RESOLVED      — stability ≥ 0.70 AND no events for ≥ RESOLVED_SILENCE_MS (quiescent)
//
// Note: FRACTURING takes precedence over all other phases. A fragmented identity
// cannot be RESOLVED — it must be investigated or allowed to decay.

export function describeTruthLifecycle(identityId) {
  const events = getHistory(identityId).sort((a, b) => a.ts - b.ts);
  if (events.length === 0) return null;

  const created          = events.find(e => e.type === 'CREATED');
  const lastEvent        = events[events.length - 1];
  const latestStability  = lastEvent.stabilityAfter;
  const hasFrag          = events.some(e => e.type === 'FRAGMENTED');
  const hasAdded         = events.some(e => e.type === 'NODE_ADDED');
  const silentMs         = Date.now() - lastEvent.ts;

  let phase;
  if (hasFrag) {
    phase = 'FRACTURING';
  } else if (latestStability >= 0.70 && silentMs >= RESOLVED_SILENCE_MS) {
    phase = 'RESOLVED';
  } else if (latestStability >= 0.70) {
    phase = 'CONSOLIDATING';
  } else if (hasAdded) {
    phase = 'FORMING';
  } else {
    phase = 'NASCENT';
  }

  return {
    identityId,
    phase,
    latestStability,
    eventCount:  events.length,
    bornAt:      created?.ts ?? events[0].ts,
    lastEventAt: lastEvent.ts,
    silentMs,
  };
}

// ── Truth Dynamics Suite ──────────────────────────────────────────────────────
// Single call for consumers that need the full picture on one identity.
// Field-level signals (fractureDensity, mergePressure) provide context for
// whether a single identity's velocity should be trusted — a high fracture-density
// field means many identities are under stress, not just this one.

export function computeTruthDynamics(identityId, windowMs = DEFAULT_WINDOW_MS) {
  return {
    velocity:  computeStabilityVelocity(identityId, windowMs),
    lifecycle: describeTruthLifecycle(identityId),
    field: {
      fractureDensity: computeFractureDensity(windowMs),
      mergePressure:   computeMergePressure(windowMs),
    },
  };
}
