// qa_counterpartymatch.mjs -- KRYL-1400. The counterparty matching outcome, on REAL SEC search responses recorded 2026-10-11
// (tests/fixtures/sec/cp-search-responses.json) plus failure and rate-limit cases. The service admits nothing.
import fs from 'fs';
import { matchCounterparty, matchCounterparties, isConfirmed, searchTerm, _clearCounterpartyCache } from './src/engine/counterpartymatch.js';
import { normalizeEntityName } from './src/engine/secfileradmission.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const fx = JSON.parse(fs.readFileSync('tests/fixtures/sec/cp-search-responses.json', 'utf8')).responses;
const asked = [];
const searchFn = async (p) => { const k = `${p.forms}|${p.entityName}`; asked.push(k); const r = fx[k]; return r ? { ok: r.ok, status: 200, hits: r.hits } : { ok: false, status: 0, hits: [] }; };
const NOW = Date.parse('2026-10-11T12:00:00Z');
const M = (name, registrant = '', passage = '') => { _clearCounterpartyCache(); return matchCounterparty({ name, registrant, passage, searchFn, now: NOW, sleep: async () => {}, gapMs: 0 }); };

console.log('Query terms and the shared name rule');
ok(searchTerm('NVIDIA Corporation') === 'NVIDIA' && searchTerm('Goldman Sachs & Co. LLC') === 'Goldman Sachs' && searchTerm('Wells Fargo Bank, National Association') === 'Wells Fargo Bank', 'the SEC query is the name without its legal suffix (SEC matches "NVIDIA CORP", not "NVIDIA Corporation")');
ok(normalizeEntityName('Wells Fargo Bank, National Association') === normalizeEntityName('WELLS FARGO BANK N.A.'), '"National Association" and "N.A." are the same suffix (shared with the filer admission rule)');

console.log('Same entity confirmed (exact normalized name, exactly one SEC registrant)');
let r = await M('NVIDIA Corporation', 'Intel Corporation');
ok(r.outcome === 'SAME_ENTITY_CONFIRMED' && r.identifier.value === '0001045810' && r.canonicalName === 'NVIDIA CORP', 'NVIDIA Corporation -> CIK 0001045810');
ok(r.evidence.accession && r.evidence.filingDate && r.evidence.rule === 'exact-normalized-name-unique-registrant' && r.evidence.retrievedAt === '2026-10-11T12:00:00.000Z', 'the evidence names the SEC filing, its date, the rule and the retrieval time');
r = await M('Goldman Sachs & Co. LLC', 'Alphabet Inc.'); ok(r.outcome === 'SAME_ENTITY_CONFIRMED' && r.identifier.value === '0000042352', 'Goldman Sachs & Co. LLC -> CIK 0000042352');
r = await M('Citibank, N.A.', 'The Boeing Company'); ok(r.outcome === 'SAME_ENTITY_CONFIRMED' && r.identifier.value === '0000036684', 'Citibank, N.A. -> CIK 0000036684');
r = await M('BofA Securities, Inc.', 'Oracle Corporation'); ok(r.outcome === 'SAME_ENTITY_CONFIRMED' && r.identifier.value === '0001675365', 'BofA Securities, Inc. -> CIK 0001675365');
r = await M('The Bank of New York Mellon Trust Company, N.A.', 'Sysco Corporation'); ok(r.outcome === 'SAME_ENTITY_CONFIRMED' && r.identifier.value === '0001371431', 'The Bank of New York Mellon Trust Company, N.A. -> CIK 0001371431');
asked.length = 0; r = await M('Bank of America, N.A.', 'Sysco Corporation', 'with Bank of America, N.A., as the administrative agent');
ok(r.outcome === 'SAME_ENTITY_CONFIRMED' && r.identifier.value === '0000838927' && asked.some(k => k === '|Bank of America, N.A.'), 'a full search (100 hits of other registrants) triggers one more search with the name as written, which finds the registrant');

console.log('Affiliation confirmed only from the filing\'s own words');
r = await M('Berkshire Hathaway Inc.', 'Alphabet Inc.', 'with an affiliate of Berkshire Hathaway Inc. ("Berkshire Hathaway") for the sale of');
ok(r.outcome === 'AFFILIATION_CONFIRMED' && r.partyIsNamed === false && r.identifier.value === '0001067983' && /unnamed affiliate/.test(r.reason) && /an affiliate of Berkshire/.test(r.evidence.documentation), '"an affiliate of Berkshire Hathaway Inc.": the party is an unnamed affiliate (partyIsNamed false), not Berkshire itself, with the documenting words');
r = await M('Berkshire Hathaway Inc.', 'Alphabet Inc.', 'sold shares to Berkshire Hathaway Inc. in a private placement');
ok(r.outcome === 'SAME_ENTITY_CONFIRMED' && r.partyIsNamed === true, 'the same name without "an affiliate of" is the entity itself');
r = await M('SK Battery America, Inc.', 'Ford Motor Company', 'and SK Battery America, Inc. ("SKBA," a wholly owned subsidiary of SK On) to build and operate an EV battery plant');
ok(r.outcome === 'UNRESOLVED' && r.documentedParent === 'SK On' && !isConfirmed(r), 'a documented parent that is not an SEC registrant (SK On) confirms nothing; the documented parent is recorded');

console.log('Not confirmed, and why');
r = await M('J.P. Morgan Securities LLC', 'Oracle Corporation'); ok(r.outcome === 'UNRESOLVED' && /AMBIGUOUS/.test(r.reason) && r.candidates.length === 2 && !r.candidates.some(c => /plc/i.test(c.registeredName)), 'two LLC registrants carry the name: UNRESOLVED (ambiguous), both listed; "J.P. Morgan Securities plc" (a different legal form) is not one of them');
r = await M('CoBank, ACB', 'Sysco Corporation'); ok(r.outcome === 'UNRESOLVED' && r.absenceClass === 'c' && !isConfirmed(r), 'no registrant: UNRESOLVED, absence class c (obtained, not found)');
r = await M('Morgan Stanley & Co. LLC', 'Alphabet Inc.'); ok(r.outcome === 'UNRESOLVED' && r.absenceClass === 'b' && /100-result/.test(r.reason), 'search limit reached without a match: UNRESOLVED, class b, and it says the registrant may exist');
r = await M('SK On Co., Ltd.', 'Ford Motor Company'); ok(!isConfirmed(r), 'a non-SEC party is never confirmed');

console.log('Failures are not negatives; the filer is not a counterparty');
_clearCounterpartyCache();
r = await matchCounterparty({ name: 'NVIDIA Corporation', registrant: 'Intel', searchFn: async () => ({ ok: false, status: 429, hits: [] }), now: NOW, sleep: async () => {}, gapMs: 0 });
ok(r.outcome === 'LOOKUP_FAILED' && r.absenceClass === 'b' && /not a negative match/.test(r.reason), 'a rate-limited search is LOOKUP_FAILED (class b), not "no match"');
let n = 0; _clearCounterpartyCache();
r = await matchCounterparty({ name: 'NVIDIA Corporation', registrant: 'Intel', searchFn: async (p) => (++n === 1 ? { ok: false, status: 500, hits: [] } : searchFn(p)), now: NOW, sleep: async () => {}, gapMs: 0 });
ok(r.outcome === 'SAME_ENTITY_CONFIRMED', 'one of the two searches failing does not hide a match the other found');
_clearCounterpartyCache();
r = await matchCounterparty({ name: 'Intel Capital Corporation', registrant: 'Intel Corporation', searchFn, now: NOW, sleep: async () => {}, gapMs: 0 });
ok(r.outcome === 'SELF', 'the filer and its subsidiaries are not counterparties');
await M('NVIDIA Corporation', 'Intel Corporation'); const cnt = asked.length; await matchCounterparty({ name: 'NVIDIA Corporation', registrant: 'Intel', searchFn, now: NOW, sleep: async () => {}, gapMs: 0 });
ok(asked.length === cnt, 'a successful lookup is cached for the page session (no repeat request)');

console.log('A list of counterparties; admissibility');
_clearCounterpartyCache();
const list = await matchCounterparties([{ name: 'NVIDIA Corporation', passage: '' }, { name: 'CoBank, ACB', passage: '' }, { name: 'Goldman Sachs & Co. LLC', passage: '' }], { registrant: 'Sysco Corporation', searchFn, now: NOW, sleep: async () => {}, gapMs: 0 });
ok(list.map(x => isConfirmed(x.match)).join() === 'true,false,true', 'only confirmed outcomes are admissible (SAME_ENTITY_CONFIRMED, AFFILIATION_CONFIRMED)');
ok(!('relationship' in list[0].match) && !Object.keys(list[0].match).some(k => /admit/i.test(k)), 'the service writes no relationship and admits nothing');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
