// benchmark-score.mjs -- scorer 1 for benchmark v1 (specs/planning-pass-benchmark-matching-store-20261011.md, A4/A6).
// Applies the frozen rubric to each captured analysis with the operational rules recorded in specs/benchmark/scoring-rules.md.
// Reads specs/benchmark/baseline/<case>.md and index.json; writes specs/benchmark/baseline-scores.json; prints one table.
import fs from 'fs';
const DIR = process.argv[2] ?? 'specs/benchmark/baseline';
const OUT = process.argv[3] ?? 'specs/benchmark/baseline-scores.json';
const idx = JSON.parse(fs.readFileSync(`${DIR}/index.json`, 'utf8'));
// Domains each frozen question concerns (O ownership, C capital, T technology, K knowledge, L labor, M media).
const NEEDS = { 1: 'OCT', 2: 'O', 3: 'C', 4: 'CO', 5: 'T', 6: 'LC', 7: 'O', 8: 'KTC', 9: 'MC', 10: 'OC', 11: 'OCTKLM', 12: 'OCTKLM' };
const rows = [];
for (const rec of idx) {
  const md = fs.readFileSync(`${DIR}/${rec.case}.md`, 'utf8');
  const page = md.split('## Delivered analysis (page text)')[1].split('## MAP brief text')[0];
  const count = (re) => (page.match(re) ?? []).length;
  const unresolved = /Subject selected: .* Its entity is not resolved/.test(page);
  const subjectBound = /Subject level: (\d+) observation/.test(page) ? Number(page.match(/Subject level: (\d+) observation/)[1]) : 0;
  const typeRe = /— (HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE|ACQUIRED|SHARED_PATENT_ASSIGNMENT|CAPITAL_EVENT_INVOLVES)\n/g;
  const types = new Set([...page.matchAll(typeRe)].map(m => m[1]));
  const admittedLines = count(typeRe);
  const changeShown = /RELATIONSHIP CHANGE/.test(page) && /Retrieval basis|nothing to compare/.test(page);
  const accessionLines = count(/\b\d{10}-\d{2}-\d{6}\b/g);
  const c = {};
  c.c1 = unresolved ? 0 : (subjectBound > 0 ? 2 : 1);                        // subject alignment 0-2
  const needs = NEEDS[rec.question]; const asksOwnership = needs.includes('O');
  c.c2 = (admittedLines === 0 || unresolved || !asksOwnership) ? 0 : (needs === 'O' ? 2 : 1);   // relationship coverage and admission 0-2: only the ownership type is admitted from live filings
  c.c3 = 0;                                                                  // formation integrity 0-1: formation is built from the signal pool, not admitted relationships
  c.c4 = (admittedLines > 0 && changeShown && asksOwnership) ? 1 : 0;                         // structural depth and synthesis 0-2: 2 needs synthesis across admitted relationships (none exists at baseline)
  c.c5 = (accessionLines >= 3 && !unresolved) ? 1 : 0;                       // evidence attribution and traceability 0-1
  c.c6 = unresolved ? 0 : (changeShown ? 1 : 0);                             // temporal correctness and coverage honesty 0-1
  c.c7 = (rec.snapshotReady && rec.pageErrors.length === 0 && !unresolved) ? 0.5 : 0; // consistency 0-1: Analysis/MAP half; the History half is 0 at baseline
  const raw = Object.values(c).reduce((a, b) => a + b, 0);
  rows.push({ case: rec.case, subject: rec.subject, q: rec.question, ...c, raw, scale: Math.max(1, Math.round(raw)), features: { unresolved, subjectBound, admittedLines, types: [...types], changeShown, accessionLines } });
}
fs.writeFileSync(OUT, JSON.stringify(rows, null, 2));
const pad = (v, n) => String(v).padEnd(n);
console.log(pad('case', 5), pad('subject', 18), pad('Q', 3), 'c1  c2  c3  c4  c5  c6  c7  | raw  scale');
for (const r of rows) console.log(pad(r.case, 5), pad(r.subject, 18), pad(r.q, 3), [r.c1, r.c2, r.c3, r.c4, r.c5, r.c6, r.c7].map(v => pad(v, 3)).join(' '), '|', pad(r.raw, 4), r.scale);
const dist = {}; for (const r of rows) dist[r.scale] = (dist[r.scale] ?? 0) + 1;
console.log('\ndistribution (scale: cases):', JSON.stringify(dist), ' mean raw', (rows.reduce((a, r) => a + r.raw, 0) / rows.length).toFixed(2));
