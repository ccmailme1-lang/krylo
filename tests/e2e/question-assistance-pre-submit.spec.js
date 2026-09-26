// tests/e2e/question-assistance-pre-submit.spec.js — KRYL-1326 / KRYL-1329 PRE-SUBMIT slice
// Real-browser guest-path verification of the ratified contract (Founder rulings 2026-09-26):
// a bare subject phrase gets the six canonical pressure suggestions as unranked peers in a fixed
// order; the guest selects ONE, exactly that wording is appended into the query and never submits;
// the menu then disappears (one-and-done); the appended wording is ordinary guest-editable text
// (no `+ ADDED` token, no clear-all, no ownership); the exact textarea string is the QUESTION.
import { test, expect } from '@playwright/test';

// KRYL-1329 ratified phrases, in the ratified fixed order (unranked peers).
const PHRASES = [
  'capital / financing changes',
  'ownership / control changes',
  'technology / architecture changes',
  'knowledge / research changes',
  'labor / workforce changes',
  'media / coverage changes',
];
const TECH    = 'technology / architecture changes';
const APPEND  = ` + ${TECH}`;
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

const box      = page => page.locator('textarea').first();
const header   = page => page.getByText('ADD TO YOUR QUESTION', { exact: true });
const chips    = page => page.locator('button[data-chip]');
const chip     = (page, phrase) => chips(page).filter({ hasText: phrase });
const addedRow = page => page.getByText('+ ADDED', { exact: true });
const clearAll = page => page.getByText('clear all', { exact: true });
const settle   = page => page.waitForTimeout(450); // seedQuery debounce (150ms) + render

async function typeInto(page, text) {
  const b = box(page);
  await b.click();
  await b.fill('');
  if (text) await b.pressSequentially(text, { delay: 8 });
  await settle(page);
}
async function appendViaChip(page, phrase = TECH, subject = BARE) {
  await typeInto(page, subject);
  await chip(page, phrase).click();
  await settle(page);
}

// ── The behavioral cases — PRE-SUBMIT ───────────────────────────────────────────────────────
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
  ['9 sample full query',   "Amazon — automation's impact on warehouse labor — next 3 years",                            false],
  ['10 single-word subject (parser limit: no menu, never a guess)', 'Amazon',                                            false],
];
for (const [name, input, offered] of CASES) {
  test(`case ${name}: ${offered ? 'six suggestions offered' : 'no assistance'}`, async ({ page }) => {
    await typeInto(page, input);
    if (offered) {
      await expect(header(page)).toBeVisible();
      await expect(chips(page)).toHaveCount(PHRASES.length);
    } else {
      await expect(header(page)).toHaveCount(0);
      await expect(chips(page)).toHaveCount(0);
    }
    // No suggestion ever submits or rewrites the guest's text.
    await expect(box(page)).toHaveValue(input);
  });
}

// A bare multi-word subject phrase gets the menu whether or not it contains a domain keyword
// (KRYL-1329 T1: the parser does not gate the menu).
for (const subject of ['Angel Investors', 'Amazon Web Services', 'Data Privacy Lawsuit', 'Founder Control Dispute']) {
  test(`bare subject "${subject}" gets the six-suggestion menu`, async ({ page }) => {
    await typeInto(page, subject);
    await expect(chips(page)).toHaveCount(PHRASES.length);
  });
}

// ── The menu: six unranked peers, fixed order, no applicability claim ───────────────────────
test('the menu shows exactly the six ratified phrases in the ratified order and nothing else', async ({ page }) => {
  await typeInto(page, BARE);
  await expect(chips(page)).toHaveCount(PHRASES.length);
  for (let i = 0; i < PHRASES.length; i++) {
    await expect(chips(page).nth(i)).toHaveText(`+ ${PHRASES[i]}`);
  }
  // No applicability, ranking or relevance wording anywhere in the assistance row.
  const rowText = (await chips(page).first().locator('xpath=ancestor::div[2]').innerText()).toLowerCase();
  for (const word of ['relevant', 'applies', 'recommended', 'suggested', 'best', 'top ', 'likely']) {
    expect(rowText).not.toContain(word);
  }
});

// ── Append: exact wording, one-and-done, plain query text ───────────────────────────────────
for (const phrase of PHRASES) {
  test(`selecting "${phrase}" appends exactly that wording, never submits, and the menu disappears`, async ({ page }) => {
    await appendViaChip(page, phrase);
    await expect(box(page)).toHaveValue(`${BARE} + ${phrase}`);
    await expect(header(page)).toHaveCount(0);               // one-and-done
    await expect(chips(page)).toHaveCount(0);
    await expect(page.getByText('TARGET PACKET', { exact: false })).toHaveCount(0); // did not submit
  });
}

test('selecting a suggestion creates NO additive + ADDED token and NO clear-all control', async ({ page }) => {
  await appendViaChip(page);
  await expect(box(page)).toHaveValue(BARE + APPEND);
  await expect(addedRow(page)).toHaveCount(0);
  await expect(clearAll(page)).toHaveCount(0);
  await expect(page.locator('button[title="Remove this addition"]')).toHaveCount(0);
  await expect(page.locator('button[title="Remove this refinement"]')).toHaveCount(0);
});

test('the appended wording is ordinary text: the guest edits it directly and nothing restores, removes or re-offers', async ({ page }) => {
  await appendViaChip(page);
  await box(page).press('End');
  await box(page).press('Backspace');                        // edit inside the appended wording
  await settle(page);
  await expect(box(page)).toHaveValue(BARE + APPEND.slice(0, -1));
  await box(page).pressSequentially('!', { delay: 8 });
  await settle(page);
  await expect(box(page)).toHaveValue(BARE + APPEND.slice(0, -1) + '!');
  await expect(addedRow(page)).toHaveCount(0);
  await expect(clearAll(page)).toHaveCount(0);
  await expect(chips(page)).toHaveCount(0);                  // no second addition is offered (one-and-done)
});

test('the guest deleting the appended wording restores the original query and the menu returns', async ({ page }) => {
  await appendViaChip(page);
  await box(page).press('End');
  for (let i = 0; i < APPEND.length; i++) await box(page).press('Backspace');
  await settle(page);
  await expect(box(page)).toHaveValue(BARE);
  await expect(chips(page)).toHaveCount(PHRASES.length);     // eligible again
});

// ── SUBMIT authority ────────────────────────────────────────────────────────────────────────
test('submit uses the exact resulting textarea string; the append does not enter structuralRefinements', async ({ page }) => {
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
