// WO-1336 L3 — Temporal Authority Service (TAS)
// Only substrate_time may participate in inference, resonance, classification, emergence.
// All other clocks are audit/interpolation only.

export const ClockType = Object.freeze({
  SUBSTRATE: 'substrate_time',  // causal ordering — sole inference clock
  INGESTION: 'ingestion_time',  // wall-clock arrival audit
  EMERGENCE: 'emergence_time',  // transition persistence timestamp
  RENDER:    'render_time',     // UI interpolation only — never touches inference
  REPLAY:    'replay_time',     // historical reconstruction
});

const INFERENCE_CLOCKS = new Set([ClockType.SUBSTRATE]);
const AUDIT_CLOCKS     = new Set([ClockType.INGESTION, ClockType.EMERGENCE, ClockType.REPLAY]);
const UI_CLOCKS        = new Set([ClockType.RENDER]);

export class TAS {
  constructor() {
    this._clocks = {
      [ClockType.SUBSTRATE]: 0n,
      [ClockType.INGESTION]: 0n,
      [ClockType.EMERGENCE]: undefined,
      [ClockType.RENDER]:    0n,
      [ClockType.REPLAY]:    undefined,
    };
    this._desync = false;
  }

  // Advance a clock. Returns the new value.
  // Throws on substrate_time regression (CLOCK_DESYNC).
  advance(clockType, value) {
    const v = typeof value === 'bigint' ? value : BigInt(Math.round(Number(value)));

    if (clockType === ClockType.SUBSTRATE) {
      if (v < this._clocks[ClockType.SUBSTRATE]) {
        this._desync = true;
        throw new Error(`CLOCK_DESYNC: substrate_time regressed from ${this._clocks[ClockType.SUBSTRATE]} to ${v}`);
      }
    }

    this._clocks[clockType] = v;
    return v;
  }

  // Returns current substrate_time as BigInt — the sole inference clock.
  substrateTime() { return this._clocks[ClockType.SUBSTRATE]; }

  // Asserts that the given clock is authorized for inference use.
  // Throws if a non-substrate clock is used for inference.
  assertInferenceClock(clockType) {
    if (!INFERENCE_CLOCKS.has(clockType)) {
      throw new Error(`CLOCK_AUTHORITY_VIOLATION: ${clockType} is not authorized for inference. Only substrate_time is.`);
    }
  }

  get desync() { return this._desync; }
  get clocks() { return { ...this._clocks }; }
}
