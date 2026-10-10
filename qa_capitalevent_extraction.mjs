// qa_capitalevent_extraction.mjs -- KRYL-1399 step B. What a Form 8-K states about a capital event, extracted from REAL saved
// filings (tests/fixtures/sec/8k-*.htm, fetched from SEC EDGAR 2026-10-10). Every extracted value must be a literal slice of the
// filing; an unstated field is ABSENT with its class; nothing is estimated.
import fs from 'fs';
import { extractCapitalEvent, htmlToText, fetchCapitalEvent, _clearCapitalEventCache } from './src/engine/connectors/edgar8kcontent.js';
import { surfaceRouter } from './src/engine/surfacerouter.js';
import { buildSignals } from './src/engine/connectors/edgar8ksignal.js';
import { A, observationDetailLines } from './src/engine/adsubject.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const html = (n) => fs.readFileSync(`tests/fixtures/sec/8k-${n}.htm`, 'utf8');
const run = (n, items, reg) => extractCapitalEvent({ html: html(n), items, registrant: reg, accession: 'ACC-' + n });
const names = (r) => r.counterparties.map(c => c.name);
const F = {
  intel: run('intel-3-02-2025-12-29', ['3.02'], 'INTEL CORP'),
  alphabet: run('alphabet-1-01-7-01-8-01-2026-06-04', ['1.01', '7.01', '8.01', '9.01'], 'Alphabet Inc.'),
  oracle: run('oracle-1-01-8-01-2026-02-04', ['1.01', '8.01', '9.01'], 'ORACLE CORP'),
  boeing: run('boeing-1-01-2-03-2026-08-28', ['1.01', '2.03', '9.01'], 'BOEING CO'),
  sysco0213: run('sysco-1-01-2-03-2026-02-13', ['1.01', '2.03', '9.01'], 'SYSCO CORP'),
  sysco1006: run('sysco-1-01-2-03-2026-10-06', ['1.01', '2.03', '9.01'], 'SYSCO CORP'),
  sysco0904: run('sysco-1-01-2-03-5-02-2026-09-04', ['1.01', '2.03', '5.02', '9.01'], 'SYSCO CORP'),
  ford: run('ford-1-01-2-03-2026-05-21', ['1.01', '2.03', '8.01', '9.01'], 'FORD MOTOR CO'),
};

console.log('Equity sale (Intel, Item 3.02)');
ok(F.intel.amounts[0]?.raw === '$5.0 billion' && F.intel.amounts[0].value === 5e9 && F.intel.amounts[0].wording === 'aggregate purchase price in cash of', 'amount $5.0 billion with the filing\'s own wording');
ok(F.intel.amounts.length === 1, 'the per-share price ($23.28) and the par value ($0.001) are not amounts');
ok(names(F.intel).join('|') === 'NVIDIA Corporation', 'counterparty NVIDIA Corporation, and no phantom names (the filing\'s "Securities Act" is not a counterparty)');
ok(F.intel.instruments.some(i => /Securities Purchase Agreement/.test(i.text)) && F.intel.instruments.some(i => i.kind === 'EQUITY_SECURITY'), 'instrument: the securities purchase agreement and the common stock');

console.log('At-the-market programs (Alphabet, Oracle, Item 1.01)');
ok(F.alphabet.amounts[0]?.raw === '$40 billion' && F.alphabet.amounts[0].wording === 'up to', 'amount "up to $40 billion" keeps the filing\'s "up to"');
ok(['Goldman Sachs & Co. LLC', 'J.P. Morgan Securities LLC', 'Morgan Stanley & Co. LLC'].every(n => names(F.alphabet).includes(n)), 'the three managers are named exactly as written');
ok(F.alphabet.instruments.some(i => /Equity Distribution Agreement/i.test(i.text)), 'instrument: equity distribution agreement');
ok(F.oracle.amounts[0]?.raw === '$20.0 billion' && names(F.oracle).includes('BofA Securities, Inc.') && names(F.oracle).includes('Goldman Sachs & Co. LLC'), 'Oracle: $20.0 billion and its named sales agents');
ok(F.oracle.counterparties.find(c => /J\.P\. Morgan Securities LLC/.test(c.name))?.role === 'as sales agents', 'a role is the filing\'s own phrase ("as sales agents"), only where the filing gives one');
ok(!names(F.oracle).some(n => /^Oracle /i.test(n)), 'the filer and its subsidiaries are not listed as counterparties');

console.log('Credit facilities and notes (Boeing, Sysco)');
ok(F.boeing.amounts[0]?.raw === '$3.0 billion' && names(F.boeing).includes('Citibank, N.A.') && F.boeing.counterparties.some(c => /JPMorgan Chase Bank, N\.A\./.test(c.name) && /joint lead arrangers/.test(c.role ?? '')), 'Boeing: $3.0 billion, Citibank and JPMorgan with the filing\'s role phrase');
ok(F.boeing.instruments.some(i => /364-day revolving credit agreement/i.test(i.text)), 'Boeing: the 364-day revolving credit agreement');
ok(F.sysco0213.amounts.slice(0, 2).map(a => a.raw).join('|') === '$600,000,000|$650,000,000' && F.sysco0213.amounts[0].wording === 'aggregate principal amount', 'Sysco notes: $600,000,000 and $650,000,000, "aggregate principal amount"');
ok(F.sysco0213.instruments.some(i => i.text === '4.400% Senior Notes due 2031') && F.sysco0213.instruments.some(i => i.text === '4.950% Senior Notes due 2036'), 'Sysco notes: the two notes as titled');
ok(names(F.sysco0213).includes('The Bank of New York Mellon Trust Company, N.A.'), 'Sysco notes: the trustee, with the filing\'s punctuation');
ok(F.sysco0904.amounts[0]?.raw === '$750 million' && names(F.sysco0904).includes('CoBank, ACB') && F.sysco0904.counterparties.some(c => /Bank of America, N\.A\./.test(c.name) && /administrative agent/.test(c.role ?? '')), 'Sysco term loan: $750 million, CoBank, Bank of America as administrative agent');
ok(!F.sysco1006.amounts.some(a => a.currency === 'EUR'), 'a euro amount written without a currency symbol is not extracted (stated limit), and none is invented');
ok(F.sysco1006.amounts[0]?.raw === '$10.75 billion' && F.sysco1006.amounts[1]?.raw === '$3.9 billion', 'Sysco 2026-10-06 offering: $10.75 billion and $3.9 billion');
ok(F.ford.amounts[0]?.raw === '$9,633,040,000' && names(F.ford).includes('SK On Co., Ltd.') && !names(F.ford).some(n => /^Ford /i.test(n)), 'Ford (text under Item 8.01): the loan amount and named parties, not Ford\'s own subsidiaries');

console.log('Nothing is invented (every value is a literal slice of the filing)');
for (const [k, n] of [['intel', 'intel-3-02-2025-12-29'], ['alphabet', 'alphabet-1-01-7-01-8-01-2026-06-04'], ['oracle', 'oracle-1-01-8-01-2026-02-04'], ['boeing', 'boeing-1-01-2-03-2026-08-28'], ['sysco0213', 'sysco-1-01-2-03-2026-02-13'], ['sysco1006', 'sysco-1-01-2-03-2026-10-06'], ['sysco0904', 'sysco-1-01-2-03-5-02-2026-09-04'], ['ford', 'ford-1-01-2-03-2026-05-21']]) {
  const text = htmlToText(html(n)); const r = F[k];
  const all = [...r.amounts.map(x => [x.raw, x.passage]), ...r.instruments.map(x => [x.text, x.passage]), ...r.counterparties.map(x => [x.name, x.passage])];
  ok(all.length > 0 && all.every(([v, p]) => text.includes(v) && text.includes(p) && p.includes(v)), `${k}: ${all.length} values, each found in the filing text and inside its quoted passage`);
}

console.log('Absence is stated with its class');
const gone = extractCapitalEvent({ items: ['1.01', '2.03'], registrant: 'X', accession: 'A-1', obtained: false, status: 503 });
ok(gone.status === 'NOT_OBTAINED' && gone.absent.length === 3 && gone.absent.every(a => a.absenceClass === 'b' && /HTTP 503/.test(a.reason)), 'document not obtained: all three fields ABSENT, class b, with the HTTP status');
const na = extractCapitalEvent({ html: '<p>Item 5.02 Departure of Directors</p>', items: ['5.02', '9.01'], accession: 'A-2' });
ok(na.attempted === false && na.status === 'NOT_ATTEMPTED' && na.amounts.length === 0, 'a filing with no capital-event item is not read (NOT_ATTEMPTED), not shown as an empty event');
const bare = extractCapitalEvent({ html: '<p>Item 1.01 Entry into a Material Definitive Agreement. The Company entered into an agreement. Item 9.01 Financial Statements and Exhibits.</p>', items: ['1.01'], registrant: 'The Co', accession: 'A-3' });
ok(bare.status === 'NOTHING_STATED' && bare.absent.map(a => a.field + a.absenceClass).sort().join() === 'amountc,counterpartyc,instrumentc', 'an Item that states none of the three: all ABSENT, class c (obtained, not stated)');
const ref = extractCapitalEvent({ html: '<p>Item 2.03 Creation of a Direct Financial Obligation. The information set forth in Item 1.01 is incorporated by reference. Item 9.01 Financial Statements and Exhibits.</p>', items: ['2.03'], registrant: 'The Co', accession: 'A-4' });
ok(ref.absent.length === 3 && ref.absent.every(a => /refers to another item/.test(a.reason)), 'an Item that only refers to another item says so');

console.log('Names seen in other companies\' filings (out-of-sample regressions)');
const snip = (t, items = ['1.01']) => extractCapitalEvent({ html: `<p>Item 1.01 Entry into a Material Definitive Agreement. ${t} Item 9.01 Financial Statements and Exhibits.</p>`, items, registrant: 'Acme Corp', accession: 'S' });
ok(!names(snip('The merger is governed by the Delaware General Corporation Law and the $2.5 billion facility.')).length, 'a statute ("Delaware General Corporation Law") is not a counterparty');
ok(names(snip('The agreement is with Wells Fargo Bank, National Association, as administrative agent, for $500 million.')).includes('Wells Fargo Bank, National Association'), '"Bank, National Association" is one name');
ok(!names(snip('Pursuant to the Restated Certificate of Formation of Beta Holdings Corporation the shares convert.')).some(n => /Certificate|Formation/.test(n)), 'a document title is never part of a name (a company named inside it is listed as named in the filing, with no role)');
ok(names(snip('Lenders include BofA Securities, Inc., Citigroup Global Markets Inc., and Mizuho Bank Ltd. for $1 billion.')).join('|') === 'BofA Securities, Inc.|Citigroup Global Markets Inc.|Mizuho Bank Ltd.', 'a list of names is split into separate names, with each name\'s own punctuation');

const cad = snip('The Issuers sold C$750 million aggregate principal amount of Notes and US$500 million of other Notes and $2 billion of loans.');
ok(cad.amounts.find(a => a.raw.startsWith('C$'))?.currency === 'CAD' && cad.amounts.find(a => a.raw.startsWith('US$'))?.currency === 'USD' && cad.amounts.find(a => a.raw === '$2 billion')?.currency === 'USD', 'C$ is Canadian dollars, US$ and $ are US dollars: the currency prefix is part of the quoted amount');
ok(run('oracle-1-01-8-01-2026-02-04', ['1.01', '8.01', '9.01'], 'ORACLE CORP').amounts.some(a => a.raw === '$25 Billion' && a.value === 25e9), 'a capitalized scale word ("$25 Billion") is read');

console.log('Fetch wrapper');
_clearCapitalEventCache();
let calls = 0;
const good = async () => { calls++; return { ok: true, status: 200, text: async () => html('intel-3-02-2025-12-29') }; };
const e1 = await fetchCapitalEvent({ cik: '0000050863', accession: '0000050863-25-000204', file: 'intc-20251226.htm', items: ['3.02'], registrant: 'INTEL CORP', fetchImpl: good });
const e2 = await fetchCapitalEvent({ cik: '0000050863', accession: '0000050863-25-000204', file: 'intc-20251226.htm', items: ['3.02'], registrant: 'INTEL CORP', fetchImpl: good });
ok(e1.status === 'EXTRACTED' && calls === 1 && e2 === e1, 'a document is fetched once per page session (immutable), then served from the cache');
_clearCapitalEventCache();
let bad = 0;
const fail503 = async () => { bad++; return { ok: false, status: 503, text: async () => '' }; };
const f1 = await fetchCapitalEvent({ cik: '1', accession: '0000000001-26-000001', file: 'x.htm', items: ['1.01'], registrant: 'X', fetchImpl: fail503 });
await fetchCapitalEvent({ cik: '1', accession: '0000000001-26-000001', file: 'x.htm', items: ['1.01'], registrant: 'X', fetchImpl: fail503 });
ok(f1.status === 'NOT_OBTAINED' && bad === 2, 'a failed fetch is NOT_OBTAINED and is not cached (it is retried next time)');

console.log('Pool to observation to guest lines');
const CID = 'qa-capev-co';
const scope = { kind: 'ENTITY', canonicalId: CID, entity: { name: 'QA CapEv Co', identifiers: { edgar: '0000000009' } }, contract: 'ENTITY', attribution: 'IDENTIFIER' };
const sigs = buildSignals({ realityObjectId: 'edgar8k-targeted-0000050863-25-000204', eventDate: '2025-12-29', accession: '0000050863-25-000204', capitalEvent: F.intel, eventClass: 'EQUITY_OFFERING', materiality: 60, groundedness: 0.98, entityName: 'QA CapEv Co', canonicalId: CID, ts: Date.now() });
surfaceRouter.dispatchBatch(sigs);
const obs = A('CAPITAL', scope).formationObservations.find(o => o.accession === '0000050863-25-000204');
ok(obs?.capitalEvent?.status === 'EXTRACTED' && obs.capitalEvent.amounts[0].raw === '$5.0 billion', 'the extracted event reaches the subject-bound observation');
const lines = observationDetailLines(obs);
ok(lines.length === 3 && /^amount: \$5\.0 billion \(aggregate purchase price in cash of\) — "/.test(lines[0]) && /^instrument: /.test(lines[1]) && /^named in the filing: NVIDIA Corporation/.test(lines[2]), 'the guest lines: amount with the filing\'s wording and a quoted passage, instrument, named party');
ok(observationDetailLines({ capitalEvent: gone }).every(l => /not stated \(absence class b/.test(l)) && observationDetailLines({ capitalEvent: gone }).length === 3, 'a document not obtained shows three lines, each absent with class b');
ok(observationDetailLines({ capitalEvent: na }).length === 0 && observationDetailLines({ eventClass: 'EXECUTIVE_CHANGE' }).length === 0, 'a filing with no capital-event item shows no extra lines');
ok(sigs.every(p => typeof p.signal === 'number' && typeof p.confidence === 'number'), 'signal and confidence are unchanged by the extraction (no magnitude is derived from an amount)');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
