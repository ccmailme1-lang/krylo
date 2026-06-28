// System Enforcement Layer — SSOT Enforcement Spec v1.0
// Passive, observational enforcement. v1 does NOT block execution.
// All violations are logged to _driftLog and returned from validateSystemEvent.

// Canonical lifecycle order (system-process.md §3)
const TEMPORAL_ORDER = {
  session_open:        0,
  ingestion_start:     1,
  ingestion_complete:  2,
  projection_generated: 3,
  action_dispatched:   4,
  action_resolved:     5,
};

// Certain events require a specific immediate predecessor (prevents skip-step violations)
const REQUIRED_PREDECESSORS = {
  ingestion_complete: 'ingestion_start',
};

// Structural: session_open must originate from an approved mediator source
const APPROVED_SESSION_SOURCES = new Set(['krylo-submit', 'cone-search', 'arc-interaction', 'ingestion-builder', 'analysis-field']);

// Epistemic: resolution signals must declare a recognized truth source
const VALID_RESOLUTION_SOURCES = new Set(['user', 'ingestion', 'ttl']);

// ─────────────────────────────────────────────────────────────────────────────
// Internal state (module-level, append-only)
// ─────────────────────────────────────────────────────────────────────────────

const _driftLog            = new Map(); // sessionId → DriftEvent[]
const _lastEventBySession  = new Map(); // sessionId → { type, orderIndex }

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeDrift({ type, severity, source, description, affectedComponent }) {
  return { type, severity, source, description, affectedComponent, timestamp: Date.now() };
}

// ─────────────────────────────────────────────────────────────────────────────
// recordDriftEvent (spec §4.2)
// Appends to _driftLog. Called internally and available for external consumers.
// ─────────────────────────────────────────────────────────────────────────────

export function recordDriftEvent(sessionId, driftEvent) {
  if (!sessionId) return;
  if (!_driftLog.has(sessionId)) _driftLog.set(sessionId, []);
  _driftLog.get(sessionId).push(driftEvent);
}

// ─────────────────────────────────────────────────────────────────────────────
// validateSystemEvent (spec §4.1)
// Validates a single runtime event against all enforcement rules.
// Returns null if compliant, DriftEvent if violation detected.
// Side effect: appends DriftEvent to _driftLog on violation.
// ─────────────────────────────────────────────────────────────────────────────

export function validateSystemEvent(event) {
  if (!event || !event.type) return null;

  const { type, sessionId } = event;
  const orderIndex = TEMPORAL_ORDER[type];

  let drift = null;

  // ── Temporal enforcer (spec §3.2 / §6) ───────────────────────────────────
  if (orderIndex !== undefined && sessionId) {
    if (type === 'session_open') {
      // New session resets temporal tracking state for this sessionId
      _lastEventBySession.set(sessionId, { type, orderIndex });

    } else {
      const last = _lastEventBySession.get(sessionId);

      // Predecessor check: some events require a specific immediate predecessor
      const requiredPred = REQUIRED_PREDECESSORS[type];
      if (!drift && requiredPred && last?.type !== requiredPred) {
        drift = makeDrift({
          type:              'temporal',
          severity:          'medium',
          source:            'telemetry',
          description:       `'${type}' requires predecessor '${requiredPred}', but last event was '${last?.type ?? 'none'}'`,
          affectedComponent: 'ingestion-pipeline',
        });
      }

      // Ordering check: event index must advance.
      // action_resolved exempt — multi-source allowed (resolver emits one per signal).
      // action_dispatched exempt — one emitted per action in the projection (iterator pattern).
      if (!drift && last && type !== 'action_resolved' && type !== 'action_dispatched' && orderIndex <= last.orderIndex) {
        drift = makeDrift({
          type:              'temporal',
          severity:          'medium',
          source:            'telemetry',
          description:       `Out-of-order event: '${type}' (index ${orderIndex}) after '${last.type}' (index ${last.orderIndex})`,
          affectedComponent: 'lifecycle',
        });
      }

      // Advance tracker only if no temporal violation
      if (!drift) {
        _lastEventBySession.set(sessionId, { type, orderIndex });
      }
    }
  }

  // ── Structural enforcer (spec §3.1 / §5.1) ───────────────────────────────
  // session_open must originate from an approved mediator entry point
  if (!drift && type === 'session_open') {
    if (!APPROVED_SESSION_SOURCES.has(event.source)) {
      drift = makeDrift({
        type:              'structural',
        severity:          'high',
        source:            'ui',
        description:       `session_open from unapproved source: '${event.source}'. Must be one of: ${[...APPROVED_SESSION_SOURCES].join(', ')}`,
        affectedComponent: 'handleSessionBootstrap',
      });
    }
  }

  // ── Epistemic enforcer (spec §3.4 / §5.4) ────────────────────────────────
  if (!drift && type === 'action_resolved') {
    if (!VALID_RESOLUTION_SOURCES.has(event.source)) {
      drift = makeDrift({
        type:              'epistemic',
        severity:          'high',
        source:            'resolver',
        description:       `action_resolved has invalid source: '${event.source}'. Must be: user | ingestion | ttl`,
        affectedComponent: 'resolver',
      });
    } else if (
      typeof event.confidenceWeight !== 'number' ||
      event.confidenceWeight < 0 ||
      event.confidenceWeight > 1
    ) {
      drift = makeDrift({
        type:              'epistemic',
        severity:          'low',
        source:            'resolver',
        description:       `action_resolved has invalid confidenceWeight: ${event.confidenceWeight} (must be 0.0–1.0)`,
        affectedComponent: 'resolver',
      });
    }
  }

  // Record and return
  if (drift && sessionId) {
    recordDriftEvent(sessionId, drift);
  }

  return drift ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// getDriftLog (spec §4.3)
// Returns full violation history for a session. Read-only (sliced copy).
// ─────────────────────────────────────────────────────────────────────────────

export function getDriftLog(sessionId) {
  return (_driftLog.get(sessionId) ?? []).slice();
}

// getAllDriftEvents — cross-session violation history, ordered by timestamp.
export function getAllDriftEvents() {
  const all = [];
  for (const events of _driftLog.values()) all.push(...events);
  return all.sort((a, b) => a.timestamp - b.timestamp);
}
