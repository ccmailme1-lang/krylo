/**
 * src/ontology/KernelProfiler.js
 *
 * WO-808: Kernel Profiler
 * Measures CPU overhead per physics kernel cycle and GPU attribute upload cadence.
 *
 * "111-node cycle" = the target operating load. All stats are normalized
 * to per-node cost so reports are comparable regardless of live node count.
 *
 * CPU measurement: performance.now() brackets around stateRef.current.forEach.
 * GPU measurement: WebGL timer queries are security-restricted in most browsers.
 *   Proxy used instead — attribute bytes uploaded per second, derived from
 *   the 30Hz gate cadence × buffer sizes.
 *
 * Rolling window: last WINDOW_SIZE samples (~2s at 60fps).
 * Report cadence: every 30s, or immediately when p95 exceeds budget.
 *
 * Usage:
 *   const profiler = new KernelProfiler();
 *   // in useFrame, before forEach:
 *   profiler.begin();
 *   // ... forEach ...
 *   profiler.end(activeNodeCount);
 *   // periodic report:
 *   if (profiler.shouldReport(now)) console.log(profiler.report(now));
 */

const WINDOW_SIZE      = 120;   // rolling sample count (~2s at 60fps)
const REPORT_INTERVAL  = 30_000; // ms between periodic reports
const FRAME_BUDGET_MS  = 16.67; // 60fps target frame time
const WARN_P95_FRAC    = 0.25;  // warn if p95 exceeds 25% of frame budget

// Attribute buffer sizes (bytes) uploaded per 30Hz gate cycle
// aFidelity(4) + aStress(4) + aPhase(4) + aScale(4) + aIsStub(4) +
// aIdentityColor(12) + aRadiusNorm(4) + aSovereign(4) +
// aSearchMatch(4) + aShattered(4) + aDebugColor(12) = 60 bytes/node
const BYTES_PER_NODE   = 60;

export class KernelProfiler {
  constructor() {
    this._t0          = 0;
    this._samples     = [];      // { durationMs, nodeCount }
    this._uploadCount = 0;       // 30Hz gate fire count
    this._lastReport  = 0;
    this._startMs     = performance.now();
  }

  /** Call immediately before the physics forEach */
  begin() {
    this._t0 = performance.now();
  }

  /**
   * Call immediately after the physics forEach completes.
   * @param {number} nodeCount — active primary node count this frame
   */
  end(nodeCount) {
    const duration = performance.now() - this._t0;
    this._samples.push({ duration, nodeCount });
    if (this._samples.length > WINDOW_SIZE) this._samples.shift();
  }

  /** Call each time the 30Hz GPU upload gate fires */
  recordUpload() {
    this._uploadCount++;
  }

  /** True when it's time for a periodic report */
  shouldReport(now) {
    return (now - this._lastReport) >= REPORT_INTERVAL;
  }

  /** Compute rolling window statistics */
  stats() {
    const s = this._samples;
    if (s.length === 0) return null;

    const durations = s.map(x => x.duration);
    durations.sort((a, b) => a - b);

    const mean    = durations.reduce((a, b) => a + b, 0) / durations.length;
    const min     = durations[0];
    const max     = durations[durations.length - 1];
    const p95idx  = Math.floor(durations.length * 0.95);
    const p95     = durations[p95idx] ?? max;

    // Per-node cost: use last sample's nodeCount as the normalizer
    const lastN   = s[s.length - 1].nodeCount || 1;
    const perNode = mean / lastN;

    const budgetPct = (p95 / FRAME_BUDGET_MS) * 100;

    return { mean, min, max, p95, perNode, budgetPct, samples: s.length, nodeCount: lastN };
  }

  /**
   * Generate a formatted report string.
   * @param {number} now — performance.now()
   */
  report(now) {
    this._lastReport = now;
    const st = this.stats();
    if (!st) return '[WO-808 PROFILER] No samples yet.';

    const elapsedS    = Math.round((now - this._startMs) / 1000);
    const uploadsHz   = (this._uploadCount / Math.max(elapsedS, 1)).toFixed(1);
    const bytesPerSec = ((this._uploadCount * st.nodeCount * BYTES_PER_NODE) / Math.max(elapsedS, 1) / 1024).toFixed(1);
    const budgetFlag  = st.budgetPct > WARN_P95_FRAC * 100 ? '⚠️ ' : '✅ ';

    return [
      `[WO-808 PROFILER] ${budgetFlag}kernel overhead | uptime: ${elapsedS}s | nodes: ${st.nodeCount}`,
      `  CPU  mean: ${st.mean.toFixed(3)}ms  p95: ${st.p95.toFixed(3)}ms  min: ${st.min.toFixed(3)}ms  max: ${st.max.toFixed(3)}ms`,
      `       per-node: ${(st.perNode * 1000).toFixed(2)}μs  frame budget: ${st.budgetPct.toFixed(1)}%`,
      `  GPU  uploads: ${uploadsHz}Hz  bandwidth: ~${bytesPerSec} KB/s (proxy)`,
    ].join('\n');
  }
}
