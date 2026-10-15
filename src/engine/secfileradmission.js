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
export const LEGAL_SUFFIXES = /\b(national association|incorporated|inc|corporation|corp|company|co|limited|ltd|plc|n\.?v|n\.?a|s\.?a|ag|se|llc|lp|l\.p|acb|holdings?|group|the)\b\.?/g;
const LEGAL = LEGAL_SUFFIXES;
export const normalizeEntityName = (s) => String(s ?? '').toLowerCase().replace(/&/g, ' and ').replace(LEGAL_SUFFIXES, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const _log = [];                                   // provenance of every verification attempt, newest last
export const getAdmissionLog = () => [..._log];

// KRYL-1407: what the canonical name source said about a name that did NOT resolve (a suggestion or a list of candidates; never an identity).
const _resolution = new Map();
const keyOf = (t) => String(t ?? '').trim().toLowerCase();
export const getNameResolution = (text) => _resolution.get(keyOf(text)) ?? null;
// An identity lookup that has started and not finished: said plainly on the page as "not finished", never as "the company is unknown" (found 2026-10-14: a slow first lookup read as unresolved).
const _identityInFlight = new Map();
export const identityLookupInFlight = (text) => _identityInFlight.has(keyOf(text));
export const _clearIdentityInFlightForTests = () => _identityInFlight.clear();
// Identity classes that exist as proposals but are NOT implemented or ratified: stated as "not checked", never as checked (specs/spec-entity-resolution-contract-for-architects-20261012.md).
export const IDENTITY_SOURCES_NOT_CHECKED = Object.freeze(['UK Companies House', 'the federal contractor registry (UEI)']);   // GLEIF is a ratified identity class since 2026-10-13 (KRYL-1417): it is listed under the checks when it ran
const OUTCOME_WORDS = { NO_MATCH: 'no match', NO_MATCH_SIMILAR: 'no exact name; similar names exist and none is assumed', AMBIGUOUS: 'several registrants share the name, none assumed', NEAR_MATCH: 'only a similar name, not assumed', NOT_LISTED: 'a registrant was found but it is not listed', NOT_VERIFIED: 'a candidate was found but its annual filings could not be confirmed', LOOKUP_FAILED: 'the lookup failed, so this is not evidence of absence', NO_QUERY_OR_SEARCH: 'not run', CANDIDATE: 'a candidate was found' };
/**
 * The sentences appended to "its entity is not resolved": the closest listed registrant, explicitly not assumed, and which identity sources were actually checked, what
 * each returned, which were not checked, and what would resolve the subject. '' when nothing was recorded for this name.
 */
export function nameResolutionNote(text) {
  if (identityLookupInFlight(text)) return ' Its identity lookup (SEC listed companies, then private SEC filers, then GLEIF) has started and has not finished; that is not a finding that the company is unknown. Refresh analysis once it completes.';
  const r = getNameResolution(text); if (!r) return '';
  const names = (r.candidates ?? []).slice(0, 4).map(c => c.name).join('; ');
  let out = '';
  if (names) {
    if (r.tier === 'NEAR') out += ` Closest listed registrant: ${names}, not assumed.`;
    else if (r.tier === 'AMBIGUOUS') out += ` Several listed registrants match: ${names}. None is assumed.`;
    else if (r.tier === 'UNVERIFIED') out += ` Listed registrant: ${names}; its annual filings could not be confirmed, so it is not assumed.`;
  }
  if (r.checks?.length) {
    out += ` Identity sources checked: static registry (no match); ${r.checks.map(c => `${c.source} (${OUTCOME_WORDS[c.outcome] ?? String(c.outcome).toLowerCase().replace(/_/g, ' ')})`).join('; ')}.`
      + ` Not checked: ${IDENTITY_SOURCES_NOT_CHECKED.join(', ')} (identity classes not yet ratified).`
      + ' What would resolve it: the exact legal name of an SEC registrant, or an identifier from one of the sources not yet checked.';
  }
  return out;
}
export const _clearNameResolutionForTests = () => _resolution.clear();
const noteResolution = (text, r) => { _resolution.set(keyOf(text), r); try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('krylo-name-resolution', { detail: { text } })); } catch { /* no window */ } };

// "Broadcom Inc.  (AVGO)  (CIK 0001730168)" -> { name:'Broadcom Inc.', tickers:['AVGO'], cik:'0001730168' }
export function parseDisplayName(dn) {
  const m = String(dn ?? '').match(/^(.*?)\s*(?:\(([A-Z0-9.,\-\s]+)\)\s*)?\(CIK\s*(\d{1,10})\)\s*$/);
  if (!m) return null;
  const tickers = (m[2] ?? '').split(/[,\s]+/).filter(t => /^[A-Z][A-Z0-9.\-]{0,5}$/.test(t));
  return { name: m[1].trim(), tickers, cik: m[3].padStart(10, '0') };
}

const threeYearsAgo = (now) => { const d = new Date(now); d.setUTCFullYear(d.getUTCFullYear() - 3); return d.toISOString().slice(0, 10); };

export async function verifyPublicFiler(name, { searchFn, nameFn = null, now = Date.now() } = {}) {
  const query = String(name ?? '').trim();
  const checks = []; let indexStep = false;                       // which identity sources were actually checked, and what each returned
  const out = (r) => {
    if (indexStep && !r.verified) checks.push({ source: 'SEC annual-report filers (filing index)', outcome: r.reason, candidates: r.candidates ?? [] });
    const full = { ...r, checks: [...checks] }; _log.push({ query, at: new Date(now).toISOString(), ...full }); return full;
  };
  if (query.length < 3 || !searchFn) return out({ verified: false, reason: 'NO_QUERY_OR_SEARCH' });
  // KRYL-1407: the canonical name source decides what the typed name may mean. EXACT / UNIQUE_PREFIX give one CANDIDATE CIK that the filing-index check below
  // must confirm by that CIK; NEAR and AMBIGUOUS never bind; NONE or an unavailable source leaves the original name-based check in force.
  let want = null, byCikOnly = null, nameTier = null;
  if (nameFn) {
    let nm = null;
    try { nm = await nameFn(query); } catch { nm = null; }
    if (!nm || nm.error || !nm.tier) checks.push({ source: 'SEC listed companies (company_tickers.json)', outcome: 'LOOKUP_FAILED' });
    else checks.push({ source: 'SEC listed companies (company_tickers.json)', outcome: nm.tier === 'NONE' ? 'NO_MATCH' : (nm.tier === 'NEAR' ? 'NEAR_MATCH' : (nm.tier === 'AMBIGUOUS' ? 'AMBIGUOUS' : 'CANDIDATE')) });
    if (nm && !nm.error && nm.tier) {
      nameTier = nm.tier;
      if (nm.tier === 'NEAR' || nm.tier === 'AMBIGUOUS') {
        noteResolution(query, { tier: nm.tier, candidates: nm.candidates ?? [], asOf: nm.asOf ?? null, checks: [...checks] });
        return out({ verified: false, reason: nm.tier === 'NEAR' ? 'NEAR_MATCH' : 'AMBIGUOUS', candidates: (nm.candidates ?? []).map(c => `${c.name} (CIK ${c.cik})`), nameTier });
      }
      if (nm.tier === 'EXACT' || nm.tier === 'UNIQUE_PREFIX') byCikOnly = nm.candidates[0];
    }
  }
  let res; indexStep = true;
  try { res = await searchFn({ forms: ANNUAL_FORMS, startdt: threeYearsAgo(now), enddt: new Date(now).toISOString().slice(0, 10), hits: '100', entityName: byCikOnly ? byCikOnly.name : query }); }
  catch (e) { return out({ verified: false, reason: 'LOOKUP_FAILED', detail: String(e?.message ?? e) }); }
  if (!res?.ok) return out({ verified: false, reason: 'LOOKUP_FAILED', detail: `HTTP ${res?.status ?? 0}` });

  want = normalizeEntityName(query);
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
  if (byCikOnly) {
    // Verification BY CIK: only the filing-index record of the candidate's own CIK can confirm it; the name never does.
    const m = rows.find(r => r.cik === byCikOnly.cik);
    if (!m) { noteResolution(query, { tier: 'UNVERIFIED', candidates: [byCikOnly], checks: [...checks, { source: 'SEC annual-report filers (filing index)', outcome: 'NOT_VERIFIED' }] }); return out({ verified: false, reason: 'NOT_VERIFIED', cik: byCikOnly.cik, candidates: [byCikOnly.name], nameTier }); }
    const tickers = new Set([...m.tickers, ...(byCikOnly.tickers ?? [])]);
    const latest = [...m.filings].sort((a, b) => String(b.filingDate).localeCompare(String(a.filingDate)))[0];
    return out({
      verified: true, cik: m.cik, canonicalName: m.name.replace(/\s*\/[A-Z]{2,4}\/?\s*$/, '').replace(/\s+/g, ' ').trim(), ticker: [...tickers][0], rule: nameTier === 'EXACT' ? 'listed-name-exact+cik' : 'listed-name-unique-prefix+cik', nameTier,
      evidence: { accession: latest.accession, form: latest.form, filingDate: latest.filingDate, annualFilingsSeen: m.filings.length, retrievedAt: new Date(now).toISOString(), source: 'SEC EDGAR filing index; name from SEC company_tickers.json' },
    });
  }
  let matches = rows.filter(r => normalizeEntityName(r.name) === want);
  let rule = 'exact-base-name';
  if (!matches.length) { matches = rows.filter(r => want.length >= 5 && normalizeEntityName(r.name).startsWith(want + ' ')); rule = 'unique-prefix'; }
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
  const k = keyOf(name); _identityInFlight.set(k, Date.now());
  try { return await admitPublicFilerUnguarded(name, opts); } finally { _identityInFlight.delete(k); }
}
async function admitPublicFilerUnguarded(name, opts = {}) {
  // The Form D and GLEIF checks depend only on the typed name, so they start now, beside the listed-name and annual-filer checks, instead of waiting for them: in a browser that holds
  // several requests already, each step in turn waited its own turn in the queue. Their answers are used only where the order of precedence below reaches them (listed, then Form D, then GLEIF),
  // so which identity qualifies is unchanged; an answer that is not reached is discarded.
  const fdStart = opts.searchFn ? import('./secformdissuer.js').then(async (mod) => ({ mod, fd: await mod.verifyFormDIssuer(name, { searchFn: opts.searchFn, now: opts.now ?? Date.now(), sleep: opts.sleep, gapMs: opts.formDGapMs }) })) : null;
  const glStart = opts.gleifFn ? import('./gleifidentity.js').then(async (mod) => ({ mod, gl: await mod.verifyGleifEntity(name, { gleifFn: opts.gleifFn, now: opts.now ?? Date.now() }) })) : null;
  fdStart?.catch(() => {}); glStart?.catch(() => {});
  const v = await verifyPublicFiler(name, opts);
  // KRYL-1412: a name that is not a listed SEC registrant is tried as a private SEC filer (Form D issuer): exact legal name, exactly one issuer, verified by its own Form D.
  let fd = null;
  if (!v.verified && (v.reason === 'NO_MATCH' || v.reason === 'LOOKUP_FAILED') && opts.searchFn) {
    const started = await fdStart; const { FORM_D_CLASS, FORM_D_LABEL } = started.mod;
    fd = started.fd;
    const check = { source: 'SEC Form D issuers', outcome: fd.verified ? 'VERIFIED' : (fd.reason === 'NO_MATCH' && fd.similar?.length ? 'NO_MATCH_SIMILAR' : fd.reason), candidates: fd.candidates ?? fd.similar ?? [] };
    if (fd.verified) {
      const byCikFd = resolveByIdentifier('edgar', fd.cik);
      if (byCikFd) return { entity: byCikFd, outcome: 'ALREADY_KNOWN' };
      const entityFd = createEntity({
        canonicalName: fd.canonicalName, aliases: [String(name).trim()], identifiers: { edgar: fd.cik }, domainTags: [],
        admissionSource: `SEC/EDGAR Form D issuer (${FORM_D_LABEL})`, admissionClass: FORM_D_CLASS,
        admissionEvidence: `${fd.curatedAlias ? `curated alias "${fd.curatedAlias.alias}" (${fd.curatedAlias.curatedBy}); ` : ''}${fd.evidence.form} ${fd.evidence.accession} filed ${fd.evidence.filingDate}; issuer name equals the query name and no other Form D issuer does (${fd.evidence.lookAlikesNotBound} look-alike issuer${fd.evidence.lookAlikesNotBound !== 1 ? 's' : ''} not bound); not listed (no ticker); rule ${fd.rule}`,
      });
      if (!entityFd) return { entity: null, outcome: 'SLUG_COLLISION', detail: { ...v, formD: fd } };
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('krylo-entity-admitted', { detail: { canonicalId: entityFd.canonicalId, cik: fd.cik } })); } catch { /* no window */ }
      return { entity: entityFd, outcome: 'ADMITTED', detail: { ...v, formD: fd } };
    }
    v.checks = [...(v.checks ?? []), check];
    if (fd.reason === 'AMBIGUOUS') v.candidates = fd.candidates;
  }
  // KRYL-1417 (GLEIF identity class, ratified 2026-10-13): a name that is neither a listed SEC registrant nor a Form D issuer is tried against the GLEIF Global LEI Index: one ACTIVE,
  // ISSUED record whose legal name equals the query (or a curated alias's recorded LEI). Identity only, for the patent producer.
  if (!v.verified && opts.gleifFn && (fd ? ['NO_MATCH', 'LOOKUP_FAILED'].includes(fd.reason) : ['NO_MATCH', 'LOOKUP_FAILED'].includes(v.reason))) {
    const startedG = await glStart; const { GLEIF_CLASS, GLEIF_LABEL } = startedG.mod;
    const gl = startedG.gl;
    const checkG = { source: 'GLEIF Global LEI Index', outcome: gl.verified ? 'VERIFIED' : gl.reason, candidates: gl.candidates ?? [] };
    if (gl.verified) {
      const byLei = resolveByIdentifier('lei', gl.lei);
      if (byLei) return { entity: byLei, outcome: 'ALREADY_KNOWN' };
      const entityG = createEntity({
        canonicalName: gl.canonicalName, aliases: [String(name).trim()], identifiers: { lei: gl.lei }, domainTags: [],
        admissionSource: `GLEIF Global LEI Index (${GLEIF_LABEL})`, admissionClass: GLEIF_CLASS,
        admissionEvidence: `${gl.curatedAlias ? `curated alias "${gl.curatedAlias.alias}" (${gl.curatedAlias.curatedBy}); ` : ''}LEI ${gl.lei} · entity status ${gl.evidence.entityStatus} · registration ${gl.evidence.registrationStatus} · ${gl.evidence.jurisdiction ?? 'jurisdiction not stated'}${gl.evidence.registeredAs ? ` · registered as ${gl.evidence.registeredAs}` : ''} · record updated ${String(gl.evidence.lastUpdate ?? 'date not stated').slice(0, 10)}; legal name equals the query name; identity only; rule ${gl.rule}`,
      });
      if (!entityG) return { entity: null, outcome: 'SLUG_COLLISION', detail: { ...v, gleif: gl } };
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('krylo-entity-admitted', { detail: { canonicalId: entityG.canonicalId, lei: gl.lei } })); } catch { /* no window */ }
      return { entity: entityG, outcome: 'ADMITTED', detail: { ...v, gleif: gl } };
    }
    v.checks = [...(v.checks ?? []), checkG];
    if (gl.reason === 'AMBIGUOUS') v.candidates = gl.candidates;
  }
  if (!v.verified) {
    // every unresolved outcome records what was checked, so the subject's message is actionable (a NEAR or AMBIGUOUS note recorded earlier keeps its candidates)
    const prev = getNameResolution(name);
    noteResolution(name, { ...(prev ?? {}), tier: prev?.tier ?? (v.reason === 'AMBIGUOUS' ? 'AMBIGUOUS' : 'NO_MATCH'), candidates: prev?.candidates ?? [], checks: v.checks ?? prev?.checks ?? [], outcome: v.reason });
    return { entity: null, outcome: v.reason, detail: v };
  }
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
