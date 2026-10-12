// insiderroles.js -- KRYL-1411 (LABOR ratified by the Founder 2026-10-12). Officer and director roles as SEC Forms 3, 4 and 5 state them.
// A reporting person and the issuer are identified by their SEC CIKs (never by name). The relationship is the role the FILING states
// (isDirector, isOfficer + officerTitle); that someone filed an insider form is not the relationship: a ten-percent owner or an "other"
// reporting person who states neither role yields nothing here (ownership is a different relationship). A Form 4 does not state that a
// role ended, so no end is ever inferred: each role is "disclosed as of" the filing it comes from.
// Pure parts: parseOwnershipDocument, rolesFromDocument. Network part: fetchInsiderRoles (search, then one document read per person: the newest filing).

export const INSIDER_FORMS = '3,4,5';
const pad = (c) => String(c ?? '').replace(/\D/g, '').padStart(10, '0');
const flag = (blk, t) => new RegExp(`<${t}>\\s*(?:1|true)\\s*</${t}>`, 'i').test(blk);
const tag = (blk, t) => { const m = blk.match(new RegExp(`<${t}>\\s*([^<]*?)\\s*</${t}>`, 'i')); return m && m[1] !== '' ? m[1].replace(/\s+/g, ' ') : null; };

/** @returns {{ documentType, periodOfReport, issuerCik, issuerName, owners: {cik,name,isDirector,isOfficer,isTenPercentOwner,isOther,officerTitle,otherText}[] }} */
export function parseOwnershipDocument(xml) {
  const x = String(xml ?? '');
  const issuer = (x.match(/<issuer>([\s\S]*?)<\/issuer>/i) ?? [])[1] ?? '';
  const owners = x.split(/<reportingOwner>/i).slice(1).map(b => {
    const blk = b.split(/<\/reportingOwner>/i)[0];
    const rel = (blk.match(/<reportingOwnerRelationship>([\s\S]*?)<\/reportingOwnerRelationship>/i) ?? [])[1] ?? '';
    return { cik: tag(blk, 'rptOwnerCik') ? pad(tag(blk, 'rptOwnerCik')) : null, name: tag(blk, 'rptOwnerName'), isDirector: flag(rel, 'isDirector'), isOfficer: flag(rel, 'isOfficer'), isTenPercentOwner: flag(rel, 'isTenPercentOwner'), isOther: flag(rel, 'isOther'), officerTitle: tag(rel, 'officerTitle'), otherText: tag(rel, 'otherText') };
  });
  return { documentType: tag(x, 'documentType'), periodOfReport: tag(x, 'periodOfReport'), issuerCik: tag(issuer, 'issuerCik') ? pad(tag(issuer, 'issuerCik')) : null, issuerName: tag(issuer, 'issuerName'), owners };
}

/** The roles the filing states for one reporting person: DIRECTOR (isDirector) and OFFICER (isOfficer, with the title as written). Nothing else qualifies. */
export function rolesFromDocument(doc, personCik) {
  const o = (doc?.owners ?? []).find(x => x.cik === pad(personCik));
  if (!o) return [];
  const out = [];
  if (o.isDirector) out.push({ role: 'DIRECTOR', officerTitle: null });
  if (o.isOfficer) out.push({ role: 'OFFICER', officerTitle: o.officerTitle ?? null });
  return out;
}

const _docCache = new Map();
export const _clearInsiderCache = () => _docCache.clear();
const dateOnly = (ms) => new Date(ms).toISOString().slice(0, 10);

/**
 * Search the issuer's Forms 3/4/5 in the window, keep the NEWEST filing of each reporting person (at most maxPersons persons), read each document and
 * extract the stated roles.
 * @returns {{ roles: object[], personsSeen: number, personsRead: number, capped: boolean, searchCapped: boolean, failedDocs: number, failed?: string }}
 */
export async function fetchInsiderRoles({ issuer, from, searchFn, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null), sleep = (ms) => new Promise(r => setTimeout(r, ms)), gapMs = 350, maxPersons = 30, now = Date.now() }) {
  const empty = { roles: [], personsSeen: 0, personsRead: 0, capped: false, searchCapped: false, failedDocs: 0 };
  let res;
  try { res = await searchFn({ forms: INSIDER_FORMS, startdt: from, enddt: dateOnly(now), hits: '100', entityName: issuer.name }); }
  catch (e) { return { ...empty, failed: String(e?.message ?? e) }; }
  if (!res?.ok) return { ...empty, failed: `HTTP ${res?.status ?? 0}` };
  const issuerCik = pad(issuer.cik);
  const hits = (res.hits ?? []).filter(h => (h._source?.ciks ?? []).map(pad).includes(issuerCik));
  const newest = new Map();                                          // person CIK -> newest hit
  for (const h of hits) for (const c of (h._source?.ciks ?? []).map(pad)) {
    if (c === issuerCik) continue;
    const held = newest.get(c);
    if (!held || String(h._source.file_date) > String(held._source.file_date)) newest.set(c, h);
  }
  const persons = [...newest.entries()].sort((a, b) => String(b[1]._source.file_date).localeCompare(String(a[1]._source.file_date)));
  const chosen = persons.slice(0, maxPersons);
  const byHit = new Map();                                           // one document read per hit, however many persons it names
  for (const [pc, h] of chosen) (byHit.get(h._id) ?? byHit.set(h._id, { h, persons: [] }).get(h._id)).persons.push(pc);
  const roles = []; let failedDocs = 0;
  for (const { h, persons: pcs } of byHit.values()) {
    const src = h._source ?? {}; const acc = src.adsh; const file = String(h._id ?? '').split(':')[1];
    let doc = _docCache.get(acc);
    if (!doc) {
      if (!fetchImpl || !file) { failedDocs++; continue; }
      try {
        const r = await fetchImpl('/api/edgar-document?' + new URLSearchParams({ cik: String(parseInt(issuerCik, 10)), accession: String(acc).replace(/-/g, ''), file }));
        if (!r.ok) { failedDocs++; continue; }
        doc = parseOwnershipDocument(await r.text()); _docCache.set(acc, doc);
      } catch { failedDocs++; continue; }
      await sleep(gapMs);
    }
    for (const pc of pcs) {
      const owner = doc.owners.find(o => o.cik === pc);
      for (const r of rolesFromDocument(doc, pc)) roles.push({ personCik: pc, personName: owner?.name ?? null, role: r.role, officerTitle: r.officerTitle, form: src.form ? `Form ${src.form}` : 'Form 4', accession: acc, filingDate: src.file_date ?? null, periodOfReport: doc.periodOfReport, jointFiling: doc.owners.length > 1, issuerCik: doc.issuerCik ?? issuerCik });
    }
  }
  return { roles, personsSeen: persons.length, personsRead: chosen.length, capped: persons.length > chosen.length, searchCapped: (res.hits ?? []).length >= 100, failedDocs };
}
