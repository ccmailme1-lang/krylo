// benchmark-score-routine.mjs -- scorer 1 over the frozen 20-query routine set (specs/benchmark/routine-query-set-v1-FROZEN-20261011.md), current build.
// Same rubric and the same mechanical rules (specs/benchmark/scoring-rules-m1.md, R2) as the 35-case benchmark; the domains each query names were recorded before scoring
// (specs/benchmark/routine-query-needs-v1-20261012.md). Output: routine-current-20261012-scores.json and routine-current-20261012-report.md. Reported separately from the other populations.
import fs from 'fs';
const M = process.env.ROUTINE_DIR ?? 'specs/benchmark/routine-current-20261012';
const QUERIES = JSON.parse(fs.readFileSync('specs/benchmark/routine-query-set-v1-queries.json', 'utf8'));
const NEEDS_BY_CASE = Object.fromEntries(QUERIES.map(q => [q.id, q.needs]));
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
  const needs = NEEDS_BY_CASE[rec.case].split('').map(c => DOM[c]);
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
fs.writeFileSync('specs/benchmark/routine-current-20261012-scores.json', JSON.stringify(rows, null, 2));
const cause = (r) => r.features.unresolved ? 'IDENTITY (subject unresolved)' : (r.features.covered.length === 0 ? 'NO_RATIFIED_SOURCE (no named domain has an admitted relationship type producing)' : 'FIXABLE_PIPELINE_DEFECT candidate: criteria lost ' + ['c1','c2','c3','c4','c5','c6','c7'].filter(k => r[k] < ({ c1: 2, c2: 2, c3: 1, c4: 2, c5: 1, c6: 1, c7: 1 })[k]).join(', '));
const pass = rows.filter(r => r.scale >= 8), strict = rows.filter(r => r.raw >= 8);
const L = ['# Routine-query set v1: current build scoring (scorer 1)', '', `Date 2026-10-12 · mechanical scorer, unchanged rubric and rules; independent blind scores are separate and outstanding.`, '',
  `**At or above 8 (rounded rule): ${pass.length} of ${rows.length}. At raw 8.0 or more (strict): ${strict.length} of ${rows.length}. Mean raw ${(rows.reduce((a, r) => a + r.raw, 0) / rows.length).toFixed(3)}.**`, '',
  '| ID | Subject | Domains named | Raw | Scale | Covered | Result |', '|---|---|---|---|---|---|---|',
  ...rows.map(r => `| ${r.case} | ${r.subject} | ${r.features.needs.join('+')} | ${r.raw.toFixed(1)} | ${r.scale} | ${r.features.covered.join('+') || 'none'} | ${r.scale >= 8 ? 'pass' : 'BELOW 8'} |`), '',
  '## Every case below 8, with its cause', '', ...(rows.filter(r => r.scale < 8).map(r => `- ${r.case} (${r.subject}, ${r.features.needs.join('+')}): raw ${r.raw.toFixed(1)}. ${cause(r)}`)), '',
  '## Integrity', '', `- Statements checked: ${rows.reduce((a, r) => a + (r.features.statements ?? 0), 0)}; statements that did not hold up: ${rows.reduce((a, r) => a + (r.features.problems ?? 0), 0)}.`,
  `- Analysis and MAP agree: ${rows.filter(r => r.features.mapAgrees).length} of ${rows.filter(r => !r.features.unresolved).length} resolved; History agrees: ${rows.filter(r => r.features.historyAgrees).length} of ${rows.filter(r => !r.features.unresolved).length}.`];
fs.writeFileSync('specs/benchmark/routine-current-20261012-report.md', L.join('\n'));
console.log(L.slice(0, 4).join('\n'));
