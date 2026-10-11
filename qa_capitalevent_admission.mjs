// qa_capitalevent_admission.mjs -- KRYL-1401. Real 8-K filings (saved) -> extraction -> counterparty matching (real SEC responses, saved) ->
// admission of CAPITAL_EVENT_INVOLVES. Only confirmed counterparties are admitted; the unnamed-affiliate qualification is preserved; magnitude is INDETERMINATE.
import fs from 'fs';
import { extractCapitalEvent } from './src/engine/connectors/edgar8kcontent.js';
import { _clearCounterpartyCache } from './src/engine/counterpartymatch.js';
import { admitCapitalEvents, buildCapitalEventAssertion } from './src/engine/capitaleventadmission.js';
import { admitAndProject, findAdmittedRelationshipsFor, latestEvidenceFor, _admittedRelationshipsFor } from './src/engine/canonicalrelationshipprojection.js';
import { getRegisteredType } from './src/engine/canonicalrelationship.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const cp = JSON.parse(fs.readFileSync('tests/fixtures/sec/cp-search-responses.json', 'utf8')).responses;
const searchFn = async (p) => { const r = cp[`${p.forms}|${p.entityName}`]; return r ? { ok: r.ok, status: 200, hits: r.hits } : { ok: false, status: 0, hits: [] }; };
const html = (n) => fs.readFileSync(`tests/fixtures/sec/8k-${n}.htm`, 'utf8');
const NOW = Date.parse('2026-10-11T12:00:00Z');
const run = (opts) => { _clearCounterpartyCache(); return admitCapitalEvents({ searchFn, now: NOW, sleep: async () => {}, gapMs: 0, ...opts }); };
const evOf = (file, items, reg, accession, filingDate, eventClass) => ({ accession, filingDate, form: '8-K', items, eventClass, capital: extractCapitalEvent({ html: html(file), items, registrant: reg, accession }) });
const INTEL = { cik: '0000050863', name: 'INTEL CORP' }, GOOG = { cik: '0001652044', name: 'Alphabet Inc.' };
const intelEv = evOf('intel-3-02-2025-12-29', ['3.02'], 'INTEL CORP', '0000050863-25-000204', '2025-12-29', 'EQUITY_OFFERING');
const googEv = evOf('alphabet-1-01-7-01-8-01-2026-06-04', ['1.01', '7.01', '8.01', '9.01'], 'Alphabet Inc.', '0001193125-26-257724', '2026-06-04', 'MATERIAL_CONTRACT');

console.log('The type is ratified and its admission rule is enforced');
ok(!!getRegisteredType('CAPITAL_EVENT_INVOLVES') && getRegisteredType('CAPITAL_EVENT_INVOLVES').phiClass === 'Semantic', 'CAPITAL_EVENT_INVOLVES is registered (Semantic)');

console.log('Equity sale: NVIDIA (same entity confirmed)');
let r = await run({ filer: INTEL, events: [intelEv] });
const nv = r.admitted.find(a => a.counterparty === 'NVIDIA Corporation');
ok(r.admitted.length === 1 && nv && nv.predicate === 'NEW', 'one relationship admitted: the filer and NVIDIA');
const rho = nv.relationship; const ev = latestEvidenceFor(rho.id);
ok(rho.part[0] === 'CIK:0000050863' && rho.part[1] === 'CIK:0001045810' && rho.nuId.event === '0000050863-25-000204' && rho.nuId.partyQualifier === 'NONE', 'ordered part (filer, counterparty by SEC CIK), event = the accession, qualifier NONE');
ok(ev.provenance.counterpartyMatch.outcome === 'SAME_ENTITY_CONFIRMED' && ev.provenance.counterpartyMatch.identifier.value === '0001045810' && ev.provenance.ladderStep === 'ESTABLISHED_RELATIONSHIP', 'the matching outcome is carried in the evidence exactly as returned');
ok(ev.provenance.magnitude === 'INDETERMINATE' && ev.provenance.amounts[0].raw === '$5.0 billion' && /Securities Purchase Agreement/.test(ev.provenance.instrument) && ev.provenance.passage.includes('NVIDIA Corporation'), 'magnitude INDETERMINATE; the quoted amount, the instrument and the passage are carried as stated');
ok(findAdmittedRelationshipsFor('CIK:0001045810').some(x => x.id === rho.id), 'it is readable from the canonical store through the single read path');

console.log('Managers and an unnamed affiliate (Alphabet): only confirmed outcomes are admitted');
r = await run({ filer: GOOG, events: [googEv] });
const by = (n) => r.admitted.find(a => a.counterparty === n); const rej = (n) => r.rejected.find(a => a.counterparty === n);
ok(by('Goldman Sachs & Co. LLC')?.outcome === 'SAME_ENTITY_CONFIRMED', 'Goldman Sachs & Co. LLC admitted (same entity confirmed)');
const bh = by('Berkshire Hathaway Inc.');
ok(bh?.outcome === 'AFFILIATION_CONFIRMED' && bh.relationship.nuId.partyQualifier === 'UNNAMED_AFFILIATE_OF', 'Berkshire Hathaway: admitted as AFFILIATION_CONFIRMED with partyQualifier UNNAMED_AFFILIATE_OF');
const bhEv = latestEvidenceFor(bh.relationship.id).provenance;
ok(bhEv.counterpartyMatch.partyIsNamed === false && /an affiliate of Berkshire/.test(bhEv.counterpartyMatch.evidence.documentation) && bhEv.ladderStep === 'SUPPORTED_CONNECTION', 'the unnamed-affiliate qualification and its documenting words are preserved; ladder step SUPPORTED_CONNECTION');
ok(!by('J.P. Morgan Securities LLC') && /UNRESOLVED/.test(rej('J.P. Morgan Securities LLC').outcome) , 'J.P. Morgan Securities LLC (two registrants carry the name) is not admitted');
ok(!by('Morgan Stanley & Co. LLC') && rej('Morgan Stanley & Co. LLC')?.outcome === 'UNRESOLVED', 'Morgan Stanley & Co. LLC (search limit, unresolved) is not admitted');
ok(r.admitted.length === 2 && r.rejected.length === 2, 'two admitted, two not admitted, none silently dropped');

console.log('Failures never admit');
_clearCounterpartyCache();
const down = await admitCapitalEvents({ filer: INTEL, events: [{ ...intelEv, accession: 'X-1' }], searchFn: async () => ({ ok: false, status: 429, hits: [] }), now: NOW, sleep: async () => {}, gapMs: 0 });
ok(down.admitted.length === 0 && down.rejected[0].outcome === 'LOOKUP_FAILED', 'a rate-limited SEC lookup admits nothing and says LOOKUP_FAILED (not a negative match)');
const noInstr = { ...intelEv, accession: 'X-2', capital: { ...intelEv.capital, instruments: [] } };
const ni = await run({ filer: INTEL, events: [noInstr] });
ok(ni.admitted.length === 0 && /no instrument/.test(ni.rejected[0].reason), 'no instrument stated in the filing: not admitted');

console.log('The admission rule itself (the write path rejects what the builder would not)');
const good = buildCapitalEventAssertion({ filer: INTEL, event: intelEv, counterparty: intelEv.capital.counterparties.find(c => c.name === 'NVIDIA Corporation'), match: { outcome: 'SAME_ENTITY_CONFIRMED', identifier: { scheme: 'sec-cik', value: '0001045810' }, canonicalName: 'NVIDIA CORP', partyIsNamed: true, evidence: { accession: 'E-1' } } });
const tamper = (fn) => { const a = JSON.parse(JSON.stringify(good.assertion)); fn(a); return admitAndProject(a, good.meta); };
ok(tamper(a => { a.evidence.provenance.magnitude = '5.0e9'; }).admitted === false, 'magnitude other than INDETERMINATE is rejected');
ok(tamper(a => { a.evidence.provenance.counterpartyMatch.outcome = 'CANDIDATE_MATCH'; }).admitted === false, 'a candidate match is rejected');
ok(tamper(a => { a.evidence.provenance.counterpartyMatch.outcome = 'UNRESOLVED'; }).admitted === false, 'an unresolved name is rejected');
ok(tamper(a => { a.evidence.provenance.passage = 'text without the name'; }).admitted === false, 'a passage that does not contain the counterparty name is rejected');
ok(tamper(a => { a.evidence.provenance.items = ['5.02']; }).admitted === false, 'a filing without a capital-event item is rejected');
ok(tamper(a => { a.nuId.partyQualifier = 'UNNAMED_AFFILIATE_OF'; }).admitted === false, 'an unnamed-affiliate qualifier on a same-entity match is rejected (qualifier and outcome must agree)');
ok(tamper(a => { delete a.evidence.provenance.instrument; }).admitted === false, 'no instrument is rejected');
ok(tamper(a => { a.evidence.provenance.ladderStep = 'LEAD'; }).admitted === false, 'a lead is rejected (ladder step must be at least supported connection)');
ok(tamper(a => { a.part = [a.part[0], a.part[0]]; }).admitted === false, 'filer = counterparty is rejected');

console.log('Identity: events are distinct, a repeat is more evidence, the affiliate qualifier is part of identity');
const again = admitAndProject(JSON.parse(JSON.stringify(good.assertion)), good.meta);
ok(again.admitted && again.predicate === 'PERSISTENT' && again.relationship.id === rho.id, 'the same event again is PERSISTENT (same id, more evidence)');
const other = JSON.parse(JSON.stringify(good.assertion)); other.nuId.event = '0000050863-26-000001'; other.evidence.provenance.accession = '0000050863-26-000001';
const o2 = admitAndProject(other, good.meta);
ok(o2.admitted && o2.predicate === 'NEW' && o2.relationship.id !== rho.id, 'a different filing with the same counterparty is a different event, a different relationship');
ok(_admittedRelationshipsFor('CAPITAL_EVENT_INVOLVES').length >= 4, 'all admitted through the one store');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
