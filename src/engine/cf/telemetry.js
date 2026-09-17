// src/engine/cf/telemetry.js — CF Runtime Telemetry (CF-004-MET-01).
//
// WS4. Independently captures the four MET-01 series so the non-interference
// invariant (CF-004-INV-006) is *measurable*, not merely asserted:
//   1. guest-facing end-to-end latency   (ingest → render)
//   2. analytical queue delay            (enqueue → start)
//   3. analytical processing time        (start → end)
//   4. state objects examined / written  (per input event — from pathwaystore.ioCounters)
//
// Bounded ring buffers, zero dependencies, no I/O. The guest recorder and the
// analytical recorder are separate call paths — recording one never touches the
// other. This module must never be imported by a guest-path render module; it is
// instrumentation for the CF analytical loop and its harness.

const CAP = 4096;   // ring-buffer capacity per series

function ring() { return { buf: new Array(CAP), n: 0, i: 0 }; }
function push(r, v) { r.buf[r.i] = v; r.i = (r.i + 1) % CAP; r.n = Math.min(r.n + 1, CAP); }
function values(r) { const out = []; for (let k = 0; k < r.n; k++) out.push(r.buf[k]); return out; }
function pct(xs, p) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}
const stats = xs => xs.length ? {
  n: xs.length, p50: +pct(xs, 50).toFixed(4), p95: +pct(xs, 95).toFixed(4),
  max: +Math.max(...xs).toFixed(4), mean: +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(4),
} : { n: 0 };

let _guest = ring();
let _queue = ring();
let _proc  = ring();
let _io    = { examined: 0, written: 0 };

export function resetTelemetry() { _guest = ring(); _queue = ring(); _proc = ring(); _io = { examined: 0, written: 0 }; }

// ── guest path ────────────────────────────────────────────────────────────
// recordGuest(fn) — times a guest-path unit of work (ingest→render). The fn
// MUST NOT call any CF analytical function; if it does, INV-006 is already
// violated and the number here is meaningless (the harness checks this
// structurally).
export function recordGuest(fn) {
  const t0 = performance.now();
  const r = fn();
  push(_guest, performance.now() - t0);
  return r;
}

// ── analytical path ──────────────────────────────────────────────────────
// recordAnalytical(op, fn, {enqueuedAt}) — times one analytical operation.
// queueDelay = start - enqueuedAt (default: no queue → 0). procTime = end - start.
export function recordAnalytical(op, fn, { enqueuedAt } = {}) {
  const start = performance.now();
  if (typeof enqueuedAt === 'number') push(_queue, start - enqueuedAt);
  const r = fn();
  push(_proc, performance.now() - start);
  return r;
}

export function recordIO({ examined = 0, written = 0 }) {
  _io.examined += examined; _io.written += written;
}

// ── the four series ──────────────────────────────────────────────────────
export function series() {
  return {
    guestLatency:   stats(values(_guest)),
    queueDelay:     stats(values(_queue)),
    processingTime: stats(values(_proc)),
    objects:        { ..._io },
  };
}
