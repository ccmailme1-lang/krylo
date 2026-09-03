// tests/e2e/cf-gate3-latency.spec.js
// KRYL-1259 WS6 Gate 3 — criterion 3: guest p95 latency under live connector load.
//
// Two independent measurements over one live window (live connectors throughout):
//  (1) TICK-ALIGNED: within CF-running, compare guest frame-service time in the 700ms
//      after each cfProducerTick() vs. frames far from any tick. This is the direct
//      MET-01 test — does the synchronous analytical pass on the daemon beat block the
//      guest render frame?
//  (2) A/B: Phase A = CF running; Phase B = stopCFProducer(). Same connectors. Does the
//      guest p95 move when CF analytical load is removed?
// No synthetic load. No substitution of the WS4 result. rAF service time = guest
// render-tree cadence; series().guestLatency = CF-004-MET-01 guest unit (perceptionFrame).

import { test, expect } from '@playwright/test';
import fs from 'fs';

const PHASE_MIN = Number(process.env.CF_PHASE_MIN || 8);
const SAMPLE_MS = 15_000;
const OUT = 'test-results/cf-gate3-latency-raw.json';
const pct = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; };
const med = a => pct(a, 50);

test(`CF Gate 3 crit-3 — guest latency, ${PHASE_MIN}min/phase`, async ({ page }) => {
  test.setTimeout((PHASE_MIN * 2 + 8) * 60_000);

  await page.addInitScript(() => {
    try { sessionStorage.setItem('krylo_auth_v1', '1'); } catch {}
    try { localStorage.setItem('krylo_active_tester_v1', 'xs'); } catch {}
    // guest render-tree probe: each frame, record service time + a wall-clock stamp
    window.__frames = [];
    (function loop() {
      const s = performance.now();
      requestAnimationFrame(() => { window.__frames.push([Date.now(), performance.now() - s]); if (window.__frames.length > 60000) window.__frames.splice(0, 30000); loop(); });
    })();
    window.__loaf = [];
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__loaf.push([Date.now(), e.duration, e.blockingDuration ?? null]); }).observe({ type: 'long-animation-frame', buffered: true }); } catch {}
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__loaf.push([Date.now(), e.duration, null, 'longtask']); }).observe({ type: 'longtask', buffered: true }); } catch {}
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // warm up: wait for the daemon-started CF producer to actually accumulate live pathway state
  let warm = null;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(6000);
    warm = await page.evaluate(async () => {
      const r = await import('/src/engine/cf/read.js'); const s = await import('/src/engine/cf/pathwaystore.js');
      return { pathways: s.pathwayCount?.() ?? 0, io: s.ioCounters?.(), state: r.producerState?.() };
    });
    if ((warm.pathways ?? 0) > 0 || (warm.io?.examined ?? 0) > 0) break;
  }

  const readState = () => page.evaluate(async () => {
    const read = await import('/src/engine/cf/read.js');
    const store = await import('/src/engine/cf/pathwaystore.js');
    const tele = await import('/src/engine/cf/telemetry.js');
    const frames = window.__frames.splice(0, window.__frames.length);
    const loaf = window.__loaf.splice(0, window.__loaf.length);
    return {
      wall: Date.now(),
      frames, loaf,
      series: tele.series?.() ?? null,
      producerState: read.producerState?.() ?? null,
      pathwayCount: store.pathwayCount?.() ?? null,
      ioCounters: store.ioCounters?.() ?? null,
      formation: read.getCFFormation?.()?.participatingDomains ?? null,
      heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null,
    };
  });

  const runPhase = async (label, mins) => {
    await page.evaluate(async () => { window.__frames.length = 0; window.__loaf.length = 0; try { (await import('/src/engine/cf/telemetry.js')).resetTelemetry(); } catch {} });
    const io0 = (await readState()).ioCounters;
    const cycles = Math.floor((mins * 60_000) / SAMPLE_MS);
    const perSampleP95 = [], allFrames = [], allLoaf = [], tickStamps = [];
    let lastTick = null;
    for (let i = 0; i < cycles; i++) {
      await page.waitForTimeout(SAMPLE_MS);
      const s = await readState();
      const svc = s.frames.map(f => f[1]);
      perSampleP95.push(pct(svc, 95));
      allFrames.push(...s.frames);
      allLoaf.push(...s.loaf);
      if (s.producerState && s.producerState.lastTick && s.producerState.lastTick !== lastTick) { tickStamps.push(s.producerState.lastTick); lastTick = s.producerState.lastTick; }
      console.log(`[${label} ${i + 1}/${cycles}] frame p50=${med(svc)?.toFixed(1)} p95=${pct(svc, 95)?.toFixed(1)} p99=${pct(svc, 99)?.toFixed(1)}ms  loaf=${s.loaf.length}  guestLat(MET01) p95=${s.series?.guestLatency?.p95?.toFixed(3)} n=${s.series?.guestLatency?.n}  pathways=${s.pathwayCount} io.ex=${s.ioCounters?.examined} heap=${s.heapMB}MB`);
    }
    const s1 = await readState();
    const svcAll = allFrames.map(f => f[1]);
    // tick-aligned: frames within 700ms after a detected tick vs. frames >2s from any tick
    const near = [], far = [];
    for (const [ts, d] of allFrames) {
      const dt = tickStamps.map(t => ts - t).filter(x => x >= 0);
      const closest = dt.length ? Math.min(...dt) : Infinity;
      if (closest <= 700) near.push(d);
      else if (closest > 2000) far.push(d);
    }
    return {
      label, minutes: mins,
      cf_io_examined_delta: (s1.ioCounters?.examined ?? 0) - (io0?.examined ?? 0),
      cf_io_written_delta: (s1.ioCounters?.written ?? 0) - (io0?.written ?? 0),
      frames_n: svcAll.length,
      frame_p50: med(svcAll), frame_p90: pct(svcAll, 90), frame_p95: pct(svcAll, 95), frame_p99: pct(svcAll, 99), frame_max: svcAll.length ? Math.max(...svcAll) : null,
      perSample_p95_median: med(perSampleP95), perSample_p95_max: perSampleP95.length ? Math.max(...perSampleP95) : null,
      loaf_n: allLoaf.length, loaf_over50: allLoaf.filter(e => e[1] > 50).length, loaf_over100: allLoaf.filter(e => e[1] > 100).length, loaf_max: allLoaf.length ? Math.max(...allLoaf.map(e => e[1])) : null,
      tick_count: tickStamps.length,
      tick_aligned: { near_n: near.length, near_p50: med(near), near_p95: pct(near, 95), far_n: far.length, far_p50: med(far), far_p95: pct(far, 95) },
      met01_guestLatency: s1.series?.guestLatency ?? null,
      heapMB_end: s1.heapMB, formation_end: s1.formation,
    };
  };

  const A = await runPhase('A_CF_ON', PHASE_MIN);
  const stopRes = await page.evaluate(async () => { const p = await import('/src/engine/cf/producer.js'); p.stopCFProducer(); const r = await import('/src/engine/cf/read.js'); return r.producerState?.(); });
  const B = await runPhase('B_CF_OFF', PHASE_MIN);

  const raw = {
    gate: 'WS6 Gate 3 — criterion 3: guest p95 latency under live connector load', ticket: 'KRYL-1259',
    env_note: 'headless Chromium (software WebGL) — absolute frame times are inflated vs a real GPU; the A/B delta and tick-aligned near/far delta isolate CF interference regardless of the baseline.',
    warmup: warm,
    method: 'live connectors throughout. A = CF running on the daemon beat (per Gate 2). B = stopCFProducer(). rAF service time = guest render-tree cadence. series().guestLatency = CF-004-MET-01 guest unit (perceptionFrame normalize). tick-aligned: frames <=700ms after a cfProducerTick vs frames >2s from any tick.',
    phase_A: A, phase_B: B, cf_stopped_state: stopRes,
  };
  fs.writeFileSync(OUT, JSON.stringify(raw, null, 2));

  console.log('\n================ GATE 3 — CRITERION 3 ================');
  console.log(`CF analytical load in A:  io.examined +${A.cf_io_examined_delta}  io.written +${A.cf_io_written_delta}  ticks=${A.tick_count}`);
  console.log(`A(CF on)  frame p50/p95/p99 = ${A.frame_p50?.toFixed(1)}/${A.frame_p95?.toFixed(1)}/${A.frame_p99?.toFixed(1)}ms   per-sample p95 median=${A.perSample_p95_median?.toFixed(1)} max=${A.perSample_p95_max?.toFixed(1)}`);
  console.log(`B(CF off) frame p50/p95/p99 = ${B.frame_p50?.toFixed(1)}/${B.frame_p95?.toFixed(1)}/${B.frame_p99?.toFixed(1)}ms   per-sample p95 median=${B.perSample_p95_median?.toFixed(1)} max=${B.perSample_p95_max?.toFixed(1)}`);
  console.log(`A vs B  Δframe_p95 = ${((A.frame_p95 ?? 0) - (B.frame_p95 ?? 0)).toFixed(1)}ms   Δper-sample-p95-median = ${((A.perSample_p95_median ?? 0) - (B.perSample_p95_median ?? 0)).toFixed(1)}ms`);
  console.log(`TICK-ALIGNED (A):  near-tick p50/p95 = ${A.tick_aligned.near_p50?.toFixed(1)}/${A.tick_aligned.near_p95?.toFixed(1)}ms (n=${A.tick_aligned.near_n})   far-from-tick p50/p95 = ${A.tick_aligned.far_p50?.toFixed(1)}/${A.tick_aligned.far_p95?.toFixed(1)}ms (n=${A.tick_aligned.far_n})`);
  console.log(`LoAF >100ms:  A=${A.loaf_over100} (max ${A.loaf_max?.toFixed(0)})   B=${B.loaf_over100} (max ${B.loaf_max?.toFixed(0)})`);
  console.log(`MET-01 guestLatency p95:  A=${A.met01_guestLatency?.p95?.toFixed(3)}ms (n=${A.met01_guestLatency?.n})   B=${B.met01_guestLatency?.p95?.toFixed(3)}ms (n=${B.met01_guestLatency?.n})`);
  console.log(`heap end:  A=${A.heapMB_end}MB  B=${B.heapMB_end}MB`);
  console.log(`raw -> ${OUT}`);

  expect(A.frames_n, 'phase A frame samples').toBeGreaterThan(2000);
  expect(B.frames_n, 'phase B frame samples').toBeGreaterThan(2000);
  expect(A.cf_io_examined_delta, 'CF did real analytical work in phase A').toBeGreaterThan(0);
});
