// WO-1336 L3 — Systemic Lock Manager
// If causal integrity fails, the OS halts projection.
// Better to emit no truth than invalid truth.

export const LockCondition = Object.freeze({
  CLOCK_DESYNC:              'CLOCK_DESYNC',
  PROVENANCE_BREAK:          'PROVENANCE_BREAK',
  VECTOR_DIVERGENCE:         'VECTOR_DIVERGENCE',
  CLASSIFIER_INCONSISTENCY:  'CLASSIFIER_INCONSISTENCY',
  INGESTION_OVERFLOW:        'INGESTION_OVERFLOW',
});

export class SystemicLockManager {
  constructor() {
    this._locked    = false;
    this._condition = null;
    this._log       = [];
  }

  lock(condition, detail = '') {
    if (!Object.values(LockCondition).includes(condition)) {
      throw new Error(`Unknown lock condition: ${condition}`);
    }
    this._locked    = true;
    this._condition = condition;
    this._log.push({ condition, detail, ts: Date.now() });
  }

  // Check and auto-lock on known error patterns.
  check(error) {
    const msg = error?.message ?? String(error);
    if (msg.includes('CLOCK_DESYNC'))             this.lock(LockCondition.CLOCK_DESYNC,             msg);
    else if (msg.includes('PROVENANCE_BREAK'))     this.lock(LockCondition.PROVENANCE_BREAK,         msg);
    else if (msg.includes('VECTOR_DIVERGENCE'))    this.lock(LockCondition.VECTOR_DIVERGENCE,        msg);
    else if (msg.includes('INGESTION_OVERFLOW'))   this.lock(LockCondition.INGESTION_OVERFLOW,       msg);
  }

  get locked()    { return this._locked; }
  get condition() { return this._condition; }
  get log()       { return [...this._log]; }

  // Projection gate — throws if locked.
  assertProjectionAllowed() {
    if (this._locked) {
      throw new Error(`PROJECTION_HALTED: ${this._condition} — causal integrity violation`);
    }
  }
}
