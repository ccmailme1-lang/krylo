// src/engine/platformformation.js — WO-1741: Platform Formation Signal
//
// CLASS: META-SIGNAL / DETECTION
// Canonical emitter of the PLATFORM_FORMATION meta-signal.
// This module IS the trigger implementor — trigger logic belongs here,
// not in any persona protocol (WO-1743 contract).
//
// Trigger:  TECHNOLOGY + CAPITAL both above score 55 in BUILDING CONVERGENCE state
// Velocity: both domains must have been above threshold for ≥14 days (prevents
//           single-day spike false positives — velocity qualifier v2)
// Output:   PLATFORM_FORMATION — consumed by WO-1735 (conviction arc) and
//           persona protocols: Nadella / Vishria / Jassy / Leone / Mignot
//
// Two output phases:
//   FORMATION_DETECTED  — gate open, velocity not yet qualified (early signal)
//   FORMATION_CONFIRMED — gate open + ≥14 days sustained (conviction-grade signal)

import { META_SIGNALS } from './metasignals.js';

const FORMATION_THRESHOLD = 55;     // signal score required per domain
const VELOCITY_DAYS       = 14;     // sustained days required for confirmation
const VELOCITY_MS         = VELOCITY_DAYS * 24 * 60 * 60 * 1000;

// Domains that must both be above threshold
const FORMATION_DOMAINS = ['TECHNOLOGY', 'CAPITAL'];

export const PLATFORM_FORMATION_PHASE = {
  NONE:      'NONE',
  DETECTED:  'FORMATION_DETECTED',   // Phase A only
  CONFIRMED: 'FORMATION_CONFIRMED',  // Phase A + velocity ≥14 days
};

// Timestamp tracking: domain → ms when it first crossed FORMATION_THRESHOLD
// Cleared when domain drops below threshold.
const _firstAboveAt = new Map();

function _updateVelocityTracker(domain, signal, now) {
  if (signal > FORMATION_THRESHOLD) {
    if (!_firstAboveAt.has(domain)) _firstAboveAt.set(domain, now);
  } else {
    _firstAboveAt.delete(domain);
  }
}

function _daysAbove(domain, now) {
  if (!_firstAboveAt.has(domain)) return 0;
  return (now - _firstAboveAt.get(domain)) / (24 * 60 * 60 * 1000);
}

// detectPlatformFormation(signals)
//
// signals: [{ domain, signal, confidence, ... }]
//   domain:  string  — TECHNOLOGY / CAPITAL / KNOWLEDGE / LABOR / MEDIA / OWNERSHIP
//   signal:  number  — pressure score 0–100
//
// Returns:
// {
//   phase:              PLATFORM_FORMATION_PHASE
//   triggered:          boolean
//   domains:            string[]   — qualifying domains
//   technologyScore:    number
//   capitalScore:       number
//   velocityQualified:  boolean
//   daysAbove:          { TECHNOLOGY: number, CAPITAL: number }
//   metaSignal:         META_SIGNALS.PLATFORM_FORMATION (provenance reference)
//   ts:                 number
// }
export function detectPlatformFormation(signals) {
  if (!Array.isArray(signals) || signals.length === 0) {
    return { phase: PLATFORM_FORMATION_PHASE.NONE, triggered: false };
  }

  const now = Date.now();

  // Extract scores for the two formation domains
  const techSig  = signals.find(s => s.domain === 'TECHNOLOGY');
  const capSig   = signals.find(s => s.domain === 'CAPITAL');

  const techScore = techSig?.signal ?? 0;
  const capScore  = capSig?.signal  ?? 0;

  // Update velocity trackers
  _updateVelocityTracker('TECHNOLOGY', techScore, now);
  _updateVelocityTracker('CAPITAL',    capScore,  now);

  // Phase A gate — both domains above threshold
  const gateOpen = techScore > FORMATION_THRESHOLD && capScore > FORMATION_THRESHOLD;

  if (!gateOpen) {
    return {
      phase:             PLATFORM_FORMATION_PHASE.NONE,
      triggered:         false,
      technologyScore:   techScore,
      capitalScore:      capScore,
      velocityQualified: false,
      daysAbove:         {
        TECHNOLOGY: _daysAbove('TECHNOLOGY', now),
        CAPITAL:    _daysAbove('CAPITAL', now),
      },
      metaSignal: META_SIGNALS.PLATFORM_FORMATION,
      ts: now,
    };
  }

  // Phase B velocity qualifier — both domains sustained ≥14 days
  const techDays = _daysAbove('TECHNOLOGY', now);
  const capDays  = _daysAbove('CAPITAL', now);
  const velocityQualified = techDays >= VELOCITY_DAYS && capDays >= VELOCITY_DAYS;

  const phase = velocityQualified
    ? PLATFORM_FORMATION_PHASE.CONFIRMED
    : PLATFORM_FORMATION_PHASE.DETECTED;

  return {
    phase,
    triggered:         true,
    domains:           FORMATION_DOMAINS,
    technologyScore:   techScore,
    capitalScore:      capScore,
    velocityQualified,
    daysAbove:         { TECHNOLOGY: techDays, CAPITAL: capDays },
    metaSignal:        META_SIGNALS.PLATFORM_FORMATION,
    ts:                now,
  };
}

// resetPlatformFormationHistory() — call on session reset or query change
export function resetPlatformFormationHistory() {
  _firstAboveAt.clear();
}
