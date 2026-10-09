// ownershiphistory.js -- KRYL-1386 (spec v1.1 section 4). Retrieves the subject's Schedule 13G/13D history for the
// source-dated comparison: about 48 months (E0 - L), BOTH form-type families, window splitting instead of paging,
// request spacing and retries, and an honest coverage record. The search and document fetchers are injected, so the
// logic is testable without a network; relationshipchangeservice.js binds them to the engine proxies.
// A failed or capped request is "not obtained" (absence class b): it marks coverage incomplete and is never read as "none".
import { parseSchedule13GXml, parseLegacy13GText, selectPerson } from '../ownershipposition.js';
import { addMonths } from '../relationshipchange.js';

export const SEARCH_FAMILIES = Object.freeze([
  { id: 'new', forms: 'SCHEDULE 13D,SCHEDULE 13G' },                       // filings from December 2024
  { id: 'legacy', forms: 'SC 13D,SC 13D/A,SC 13G,SC 13G/A' },               // earlier filings
]);
export const HIT_CAP = 100;
export const RETRIEVAL_MONTHS = 48;                                         // E0 - L = T - 24 - 24 months

const pad10 = (c) => String(c ?? '').replace(/\D/g, '').padStart(10, '0');
const dayMs = (iso) => { const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/); return Date.UTC(+m[1], +m[2] - 1, +m[3]); };
const isoOf = (ms) => new Date(ms).toISOString().slice(0, 10);

export function retrievalWindow(T) {
  const to = String(T).slice(0, 10);
  return { from: addMonths(to, -RETRIEVAL_MONTHS), to };
}

/**
 * @param issuerCik   the subject's SEC identifier
 * @param issuerName  the subject's registered name (used for the name-narrowed search)
 * @param from,to     'YYYY-MM-DD' retrieval window
 * @param searchFn    async ({ forms, startdt, enddt, hits, entityName }) -> { ok, status, hits: [ {_id,_source} ] }
 * @param docFn       async ({ cik, accession, file }) -> { ok, status, text }
 * @param sleep       async (ms) -> void
 */
export async function retrieveOwnershipObservations({
  issuerCik, issuerName, from, to, searchFn, docFn, sleep = () => Promise.resolve(),
  searchGapMs = 1500, docGapMs = 400, retries = 2, maxDocs = 80,
}) {
  const cik10 = pad10(issuerCik);
  const cov = { windows: [], failedWindows: [], failedDocs: [], reasons: [], requests: { search: 0, doc: 0 } };
  const seen = new Map();

  async function searchOnce(family, a, b) {
    let last = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) await sleep(searchGapMs * (attempt + 1));
      cov.requests.search++;
      try { last = await searchFn({ forms: family.forms, startdt: a, enddt: b, hits: String(HIT_CAP), entityName: issuerName }); }
      catch (e) { last = { ok: false, status: 0, error: String(e?.message ?? e) }; }
      if (last?.ok) return last;
    }
    return last ?? { ok: false, status: 0 };
  }

  // Window splitting (no paging dependency): a response at the cap, or any failure, never passes silently.
  async function fetchWindow(family, a, b) {
    await sleep(searchGapMs);
    const res = await searchOnce(family, a, b);
    if (!res.ok) { cov.failedWindows.push({ family: family.id, from: a, to: b, status: res.status, reason: 'REQUEST_FAILED' }); cov.windows.push({ family: family.id, from: a, to: b, status: 'failed' }); return; }
    const hits = res.hits ?? [];
    if (hits.length >= HIT_CAP) {
      const spanDays = (dayMs(b) - dayMs(a)) / 86400000;
      if (spanDays <= 31) { cov.failedWindows.push({ family: family.id, from: a, to: b, status: 200, reason: 'AT_CAP' }); cov.windows.push({ family: family.id, from: a, to: b, status: 'at-cap' }); return; }
      const mid = isoOf(dayMs(a) + Math.floor((dayMs(b) - dayMs(a)) / 2));
      await fetchWindow(family, a, mid);
      await fetchWindow(family, isoOf(dayMs(mid) + 86400000), b);
      return;
    }
    cov.windows.push({ family: family.id, from: a, to: b, status: 'ok', count: hits.length });
    for (const h of hits) { const id = `${h._source?.adsh}:${h._id}`; if (!seen.has(id)) seen.set(id, { family: family.id, hit: h }); }
  }

  for (const fam of SEARCH_FAMILIES) await fetchWindow(fam, from, to);

  const observations = [], excluded = [];
  let docs = 0;
  for (const { family, hit } of seen.values()) {
    const s = hit._source ?? {};
    const ciks = (s.ciks ?? []).map(pad10);
    if (!ciks.includes(cik10)) { excluded.push({ accession: s.adsh, reason: 'SUBJECT_NOT_IN_FILING' }); continue; }
    if (docs >= maxDocs) { cov.reasons.push(`document cap (${maxDocs}) reached`); excluded.push({ accession: s.adsh, reason: 'DOC_CAP' }); continue; }
    docs++;
    const file = family === 'new' ? 'primary_doc.xml' : String(hit._id ?? '').split(':')[1];
    if (!file) { cov.failedDocs.push({ accession: s.adsh, reason: 'NO_DOCUMENT_NAME' }); continue; }
    let d = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      await sleep(docGapMs * (attempt + 1));
      cov.requests.doc++;
      try { d = await docFn({ cik: String(parseInt(cik10, 10)), accession: s.adsh, file }); } catch (e) { d = { ok: false, status: 0 }; }
      if (d?.ok) break;
    }
    if (!d?.ok) { cov.failedDocs.push({ accession: s.adsh, reason: 'DOCUMENT_FAILED', status: d?.status ?? 0 }); continue; }

    const names = s.display_names ?? [];
    const holderName = names.find(n => !n.includes(`CIK ${cik10}`))?.replace(/\s*\(CIK[^)]*\)\s*$/, '').replace(/\s*\([A-Z,\- ]+\)\s*$/, '').trim() ?? null;
    const holderCikFromHit = ciks.find(c => c !== cik10) ?? null;
    if (family === 'new') {
      const p = parseSchedule13GXml(d.text);
      if (!p) { cov.failedDocs.push({ accession: s.adsh, reason: 'UNPARSEABLE' }); continue; }
      if (pad10(p.issuerCik) !== cik10) { excluded.push({ accession: s.adsh, reason: 'SUBJECT_IS_NOT_THE_ISSUER' }); continue; } // the subject as holder is a separate relationship direction
      const { person } = selectPerson(p, holderName);
      observations.push({
        accession: s.adsh, form: s.form, family, filingDate: s.file_date, eventDate: p.eventDate ?? s.file_date, dateBasis: p.eventDate ? 'event' : 'filing',
        issuerCik: cik10, holderCik: pad10(p.filerCik ?? holderCikFromHit), holderName, cusip: p.cusip, classTitle: p.classTitle,
        percent: person?.percent ?? null, shares: person?.shares ?? null, soleVote: person?.soleVote ?? null, sharedVote: person?.sharedVote ?? null,
        soleDisp: person?.soleDisp ?? null, sharedDisp: person?.sharedDisp ?? null, below5Flag: p.below5Flag, comments: person?.comments ?? null,
        releaseNumber: person?.releaseNumber ?? null, source: `SEC ${s.form} ${s.adsh} ${file}`,
      });
    } else {
      const p = parseLegacy13GText(d.text);
      if (!p) { cov.failedDocs.push({ accession: s.adsh, reason: 'UNPARSEABLE' }); continue; }
      // Direction for legacy filings (no issuer CIK in the document): the codebase convention (secownershipconnector.js:
      // "ciks/display_names are parallel, index 0 is the subject [issuer], index 1 the filer"). The subject must be index 0.
      if (ciks[0] !== cik10) { excluded.push({ accession: s.adsh, reason: 'SUBJECT_IS_NOT_THE_ISSUER' }); continue; }
      observations.push({
        accession: s.adsh, form: s.form, family, filingDate: s.file_date, eventDate: p.eventDate ?? s.file_date, dateBasis: p.eventDate ? 'event' : 'filing',
        issuerCik: cik10, holderCik: pad10(ciks[1]), holderName, cusip: p.cusip, classTitle: p.classTitle,
        percent: p.person.percent, shares: p.person.shares, soleVote: null, sharedVote: null, soleDisp: null, sharedDisp: null, below5Flag: false,
        comments: null, releaseNumber: null, source: `SEC ${s.form} ${s.adsh} ${file}`,
      });
    }
  }

  const complete = cov.failedWindows.length === 0 && cov.failedDocs.length === 0 && cov.reasons.length === 0;
  if (cov.failedWindows.length) cov.reasons.push(`${cov.failedWindows.length} search window(s) not obtained`);
  if (cov.failedDocs.length) cov.reasons.push(`${cov.failedDocs.length} document(s) not obtained or not parseable`);
  return { observations, excluded, coverage: { complete, ...cov } };
}
