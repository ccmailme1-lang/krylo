// gleifidentity.js -- KRYL-1417 (GLEIF identity class, ratified by the Founder 2026-10-13). Identity ONLY, for the patent producer.
// A company with no SEC filings of its own resolves when the GLEIF Global LEI Index holds ONE authoritative record for it:
//   - the record's legal name equals the typed name exactly once the legal form is set aside (case, punctuation and the spelling of the same legal form ignored), or, for a curated alias,
//     the alias's recorded legal name equals it and the record carries the recorded LEI;
//   - the entity status is ACTIVE and the LEI registration status is ISSUED (a lapsed or retired record does not confirm the entity);
//   - exactly one record qualifies (two entities with the same name stay unresolved; look-alike names, investor vehicles and similarly named entities never bind).
// A GLEIF record is identity, not evidence of financing, officers, ownership or any other relationship. Nothing here creates a relationship.
//
//   verifyGleifEntity(name, { gleifFn, now }) -> { verified:true, lei, canonicalName, evidence } | { verified:false, reason, candidates? }
import { legalNameKey } from './legalnamekey.js';
import CURATED from '../data/curatedaliases.json' with { type: 'json' };

export const GLEIF_CLASS = 'GLEIF_LEI';
export const GLEIF_LABEL = 'legal entity (GLEIF LEI), not an SEC filer';
const FORMS = new Set(['incorporated', 'corporation', 'company', 'limited', 'llc', 'lp', 'plc', 'ltd', 'inc', 'corp', 'co']);
/** The name key with a trailing legal form set aside ("netflix incorporated" -> "netflix"). */
export const baseKey = (n) => { const w = legalNameKey(n).split(' ').filter(Boolean); while (w.length > 1 && FORMS.has(w[w.length - 1])) w.pop(); return w.join(' '); };
export const gleifAliasFor = (name) => (CURATED.aliases ?? []).find(a => a.class === GLEIF_CLASS && legalNameKey(a.alias) === legalNameKey(name)) ?? null;

export async function verifyGleifEntity(name, { gleifFn, now = Date.now() } = {}) {
  const typed = String(name ?? '').trim();
  const curated = gleifAliasFor(typed);
  const query = curated ? curated.legalName : typed;
  if (query.length < 3 || !gleifFn) return { verified: false, reason: 'NO_QUERY_OR_LOOKUP' };
  let res;
  try { res = await gleifFn(query); } catch (e) { return { verified: false, reason: 'LOOKUP_FAILED', detail: String(e?.message ?? e) }; }
  if (!res || res.error || !Array.isArray(res.records)) return { verified: false, reason: 'LOOKUP_FAILED', detail: res?.error ?? 'no answer' };
  const want = baseKey(query);
  const named = res.records.filter(r => r.legalName && baseKey(r.legalName) === want);
  const good = named.filter(r => r.entityStatus === 'ACTIVE' && r.registrationStatus === 'ISSUED');
  if (good.length > 1) return { verified: false, reason: 'AMBIGUOUS', candidates: good.map(r => `${r.legalName} (LEI ${r.lei})`) };
  if (good.length === 0) return { verified: false, reason: named.length ? 'NOT_ACTIVE' : 'NO_MATCH', candidates: (named.length ? named : res.records).slice(0, 4).map(r => `${r.legalName} (LEI ${r.lei}, ${r.entityStatus}/${r.registrationStatus})`) };
  const m = good[0];
  if (curated && m.lei !== curated.lei) return { verified: false, reason: 'CURATED_LEI_MISMATCH', candidates: [`${m.legalName} (LEI ${m.lei})`] };   // the alias is never applied to a different entity
  return {
    verified: true, lei: m.lei, canonicalName: m.legalName.replace(/\s+/g, ' ').trim(), rule: curated ? 'gleif-curated-alias+exact-legal-name+lei' : 'gleif-exact-legal-name+lei',
    curatedAlias: curated ? { alias: curated.alias, curatedBy: curated.curatedBy } : null,
    evidence: { lei: m.lei, legalName: m.legalName, entityStatus: m.entityStatus, registrationStatus: m.registrationStatus, jurisdiction: m.jurisdiction, registeredAs: m.registeredAs, registeredAt: m.registeredAt, lastUpdate: m.lastUpdate, retrievedAt: new Date(now).toISOString(), source: res.source ?? 'GLEIF Global LEI Index', recordsSeen: res.records.length, lookAlikesNotBound: res.records.length - 1 },
  };
}

/**
 * An entity that already carries an LEI (a curated registry identifier): the producer runs only when the live GLEIF record for THAT LEI confirms it now -- the record exists, the
 * entity is ACTIVE, the registration ISSUED, and its legal name equals the entity's name once the legal form is set aside.
 * @returns {Promise<{ verified: true, lei, legalName, evidence } | { verified: false, reason, detail? }>}
 */
export async function verifyGleifLei(entity, { gleifLeiFn, now = Date.now() } = {}) {
  const lei = String(entity?.identifiers?.lei ?? '').toUpperCase();
  if (!lei || !gleifLeiFn) return { verified: false, reason: 'NO_LEI_OR_LOOKUP' };
  let res;
  try { res = await gleifLeiFn(lei); } catch (e) { return { verified: false, reason: 'LOOKUP_FAILED', detail: String(e?.message ?? e) }; }
  if (!res || res.error || !Array.isArray(res.records)) return { verified: false, reason: 'LOOKUP_FAILED', detail: res?.error ?? 'no answer' };
  const m = res.records.find(r => r.lei === lei);
  if (!m) return { verified: false, reason: 'NO_RECORD' };
  if (m.entityStatus !== 'ACTIVE' || m.registrationStatus !== 'ISSUED') return { verified: false, reason: 'NOT_ACTIVE', detail: `${m.legalName} (${m.entityStatus}/${m.registrationStatus})` };
  if (!m.legalName || baseKey(m.legalName) !== baseKey(entity.name)) return { verified: false, reason: 'NAME_MISMATCH', detail: `${m.legalName} is not ${entity.name}` };
  return { verified: true, lei, legalName: m.legalName.replace(/\s+/g, ' ').trim(),
    evidence: { lei, legalName: m.legalName, entityStatus: m.entityStatus, registrationStatus: m.registrationStatus, jurisdiction: m.jurisdiction, registeredAs: m.registeredAs, registeredAt: m.registeredAt, lastUpdate: m.lastUpdate, retrievedAt: new Date(now).toISOString(), source: res.source ?? 'GLEIF Global LEI Index' } };
}
