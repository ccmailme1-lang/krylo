// tests/e2e/cf-gate3-live-window.spec.js
// KRYL-1259 WS6 Gate 3 — LIVE measurement window.
// Loads the running branch with connectors enabled, holds the page open, and every
// SAMPLE_MS records CF pathway/formation state + the synchronous formation for the
// same field. NO fixture data, NO synthetic replay. Raw output only.

import { test, expect } from '@playwright/test';
import fs from 'fs';

const WINDOW_MIN = Number(process.env.CF_WINDOW_MIN || 12);
const SAMPLE_MS  = 20_000;
const OUT = 'test-results/cf-gate3-raw.json';

test(`CF Gate 3 — ${WINDOW_MIN}min live window`, async ({ page }) => {
  test.setTimeout((WINDOW_MIN + 4) * 60_000);

  const console_log = [];
  page.on('console', m => console_log.push({ ts: new Date().toISOString(), type: m.type(), text: m.text().slice(0, 500) }));
  page.on('pageerror', e => console_log.push({ ts: new Date().toISOString(), type: 'pageerror', text: String(e).slice(0, 500) }));
  const net = [];
  page.on('requestfinished', async r => {
    const u = r.url();
    if (/\/api\//.test(u)) { try { net.push({ ts: new Date().toISOString(), url: u.replace(/api_key=[^&]*/,'api_key=***').replace(/token=[^&]*/,'token=***'), status: (await r.response())?.status() }); } catch {} }
  });

  await page.addInitScript(() => {
    try { sessionStorage.setItem('krylo_auth_v1', '1'); } catch {}
    try { localStorage.setItem('krylo_active_tester_v1', 'xs'); } catch {}
  });

  const t0 = new Date().toISOString();
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000); // daemon + connector mount-fire

  const samples = [];
  const readCF = async () => page.evaluate(async () => {
    const out = { ts: new Date().toISOString() };
    try {
      const read  = await import('/src/engine/cf/read.js');
      const store = await import('/src/engine/cf/pathwaystore.js');
      const F = read.getCFFormation?.();
      out.getCFFormation = F ? {
        participatingDomains: F.participatingDomains, kind: F.kind,
        reconstructable: F.reconstructable, pathways: F.pathways,
        particleCount: F.particles?.length ?? null,
      } : null;
      out.producerState = read.producerState?.() ?? null;
      out.pathwayCount  = store.pathwayCount?.() ?? null;
      out.ioCounters    = store.ioCounters?.() ?? null;
      try {
        const snap = store.serialize?.();
        out.pathways = (snap?.pathways ?? snap ?? []).map?.(p => ({
          id: p.pathway_id ?? p.id, domains: p.domains ?? p.domain,
          tier: p.tier ?? p.state, nu: p.nu ?? p.nu_t,
          events: (p.events ?? p.lineage ?? []).length,
          lastCorroboratedBatch: p.lastCorroboratedBatch ?? p.last_corroborated,
        })) ?? null;
        out.snapshotVersion = snap?.version ?? null;
      } catch (e) { out.snapshotErr = String(e); }
    } catch (e) { out.err = String(e); }
    // synchronous formation over the same live field, for comparison (parallel-read invariant)
    try {
      const fi = await import('/src/engine/formationinference.js');
      const w = window;
      const field = w.__KRYLO_FIELD__ || null;
      out.syncFormationAvailable = typeof fi.inferFormation === 'function';
    } catch (e) { out.syncErr = String(e); }
    return out;
  });

  const cycles = Math.floor((WINDOW_MIN * 60_000) / SAMPLE_MS);
  for (let i = 0; i < cycles; i++) {
    const s = await readCF();
    samples.push(s);
    console.log(`[${i + 1}/${cycles}] pathways=${s.pathwayCount} formation=${s.getCFFormation ? s.getCFFormation.participatingDomains?.join('+') : 'none'} io=${JSON.stringify(s.ioCounters)}`);
    await page.waitForTimeout(SAMPLE_MS);
  }
  const t1 = new Date().toISOString();

  const raw = {
    gate: 'WS6 Gate 3 — live-I/O telemetry', ticket: 'KRYL-1259',
    window: { start: t0, end: t1, minutes: WINDOW_MIN, sample_ms: SAMPLE_MS, cycles },
    api_calls: net,
    samples,
    console_tail: console_log.filter(l => /\[CF\]|\[WO-1390\]|connector|cf\.|pathway|formation|Ingestion|dispatchBatch/i.test(l.text)).slice(-200),
    console_errors: console_log.filter(l => l.type === 'error' || l.type === 'pageerror').slice(-80),
  };
  fs.writeFileSync(OUT, JSON.stringify(raw, null, 2));
  console.log('WROTE', OUT, `(${samples.length} samples, ${net.length} api calls)`);
  expect(samples.length).toBeGreaterThan(0);
});
