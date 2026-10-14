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
  ok(String((await mediaFor('2', { noCache: true, titleFn: title, getFn: async () => 'Please limit requests to one every 5 seconds' })).error).startsWith('GDELT_NOT_JSON'), 'GDELT\'s rate-limit text is a failure, not "no articles"');
  ok(String((await mediaFor('3', { noCache: true, titleFn: title, getFn: async () => { throw new Error('GDELT HTTP 503'); } })).error).startsWith('GDELT_LOOKUP_FAILED'), 'an HTTP failure is a failure');
  const none = await mediaFor('4', { noCache: true, titleFn: async () => ({ name: 'ACME WIDGETS INC' }), getFn: async () => '{}' });
  ok(none.articles.length === 0 && !none.error, 'GDELT\'s empty answer ({}) is no articles for the phrase in the window');
}

console.log('Packets: dated, subject-bound, observation only');
{
  const res = await fetchMediaObservations({ entity: { cik: '0000732712' }, fetchImpl: async (u) => ({ ok: true, json: async () => ({ phrase: 'VERIZON COMMUNICATIONS', legalName: 'VERIZON COMMUNICATIONS INC', articles: real.articles.map(a => ({ url: a.url, title: a.title, domain: a.domain, seenDate: a.seendate, language: a.language, sourceCountry: a.sourcecountry })), source: 'GDELT DOC 2.0 API (api.gdeltproject.org)', retrievedAt: '2026-10-13T20:00:00.000Z', timespan: '7d' }) }) });
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
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
