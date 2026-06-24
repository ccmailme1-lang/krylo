// WO-1854 — Structural Void Classifier
// Detects when expected signal classes fail to fire within a threshold window.
// ABSENT signals are first-class — not missing data, not low confidence.
// Dispatches via surfacerouter.dispatchBatch() — same contract as all signals.

import { surfaceRouter } from './surfacerouter.js';
import { POLARITY } from './signalconstants.js';

// Expected event class registry — one entry per domain × signal type.
// windowMs: how long silence must persist before ABSENT fires.
// lastSeen:  timestamp of last positive/negative signal in this class.
const EXPECTED_CLASSES = [
  { id: 'TECH_AI_ACTIVITY',       domain: 'TECHNOLOGY', label: 'AI/ML signal activity',        windowMs: 7  * 24 * 60 * 60 * 1000 },
  { id: 'TECH_SEMICO_ACTIVITY',   domain: 'TECHNOLOGY', label: 'Semiconductor signal activity', windowMs: 14 * 24 * 60 * 60 * 1000 },
  { id: 'CAPITAL_INSIDER',        domain: 'CAPITAL',     label: 'Insider transaction activity',  windowMs: 7  * 24 * 60 * 60 * 1000 },
  { id: 'CAPITAL_RATE_SIGNAL',    domain: 'CAPITAL',     label: 'Rate / macro signal activity',  windowMs: 30 * 24 * 60 * 60 * 1000 },
  { id: 'LABOR_HIRING_SIGNAL',    domain: 'LABOR',       label: 'Hiring / workforce signal',     windowMs: 14 * 24 * 60 * 60 * 1000 },
  { id: 'OWNERSHIP_PERMIT',       domain: 'OWNERSHIP',   label: 'Permit / zoning activity',      windowMs: 30 * 24 * 60 * 60 * 1000 },
  { id: 'MEDIA_COVERAGE_SHIFT',   domain: 'MEDIA',       label: 'Media coverage shift signal',   windowMs: 3  * 24 * 60 * 60 * 1000 },
  { id: 'KNOWLEDGE_RESEARCH',     domain: 'KNOWLEDGE',   label: 'Research / publication signal', windowMs: 14 * 24 * 60 * 60 * 1000 },
];

// In-memory last-seen map — keyed by expected class id.
const _lastSeen = new Map(EXPECTED_CLASSES.map(c => [c.id, null]));

// Call this whenever a signal arrives — updates the last-seen timestamp
// for the matching expected class.
export function markSeen(classId, ts = Date.now()) {
  if (_lastSeen.has(classId)) _lastSeen.set(classId, ts);
}

// Run the void check. Call periodically (e.g. hourly via daemon or on each
// surfacerouter reconcile cycle). Dispatches ABSENT signals for any class
// whose window has elapsed without a positive/negative signal.
export function runVoidCheck() {
  const now    = Date.now();
  const absent = [];

  for (const cls of EXPECTED_CLASSES) {
    const last = _lastSeen.get(cls.id);
    if (last === null) continue; // never seeded — skip until first signal arrives
    if ((now - last) < cls.windowMs) continue; // within window — no void

    absent.push({
      id:            `void_${cls.id}_${now}`,
      source:        'VOID_CLASSIFIER',
      domain:        cls.domain,
      signal:        `Expected ${cls.label} absent`,
      confidence:    55, // void signals carry moderate confidence
      ts:            now,
      polarity:      POLARITY.ABSENT,
      expectedClass: cls.id,
      windowMs:      cls.windowMs,
      silenceSince:  last,
    });
  }

  if (absent.length > 0) surfaceRouter.dispatchBatch(absent);
  return absent;
}

// Seed a class as active (first signal received). Until seeded,
// the class is not eligible for void detection — avoids false ABSENT
// signals on startup before any data has arrived.
export function seedClass(classId, ts = Date.now()) {
  markSeen(classId, ts);
}

export { EXPECTED_CLASSES };
