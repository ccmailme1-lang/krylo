// tests/e2e/question-assistance-pre-submit.spec.js — KRYL-1326 PRE-SUBMIT slice
// Real-browser guest-path verification of the ratified contract (Founder rulings 2026-09-26):
// the 8 behavioral cases, the additive `+` append, the position-tracked ownership rules
// (P-Q2: KRYLO removes only text it can still identify as its own unmodified addition), and
// SUBMIT authority (the exact textarea string is the QUESTION).
import { test, expect } from '@playwright/test';

const PHRASE  = 'technology / architecture changes';
const APPEND  = ` + ${PHRASE}`;
const BARE    = 'Vendor Platform Decoupling';

test.beforeEach(async ({ page }) => {
  // Same dev-gate bypass the other e2e specs use (GuestGate + ProfilePicker).
  await page.addInitScript(() => {
    try { sessionStorage.setItem('krylo_auth_v1', '1'); } catch {}
    try { localStorage.setItem('krylo_active_tester_v1', 'xs'); } catch {}
  });
  await page.goto('/');
  await page.waitForSelector('iframe[title="KRYLO Campaign"]', { timeout: 20000 });
  await page.evaluate(() => window.postMessage({ type: 'krylo-nav', mode: 'analysis' }, '*'));
  await page.locator('textarea').first().waitFor({ timeout: 20000 });
});

const box       = page => page.locator('textarea').first();
const header    = page => page.getByText('ADD TO YOUR QUESTION', { exact: true });
const chip      = page => page.locator('button[data-chip]').filter({ hasText: PHRASE });
const token     = page => page.locator('button[title="Remove this addition"]');
const clearAll  = page => page.getByText('clear all', { exact: true });
const settle    = page => page.waitForTimeout(450); // seedQuery debounce (150ms) + render

async function typeInto(page, text) {
  const b = box(page);
  await b.click();
  await b.fill('');
  if (text) await b.pressSequentially(text, { delay: 8 });
  await settle(page);
}
async function appendViaChip(page) {
  await typeInto(page, BARE);
  await chip(page).click();
  await settle(page);
}

// ── The 8 behavioral cases — PRE-SUBMIT ─────────────────────────────────────────────────────
const CASES = [
  ['1 bare subject',        BARE,                                                                                        true],
  ['2 fully specified',     "I'm looking at Amazon over the next three years. I'm concerned about warehouse automation and what it means for labor.", false],
  ['3 vague investment',    'Is SpaceX a good long-term investment?',                                                     false],
  ['4 explicit personal',   "I'm 55, live in Philly, looking to invest in SpaceX for the next 10+ years. Is this a good fit?", false],
  ['5 ambiguous referent',  'What happened with the platform migration last year?',                                       false],
  ['6a empty',              '',                                                                                           false],
  ['6b ???',                '???',                                                                                        false],
  ['7 comparison (deferred)', 'AWS vs Azure vs on-prem for our ERP',                                                      false],
  ['8 already-formed paragraph', 'Our mid-size logistics firm is evaluating whether consolidating three regional carriers into one vendor over the next 18 months would reduce exposure to fuel and labor cost swings; we care about contract terms and service-level risk.', false],
];
for (const [name, input, offered] of CASES) {
  test(`case ${name}: ${offered ? 'assistance offered' : 'no assistance'}`, async ({ page }) => {
    await typeInto(page, input);
    if (offered) {
      await expect(header(page)).toBeVisible();
      await expect(chip(page)).toBeVisible();
      await expect(chip(page)).toContainText(`+ ${PHRASE}`);
    } else {
      await expect(header(page)).toHaveCount(0);
    }
    // No suggestion ever submits or rewrites the guest's text.
    await expect(box(page)).toHaveValue(input);
  });
}

// ── Append / deselect ───────────────────────────────────────────────────────────────────────
test('select appends exactly the displayed wording, never submits, and shows the + ADDED token', async ({ page }) => {
  await appendViaChip(page);
  await expect(box(page)).toHaveValue(BARE + APPEND);
  await expect(header(page)).toHaveCount(0);                 // no longer a bare subject phrase
  await expect(token(page)).toHaveCount(1);
  await expect(token(page)).toContainText(PHRASE);
  await expect(page.getByText('TARGET PACKET', { exact: false })).toHaveCount(0); // did not submit
});

test('deselect (token x) with the addition untouched restores the original text exactly', async ({ page }) => {
  await appendViaChip(page);
  await token(page).click();
  await settle(page);
  await expect(box(page)).toHaveValue(BARE);
  await expect(token(page)).toHaveCount(0);
  await expect(chip(page)).toBeVisible();                    // eligible again
});

test('clear all removes an intact addition (bulk deselect)', async ({ page }) => {
  await appendViaChip(page);
  await clearAll(page).click();
  await settle(page);
  await expect(box(page)).toHaveValue(BARE);
  await expect(token(page)).toHaveCount(0);
});

// ── Ownership (P-Q2): identify by tracked offset, never by string match ─────────────────────
test('editing the appended text drops the token and leaves the guest text intact', async ({ page }) => {
  await appendViaChip(page);
  await box(page).press('End');
  await box(page).press('Backspace');                        // edits inside KRYLO's segment
  await settle(page);
  await expect(box(page)).toHaveValue(BARE + APPEND.slice(0, -1));
  await expect(token(page)).toHaveCount(0);
  await expect(clearAll(page)).toHaveCount(0);               // nothing left that could remove text
});

test('editing the original text (before the segment) keeps the token; removal takes only the segment', async ({ page }) => {
  await appendViaChip(page);
  await box(page).press('Home');
  await box(page).pressSequentially('X');
  await settle(page);
  await expect(box(page)).toHaveValue('X' + BARE + APPEND);
  await expect(token(page)).toHaveCount(1);
  await token(page).click();
  await settle(page);
  await expect(box(page)).toHaveValue('X' + BARE);
});

test('deleting the appended text drops the token; retyping identical text creates no ownership', async ({ page }) => {
  await appendViaChip(page);
  await box(page).press('End');
  for (let i = 0; i < APPEND.length; i++) await box(page).press('Backspace');
  await settle(page);
  await expect(box(page)).toHaveValue(BARE);
  await expect(token(page)).toHaveCount(0);
  await box(page).pressSequentially(APPEND, { delay: 8 });   // guest retypes the identical string
  await settle(page);
  await expect(box(page)).toHaveValue(BARE + APPEND);
  await expect(token(page)).toHaveCount(0);                  // KRYLO must never remove the retyped text
  await expect(clearAll(page)).toHaveCount(0);
});

test('guest text identical to the addition is never removed in place of KRYLO\'s segment', async ({ page }) => {
  await appendViaChip(page);
  await box(page).press('End');
  await box(page).pressSequentially(APPEND, { delay: 8 });   // guest types a second, identical copy
  await settle(page);
  await expect(box(page)).toHaveValue(BARE + APPEND + APPEND);
  await token(page).click();                                 // removes KRYLO's copy (at its offset) only
  await settle(page);
  await expect(box(page)).toHaveValue(BARE + APPEND);        // the guest's copy remains
});

// ── SUBMIT authority ────────────────────────────────────────────────────────────────────────
test('submit uses the exact resulting textarea string; additions do not enter structuralRefinements', async ({ page }) => {
  await appendViaChip(page);
  const expected = BARE + APPEND;
  await expect(box(page)).toHaveValue(expected);
  await box(page).press('Control+Enter');
  await expect(page.getByText('QUESTION AS ASKED', { exact: false }).first()).toBeVisible({ timeout: 30000 });
  const state = await page.evaluate(async () => {
    const m = await import('/src/store/useanalysisstore.js');
    const st = (m.default ?? m.useAnalysisStore).getState();
    const s = st.sessions[st.activeSessionId];
    return {
      query: s?.query,
      questionText: s?.tensor?.analysisIntent?.question?.value?.text,
      structuralRefinements: s?.tensor?.structuralRefinements ?? [],
    };
  });
  expect(state.query).toBe(expected);
  expect(state.questionText).toBe(expected);
  expect(state.structuralRefinements).toEqual([]);
});
