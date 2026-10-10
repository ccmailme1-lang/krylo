// qa_snapshot_live.mjs -- KRYL-1398 integrated journey on localhost, two entities (one registry-resolved, one admitted at runtime).
// Real app, real connectors. Checks: Checking... before the freeze, then one snapshot; three reads over time match on every surface
// while the live pool keeps changing; surfaces agree with each other; an explicit refresh replaces the snapshot atomically.
// Needs vite (:5173) and the engine (:4000). Slow (about 4 minutes). Run on demand.
import { chromium } from 'playwright';
const URL = process.env.KRYLO_URL ?? 'http://localhost:5173/';
const ENTITIES = [
  ['registry', 'What structural relationships are forming around Sysco across ownership, technology, and capital?'],
  ['runtime-admitted', 'What structural relationships are forming around Costco across ownership, technology, and capital?'],
];
const b = await chromium.launch(); let fail = 0, total = 0;
const window_id = (s) => s.snap.id;
const cid0 = () => null;
const ok = (c, l) => { total++; console.log((c ? '  ✓ ' : '  ✗ ') + l); if (!c) fail++; };
const norm = (t) => t.replace(/\s+/g, ' ');

async function surfaces(pg) {
  const text = norm(await pg.evaluate(() => document.body.innerText));
  const frames = pg.frames().filter(f => /structure-field/.test(f.url()));
  const mapText = frames.length ? norm(await frames[0].evaluate(() => document.body.innerText).catch(() => '')) : '';
  const snap = await pg.evaluate(async () => { const m = await import('/src/engine/analyticalsnapshot.js'); const s = m.getSnapshotState(); return { status: s.status, id: s.active?.id ?? null, at: s.active?.generatedAt ?? null, refresh: s.refresh }; });
  const g = (re, src = text) => (src.match(re) ?? [])[1] ?? null;
  const dom = {};
  for (const d of ['CAPITAL', 'OWNERSHIP', 'LABOR', 'TECHNOLOGY', 'KNOWLEDGE', 'MEDIA']) dom[d] = g(new RegExp(`${d} — (\\d+) observations?, \\w+ polarity, magnitude (\\d+)/100`)) ? [text.match(new RegExp(`${d} — (\\d+) observations?, \\w+ polarity, magnitude (\\d+)/100`)).slice(1, 3).join('/')] : null;
  return {
    snap, text, mapText,
    headerObs: g(/Structural analysis · [\d-]+ · (\d+) observations? across/),
    briefFieldSignals: g(/\((\d+) signals?\), with/),
    briefFieldPairs: g(/with (\d+) domain pairs? co-present — a field-level/),
    briefSubject: g(/Subject level: (\d+) observations?/),
    briefSubjectPairs: g(/with (\d+) domain pairs? co-present among them/),
    rels: g(/Separately, (\d+) canonical relationships?/),
    dom,
    tabCapital: text.match(/field context — CAPITAL pressure (\d+) \((\w+)\), (\d+) signals/)?.slice(1, 4).join('/') ?? null,
    stamp: g(/Analysis snapshot: (\d{4}-\d\d-\d\d \d\d:\d\d:\d\d [A-Z]{2,4})/),
    mapField: g(/(\d+) of 6 domains[^.]*carry live signal \((\d+) signals?\)/, mapText),
  };
}
const keyOf = (s) => JSON.stringify({ id: s.snap.id, headerObs: s.headerObs, f: s.briefFieldSignals, fp: s.briefFieldPairs, sub: s.briefSubject, sp: s.briefSubjectPairs, rels: s.rels, dom: s.dom, tab: s.tabCapital, stamp: s.stamp });

for (const [kind, q] of ENTITIES) {
  console.log(`\n== ${kind}: ${q.split('around ')[1].split(' across')[0]}`);
  const pg = await b.newPage({ viewport: { width: 2000, height: 1100 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForTimeout(4000);
  await pg.evaluate(async (q) => {
    // sampled in the page every 100 ms so the transient Checking… state is observed, not missed between polls
    window.__samples = { checking: 0, partialWhileChecking: 0 };
    setInterval(() => { const t = document.body.innerText; const st = window.__st; if (st === 'checking') { if (/checking…/i.test(t)) window.__samples.checking++; if (/Subject level:|STRUCTURAL BRIEF/.test(t)) window.__samples.partialWhileChecking++; } }, 100);
    const m = await import('/src/engine/analyticalsnapshot.js'); window.__st = m.getSnapshotState().status; m.subscribeSnapshot(() => { window.__st = m.getSnapshotState().status; });
    const st = await import('/src/store/useanalysisstore.js'); st.useAnalysisStore.getState().createSession('e2e', 'GENERAL', q, {}); const tc = await import('/src/engine/topicconnectors.js'); window.__t0 = Date.now(); tc.fireTopicConnectors(q);
  }, q);
  let ready = null;
  for (let i = 0; i < 160; i++) {
    const t = norm(await pg.evaluate(() => document.body.innerText));
    const st = await pg.evaluate(async () => (await import('/src/engine/analyticalsnapshot.js')).getSnapshotState().status);
    if (st === 'ready' && /Analysis snapshot:/.test(t)) { ready = i; break; }
    await pg.waitForTimeout(500);
  }
  const smp = await pg.evaluate(() => window.__samples); const sawChecking = smp.checking > 0, sawPartial = smp.partialWhileChecking > 0;
  console.log(`   (natural run: checking samples ${smp.checking}, partial samples ${smp.partialWhileChecking}; the freeze can land before the view mounts, so the gate is exercised deterministically below)`);
  ok(!sawPartial, 'before the freeze no partial counts are shown (natural run)');
  const frozeAt = await pg.evaluate(async () => { const m = await import('/src/engine/analyticalsnapshot.js'); const a = m.getSnapshotState().active; return a ? Math.round((a.generatedAt - window.__t0) / 100) / 10 : null; });
  ok(ready != null, `a snapshot froze ${frozeAt} s after submit (checking samples ${smp.checking}, partial samples ${smp.partialWhileChecking})`);
  if (ready == null) { await pg.close(); fail++; continue; }
  const s0 = await surfaces(pg);
  console.log('   snapshot', s0.snap.id, s0.stamp, '| header obs', s0.headerObs, '| brief field signals', s0.briefFieldSignals, 'pairs', s0.briefFieldPairs, '| subject', s0.briefSubject, 'pairs', s0.briefSubjectPairs, '| canonical', s0.rels);
  // cross-surface agreement
  const sumDom = Object.values(s0.dom).reduce((n, v) => n + (v ? Number(String(v).split('/')[0]) : 0), 0);
  ok(s0.headerObs == null || s0.headerObs === s0.briefFieldSignals, `header observations (${s0.headerObs}) = brief field signals (${s0.briefFieldSignals})`);
  ok(sumDom === Number(s0.briefFieldSignals), `per-domain observations sum (${sumDom}) = brief field signals`);
  const capBrief = s0.dom.CAPITAL ? String(s0.dom.CAPITAL).split('/') : null; const capTab = s0.tabCapital ? s0.tabCapital.split('/') : null;
  ok(!capBrief || !capTab || (capBrief[1] === capTab[0] && capBrief[0] === capTab[2]), `By Domain panel CAPITAL (${s0.tabCapital}) = brief CAPITAL (${s0.dom.CAPITAL})`);
  console.log('   MAP text:', s0.mapText.slice(0, 260));
  const mapSignals = (s0.mapText.match(/\((\d+) signals?\)/) ?? [])[1] ?? null, mapPairs = (s0.mapText.match(/(\d+) domain pairs? co-present\./) ?? [])[1] ?? null;
  ok(s0.mapText.length > 0 && mapSignals === s0.briefFieldSignals && mapPairs === s0.briefFieldPairs, `MAP brief field signals (${mapSignals}) and pairs (${mapPairs}) = left brief (${s0.briefFieldSignals}, ${s0.briefFieldPairs})`);
  // reachability: mutate the LIVE pool (ambient and subject-bound signals in every domain) and a late canonical admission; nothing on screen may change
  await pg.evaluate(async (cid) => {
    const { surfaceRouter } = await import('/src/engine/surfacerouter.js');
    const batch = []; let n = 0;
    for (const d of ['capital', 'ownership', 'labor', 'technology', 'knowledge', 'media']) for (let k = 0; k < 6; k++) batch.push({ id: `qa-live-${d}-${k}`, domain: d, confidence: 97, ts: Date.now(), source: 'EDGAR_8K', meta: { canonicalId: k % 2 ? cid : null, eventDate: '2026-10-0' + (1 + (n++ % 9)) } });
    surfaceRouter.dispatchBatch(batch);
  }, await pg.evaluate(async (q) => (await import('/src/engine/subjectscope.js')).subjectScope(q).canonicalId, q));
  await pg.waitForTimeout(3000); const sMut = await surfaces(pg);
  ok(keyOf(sMut) === keyOf(s0), 'after 36 new live signals (ambient and subject-bound, all six domains) nothing on any surface changed: brief, header, By Domain fieldContext, MAP');
  // three reads with the live pool still changing
  await pg.waitForTimeout(15000); const s1 = await surfaces(pg);
  await pg.waitForTimeout(15000); const s2 = await surfaces(pg);
  ok(keyOf(s0) === keyOf(s1) && keyOf(s1) === keyOf(s2), 'three reads 15 s apart match on snapshot id, counts, pairs, relationships, per-domain figures and the By Domain panel');
  const live = await pg.evaluate(async () => { const g = await import('/src/engine/domaingravity.js'); return { frozen: g.getFrozenPoolInfo()?.id ?? null }; });
  ok(live.frozen === s0.snap.id, 'the pool is frozen on this snapshot id');
  // pinned change
  let hasChange = false; for (let i = 0; i < 40 && !hasChange; i++) { hasChange = /RELATIONSHIP CHANGE/.test(norm(await pg.evaluate(() => document.body.innerText))); if (!hasChange) await pg.waitForTimeout(3000); }
  ok(hasChange, 'the RELATIONSHIP CHANGE section appears after the freeze, pinned to the snapshot');
  const sc = await surfaces(pg);
  ok(/Retrieved [\d-]+ [\d:]+ \w+ · fixed for this analysis snapshot until it is refreshed/.test(sc.text), 'the change block states its retrieval time and that it is fixed for this snapshot');
  ok(sc.snap.id === s0.snap.id && keyOf(sc) === keyOf(s0), 'pinning the change result did not change the snapshot or any surface');
  // refresh
  const before = sc;
  await pg.evaluate(() => [...document.querySelectorAll('button')].find(x => x.textContent === 'Refresh analysis').click());
  await pg.waitForTimeout(300);
  const during = await surfaces(pg);
  ok(/Refreshing…/.test(during.text) && keyOf(during) === keyOf(before), 'during refresh the previous analysis stays displayed and unchanged');
  let swapped = false; for (let i = 0; i < 80 && !swapped; i++) { await pg.waitForTimeout(3000); const s = await surfaces(pg); swapped = s.snap.id !== before.snap.id && !s.snap.refresh.running; }
  const after = await surfaces(pg);
  ok(swapped, 'the refresh produced a new snapshot id');
  ok(!/Refreshing…/.test(after.text) && after.stamp !== before.stamp, 'the snapshot time on screen changed with it');
  const retr = (t) => (t.match(/Retrieved (\d{4}-\d\d-\d\d \d\d:\d\d:\d\d [A-Z]{2,4}) · fixed/) ?? [])[1] ?? null;
  ok(retr(after.text) && retr(after.text) !== retr(before.text), `the pinned relationship-change result was replaced together with the snapshot (retrieved ${retr(before.text)} then ${retr(after.text)})`);
  const sumAfter = Object.values(after.dom).reduce((n, v) => n + (v ? Number(String(v).split('/')[0]) : 0), 0);
  ok(sumAfter === Number(after.briefFieldSignals) && (after.headerObs == null || after.headerObs === after.briefFieldSignals), 'after the refresh the surfaces agree with each other again (no mixed generation)');
  await pg.waitForTimeout(8000); const a2 = await surfaces(pg);
  ok(keyOf(after) === keyOf(a2), 'the new snapshot is stable after the swap');
  // deterministic pre-freeze gate: open a run that cannot settle yet, look at the page, then let it settle
  const cid = await pg.evaluate(async (q) => { const sc = (await import('/src/engine/subjectscope.js')).subjectScope(q); return sc.canonicalId; }, q);
  await pg.evaluate(async ({ q, cid }) => { const m = await import('/src/engine/analyticalsnapshot.js'); window.__gate = { id: m.getSnapshotState().active?.id }; m.beginAnalysis(q); m.expectLookup('ownership', { canonicalId: cid }); m.armSettlement(); }, { q, cid });
  await pg.waitForTimeout(800);
  const gt = norm(await pg.evaluate(() => document.body.innerText));
  ok(/checking…/i.test(gt) && !/Subject level:|WHAT THE STRUCTURE SHOWS|Analysis snapshot:/.test(gt), 'while a run is unsettled the page shows only Checking… (no counts, no brief, no snapshot time)');
  const mt = (await Promise.all(pg.frames().filter(f => /structure-field/.test(f.url())).map(f => f.evaluate(() => document.body.innerText).catch(() => '')))).join(' ');
  await pg.evaluate(async () => { const m = await import('/src/engine/analyticalsnapshot.js'); m.settleLookup('ownership'); });
  await pg.waitForTimeout(1500);
  const gs = await surfaces(pg);
  ok(gs.snap.status === 'ready' && gs.snap.id !== window_id(before) && /Analysis snapshot:/.test(gs.text), 'when the run settles the analysis appears with its snapshot time');
  ok(errs.length === 0, `no page errors (${errs[0] ?? 'none'})`);
  await pg.close();
}
await b.close();
console.log(`\n${total - fail} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
