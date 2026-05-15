'use strict';
// WO-1093 — Streaming Backpressure + Flow Control Engine
// Sits between frame ingestion and codec dispatch.
// States: OPEN → THROTTLED → BACKPRESSURE → DROPPING

const { evaluateCompliance, ComplianceTrigger, ComplianceState } =
    require('./frameCompliance.cjs');

const FlowState = {
    OPEN:         'OPEN',
    THROTTLED:    'THROTTLED',
    BACKPRESSURE: 'BACKPRESSURE',
    DROPPING:     'DROPPING',
};

const DEFAULTS = {
    maxQueueDepth:        50,
    throttleAt:           0.60,   // fill ratio → THROTTLED
    backpressureAt:       0.85,   // fill ratio → BACKPRESSURE
    dropAt:               0.95,   // fill ratio → DROPPING
    velocityWindowMs:     1000,
    baseEmissionIntervalMs: 200,
};

class FlowController {
    constructor(opts = {}) {
        this._o           = { ...DEFAULTS, ...opts };
        this._queue       = [];            // { frame, enqueuedAt }
        this._state       = FlowState.OPEN;
        this._compliance  = ComplianceState.VALID;
        this._velBuf      = [];            // { ts } entries
        this._clientLevel = 'normal';      // 'slow'|'normal'|'fast'
        this._stats       = { enqueued: 0, dropped: 0, emitted: 0 };
    }

    // ── Ingestion boundary ────────────────────────────────────────────────────

    enqueue(frame) {
        this._tick();
        this._sync();

        if (this._state === FlowState.DROPPING) {
            this._stats.dropped++;
            return { action: 'drop', ...this._snapshot() };
        }

        this._queue.push({ frame, enqueuedAt: Date.now() });
        this._stats.enqueued++;
        const action = this._state === FlowState.BACKPRESSURE ? 'delay' : 'accept';
        return { action, ...this._snapshot() };
    }

    // ── Dispatch boundary ─────────────────────────────────────────────────────

    drain(n = 1) {
        const out = this._queue.splice(0, n);
        this._stats.emitted += out.length;
        this._sync();
        return out;
    }

    peek() { return this._queue.length; }

    // ── Backpressure signal from downstream ───────────────────────────────────

    setClientPressure(level) {
        if (['slow', 'normal', 'fast'].includes(level)) this._clientLevel = level;
        this._sync();
    }

    // ── Adaptive emission interval ────────────────────────────────────────────

    get intervalMs() {
        const b = this._o.baseEmissionIntervalMs;
        if (this._state === FlowState.BACKPRESSURE || this._clientLevel === 'slow') return b * 4;
        if (this._state === FlowState.THROTTLED)  return b * 2;
        if (this._clientLevel === 'fast' && this._state === FlowState.OPEN) return Math.max(50, b / 2);
        return b;
    }

    // ── Pressure snapshot (exposed to SSE + REST) ─────────────────────────────

    pressure() {
        return {
            state:         this._state,
            compliance:    this._compliance,
            queueDepth:    this._queue.length,
            maxDepth:      this._o.maxQueueDepth,
            fillRatio:     +(this._queue.length / this._o.maxQueueDepth).toFixed(3),
            velocityHz:    this._velocity(),
            clientLevel:   this._clientLevel,
            intervalMs:    this.intervalMs,
            stats:         { ...this._stats },
        };
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    _sync() {
        const fill = this._queue.length / this._o.maxQueueDepth;
        let next;
        if      (fill >= this._o.dropAt)         next = FlowState.DROPPING;
        else if (fill >= this._o.backpressureAt)  next = FlowState.BACKPRESSURE;
        else if (fill >= this._o.throttleAt)      next = FlowState.THROTTLED;
        else                                      next = FlowState.OPEN;

        if (this._clientLevel === 'slow' && next === FlowState.OPEN) next = FlowState.THROTTLED;

        if (next !== this._state) {
            const trigger = fill >= this._o.dropAt
                ? ComplianceTrigger.FRAME_DELTA_BREACH
                : ComplianceTrigger.SEQUENCE_DISCONTINUITY;
            this._compliance = evaluateCompliance(
                { trigger },
                { driftRatio: fill, currentState: this._compliance }
            );
        }
        this._state = next;
    }

    _tick() {
        const now = Date.now();
        this._velBuf.push(now);
        const cutoff = now - this._o.velocityWindowMs;
        this._velBuf = this._velBuf.filter(t => t >= cutoff);
    }

    _velocity() { return this._velBuf.length; }

    _snapshot() {
        return {
            queueDepth:  this._queue.length,
            velocityHz:  this._velocity(),
            state:       this._state,
            compliance:  this._compliance,
        };
    }
}

module.exports = { FlowController, FlowState };
