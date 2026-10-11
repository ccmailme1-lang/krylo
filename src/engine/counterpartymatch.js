// counterpartymatch.js -- KRYL-1400. The matching outcome for a counterparty named in a capital-event filing, the prerequisite for
// admitting a CAPITAL_EVENT_INVOLVES relationship (decision record 2026-10-11, sections 3 and 6). The extractor (edgar8kcontent.js) returns
// names exactly as written, with no identifier; this service decides, from evidence, whether a name is a confirmed identified entity.
// It admits nothing and writes no relationship.
//
// Outcomes (one per name):
//   SAME_ENTITY_CONFIRMED   the name, with legal suffixes normalized, equals exactly ONE SEC registrant name (the rule KRYL-1380 uses to admit
//                           filers: the SEC CIK is the identifier). Evidence: the SEC filing in which that registrant's name appears.
//   AFFILIATION_CONFIRMED   the filing's own text documents the relationship next to the name and the named parent is itself SAME_ENTITY_CONFIRMED:
//                           "an affiliate of X" before the name (the party is an UNNAMED affiliate of X: partyIsNamed = false), or
//                           "<name> ... a wholly owned subsidiary of X" after it (the party is the named subsidiary: partyIsNamed = true).
//   CANDIDATE_MATCH         exactly one registrant has a similar name; never admitted.
//   UNRESOLVED              no registrant, two registrants carrying the same name (ambiguous), or no evidence; never admitted.
//   LOOKUP_FAILED           a SEC request failed or was rate-limited and nothing was confirmed: not obtained (absence class b), never a negative match.
//   SELF                    the name is the filer itself (or shares its first word): not a counterparty.
// SEC name search is phrase-based and matches the registered name ("NVIDIA CORP", not "NVIDIA Corporation"), so the query is the name WITHOUT
// its legal suffix, and the match is then decided by exact normalized equality, never by the search ranking.
import { parseDisplayName, normalizeEntityName, LEGAL_SUFFIXES, ANNUAL_FORMS } from './secfileradmission.js';

const LEGAL_CI = new RegExp(LEGAL_SUFFIXES.source, 'gi');   // the shared suffix list, matched case-insensitively on the original-case name
export const searchTerm = (name) => String(name ?? '').replace(LEGAL_CI, ' ').replace(/[,;&]+\s*$/g, ' ').replace(/^\s*[,;&]+/g, ' ').replace(/\s*,\s*(?=,|$)/g, ' ').replace(/\s+/g, ' ').trim();

// The shared name rule drops legal forms, so "X LLC" and "X plc" normalize alike although they are different legal entities. For a counterparty
// match a named legal form must agree: both names carry the same form (corporation = corp, incorporated = inc, company = co, limited = ltd,
// national association = n.a.), or one of them states none.
const FORM_GROUPS = [['llc', 'l.l.c'], ['inc', 'incorporated'], ['corp', 'corporation'], ['co', 'company'], ['ltd', 'limited'], ['plc'], ['lp', 'l.p'], ['n.a', 'na', 'national association'], ['acb'], ['ag'], ['sa', 's.a'], ['nv', 'n.v']];
const formOf = (name) => { const t = String(name ?? '').toLowerCase().replace(/[,;]+/g, ' ').replace(/\s+/g, ' ').trim(); let best = null; for (const g of FORM_GROUPS) for (const f of g) { const re = new RegExp('(?:^|[\\s(])' + f.replace(/\./g, '\\.?') + '\\.?\\s*$'); if (re.test(t)) best = g[0]; } return best; };
const sameForm = (a, b) => { const fa = formOf(a), fb = formOf(b); return !fa || !fb || fa === fb; };
const dateOnly = (ms) => new Date(ms).toISOString().slice(0, 10);
const threeYearsBefore = (ms) => { const d = new Date(ms); d.setUTCFullYear(d.getUTCFullYear() - 3); return dateOnly(d.getTime()); };
const firstTok = (s) => normalizeEntityName(s).split(' ')[0] ?? '';

const _cache = new Map();                       // exact name -> registrant lookup result (kept for the page session; failures are not cached)
export const _clearCounterpartyCache = () => _cache.clear();

/** Registrants whose name equals `name` (normalized), plus similar ones, from SEC search over annual-report filings and over all forms. */
async function lookupRegistrants(name, { searchFn, now, sleep, gapMs }) {
  const key = normalizeEntityName(name);
  if (_cache.has(key)) return _cache.get(key);
  const term = searchTerm(name); const want = key;
  const exact = new Map(), similar = new Map(); let failed = false, answered = 0, capped = false;
  const wantHead = want.split(' ').slice(0, 2).join(' ');
  for (const forms of [ANNUAL_FORMS, '']) {
    if (answered || failed) await sleep(gapMs);
    let res; try { res = await searchFn({ forms, startdt: threeYearsBefore(now), enddt: dateOnly(now), hits: '100', entityName: term }); } catch { res = { ok: false }; }
    if (!res?.ok) { failed = true; continue; }
    answered++; if ((res.hits ?? []).length >= 100) capped = true;
    for (const h of res.hits ?? []) {
      const s = h._source ?? {};
      for (const dn of s.display_names ?? []) {
        const p = parseDisplayName(dn); if (!p) continue;
        const n = normalizeEntityName(p.name);
        const ev = { cik: p.cik, registeredName: p.name, accession: s.adsh ?? null, form: s.form ?? null, filingDate: s.file_date ?? null };
        if (n === want && sameForm(name, p.name)) { if (!exact.has(p.cik)) exact.set(p.cik, ev); }
        else if (n === want) { if (!similar.has(p.cik)) similar.set(p.cik, ev); }          // same words, a different legal form: similar, never exact
        else if (wantHead && (n === wantHead || n.startsWith(wantHead + ' ') || want.startsWith(n + ' '))) { if (!similar.has(p.cik)) similar.set(p.cik, ev); }
      }
    }
    if (forms === ANNUAL_FORMS && exact.size === 1) break;   // one listed issuer found among annual-report filers: no need for the all-forms search
  }
  // The search returns at most 100 hits; a common name can fill them with other registrants. If nothing matched and a search was full, ask once
  // more with the name as written (a phrase search that is narrower for names with a legal suffix in the registered form).
  if (!exact.size && capped && !failed) {
    await sleep(gapMs);
    let res; try { res = await searchFn({ forms: '', startdt: threeYearsBefore(now), enddt: dateOnly(now), hits: '100', entityName: String(name).trim() }); } catch { res = { ok: false }; }
    if (!res?.ok) failed = true; else {
      if ((res.hits ?? []).length >= 100) capped = true;
      for (const h of res.hits ?? []) { const s = h._source ?? {}; for (const dn of s.display_names ?? []) { const p = parseDisplayName(dn); if (p && normalizeEntityName(p.name) === want && sameForm(name, p.name) && !exact.has(p.cik)) exact.set(p.cik, { cik: p.cik, registeredName: p.name, accession: s.adsh ?? null, form: s.form ?? null, filingDate: s.file_date ?? null }); } }
    }
  }
  const out = { failed, capped, answered, exact: [...exact.values()], similar: [...similar.values()] };
  if (!failed) _cache.set(key, out);
  return out;
}

const evidenceOf = (m, now, rule) => ({ source: 'SEC EDGAR full-text search (filing display names)', accession: m.accession, form: m.form, filingDate: m.filingDate, registeredName: m.registeredName, retrievedAt: new Date(now).toISOString(), rule });

/**
 * @param {{ name:string, registrant?:string, passage?:string, searchFn:Function, now?:number, sleep?:Function, gapMs?:number }} p
 *   searchFn({forms,startdt,enddt,hits,entityName}) -> { ok, status, hits }   (the engine /api/edgar binding)
 */
export async function matchCounterparty({ name, registrant = '', passage = '', searchFn, now = Date.now(), sleep = (ms) => new Promise(r => setTimeout(r, ms)), gapMs = 1500 }) {
  const base = { name, outcome: null, identifier: null, canonicalName: null, partyIsNamed: true, evidence: null, candidates: [], reason: null };
  if (!name || !searchFn) return { ...base, outcome: 'LOOKUP_FAILED', absenceClass: 'b', reason: 'no name or no search binding' };
  if (registrant && firstTok(name) && firstTok(name) === firstTok(registrant)) return { ...base, outcome: 'SELF', reason: 'the filer or one of its subsidiaries' };
  const opts = { searchFn, now, sleep, gapMs };

  // How the filing words the party: "an affiliate of <name>" (the party is an unnamed affiliate) or "<name> ... a wholly owned subsidiary of <parent>".
  const at = passage.indexOf(name);
  const before = at > 0 ? passage.slice(Math.max(0, at - 60), at) : '';
  const after = at >= 0 ? passage.slice(at + name.length, at + name.length + 160) : '';
  const unnamedAffiliate = /\b(?:an?|the)\s+(?:wholly[- ]owned\s+)?(?:affiliate|subsidiary)s?\s+of\s+$/i.test(before);
  const parentMatch = after.match(/\b(?:an?\s+)?(?:wholly[- ]owned\s+)?subsidiary\s+of\s+(?:the\s+)?([A-Z][A-Za-z0-9&.'\-]*(?:\s+[A-Z][A-Za-z0-9&.'\-]*){0,5})/);

  const own = await lookupRegistrants(name, opts);
  if (own.exact.length === 1) {
    const m = own.exact[0];
    if (unnamedAffiliate) return { ...base, outcome: 'AFFILIATION_CONFIRMED', partyIsNamed: false, identifier: { scheme: 'sec-cik', value: m.cik }, canonicalName: m.registeredName, evidence: { ...evidenceOf(m, now, 'filing-text: an affiliate of <named registrant>'), documentation: passage.slice(Math.max(0, at - 60), at + name.length + 20) }, reason: 'the party is an unnamed affiliate of the named registrant; the relationship is to the affiliate, not to the registrant itself' };
    return { ...base, outcome: 'SAME_ENTITY_CONFIRMED', identifier: { scheme: 'sec-cik', value: m.cik }, canonicalName: m.registeredName, evidence: evidenceOf(m, now, 'exact-normalized-name-unique-registrant') };
  }
  if (own.exact.length > 1) return { ...base, outcome: 'UNRESOLVED', reason: 'AMBIGUOUS: two or more SEC registrants carry this name', candidates: own.exact.map(m => ({ cik: m.cik, registeredName: m.registeredName })) };

  // No exact registrant. A documented parent of the named subsidiary can still confirm an affiliation.
  if (parentMatch) {
    const parentName = parentMatch[1].trim();
    const par = await lookupRegistrants(parentName, opts);
    if (par.exact.length === 1) {
      const m = par.exact[0];
      return { ...base, outcome: 'AFFILIATION_CONFIRMED', partyIsNamed: true, identifier: { scheme: 'sec-cik', value: m.cik }, canonicalName: m.registeredName, evidence: { ...evidenceOf(m, now, 'filing-text: <named party> is a subsidiary of <registrant>'), documentation: passage.slice(Math.max(0, at), at + name.length + 120) }, reason: `the filing documents the party as a subsidiary of ${parentName}` };
    }
  }
  if (own.failed && !own.answered) return { ...base, outcome: 'LOOKUP_FAILED', absenceClass: 'b', reason: 'the SEC name search was not obtained; this is not a negative match' };
  if (own.similar.length === 1) return { ...base, outcome: 'CANDIDATE_MATCH', candidates: [{ cik: own.similar[0].cik, registeredName: own.similar[0].registeredName }], reason: 'one registrant has a similar name; name similarity alone is not confirmation' };
  return { ...base, outcome: 'UNRESOLVED', absenceClass: (own.failed || own.capped) ? 'b' : 'c', reason: own.failed ? 'one of the SEC searches was not obtained and no registrant matched' : (own.capped ? 'not found within the 100-result SEC search limit; a registrant with this name may exist (not obtained)' : 'no SEC registrant carries this name') + (parentMatch ? ' and the documented parent is not a registrant' : ''), documentedParent: parentMatch ? parentMatch[1].trim() : null };
}

/** Match every counterparty of one extracted capital event, sequentially (SEC fair access; requests are spaced by `gapMs`). */
export async function matchCounterparties(counterparties, { registrant, searchFn, now, sleep, gapMs } = {}) {
  const out = [];
  for (const c of counterparties ?? []) out.push({ counterparty: c, match: await matchCounterparty({ name: c.name, registrant, passage: c.passage, searchFn, now, sleep, gapMs }) });
  return out;
}

/** A counterparty is admissible only with a confirmed outcome. */
export const isConfirmed = (m) => m?.outcome === 'SAME_ENTITY_CONFIRMED' || m?.outcome === 'AFFILIATION_CONFIRMED';
