// qa_completionchips.mjs — KRYL-1222 derivation proof.
// Completion chips are prescriptive ("what's missing"), pure, and gated: only
// `timeline` has a control to route to today, so only it is active.
// Run: node qa_completionchips.mjs

import { deriveCompletionChips, activeCompletionChips, CHIP_MODEL, VISIBLE_CAP } from './src/engine/completionchips.js';
import { buildQueryContext } from './src/engine/querycontext.js';

let pass = 0, fail = 0;
const ok = (label, cond) => { if (cond) { pass++; console.log(`  ✓ ${label}`); } else { fail++; console.log(`  ✗ ${label}`); } };
const ids = arr => arr.map(c => c.id);

// ── 1. Sparse query — every dimension missing ──────────────────────────────
{
  const qc = buildQueryContext('what is going on', { now: 1 });
  const chips = deriveCompletionChips({ queryContext: qc, selectedFloor: null, horizon: null, activeLens: null });
  ok('1 sparse → decision,budget,timeline,lens candidates (no asset, class absent)',
     JSON.stringify(ids(chips)) === JSON.stringify(['decision', 'budget', 'timeline', 'lens']));
  const active = activeCompletionChips({ queryContext: qc, selectedFloor: null, horizon: null, activeLens: null });
  ok('1 sparse → only timeline is active (others gated off)', JSON.stringify(ids(active)) === JSON.stringify(['timeline']));
}

// ── 2. Fully-formed query — nothing missing ────────────────────────────────
{
  const qc = buildQueryContext('should we acquire the company for $2.5 million', { now: 1 });
  const chips = deriveCompletionChips({ queryContext: qc, selectedFloor: 50000, horizon: 'MED', activeLens: 'CFO' });
  ok('2 fully-formed → no candidates', chips.length === 0);
  ok('2 fully-formed → no active chips', activeCompletionChips({ queryContext: qc, selectedFloor: 50000, horizon: 'MED', activeLens: 'CFO' }).length === 0);
}

// ── 3. Partial — has a figure, no timeline ─────────────────────────────────
{
  const qc = buildQueryContext('lease the warehouse for $80,000 a month', { now: 1 });
  const chips = deriveCompletionChips({ queryContext: qc, selectedFloor: null, horizon: null, activeLens: 'COO' });
  ok('3 partial → no budget candidate (figure present)', !ids(chips).includes('budget'));
  ok('3 partial → timeline candidate present', ids(chips).includes('timeline'));
  ok('3 partial → no decision candidate ("lease" is a cue)', !ids(chips).includes('decision'));
  ok('3 partial → asset candidate present (warehouse → CRE)', ids(chips).includes('asset'));
  ok('3 partial → active = [timeline] only', JSON.stringify(ids(activeCompletionChips({ queryContext: qc, selectedFloor: null, horizon: null, activeLens: 'COO' }))) === JSON.stringify(['timeline']));
}

// ── 4. Mechanic copy — static, present, no numeric/threshold content ───────
{
  const numeric = /\d|\b(threshold|weight|score|percent|%|>=|<=|coefficient)\b/i;
  let clean = true;
  for (const c of CHIP_MODEL) {
    if (typeof c.mechanic !== 'string' || c.mechanic.length < 20) clean = false;
    if (numeric.test(c.mechanic)) clean = false;
  }
  ok('4 every chip has static mechanic copy with no numeric/threshold content', clean);
}

// ── 5. Priority + cap ─────────────────────────────────────────────────────
{
  const qc = buildQueryContext('office building', { now: 1 });   // asset resolves, all gaps open
  const chips = deriveCompletionChips({ queryContext: qc, selectedFloor: null, horizon: null, activeLens: null });
  ok('5 priority order decision>budget>timeline>lens>asset',
     JSON.stringify(ids(chips)) === JSON.stringify(['decision', 'budget', 'timeline', 'lens', 'asset']));
  ok('5 active never exceeds VISIBLE_CAP', activeCompletionChips({ queryContext: qc }).length <= VISIBLE_CAP);
}

// ── 6. timeline disappears once horizon is set ────────────────────────────
{
  const qc = buildQueryContext('what is going on', { now: 1 });
  const before = activeCompletionChips({ queryContext: qc, horizon: null });
  const after  = activeCompletionChips({ queryContext: qc, horizon: 'ACUTE' });
  ok('6 timeline active before horizon set', ids(before).includes('timeline'));
  ok('6 timeline gone after horizon set', !ids(after).includes('timeline'));
}

// ── 7. timeline routes to the horizon control ─────────────────────────────
{
  const t = CHIP_MODEL.find(c => c.id === 'timeline');
  ok('7 timeline.target === "horizon"', t.target === 'horizon');
  ok('7 timeline is the only enabled chip in the model', CHIP_MODEL.filter(c => c.enabled).map(c => c.id).join() === 'timeline');
}

// ── 8. tolerates a missing / malformed queryContext ──────────────────────
{
  const chips = deriveCompletionChips({ queryContext: undefined });
  ok('8 undefined queryContext → decision,budget,timeline,lens (no throw)',
     JSON.stringify(ids(chips)) === JSON.stringify(['decision', 'budget', 'timeline', 'lens']));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
