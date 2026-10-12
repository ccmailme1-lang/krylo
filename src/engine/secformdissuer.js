// secformdissuer.js -- KRYL-1412 (SEC Form D issuer identity class, ratified by the Founder 2026-10-12). Identity ONLY.
// A private company that sold securities under Regulation D files Form D and has an SEC CIK. The class resolves a name to that issuer when, and only when:
//   - the name with legal suffixes removed equals the name of exactly ONE Form D issuer (look-alike vehicles named after the company, such as
//     "AVSF - Databento 2026, LLC", do not equal it and never bind; two issuers with the same name stay unresolved);
//   - the issuer is verified by a Form D filed under that CIK (the filing is the evidence; its accession and date travel with the entity);
//   - an empty search result is confirmed by one repeat after a pause (the SEC search returns empty under bursts), and a failed lookup is reported as failed.
// The entity is labelled "private SEC filer (Form D), not listed". Nothing here creates a relationship.
//
//   verifyFormDIssuer(name, { searchFn, now, sleep }) -> { verified:true, cik, canonicalName, evidence } | { verified:false, reason, candidates?, similar? }
import { normalizeEntityName, parseDisplayName } from './secfileradmission.js';

export const FORM_D_CLASS = 'SEC_FORM_D_ISSUER';
export const FORM_D_LABEL = 'private SEC filer (Form D), not listed';
const FROM = '2009-01-01';                          // electronic Form D filing began in 2009
const dateOnly = (ms) => new Date(ms).toISOString().slice(0, 10);

export async function verifyFormDIssuer(name, { searchFn, now = Date.now(), sleep = (ms) => new Promise(r => setTimeout(r, ms)), gapMs = 1500 } = {}) {
  const query = String(name ?? '').trim(); const want = normalizeEntityName(query);
  if (query.length < 3 || !want || !searchFn) return { verified: false, reason: 'NO_QUERY_OR_SEARCH' };
  const run = async () => searchFn({ forms: 'D', startdt: FROM, enddt: dateOnly(now), hits: '100', entityName: query });
  let res;
  try { res = await run(); } catch (e) { return { verified: false, reason: 'LOOKUP_FAILED', detail: String(e?.message ?? e) }; }
  if (!res?.ok) return { verified: false, reason: 'LOOKUP_FAILED', detail: `HTTP ${res?.status ?? 0}` };
  if (!(res.hits ?? []).length) {                    // an empty answer is confirmed once before it is believed
    await sleep(gapMs);
    try { res = await run(); } catch (e) { return { verified: false, reason: 'LOOKUP_FAILED', detail: String(e?.message ?? e) }; }
    if (!res?.ok) return { verified: false, reason: 'LOOKUP_FAILED', detail: `HTTP ${res?.status ?? 0}` };
  }
  const byCik = new Map();                            // issuer CIK -> { name, newest hit, filings }
  for (const h of res.hits ?? []) {
    const s = h._source ?? {}; const issuerCik = String((s.ciks ?? [])[0] ?? '').padStart(10, '0');
    const dn = (s.display_names ?? []).map(parseDisplayName).filter(Boolean).find(p => p.cik === issuerCik) ?? (s.display_names ?? []).map(parseDisplayName).filter(Boolean)[0];
    if (!dn) continue;
    const row = byCik.get(dn.cik) ?? { cik: dn.cik, name: dn.name, newest: null, filings: 0 };
    row.filings++; if (!row.newest || String(s.file_date) > String(row.newest.filingDate)) row.newest = { accession: s.adsh, form: s.form ? `Form ${s.form}` : 'Form D', filingDate: s.file_date };
    byCik.set(dn.cik, row);
  }
  const rows = [...byCik.values()];
  const exact = rows.filter(r => normalizeEntityName(r.name) === want);
  if (exact.length > 1) return { verified: false, reason: 'AMBIGUOUS', candidates: exact.map(r => `${r.name} (CIK ${r.cik})`) };
  if (exact.length === 0) return { verified: false, reason: 'NO_MATCH', similar: rows.filter(r => normalizeEntityName(r.name).split(' ')[0] === want.split(' ')[0]).slice(0, 4).map(r => r.name) };
  const m = exact[0];
  return {
    verified: true, cik: m.cik, canonicalName: m.name.replace(/\s+/g, ' ').trim(), rule: 'form-d-issuer-exact-name+cik',
    evidence: { accession: m.newest.accession, form: m.newest.form, filingDate: m.newest.filingDate, formDFilingsSeen: m.filings, retrievedAt: new Date(now).toISOString(), source: 'SEC EDGAR filing index (Form D)', lookAlikesNotBound: rows.length - 1 },
  };
}
