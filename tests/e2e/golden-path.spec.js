// tests/e2e/golden-path.spec.js
// WO-1334 — E2E Happy Path
// Sequence: Page load → search submit → Signal Map → scrubber → persistence write → DB_WRITE_SUCCESS

import { test, expect } from '@playwright/test';
import { randomUUID }   from 'crypto';

const PERSISTENCE_URL = 'http://localhost:4000/api/v1/persistence/execution-plan';
const INHALE_MS       = 3000; // PrismContext 2500ms + render buffer
const TEST_QUERY      = 'job offer negotiation software engineer NYC';

// Helper: wait for iframe frame context and call submitQuery() directly.
// #cta-input is a ghost input (top:-999px, opacity:0) by design — not interactable.
async function getIframeFrame(page) {
  await page.waitForSelector('iframe[src*="krylo2-feed"]', { timeout: 15_000 });
  // Poll until the frame registers and its URL resolves
  let f = null;
  for (let i = 0; i < 20; i++) {
    f = page.frames().find(fr => fr.url().includes('krylo2-feed'));
    if (f) break;
    await page.waitForTimeout(500);
  }
  if (!f) throw new Error('krylo2-feed iframe frame not found after 10s');
  return f;
}

// React synthetic event dispatch for range inputs
async function setRangeValue(scrubber, value) {
  await scrubber.evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function submitViaIframe(page) {
  const f = await getIframeFrame(page);
  await f.waitForFunction(() => typeof window.submitQuery === 'function', { timeout: 15_000 });
  await f.evaluate((q) => window.submitQuery(q), TEST_QUERY);
}

// ── Stage 1: Page load ────────────────────────────────────────────────────────

test('P1 — page loads and iframe is visible', async ({ page }) => {
  await page.goto('/');
  const frame = await getIframeFrame(page);
  expect(frame).toBeTruthy();
  // submitQuery must be defined — confirms full script load
  await frame.waitForFunction(() => typeof window.submitQuery === 'function', { timeout: 15_000 });
});

// ── Stage 2: Search submit ────────────────────────────────────────────────────

test('P2 — search submit triggers inhale and transitions to Signal Map', async ({ page }) => {
  await page.goto('/');
  await submitViaIframe(page);

  // Hero copy fades out — confirms submitQuery fired
  const iframe = page.frameLocator('iframe[src*="krylo2-feed"]');
  await expect(iframe.locator('.hero-copy-wrap')).toHaveCSS('opacity', '0', { timeout: 5_000 });

  // Wait for inhale + render
  await page.waitForTimeout(INHALE_MS);

  // Scrubber bar at the bottom confirms surface view is active
  await expect(page.locator('.krylo-scrubber')).toBeVisible({ timeout: 10_000 });
});

// ── Stage 3: Scrubber interaction ─────────────────────────────────────────────

test('P3 — scrubber drags and RETURN TO LIVE appears', async ({ page }) => {
  await page.goto('/');
  await submitViaIframe(page);
  await page.waitForTimeout(INHALE_MS);

  const scrubber = page.locator('.krylo-scrubber');
  await expect(scrubber).toBeVisible({ timeout: 10_000 });

  await setRangeValue(scrubber, 0.5);

  // RETURN TO LIVE must appear when scrubPos > 0
  await expect(page.getByText('RETURN TO LIVE')).toBeVisible({ timeout: 5_000 });

  // Click RETURN TO LIVE — scrubPos returns to 0
  await page.getByText('RETURN TO LIVE').click();
  await expect(page.getByText('RETURN TO LIVE')).not.toBeVisible({ timeout: 3_000 });
});

// ── Stage 4: Persistence contract — DB_WRITE_SUCCESS ─────────────────────────

test('P4 — persistence endpoint accepts ExecutionPlan and returns DB_WRITE_SUCCESS', async ({ request }) => {
  const body = {
    header: {
      plan_id:   randomUUID(),
      timestamp: new Date().toISOString(),
      version:   '1.0.0',
    },
    payload: {
      execution_plan: {
        initial_ask: {
          value:     146900,
          basis:     '13% above anchor — STARTUP opening premium',
          condition: 'ALWAYS',
        },
        branches: {
          stall: {
            trigger:       'response_time > 72h',
            action:        'cite competing pipeline',
            pressure_type: 'TEMPORAL',
          },
          lowball: {
            trigger:      'counter_offer < 140000',
            action:       'shift demand to ownership stake',
            pivot_vector: 'equity_vesting',
            demand:       'accelerate cliff 12mo → 6mo + 0.5% equity grant',
          },
        },
        meta: {
          geo:       'NYC',
          org_type:  'STARTUP',
          anchor:    130000,
          threshold: 140000,
        },
      },
      scrubber_range: { start: Date.now() - 3_600_000, end: Date.now() },
      signature:      'sha256-placeholder',
    },
    metadata: {
      source:      'Krylo-UI-1334',
      commit_hash: 'e2e-test',
    },
  };

  const res = await request.post(PERSISTENCE_URL, { data: body });

  expect(res.status()).toBe(201);
  const json = await res.json();
  expect(json.status).toBe('DB_WRITE_SUCCESS');
  expect(typeof json.receipt_id).toBe('string');
  expect(json.receipt_id.length).toBeGreaterThan(0);
  expect(typeof json.latency_ms).toBe('number');
});

// ── Stage 5: Full golden path — end-to-end ────────────────────────────────────

test('P5 — full golden path: submit → scrubber → LIVE → persistence receipt', async ({ page, request }) => {
  await page.goto('/');
  await submitViaIframe(page);
  await page.waitForTimeout(INHALE_MS);

  // Surface view live
  const scrubber = page.locator('.krylo-scrubber');
  await expect(scrubber).toBeVisible({ timeout: 10_000 });

  // Scrub back
  await setRangeValue(scrubber, 0.4);
  await expect(page.getByText('RETURN TO LIVE')).toBeVisible({ timeout: 5_000 });

  // Return to live
  await page.getByText('RETURN TO LIVE').click();
  await expect(page.getByText('RETURN TO LIVE')).not.toBeVisible({ timeout: 3_000 });

  // Terminal step — persist execution plan
  const res = await request.post(PERSISTENCE_URL, {
    data: {
      header:   { plan_id: randomUUID(), timestamp: new Date().toISOString(), version: '1.0.0' },
      payload: {
        execution_plan: {
          initial_ask: { value: 146900, basis: '13% above anchor', condition: 'ALWAYS' },
          branches: {
            stall:   { trigger: 'response_time > 72h', action: 'cite pipeline', pressure_type: 'TEMPORAL' },
            lowball: { trigger: 'counter_offer < 140000', action: 'shift to equity', pivot_vector: 'equity_vesting', demand: 'accelerate cliff' },
          },
          meta: { geo: 'NYC', org_type: 'STARTUP', anchor: 130000, threshold: 140000 },
        },
        scrubber_range: { start: Date.now() - 3_600_000, end: Date.now() },
        signature: 'sha256-e2e-golden-path',
      },
      metadata: { source: 'Krylo-UI-1334', commit_hash: 'e2e-test' },
    },
  });

  expect(res.status()).toBe(201);
  const json = await res.json();
  expect(json.status).toBe('DB_WRITE_SUCCESS');
  expect(typeof json.receipt_id).toBe('string');
});
