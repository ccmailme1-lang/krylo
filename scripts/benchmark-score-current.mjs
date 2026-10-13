// benchmark-score-m1.mjs -- scorer 1 for benchmark v1, MILESTONE 1 (the complete architecture, capital-event admission through History).
// Same 35 cases, same 10-point rubric, same one-scorer method as the baseline; the operational rules are in specs/benchmark/scoring-rules-m1.md.
// The baseline (specs/benchmark/baseline*, baseline-scores.json) is read, never written. Output: milestone1-scores.json and milestone1-report.md.
import fs from 'fs';
const B = 'specs/benchmark/baseline', M = process.env.CURRENT_DIR ?? 'specs/benchmark/current-20261012';
const base = JSON.parse(fs.readFileSync('specs/benchmark/baseline-scores.json', 'utf8'));
const NEEDS = { 1: 'OCT', 2: 'O', 3: 'C', 4: 'CO', 5: 'T', 6: 'LC', 7: 'O', 8: 'KTC', 9: 'MC', 10: 'OC', 11: 'OCTKLM', 12: 'OCTKLM' };
const DOM = { O: 'OWNERSHIP', C: 'CAPITAL', T: 'TECHNOLOGY', K: 'KNOWLEDGE', L: 'LABOR', M: 'MEDIA' };
const norm = (t) => String(t ?? '').toLowerCase().replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
function scoreRun(dir, rules) {
  const idx = JSON.parse(fs.readFileSync(`${dir}/index.json`, 'utf8'));
  const rows = [];
  for (const rec of idx) {
  const md = fs.readFileSync(`${dir}/${rec.case}.md`, 'utf8');
  const page = md.split('## Delivered analysis (page text)')[1].split('## MAP brief text')[0];
  const mapText = (md.split('## MAP brief text')[1] ?? '');
  const probe = rec.probe ?? {}; const unresolved = /Subject selected: .* Its entity is not resolved/.test(page) || probe.unresolved === true;
  const needs = NEEDS[rec.question].split('').map(c => DOM[c]);
  const subjectBound = /Subject level: (\d+) observation/.test(page) ? Number(page.match(/Subject level: (\d+) observation/)[1]) : 0;
  const admitted = probe.admittedDomains ?? []; const covered = needs.filter(d => admitted.includes(d));
  const linkedNeeds = (probe.linkedDomains ?? []).filter(d => needs.includes(d));
  const hasSynthesis = /SYNTHESIS/.test(page) && (probe.synthesisValidation?.statements ?? 0) > 0;
  const problems = probe.synthesisValidation?.problems?.length ?? 0; const supported = probe.synthesisCounts?.SUPPORTED ?? 0;
  const changeShown = /RELATIONSHIP CHANGE/.test(page) && /Retrieval basis|nothing to compare/.test(page);
  const accessionLines = (page.match(/\b\d{10}-\d{2}-\d{6}\b/g) ?? []).length;
  const mapFormation = (() => { const lines = String(mapText ?? '').split('\n').map(x => x.trim()); const end = lines.findIndex(x => /^structural resolution field$/i.test(x)); let i = -1; for (let k = 0; k < (end < 0 ? 0 : end); k++) if (/^formation$/i.test(lines[k])) i = k; return i < 0 ? '' : norm(lines.slice(i + 1, end).join(' ')); })();   // the Formation row: the last 'FORMATION' label line before the field
  const mapAgrees = !!probe.analysisSentence && mapFormation.startsWith(norm(probe.analysisSentence).slice(0, 60));
  const historyAgrees = !!probe.historySentence && probe.historySentence === probe.analysisSentence && probe.historyRelationships === probe.relationships;
  const c = {};
  c.c1 = unresolved ? 0 : (subjectBound > 0 ? 2 : 1);
  c.c2 = unresolved || !covered.length ? 0 : (covered.length === needs.length ? 2 : 1);
  c.c3 = unresolved ? 0 : 1;
  // R1 (first run): depth 0 without a synthesis or with unsupported labels; 2 when every needed domain is covered and (cross-domain: the needed domains are linked / single domain: a supported statement).
  // R2 (final run): additionally 0 when no needed domain is covered (a synthesis unrelated to the question earns no depth), and 2 only when the synthesis also connects relationships
  // (a formation link, a recurring counterparty, a holder who is also a counterparty, or an inference): listing facts is depth 1.
  const synText = (page.split('SYNTHESIS')[1] ?? '').split('WHAT THE STRUCTURE SHOWS')[0];
  const connective = (synText.match(/connect \d+ domains|is named as a counterparty in|appears both as a disclosed holder|(^|\n)\s*INFERRED/g) ?? []).length;
  const guard = rules === 'R2';
  c.c4 = unresolved || !hasSynthesis || problems > 0 || (guard && covered.length === 0) ? 0 : ((covered.length === needs.length && (needs.length >= 2 ? linkedNeeds.length >= 2 : supported >= 1) && (!guard || connective >= 1)) ? 2 : 1);
  c.c5 = (!unresolved && problems === 0 && hasSynthesis && accessionLines >= 3) ? 1 : 0;
  c.c6 = unresolved ? 0 : (changeShown ? 1 : 0);
  c.c7 = (rec.snapshotReady && rec.pageErrors.length === 0 && !unresolved && mapAgrees ? 0.5 : 0) + (historyAgrees ? 0.5 : 0);
  const raw = Object.values(c).reduce((a, b) => a + b, 0);
  rows.push({ case: rec.case, subject: rec.subject, q: rec.question, ...c, raw, scale: Math.max(1, Math.round(raw)), features: { connective, unresolved, needs, admitted, covered, linked: probe.linkedDomains ?? [], relationships: probe.relationships ?? 0, hasSynthesis, problems, statements: probe.synthesisValidation?.statements ?? 0, supported, mapAgrees, historyAgrees, accessionLines, admission: probe.admission ?? null } });
}
  return rows;
}
const rows = scoreRun(M, 'R2');
const run1 = [];
fs.writeFileSync(`${process.env.OUT_PREFIX ?? 'specs/benchmark/current-20261012'}-scores.json`, JSON.stringify(rows, null, 2));

// ── comparison
const bmap = new Map(base.map(r => [r.case, r]));
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; const f1 = (x) => x.toFixed(1);
const dist = (arr) => { const d = {}; for (const r of arr) d[r.scale] = (d[r.scale] ?? 0) + 1; return d; };
const meanB = mean(base.map(r => r.raw)), meanM = mean(rows.map(r => r.raw));
const reach = (arr) => arr.filter(r => r.scale >= 8).length;
let L = [];
L.push('# Benchmark v1: current build report (complete architecture, capital-event admission through History)', '');
L.push(`Date: ${new Date().toISOString().slice(0, 10)} · Build: commit 232b703 plus the working tree · Environment: localhost (Dev) · Matrix, questions and rubric: the frozen v1 set (planning-pass-benchmark-matching-store-20261011.md, A6). Scorer 1 only; the independent second reviewer's scores are outstanding and are kept separate. The baseline (specs/benchmark/baseline*, baseline-scores.json) is unchanged.`, '');
L.push('## Headline', '');
L.push(`| | Baseline | Current build 2026-10-12 | Change |`, `|---|---|---|---|`);
L.push(`| Mean raw score (0 to 10) | ${f1(meanB)} | ${f1(meanM)} | ${meanM - meanB >= 0 ? '+' : ''}${f1(meanM - meanB)} |`);
L.push(`| Mean, unrounded | ${meanB.toFixed(3)} | ${meanM.toFixed(3)} | ${(meanM - meanB >= 0 ? '+' : '') + (meanM - meanB).toFixed(3)} |`);
L.push(`| Distribution (1 to 10 scale: cases) | ${JSON.stringify(dist(base))} | ${JSON.stringify(dist(rows))} | |`);
L.push(`| Cases at or above 8 (the release target) | ${reach(base)} of 35 | ${reach(rows)} of 35 | ${reach(rows) - reach(base) >= 0 ? '+' : ''}${reach(rows) - reach(base)} |`);
L.push(`| Question 1 cases, mean raw | ${f1(mean(base.filter(r => r.q === 1).map(r => r.raw)))} | ${f1(mean(rows.filter(r => r.q === 1).map(r => r.raw)))} | |`, '');
L.push('## By criterion (mean points; maximum in brackets)', '', '| Criterion | Baseline | Current build 2026-10-12 |', '|---|---|---|');
const crit = [['c1', 'Subject alignment [2]'], ['c2', 'Relationship coverage and admission [2]'], ['c3', 'Formation integrity [1]'], ['c4', 'Structural depth and synthesis [2]'], ['c5', 'Evidence attribution and traceability [1]'], ['c6', 'Temporal correctness and coverage honesty [1]'], ['c7', 'Consistency across Analysis, MAP and History [1]']];
for (const [k, n] of crit) L.push(`| ${n} | ${f1(mean(base.map(r => r[k])))} | ${f1(mean(rows.map(r => r[k])))} |`);
L.push('', '## By case', '', '| Case | Subject | Q | Baseline | Now | Change | Coverage now (needed domains with an admitted relationship) |', '|---|---|---|---|---|---|---|');
for (const r of rows) { const b = bmap.get(r.case); L.push(`| ${r.case} | ${r.subject} | ${r.q} | ${f1(b.raw)} | ${f1(r.raw)} | ${r.raw - b.raw >= 0 ? '+' : ''}${f1(r.raw - b.raw)} | ${r.features.covered.length}/${r.features.needs.length}${r.features.unresolved ? ' (subject not resolved)' : ''} |`); }
L.push('', '## By question', '', '| Q | Cases | Baseline mean | Now mean | Change |', '|---|---|---|---|---|');
for (const q of [...new Set(rows.map(r => r.q))].sort((a, b) => a - b)) { const a = rows.filter(r => r.q === q), bb = base.filter(r => r.q === q); L.push(`| ${q} | ${a.length} | ${f1(mean(bb.map(r => r.raw)))} | ${f1(mean(a.map(r => r.raw)))} | ${mean(a.map(r => r.raw)) - mean(bb.map(r => r.raw)) >= 0 ? '+' : ''}${f1(mean(a.map(r => r.raw)) - mean(bb.map(r => r.raw)))} |`); }
L.push('', '## By domain: cases (of 35) in which an admitted relationship covers the domain', '', '| Domain | Baseline | Current build 2026-10-12 |', '|---|---|---|');
for (const d of Object.values(DOM)) { const nb = d === 'OWNERSHIP' ? base.filter(r => r.features.admittedLines > 0).length : 0; const nm = rows.filter(r => r.features.admitted.includes(d)).length; L.push(`| ${d} | ${nb} | ${nm} |`); }
L.push('', 'Baseline admitted only ownership-disclosure relationships (the only type produced from live evidence). TECHNOLOGY, KNOWLEDGE, LABOR and MEDIA still have no admitted relationship type.', '');
const up = rows.filter(r => r.raw - bmap.get(r.case).raw >= 1), down = rows.filter(r => r.raw - bmap.get(r.case).raw <= -1), same = rows.filter(r => Math.abs(r.raw - bmap.get(r.case).raw) < 1);
L.push('## Material changes', '', `- Improved by 1 point or more: ${up.length} cases (${up.map(r => r.case).join(', ') || 'none'}).`, `- Regressed by 1 point or more: ${down.length} cases (${down.map(r => r.case).join(', ') || 'none'}).`, `- Within 1 point: ${same.length} cases.`);
L.push('', '## Synthesis labels against their evidence, and Analysis / MAP / History agreement', '');
const withSyn = rows.filter(r => r.features.statements > 0);
L.push(`- Statements checked: ${withSyn.reduce((n, r) => n + r.features.statements, 0)} across ${withSyn.length} cases. Statements whose status or evidence did not hold up: ${withSyn.reduce((n, r) => n + r.features.problems, 0)}${withSyn.some(r => r.features.problems) ? ' (' + withSyn.filter(r => r.features.problems).map(r => r.case).join(', ') + ')' : ''}.`);
const res = rows.filter(r => !r.features.unresolved);
L.push(`- Analysis and MAP show the same formation: ${res.filter(r => r.features.mapAgrees).length} of ${res.length} resolved cases.`, `- History rebuilt from the store shows the same formation and relationship count as Analysis: ${res.filter(r => r.features.historyAgrees).length} of ${res.length} resolved cases.`);
L.push('', '## Cases not at the target, and why', '', 'Most remaining points are lost on relationship coverage: only OWNERSHIP and CAPITAL have admitted relationship types, so any question about TECHNOLOGY, KNOWLEDGE, LABOR or MEDIA scores 0 on coverage, and multi-domain questions cover at most two of their domains. Questions that open with "Across" still select that word as the subject (C07, C11).', '');
const p1 = run1.reduce((n, r) => n + r.features.problems, 0);
// (run 1 section omitted in the current-build scoring)
L.push('## Limits stated', '', '- Scorer 1 is mechanical (rules in scoring-rules-m1.md) and sees only what is on the page and in the probe; it cannot judge the quality of a synthesis beyond whether its labels are supported by its evidence. The independent reviewer\'s scores on the eight designated cases (C01, C04, C08, C13, C17, C20, C25, C29) are outstanding and are not mixed with these.', '- The file store (as-diff/data/canonical_store.jsonl) is the effective durable store in this environment: PostgreSQL is not reachable on this machine, and the engine\'s code notes it was unreachable from the VPS on 2026-10-03.', '- Capture method as for the baseline: one page session per subject, a new snapshot per case, SEC documents and stored history reused within a subject; run on localhost. Nothing is deployed and /v1/canonical-store is not exposed in production.', '- Cases ran grouped by subject, not strictly C01 to C35 (as in the baseline).', '');
fs.writeFileSync(`${process.env.OUT_PREFIX ?? 'specs/benchmark/current-20261012'}-report.md`, L.join('\n'));
console.log(L.slice(0, 22).join('\n'));
