// secfileradmission.js -- KRYL-1380 (Founder decision 2026-10-10): a reusable, evidence-bound admission path for verified
// public SEC filers. The SEC CIK is the identity anchor; a name match alone is never enough.
//   verifyPublicFiler(name)  -> { verified, cik, canonicalName, ticker, evidence } | { verified:false, reason }
//   admitPublicFiler(name)   -> the admitted (or already known) entity card, or null with the reason recorded
// Identity only: nothing here creates an ownership, acquisition, capital or cross-domain relationship. Observations are
// bound later, by CIK, through the existing connectors. Runtime admission is in memory (like the existing Tier 2 admission in
// secownershipconnector.js: SEC/EDGAR CIK is the sole admission authority); a registered entity always wins.
//
// Verification rule (all must hold, otherwise the subject stays unresolved and says why):
//   1. The SEC filing index returns annual-report filings (10-K, 10-K405, 20-F, 40-F) of the company within the last 3 years,
//      each carrying the issuer's own CIK and the registered name, so the issuer is a real reporting company.
//   2. The registered name, with legal suffixes removed, equals the query name with legal suffixes removed (exact base
//      equality). A prefix match is accepted only when exactly ONE CIK matches.
//   3. The registrant is listed: the SEC record shows a ticker.
//   4. Exactly one CIK satisfies the rule (several is AMBIGUOUS: nothing is admitted).
import { createEntity, resolve, resolveByIdentifier } from './entityresolution.js';

export const ANNUAL_FORMS = '10-K,10-K405,20-F,40-F';
const LEGAL = /\b(incorporated|inc|corporation|corp|company|co|limited|ltd|plc|n\.?v|s\.?a|ag|se|llc|lp|l\.p|holdings?|group|the)\b\.?/g;
const base = (s) => String(s ?? '').toLowerCase().replace(/&/g, ' and ').replace(LEGAL, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const _log = [];                                   // provenance of every verification attempt, newest last
export const getAdmissionLog = () => [..._log];

// "Broadcom Inc.  (AVGO)  (CIK 0001730168)" -> { name:'Broadcom Inc.', tickers:['AVGO'], cik:'0001730168' }
export function parseDisplayName(dn) {
  const m = String(dn ?? '').match(/^(.*?)\s*(?:\(([A-Z0-9.,\-\s]+)\)\s*)?\(CIK\s*(\d{1,10})\)\s*$/);
  if (!m) return null;
  const tickers = (m[2] ?? '').split(/[,\s]+/).filter(t => /^[A-Z][A-Z0-9.\-]{0,5}$/.test(t));
  return { name: m[1].trim(), tickers, cik: m[3].padStart(10, '0') };
}

const threeYearsAgo = (now) => { const d = new Date(now); d.setUTCFullYear(d.getUTCFullYear() - 3); return d.toISOString().slice(0, 10); };

export async function verifyPublicFiler(name, { searchFn, now = Date.now() } = {}) {
  const query = String(name ?? '').trim();
  const out = (r) => { _log.push({ query, at: new Date(now).toISOString(), ...r }); return r; };
  if (query.length < 3 || !searchFn) return out({ verified: false, reason: 'NO_QUERY_OR_SEARCH' });
  let res;
  try { res = await searchFn({ forms: ANNUAL_FORMS, startdt: threeYearsAgo(now), enddt: new Date(now).toISOString().slice(0, 10), hits: '100', entityName: query }); }
  catch (e) { return out({ verified: false, reason: 'LOOKUP_FAILED', detail: String(e?.message ?? e) }); }
  if (!res?.ok) return out({ verified: false, reason: 'LOOKUP_FAILED', detail: `HTTP ${res?.status ?? 0}` });

  const want = base(query);
  if (!want) return out({ verified: false, reason: 'NO_MATCH' });
  const byCik = new Map();                           // cik -> { name, tickers, filings[] }
  for (const h of res.hits ?? []) {
    const s = h._source ?? {};
    const names = (s.display_names ?? []).map(parseDisplayName).filter(Boolean);
    const issuerCik = String((s.ciks ?? [])[0] ?? '').padStart(10, '0');
    const issuer = names.find(n => n.cik === issuerCik) ?? names[0];
    if (!issuer) continue;
    const row = byCik.get(issuer.cik) ?? { cik: issuer.cik, name: issuer.name, tickers: new Set(), filings: [] };
    issuer.tickers.forEach(t => row.tickers.add(t));
    row.filings.push({ accession: s.adsh, form: s.form, filingDate: s.file_date });
    byCik.set(issuer.cik, row);
  }
  const rows = [...byCik.values()];
  let matches = rows.filter(r => base(r.name) === want);
  let rule = 'exact-base-name';
  if (!matches.length) { matches = rows.filter(r => want.length >= 5 && base(r.name).startsWith(want + ' ')); rule = 'unique-prefix'; }
  if (!matches.length) return out({ verified: false, reason: 'NO_MATCH', candidates: rows.map(r => r.name).slice(0, 5) });
  if (matches.length > 1) return out({ verified: false, reason: 'AMBIGUOUS', candidates: matches.map(r => `${r.name} (CIK ${r.cik})`) });
  const m = matches[0];
  if (!m.tickers.size) return out({ verified: false, reason: 'NOT_LISTED', cik: m.cik, candidates: [m.name] });
  const latest = [...m.filings].sort((a, b) => String(b.filingDate).localeCompare(String(a.filingDate)))[0];
  return out({
    verified: true, cik: m.cik, canonicalName: m.name.replace(/\s*\/[A-Z]{2,4}\/?\s*$/, '').replace(/\s+/g, ' ').trim(), ticker: [...m.tickers][0], rule,
    evidence: { accession: latest.accession, form: latest.form, filingDate: latest.filingDate, annualFilingsSeen: m.filings.length, retrievedAt: new Date(now).toISOString(), source: 'SEC EDGAR filing index' },
  });
}

/** Admit a verified public filer (identity only). Returns { entity, outcome } where outcome is ADMITTED | ALREADY_KNOWN | the failure reason. */
export async function admitPublicFiler(name, opts = {}) {
  const known = resolve(name);
  if (known && known.confidence === 1.0) return { entity: known, outcome: 'ALREADY_KNOWN' };
  const v = await verifyPublicFiler(name, opts);
  if (!v.verified) return { entity: null, outcome: v.reason, detail: v };
  const byCik = resolveByIdentifier('edgar', v.cik);
  if (byCik) return { entity: byCik, outcome: 'ALREADY_KNOWN' };
  const entity = createEntity({
    canonicalName: v.canonicalName,
    aliases: [String(name).trim(), v.ticker].filter(Boolean),
    identifiers: { edgar: v.cik },
    domainTags: [],                                   // no sector inference (identity only)
    admissionSource: 'SEC/EDGAR issuer verification',
    admissionEvidence: `${v.evidence.form} ${v.evidence.accession} filed ${v.evidence.filingDate}; ticker ${v.ticker}; rule ${v.rule}`,
  });
  if (!entity) return { entity: null, outcome: 'SLUG_COLLISION', detail: v };
  try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('krylo-entity-admitted', { detail: { canonicalId: entity.canonicalId, cik: v.cik } })); } catch { /* no window */ }
  return { entity, outcome: 'ADMITTED', detail: v };
}
