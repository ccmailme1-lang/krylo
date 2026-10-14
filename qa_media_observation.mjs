// qa_media_observation.mjs -- KRYL-1418 (GDELT MEDIA observation, ratified 2026-10-13). The article rows are an excerpt of a real GDELT answer (tests/fixtures/gdelt).
import fs from 'fs';
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? '✓' : '✗'} ${m}`); };
const { phraseOf, mediaFor } = await import('./as-diff/mediaobservation.js');
const { fetchMediaObservations, buildMediaSignals, seenDay, MAX_ARTICLES } = await import('./src/engine/connectors/gdeltmediaobservation.js');
const { observationDetailLines, observationLabel } = await import('./src/engine/adsubject.js');
const { producerEligibility } = await import('./src/engine/produceridentifiers.js');
const { POLARITY } = await import('./src/engine/signalconstants.js');
const real = JSON.parse(fs.readFileSync('tests/fixtures/gdelt/artlist-verizon-communications.json', 'utf8'));
const title = async () => ({ name: 'VERIZON COMMUNICATIONS INC', source: 'SEC company_tickers.json' });

console.log('Server: the exact phrase of the SEC registered name; failures stay failures');
{
  ok(phraseOf('VERIZON COMMUNICATIONS INC') === 'VERIZON COMMUNICATIONS' && phraseOf('Tesla, Inc.') === 'Tesla' && phraseOf('INTEL CORP') === 'INTEL' && phraseOf('Boston Scientific Corporation') === 'Boston Scientific', 'the phrase is the registered name with a spelled-out trailing legal form set aside');
  let asked = null;
  const r = await mediaFor('0000732712', { noCache: true, titleFn: title, getFn: async (p) => { asked = p; return JSON.stringify(real); } });
  ok(r.phrase === 'VERIZON COMMUNICATIONS' && decodeURIComponent(asked.replace(/\+/g, ' ')).includes('"VERIZON COMMUNICATIONS" sourcelang:english') && r.articles.length === 2 && r.articles[0].domain === 'tickerreport.com', 'GDELT is asked for the exact phrase; articles come back as GDELT states them');
  ok((await mediaFor('1', { titleFn: async () => ({ notListed: true }), getFn: async () => '{}' })).error === 'LEGAL_NAME_NOT_FOUND', 'no SEC registered name: stated, not guessed');
  let tries = 0;
  ok(String((await mediaFor('2', { noCache: true, titleFn: title, sleep: async () => {}, getFn: async () => { tries++; return 'Please limit requests to one every 5 seconds'; } })).error).startsWith('GDELT_NOT_JSON') && tries === 3, 'GDELT\'s rate-limit text is repeated after a pause (3 attempts) and then reported as a failure, not as "no articles"');
  let n429 = 0;
  const rec = await mediaFor('5', { noCache: true, titleFn: title, sleep: async () => {}, getFn: async () => { if (++n429 < 3) throw new Error('GDELT HTTP 429'); return JSON.stringify(real); } });
  ok(rec.articles?.length === 2 && n429 === 3, 'a limited answer followed by a good one: the good answer is used');
  ok(String((await mediaFor('3', { noCache: true, titleFn: title, sleep: async () => {}, getFn: async () => { throw new Error('GDELT HTTP 503'); } })).error).startsWith('GDELT_LOOKUP_FAILED'), 'an HTTP failure is a failure (not repeated)');
  const none = await mediaFor('4', { noCache: true, titleFn: async () => ({ name: 'ACME WIDGETS INC' }), getFn: async () => '{}' });
  ok(none.articles.length === 0 && !none.error, 'GDELT\'s empty answer ({}) is no articles for the phrase in the window');
}

console.log('Packets: dated, subject-bound, observation only');
{
  const res = await fetchMediaObservations({ entity: { cik: '0000732712' }, fetchImpl: async (u) => ({ ok: true, json: async () => ({ phrase: 'VERIZON COMMUNICATIONS', legalName: 'VERIZON COMMUNICATIONS INC', articles: real.articles.map(a => ({ url: a.url, title: a.title, domain: a.domain, seenDate: a.seendate, language: a.language, sourceCountry: a.sourcecountry })), source: 'GDELT DOC 2.0 API (api.gdeltproject.org)', retrievedAt: '2026-10-13T20:00:00.000Z', timespan: '30d' }) }) });
  const sigs = buildMediaSignals({ canonicalId: 'verizon', entityName: 'VERIZON', result: res });
  ok(sigs.length === 2 && sigs.every(s => s.domain === 'media' && s.source === 'GDELT' && s.eventClass === 'MEDIA_ARTICLE' && s.polarity === POLARITY.ABSENT && s.meta.canonicalId === 'verizon'), 'one MEDIA packet per article, bound to the subject, no polarity inferred');
  ok(sigs[0].meta.eventDate === '2026-09-30' && sigs[0].meta.accession === real.articles[0].url && sigs[0].meta.mediaArticle.title === real.articles[0].title && sigs[0].meta.mediaArticle.domain === 'tickerreport.com', 'dated by GDELT\'s first-seen day; the article title, domain and URL are recorded as stated');
  ok(sigs[0].signal === 1 && sigs[0].id !== sigs[1].id, 'the signal follows the existing GDELT volume precedent (count/200 x 100), not any reading of the article');
  ok(buildMediaSignals({ canonicalId: 'x', result: { articles: [] } }).length === 0 && buildMediaSignals({ result: res }).length === 0, 'no articles or no subject: no packet');
  ok(seenDay('20260930T193000Z') === '2026-09-30' && seenDay('bad') === null && MAX_ARTICLES === 5, 'the date is GDELT\'s first-seen day');
  const bad = await fetchMediaObservations({ entity: { cik: '1' }, fetchImpl: async () => ({ ok: true, json: async () => ({ error: 'GDELT_NOT_JSON: Please limit' }) }) });
  ok(bad.failed?.startsWith('GDELT_NOT_JSON') && bad.articles.length === 0, 'the connector carries the failure');
  const down = await fetchMediaObservations({ entity: { cik: '1' }, fetchImpl: async () => ({ ok: false, status: 502 }) });
  ok(down.failed === 'HTTP 502', 'an HTTP error is carried as failed');
}

console.log('Words and contract');
{
  const o = { source: 'GDELT', eventClass: 'MEDIA_ARTICLE', eventDate: '2026-09-30', accession: real.articles[0].url, mediaArticle: { title: real.articles[0].title, domain: 'tickerreport.com', seenDate: '2026-09-30', phrase: 'VERIZON COMMUNICATIONS' } };
  const lines = observationDetailLines(o);
  ok(lines.length === 2 && /article: "Verizon Communications \( NYSE : VZ \) Stock : Insider Kyle Malady Sells 1 , 100 Shares" · tickerreport\.com · first seen 2026-09-30 \(as GDELT states it\)/.test(lines[0]), 'the line quotes the title, domain and date as GDELT states them');
  ok(/exact phrase "VERIZON COMMUNICATIONS"/.test(lines[1]) && /no relationship or event connection is inferred from an article alone/.test(lines[1]), 'the limit is stated: matched phrase only, text not read, nothing inferred');
  ok(/GDELT · MEDIA_ARTICLE · 2026-09-30/.test(observationLabel(o)), 'the evidence label carries source, class, date and the article URL');
  const listed = producerEligibility({ name: 'VERIZON', identifiers: { edgar: '0000732712' } });
  ok(listed.eligible.includes('media') && !producerEligibility({ name: 'X', identifiers: {} }).eligible.includes('media') && !producerEligibility({ name: 'DATABENTO', identifiers: { edgar: '0002000000' }, admissionClass: 'SEC_FORM_D_ISSUER' }).eligible.includes('media'), 'the media producer needs an SEC CIK and a registry or listed company (the registered name is the phrase)');
}

console.log('Relationship: NAMED_IN_ARTICLE (ratified 2026-10-13), only when the title names the company');
{
  const { admitMediaArticles, titleNames, articleNodeId, buildArticleAssertion } = await import('./src/engine/mediaarticleadmission.js');
  const { admitAndProject, findAdmittedRelationshipsFor, latestEvidenceFor, _clearAdmittedForTests } = await import('./src/engine/canonicalrelationshipprojection.js');
  const { canonicalRelationshipSentence, canonicalDetailLines } = await import('./src/engine/canonicalrelationshiptext.js');
  const { buildAdmittedFormation } = await import('./src/engine/admittedformation.js');
  const { buildSynthesis } = await import('./src/engine/analyticalsynthesis.js');
  const { validateSynthesis } = await import('./src/engine/benchmarkprobe.js');
  const { NODE_LABELS } = await import('./src/engine/entitytopologyregistry.js');
  _clearAdmittedForTests();
  const VZ = { cik: '0000732712', name: 'VERIZON COMMUNICATIONS INC' };
  const arts = [...real.articles.map(a => ({ url: a.url, title: a.title, domain: a.domain, seenDate: a.seendate })),
    { url: 'https://example.com/a-text-only-match', title: 'Telecom stocks rally on dividend news', domain: 'example.com', seenDate: '20260930T100000Z' }];
  const result = { phrase: 'VERIZON COMMUNICATIONS', articles: arts, retrievedAt: '2026-10-13T20:00:00.000Z', timespan: '30d' };
  ok(titleNames('Verizon Communications ( NYSE : VZ ) Stock', 'VERIZON COMMUNICATIONS') && !titleNames('Verizon wins a contract', 'VERIZON COMMUNICATIONS') && !titleNames('If You Invest $500 a Month', 'VERIZON COMMUNICATIONS'), 'the title must contain the registered name; a title with only part of it, or none, does not name the company');
  const res = admitMediaArticles({ entity: VZ, result });
  ok(res.admitted.length === 1 && res.namedInTitle === 1 && res.returned === 3, 'only the article whose title names the company is admitted; the other two stay observations');
  const rels = findAdmittedRelationshipsFor('CIK:0000732712').filter(r => r.type === 'NAMED_IN_ARTICLE');
  ok(rels.length === 1 && rels[0].part[0] === 'CIK:0000732712' && /^ARTICLE:[a-z0-9]+$/.test(rels[0].part[1]), 'ordered (company by SEC CIK, article by its id)');
  ok(admitMediaArticles({ entity: VZ, result }).admitted.every(a => a.predicate === 'PERSISTENT'), 'a repeat is PERSISTENT');
  const labelOf = (id) => String(NODE_LABELS[id] ?? id);
  ok(canonicalRelationshipSentence('NAMED_IN_ARTICLE', 'VERIZON', labelOf(rels[0].part[1])).startsWith('VERIZON is named in the article '), 'wording: "is named in the article ..."');
  const lines = canonicalDetailLines(latestEvidenceFor(rels[0].id));
  ok(/named in article · "Verizon Communications \( NYSE : VZ \) Stock/.test(lines[0]) && /tickerreport\.com · first seen 2026-09-30/.test(lines[0]) && /no endorsement, causation, event participation, sentiment or other connection is inferred/.test(lines[1]), 'detail lines cite the title, publisher domain and date and state what is not inferred');
  const f = buildAdmittedFormation({ relationships: rels, evidenceFor: latestEvidenceFor, labelOf });
  ok(f.structure.domains.join() === 'MEDIA', 'MEDIA is an admitted domain');
  const S = buildSynthesis({ subject: 'VERIZON', relationships: rels, evidenceFor: latestEvidenceFor, labelOf, formation: f });
  const st = S.statements.find(x => /dated article name VERIZON in its title/.test(x.text) || /dated article names VERIZON in its title/.test(x.text));
  ok(st && st.status === 'SUPPORTED' && /no endorsement, causation, event participation or other connection is inferred/.test(st.text) && st.evidence.length === 1 && st.evidence[0].accession === real.articles[0].url, 'a SUPPORTED statement cites the article and states the limit');
  ok(validateSynthesis(S, rels, latestEvidenceFor, null).problems.length === 0, 'every label is supported by its evidence (validator: no problems)');
  const mk = (mut) => { const b = buildArticleAssertion({ entity: VZ, article: arts[0], phrase: 'VERIZON COMMUNICATIONS', retrievedAt: 'x', timespan: '30d' }); mut(b.assertion); return admitAndProject(b.assertion, { companyName: VZ.name, companyCik: VZ.cik, articleLabel: 'x', source: 'GDELT' }); };
  ok(mk(a => { a.evidence.provenance.title = 'Telecom stocks rally'; }).admitted === false, 'a title that does not name the company: refused');
  ok(mk(a => { a.evidence.provenance.url = 'not a url'; }).admitted === false, 'no citable URL: refused');
  ok(mk(a => { a.evidence.provenance.seenDate = null; }).admitted === false, 'no date: refused');
  ok(mk(a => { a.evidence.provenance.domain = null; }).admitted === false, 'no publisher domain: refused');
  ok(mk(a => { a.evidence.provenance.phraseSource = 'GUESS'; }).admitted === false, 'a phrase that is not the SEC registered name: refused');
  ok(mk(a => { a.part = ['CIK:0000732712', 'ARTICLE:wrong']; }).admitted === false, 'an article node that is not its article id: refused');
  ok(mk(a => { a.part = ['VERIZON', a.part[1]]; }).admitted === false, 'a company that is not identified by its SEC CIK: refused');
  ok(articleNodeId(arts[0].url) === rels[0].part[1], 'the article node is derived from its URL');
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
