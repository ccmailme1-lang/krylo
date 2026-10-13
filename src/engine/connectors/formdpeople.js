// formdpeople.js -- KRYL-1413 (Founder ratified 2026-10-12). Officers and directors of a PRIVATE SEC filer as its own newest Form D states them.
// Form D lists the issuer's related persons by name with their relationship (Executive Officer, Director, Promoter). Only Executive Officer and Director are read as
// LABOR relationships; Promoter and anything else is not. The person has no SEC CIK: the identity is the NAME AS THE ISSUER'S FILING STATES IT, scoped to that issuer and that
// filing (never matched or merged with any other person or entity). The role is "stated as of" the filing; no end of a role is inferred.
// Pure parts: parseFormD, personNodeId. Network part: fetchFormDPeople (search the issuer's Form D filings, read the newest).

const pad = (c) => String(c ?? '').replace(/\D/g, '').padStart(10, '0');
const tag = (blk, t) => { const m = String(blk ?? '').match(new RegExp(`<${t}>\\s*([^<]*?)\\s*</${t}>`, 'i')); return m && m[1] !== '' ? m[1].replace(/\s+/g, ' ') : null; };
const all = (blk, t) => [...String(blk ?? '').matchAll(new RegExp(`<${t}>\\s*([^<]*?)\\s*</${t}>`, 'gi'))].map(m => m[1].replace(/\s+/g, ' '));
export const nameKey = (n) => String(n ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
/** The person node: scoped to the issuer, by the name as the filing states it. It never equals an SEC CIK node and is never shared across issuers. */
export const personNodeId = (issuerCik, personName) => `FORMD_PERSON:${pad(issuerCik)}:${nameKey(personName).replace(/ /g, '_')}`;

export function parseFormD(xml) {
  const x = String(xml ?? '');
  const issuer = (x.match(/<primaryIssuer>([\s\S]*?)<\/primaryIssuer>/i) ?? [])[1] ?? '';
  const persons = [...x.matchAll(/<relatedPersonInfo>([\s\S]*?)<\/relatedPersonInfo>/gi)].map(m => {
    const blk = m[1]; const nm = (blk.match(/<relatedPersonName>([\s\S]*?)<\/relatedPersonName>/i) ?? [])[1] ?? '';
    const name = [tag(nm, 'firstName'), tag(nm, 'middleName'), tag(nm, 'lastName')].filter(Boolean).join(' ');
    return { name, relationships: all((blk.match(/<relatedPersonRelationshipList>([\s\S]*?)<\/relatedPersonRelationshipList>/i) ?? [])[1] ?? '', 'relationship'), clarification: tag(blk, 'relationshipClarification') };
  }).filter(p => p.name);
  const od = (x.match(/<offeringData>([\s\S]*?)<\/offeringData>/i) ?? [])[1] ?? '';
  const sales = (od.match(/<offeringSalesAmounts>([\s\S]*?)<\/offeringSalesAmounts>/i) ?? [])[1] ?? '';
  const types = (od.match(/<typesOfSecuritiesOffered>([\s\S]*?)<\/typesOfSecuritiesOffered>/i) ?? [])[1] ?? '';
  const flagTrue = (b, t) => new RegExp(`<${t}>\\s*true\\s*</${t}>`, 'i').test(b);
  const SEC_TYPES = { isEquityType: 'equity', isDebtType: 'debt', isOptionToAcquireType: 'option to acquire', isSecurityToBeAcquiredType: 'security to be acquired', isPooledInvestmentFundType: 'pooled investment fund interest', isTenantInCommonType: 'tenant-in-common security', isMineralPropertyType: 'mineral property security', isOtherType: 'other' };
  const offering = od ? {
    industryGroup: tag((od.match(/<industryGroup>([\s\S]*?)<\/industryGroup>/i) ?? [])[1] ?? '', 'industryGroupType'),
    dateOfFirstSale: tag((od.match(/<dateOfFirstSale>([\s\S]*?)<\/dateOfFirstSale>/i) ?? [])[1] ?? '', 'value'),
    totalOfferingAmount: tag(sales, 'totalOfferingAmount'), totalAmountSold: tag(sales, 'totalAmountSold'), totalRemaining: tag(sales, 'totalRemaining'), amountClarification: tag(sales, 'clarificationOfResponse'),
    investorsAlreadyInvested: tag((od.match(/<investors>([\s\S]*?)<\/investors>/i) ?? [])[1] ?? '', 'totalNumberAlreadyInvested'),
    securityTypes: Object.entries(SEC_TYPES).filter(([k]) => flagTrue(types, k)).map(([, v]) => v),
    exemptions: all((od.match(/<federalExemptionsExclusions>([\s\S]*?)<\/federalExemptionsExclusions>/i) ?? [])[1] ?? '', 'item'),
    isAmendment: flagTrue(od, 'isAmendment'),
  } : null;
  return { offering, submissionType: tag(x, 'submissionType'), issuerCik: tag(issuer, 'cik') ? pad(tag(issuer, 'cik')) : null, issuerName: tag(issuer, 'entityName'), previousNames: all(issuer, 'previousName'), persons, dateOfFirstSale: tag(x, 'dateOfFirstSale') ? tag((x.match(/<dateOfFirstSale>([\s\S]*?)<\/dateOfFirstSale>/i) ?? [])[1], 'value') : null };
}

/** The roles Form D states that are LABOR relationships: Executive Officer (OFFICER) and Director (DIRECTOR). Promoter and any other relationship yield nothing. */
export function rolesFromFormD(doc) {
  const out = [];
  for (const p of doc?.persons ?? []) {
    if (p.relationships.some(r => /^executive officer$/i.test(r))) out.push({ personName: p.name, role: 'OFFICER', clarification: p.clarification ?? null });
    if (p.relationships.some(r => /^director$/i.test(r))) out.push({ personName: p.name, role: 'DIRECTOR', clarification: p.clarification ?? null });
  }
  return out;
}

const dateOnly = (ms) => new Date(ms).toISOString().slice(0, 10);
/** @returns {{ roles: object[], formDFilings: number, failed?: string, failedDoc?: boolean }} */
export async function fetchFormDPeople({ issuer, searchFn, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null), now = Date.now(), sleep = (ms) => new Promise(r => setTimeout(r, ms)), gapMs = 1500 }) {
  // The SEC search takes one form type per request (a comma list of D and D/A is not honoured): the original filings and the amendments are searched separately and merged;
  // an empty answer is confirmed by one repeat after a pause (the search returns empty under bursts).
  const one = async (forms) => searchFn({ forms, startdt: '2009-01-01', enddt: dateOnly(now), hits: '100', entityName: issuer.name });
  const mine = (res) => (res.hits ?? []).filter(h => (h._source?.ciks ?? []).map(pad).includes(pad(issuer.cik)));
  let hits = [];
  try {
    for (const forms of ['D', 'D/A']) {
      let res = await one(forms); if (!res?.ok) return { roles: [], formDFilings: 0, failed: `HTTP ${res?.status ?? 0}` };
      let m = mine(res);
      if (!m.length) { await sleep(gapMs); res = await one(forms); if (!res?.ok) return { roles: [], formDFilings: 0, failed: `HTTP ${res?.status ?? 0}` }; m = mine(res); }
      hits = hits.concat(m); if (forms === 'D') await sleep(gapMs);
    }
  } catch (e) { return { roles: [], formDFilings: 0, failed: String(e?.message ?? e) }; }
  if (!hits.length) return { roles: [], formDFilings: 0 };
  const newest = [...hits].sort((a, b) => String(b._source.file_date).localeCompare(String(a._source.file_date)))[0];
  const src = newest._source; const file = String(newest._id ?? '').split(':')[1];
  if (!fetchImpl || !file) return { roles: [], formDFilings: hits.length, failedDoc: true };
  let doc;
  try {
    const r = await fetchImpl('/api/edgar-document?' + new URLSearchParams({ cik: String(parseInt(pad(issuer.cik), 10)), accession: String(src.adsh).replace(/-/g, ''), file }));
    if (!r.ok) return { roles: [], formDFilings: hits.length, failedDoc: true };
    doc = parseFormD(await r.text());
  } catch { return { roles: [], formDFilings: hits.length, failedDoc: true }; }
  if (doc.issuerCik !== pad(issuer.cik)) return { roles: [], formDFilings: hits.length, failedDoc: true };     // the document must be the issuer's own
  return { roles: rolesFromFormD(doc).map(r => ({ ...r, form: src.form === 'D/A' ? 'Form D/A' : 'Form D', accession: src.adsh, filingDate: src.file_date, issuerCik: doc.issuerCik })), formDFilings: hits.length, peopleListed: doc.persons.length, offering: doc.offering, filing: { form: src.form === 'D/A' ? 'Form D/A' : 'Form D', accession: src.adsh, filingDate: src.file_date, issuerCik: doc.issuerCik, issuerName: doc.issuerName } };
}
