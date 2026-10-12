// ratified3-live-check.mjs -- live check through the real page for the three capabilities ratified 2026-10-12: Form D identity, Form D officers and directors, clinical-trial sponsorship.
import { chromium } from 'playwright';
const subjects = (process.env.SUBJECTS ?? 'Databento,Integrated Biosciences,Daytona,Anduril,Boston Scientific,Oracle').split(',');
const b = await chromium.launch();
for (const name of subjects) {
  const pg = await b.newPage({ viewport: { width: 2000, height: 1150 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForTimeout(3500);
  const q = `What structural relationships are forming around ${name} across technology, ownership, and labor?`;
  await pg.evaluate(async (q) => { const st = await import('/src/store/useanalysisstore.js'); st.useAnalysisStore.getState().createSession('r', 'GENERAL', q, {}); const tc = await import('/src/engine/topicconnectors.js'); tc.fireTopicConnectors(q); }, q);
  for (let i = 0; i < 200; i++) { await pg.waitForTimeout(500); const r = await pg.evaluate(async (qq) => { const m = await import('/src/engine/analyticalsnapshot.js'); const s = m.getSnapshotState(); return s.status === 'ready' && s.active?.query === qq; }, q); if (r) break; }
  await pg.waitForTimeout(9000);
  const info = await pg.evaluate(async (q) => {
    const sc = (await import('/src/engine/subjectscope.js')).subjectScope(q);
    let probe = null; try { probe = await (await import('/src/engine/benchmarkprobe.js')).probeActiveAnalysis(); } catch (e) { probe = { error: String(e?.message ?? e).slice(0, 100) }; }
    const m = await import('/src/engine/analyticalsnapshot.js'); const lk = (m.getSnapshotState().active?.lookups ?? []).map(l => `${l.kind}:${l.state}`).join(' ');
    return { kind: sc.kind, entity: sc.entity?.name ?? sc.subject?.text, cls: sc.entity?.admissionClass ?? null, cik: sc.entity?.identifiers?.edgar ?? null, probe, lk };
  }, q);
  const text = await pg.evaluate(() => document.body.innerText);
  const p = info.probe ?? {};
  console.log(`\n${name}: ${info.kind} ${info.entity ?? ''} class=${info.cls ?? 'registry/listed'} cik=${info.cik ?? 'none'} | relationships=${p.relationships ?? 0} byType=${JSON.stringify(p.byType ?? {})} domains=${(p.admittedDomains ?? []).join('+')} linked=${(p.linkedDomains ?? []).join('+') || 'none'} historySame=${p.historyRelationships === p.relationships} synthProblems=${p.synthesisValidation?.problems?.length ?? 'n/a'} errors=${errs.length}`);
  console.log(`   lookups: ${info.lk}`);
  console.log(`   identity label on page: ${/IDENTITY: SEC CIK .* private SEC filer \(Form D\), not listed/.test(text)} | "is stated as" lines: ${(text.match(/is stated as (a director|an executive officer) of/g) ?? []).length} | "lead sponsor of clinical trial" lines: ${(text.match(/is the lead sponsor of clinical trial/g) ?? []).length} | unresolved message: ${/Its entity is not resolved/.test(text)}`);
  await pg.close();
}
await b.close();
