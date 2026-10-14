// qa_issuer_page.mjs -- KRYL-1419 (the issuer's OWN published page as a source for officers and financing, ratified 2026-10-14). The two pages are real captures of Anduril's own site
// (tests/fixtures/issuer, retrieved 2026-10-14).
import fs from 'fs';
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? '✓' : '✗'} ${m}`); };
const { extractLeadership, extractFinancing, issuerPagesFor } = await import('./as-diff/issuerpage.js');
const { fetchIssuerPage } = await import('./src/engine/connectors/issuerpage.js');
const { admitIssuerPage, buildRoleAssertion, buildLeadAssertion, issuerPersonNode } = await import('./src/engine/issuerpageadmission.js');
const { admitAndProject, findAdmittedRelationshipsFor, latestEvidenceFor, _clearAdmittedForTests } = await import('./src/engine/canonicalrelationshipprojection.js');
const { canonicalRelationshipSentence, canonicalDetailLines } = await import('./src/engine/canonicalrelationshiptext.js');
const { buildAdmittedFormation } = await import('./src/engine/admittedformation.js');
const { buildSynthesis } = await import('./src/engine/analyticalsynthesis.js');
const { validateSynthesis } = await import('./src/engine/benchmarkprobe.js');
const { NODE_LABELS } = await import('./src/engine/entitytopologyregistry.js');
const { producerEligibility } = await import('./src/engine/produceridentifiers.js');
const { resolve } = await import('./src/engine/entityresolution.js');
const lead = fs.readFileSync('tests/fixtures/issuer/anduril-leadership-2026-10-14.html', 'utf8');
const ann = fs.readFileSync('tests/fixtures/issuer/anduril-series-h-announcement-2026-10-14.html', 'utf8');

console.log('Extraction: only what the page states');
{
  const people = extractLeadership(lead);
  ok(people.length === 4 && people[1].name === 'Brian Schimpf' && people[1].role === 'Co-Founder and CEO' && people[0].role === 'Founder' && people[3].role === 'Co-Founder & COO', 'the leadership page: four people, each with the role the page states');
  const f = extractFinancing(ann);
  ok(f && f.label === 'Series H' && f.amount === '$5 billion' && f.valuation === '$61 billion' && f.leads.join('|') === 'Thrive Capital|Andreessen Horowitz' && f.date === '2026-05-13', 'the announcement: Series H, $5 billion, $61 billion valuation, led by Thrive Capital and Andreessen Horowitz, dated 2026-05-13');
  ok(/^Today, Anduril is announcing our Series H/.test(f.sentence) && /led by Thrive Capital and Andreessen Horowitz\.$/.test(f.sentence), 'the sentence is quoted whole, as the page writes it');
  ok(extractFinancing('<p>We had a great quarter.</p>') === null && extractLeadership('<p>nothing</p>').length === 0, 'a page that states no round or no people yields nothing');
  ok(extractFinancing('"text":"Today, Acme is announcing our Series B: a $40 million raise, led by Foo Ventures, Bar Capital, and Baz Partners."').leads.join('|') === 'Foo Ventures|Bar Capital|Baz Partners', 'several lead investors in a list are separated');
}

console.log('Server: the company\'s own domain only; cached for a week; failures stated');
{
  const reg = [{ canonicalId: 'acme', officialDomain: 'acme.com', officialPages: [{ kind: 'LEADERSHIP', url: 'https://www.acme.com/team' }, { kind: 'FINANCING_ANNOUNCEMENT', url: 'https://evil.example.org/acme-series-b' }, { kind: 'FINANCING_ANNOUNCEMENT', url: 'http://www.acme.com/insecure' }] }];
  const asked = []; const getFn = async (u) => { asked.push(u); return lead; };
  const r = await issuerPagesFor('acme', { registry: reg, getFn, noCache: true });
  ok(asked.join() === 'https://www.acme.com/team' && r.pages.filter(p => p.error === 'NOT_ON_OFFICIAL_DOMAIN').length === 2 && r.leadership.people.length === 4, 'a page outside the company\'s own domain (or not https) is never requested');
  ok((await issuerPagesFor('nobody', { registry: reg, getFn })).error === 'NO_OFFICIAL_PAGES_CURATED', 'a company with no curated pages: stated, not guessed');
  const down = await issuerPagesFor('acme', { registry: [{ canonicalId: 'acme', officialDomain: 'acme.com', officialPages: [{ kind: 'LEADERSHIP', url: 'https://www.acme.com/team' }] }], getFn: async () => { throw new Error('HTTP 503'); }, noCache: true });
  ok(String(down.error).startsWith('ISSUER_PAGES_NOT_READ'), 'pages that could not be read: a failure, not an empty page');
  let calls = 0; const one = [{ canonicalId: 'cache-co', officialDomain: 'acme.com', officialPages: [{ kind: 'LEADERSHIP', url: 'https://www.acme.com/team' }] }]; const g2 = async () => { calls++; return lead; };
  const t0 = Date.now(); await issuerPagesFor('cache-co', { registry: one, getFn: g2, now: t0 }); await issuerPagesFor('cache-co', { registry: one, getFn: g2, now: t0 + 6 * 86_400_000 });
  ok(calls === 1, 'cached: not read again within a week');
  await issuerPagesFor('cache-co', { registry: one, getFn: g2, now: t0 + 8 * 86_400_000 }); ok(calls === 2, 'read again after a week');
  const real = resolve('Anduril');
  ok(real.officialDomain === 'anduril.com' && real.officialPages.length === 2 && real.officialPages.every(p => p.url.startsWith('https://www.anduril.com/')), 'Anduril carries its curated own-domain pages in the registry');
}

console.log('Admission: LABOR and CAPITAL, source-stated');
{
  _clearAdmittedForTests();
  const AN = { lei: '254900CIXLZUXXNYQW57', name: 'ANDURIL INDUSTRIES, INC.', displayName: 'ANDURIL INDUSTRIES', gleif: { entityStatus: 'ACTIVE', registrationStatus: 'ISSUED', retrievedAt: '2026-10-14T00:00:00.000Z' } };
  const page = { officialDomain: 'anduril.com', retrievedAt: '2026-10-14T12:00:00.000Z', leadership: { people: extractLeadership(lead), url: 'https://www.anduril.com/anduril-leadership' }, financing: { ...extractFinancing(ann), url: 'https://www.anduril.com/news/anduril-announces-usd5b-series-h-raise' } };
  const res = admitIssuerPage({ entity: AN, page });
  ok(res.admitted.length === 6 && res.rejected.length === 0 && res.admitted.filter(a => a.kind === 'ROLE').length === 4 && res.admitted.filter(a => a.kind === 'LEAD').length === 2, 'four roles and two round leads admitted through the single write path');
  const rels = findAdmittedRelationshipsFor('LEI:254900CIXLZUXXNYQW57');
  ok(rels.length === 6 && rels.every(r => r.part[0] === 'LEI:254900CIXLZUXXNYQW57') && rels.some(r => r.part[1] === 'ISSUER_PAGE_PERSON:254900CIXLZUXXNYQW57:brian_schimpf') && rels.some(r => r.part[1] === 'ISSUER_PAGE_INVESTOR:254900CIXLZUXXNYQW57:thrive_capital'), 'ordered (company by LEI, a party scoped to the issuer\'s page): no identity is shared with anyone else');
  ok(admitIssuerPage({ entity: AN, page }).admitted.every(a => a.predicate === 'PERSISTENT'), 'a repeat is PERSISTENT');
  const lab = (id) => String(NODE_LABELS[id] ?? id);
  const role = rels.find(r => r.type === 'HAS_STATED_ROLE_ON_ISSUER_PAGE' && /schimpf/.test(r.part[1])), led = rels.find(r => r.type === 'LED_FUNDING_ROUND_PER_ISSUER');
  ok(canonicalRelationshipSentence(role.type, 'ANDURIL INDUSTRIES', lab(role.part[1]), role.nuId) === "Brian Schimpf is listed as Co-Founder and CEO on ANDURIL INDUSTRIES's own page" && canonicalRelationshipSentence(led.type, 'ANDURIL INDUSTRIES', lab(led.part[1]), led.nuId) === 'Thrive Capital is stated by ANDURIL INDUSTRIES to have led its Series H', 'wording: listed on the company\'s own page / stated by the company to have led its round');
  const dl = canonicalDetailLines(latestEvidenceFor(role.id)), dn = canonicalDetailLines(latestEvidenceFor(led.id));
  ok(/"Co-Founder and CEO" · https:\/\/www\.anduril\.com\/anduril-leadership · page read 2026-10-14/.test(dl[0]) && /not independently confirmed, it is not a filing, and a listing on a web page is not a formal officer disclosure/.test(dl[1]), 'role lines: quoted role, URL, read date, and the limits');
  ok(/Today, Anduril is announcing our Series H/.test(dn[0]) && /announcement dated 2026-05-13/.test(dn[0]) && /it does not state the other investors or later rounds/.test(dn[1]), 'round lines: the whole sentence, URL, dates, and the limits');
  const f = buildAdmittedFormation({ relationships: rels, evidenceFor: latestEvidenceFor, labelOf: lab });
  ok(f.structure.domains.join() === 'CAPITAL,LABOR' && f.formation && f.formation.links.some(l => l.a === 'CAPITAL' && l.b === 'LABOR'), 'CAPITAL and LABOR are admitted and linked through the company');
  const S = buildSynthesis({ subject: 'ANDURIL INDUSTRIES', relationships: rels, evidenceFor: latestEvidenceFor, labelOf: lab, formation: f });
  const sr = S.statements.find(x => /own leadership page lists 4 people with roles/.test(x.text)), sl = S.statements.find(x => /own announcement states Series H, \$5 billion at a valuation of \$61 billion, led by Thrive Capital and Andreessen Horowitz \(announcement dated 2026-05-13\)/.test(x.text));
  ok(sr?.status === 'SUPPORTED' && /not a formal officer disclosure; board membership is not stated/.test(sr.text) && sl?.status === 'SUPPORTED' && /states no other investor and no later round/.test(sl.text) && sr.evidence.length === 4 && sl.evidence.length === 2, 'two SUPPORTED statements, each the company\'s own statement with its limits and its citations');
  ok(validateSynthesis(S, rels, latestEvidenceFor, null).problems.length === 0, 'every label is supported by its evidence (validator: no problems)');
  const mkR = (mut) => { const b = buildRoleAssertion({ entity: AN, page, person: page.leadership.people[1] }); mut(b.assertion); return admitAndProject(b.assertion, { companyName: AN.name, partyLabel: 'x', source: 'ISSUER_PAGE' }); };
  const mkL = (mut) => { const b = buildLeadAssertion({ entity: AN, page, investor: 'Thrive Capital' }); mut(b.assertion); return admitAndProject(b.assertion, { companyName: AN.name, partyLabel: 'x', source: 'ISSUER_PAGE' }); };
  ok(mkR(a => { a.evidence.provenance.url = 'https://evil.example.org/team'; }).admitted === false, 'a page not on the company\'s own domain: refused');
  ok(mkR(a => { a.evidence.provenance.url = 'http://www.anduril.com/anduril-leadership'; }).admitted === false, 'not https: refused');
  ok(mkR(a => { delete a.evidence.provenance.identity; }).admitted === false && mkR(a => { a.evidence.provenance.identity.registrationStatus = 'LAPSED'; }).admitted === false, 'no confirmed GLEIF record for the company: refused');
  ok(mkR(a => { a.part = ['CIK:0000000001', a.part[1]]; }).admitted === false, 'a company not identified by its GLEIF LEI: refused');
  ok(mkR(a => { a.evidence.provenance.role = null; a.nuId = { role: null }; }).admitted === false, 'no stated role: refused');
  ok(mkR(a => { a.part = [a.part[0], 'PERSON:brian']; }).admitted === false, 'a person node that is not scoped to the issuer\'s page: refused');
  ok(mkR(a => { a.evidence.provenance.personIdentity = 'SEC_CIK'; }).admitted === false, 'a person identified by anything but the stated name: refused');
  ok(mkL(a => { a.evidence.provenance.sentence = 'Today, Anduril is announcing our Series H, led by Someone Else.'; }).admitted === false, 'a sentence that does not name the investor: refused');
  ok(mkL(a => { a.evidence.provenance.round = null; a.nuId = { round: null }; }).admitted === false, 'no stated round: refused');
}

console.log('Connector and contract');
{
  const r = await fetchIssuerPage({ entity: { canonicalId: 'anduril-industries' }, fetchImpl: async (u) => ({ ok: true, json: async () => ({ canonicalId: 'anduril-industries', retrievedAt: 'x', pages: [], _asked: u }) }) });
  ok(/\/api\/issuer-page\?id=anduril-industries/.test(r._asked), 'the connector asks the engine for the entity\'s own pages');
  ok((await fetchIssuerPage({ entity: { canonicalId: 'x' }, fetchImpl: async () => ({ ok: true, json: async () => ({ error: 'NO_OFFICIAL_PAGES_CURATED' }) }) })).failed === 'NO_OFFICIAL_PAGES_CURATED' && (await fetchIssuerPage({ entity: { canonicalId: 'x' }, fetchImpl: async () => ({ ok: false, status: 502 }) })).failed === 'HTTP 502', 'a failure or an uncurated company is carried as failed');
  const an = (() => { const c = resolve('Anduril'); return { ...c, name: c.canonicalName }; })();
  ok(producerEligibility(an).eligible.includes('issuer-page') && !producerEligibility({ name: 'X', identifiers: { lei: '5493001KJTIIGC8Y1R12' } }).eligible.includes('issuer-page') && !producerEligibility({ name: 'X', identifiers: { edgar: '0000050863' } }).eligible.includes('issuer-page'), 'the producer needs an LEI AND a curated official domain; a company with only one of them does not run it');
  ok(issuerPersonNode('254900cixlzuxxnyqw57', 'Matt Grimm') === 'ISSUER_PAGE_PERSON:254900CIXLZUXXNYQW57:matt_grimm', 'a person node is scoped to the company and the stated name');
}
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
