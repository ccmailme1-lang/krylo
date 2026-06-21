// WO-1065 — Frame Tick Compliance Validator
// Validates timing and sequence ordering of frame ticks.
// INVARIANT: ticks must be monotonically increasing; late ticks are flagged, not dropped.

const MAX_TICK_INTERVAL_MS = 500;
const JITTER_THRESHOLD_MS  = 50;
const LATE_THRESHOLD_MS    = 100;

export const TickViolation = Object.freeze({
  CLOCK_REGRESSION:    'CLOCK_REGRESSION',
  SEQUENCE_GAP:        'SEQUENCE_GAP',
  TICK_LATE:           'TICK_LATE',
  INTERVAL_EXCEEDED:   'INTERVAL_EXCEEDED',
  JITTER_EXCEEDED:     'JITTER_EXCEEDED',
});

export class FrameTickValidator {
  constructor() {
    this._lastTick      = null;
    this._lastSeq       = null;
    this._intervalSum   = 0;
    this._intervalCount = 0;
    this._violations    = [];
  }

  // Validate a single tick.
  // tick: { seq, ts, expectedTs? }
  // Returns: { compliant, violations: [] }
  validate(tick) {
    if (!tick || typeof tick.seq !== 'number' || typeof tick.ts !== 'number') {
      return { compliant: false, violations: [{ code: 'MISSING_TICK_FIELDS', ts: Date.now() }] };
    }

    const violations = [];
    const now = Date.now();

    // Clock regression
    if (this._lastTick !== null && tick.ts < this._lastTick.ts) {
      violations.push({ code: TickViolation.CLOCK_REGRESSION, detail: `tick.ts ${tick.ts} < last ${this._lastTick.ts}` });
    }

    // Sequence gap
    if (this._lastSeq !== null && tick.seq !== this._lastSeq + 1) {
      violations.push({ code: TickViolation.SEQUENCE_GAP, detail: `expected ${this._lastSeq + 1}, got ${tick.seq}` });
    }

    // Interval exceeded
    if (this._lastTick !== null) {
      const interval = tick.ts - this._lastTick.ts;
      if (interval > MAX_TICK_INTERVAL_MS) {
        violations.push({ code: TickViolation.INTERVAL_EXCEEDED, detail: `interval ${interval}ms > max ${MAX_TICK_INTERVAL_MS}ms` });
      }

      // Jitter — deviation from running mean
      this._intervalSum   += interval;
      this._intervalCount += 1;
      const mean  = this._intervalSum / this._intervalCount;
      const jitter = Math.abs(interval - mean);
      if (this._intervalCount > 2 && jitter > JITTER_THRESHOLD_MS) {
        violations.push({ code: TickViolation.JITTER_EXCEEDED, detail: `jitter ${jitter.toFixed(1)}ms > threshold ${JITTER_THRESHOLD_MS}ms` });
      }
    }

    // Late tick relative to expected
    if (tick.expectedTs !== undefined && tick.ts > tick.expectedTs + LATE_THRESHOLD_MS) {
      violations.push({ code: TickViolation.TICK_LATE, detail: `arrived ${tick.ts - tick.expectedTs}ms late` });
    }

    violations.forEach(v => this._violations.push({ ...v, seq: tick.seq, ts: tick.ts }));

    this._lastTick = tick;
    this._lastSeq  = tick.seq;

    return { compliant: violations.length === 0, violations };
  }

  reset() {
    this._lastTick      = null;
    this._lastSeq       = null;
    this._intervalSum   = 0;
    this._intervalCount = 0;
    this._violations    = [];
  }

  get violationLog()  { return [...this._violations]; }
  get tickCount()     { return this._intervalCount + (this._lastTick !== null ? 1 : 0); }
  get meanInterval()  { return this._intervalCount > 0 ? this._intervalSum / this._intervalCount : null; }
}

// Stateless validation for single-tick audits outside a sequence context.
export function validateSingleTick(tick) {
  const v = new FrameTickValidator();
  return v.validate(tick);
}
