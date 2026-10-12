// produceridentifiers.js -- producer identifier contracts (Founder direction 2026-10-12; spec section 7, step 2). Identity resolution and producer eligibility are SEPARATE
// contracts: resolving a company does not by itself make any evidence producer able to run for it. Each entity-scoped producer declares here which identifiers it
// requires, which evidence it produces, and why. The dispatcher asks `producerEligibility(entity)` instead of testing for an SEC CIK everywhere; a producer that is not
// eligible is reported with the identifier it is missing (never silently skipped), and an identifier is NEVER manufactured or substituted: the entity carries only
// identifiers a registry resolution verified.
//
// Today every relationship producer reads an SEC dataset keyed by the SEC CIK, so SEC identifiers are intrinsically required for them. The declaration makes that explicit and
// is where a future producer keyed by another identifier (for example an LEI) is registered without touching the dispatcher.
//
//   producerEligibility({ identifiers, name }) -> { eligible: string[], ineligible: [{ id, label, missing: string[] }] }

export const IDENTIFIER_LABELS = Object.freeze({ edgar: 'an SEC CIK', lei: 'an LEI', uei: 'a federal contractor UEI', companiesHouse: 'a UK Companies House number', canonicalName: 'a verified canonical name' });

export const PRODUCERS = Object.freeze([
  { id: 'ownership', label: 'SEC beneficial-ownership disclosures (Schedules 13D and 13G)', requires: ['edgar'], produces: 'relationship HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', evidence: 'the filing states the holder and the issuer, both by SEC CIK', why: 'the SEC dataset is keyed by the issuer CIK' },
  { id: '8k', label: 'SEC 8-K filings (capital events and acquisitions, Items 1.01, 2.01, 2.03, 3.02)', requires: ['edgar'], produces: 'relationships CAPITAL_EVENT_INVOLVES and ACQUIRED', evidence: 'the Item text states the event; the other party is matched to an identified registrant', why: 'the SEC dataset is keyed by the filer CIK' },
  { id: 'counterparty', label: 'counterparty matching for the 8-K events', requires: ['edgar'], produces: 'identity of the named parties (matching outcome carried as returned)', evidence: 'exact normalized name, unique registrant', why: 'it matches the parties named in this issuer\'s 8-K filings' },
  { id: 'labor', label: 'SEC insider forms (Forms 3, 4 and 5): officers and directors', requires: ['edgar'], produces: 'relationship HAS_OFFICER_OR_DIRECTOR_DISCLOSURE', evidence: 'the filing states the role; both parties by SEC CIK', why: 'the insider forms are keyed by the issuer CIK' },
  { id: 'capital', label: 'USAspending awards (name-based observation)', requires: ['canonicalName'], produces: 'observation only, never a relationship', evidence: 'federal award history for the resolved name', why: 'the lookup is by recipient name; its result is an observation, not company-bound evidence' },
]);

/** Which producers can run for an entity, and for each that cannot, the identifier types it is missing. */
export function producerEligibility(entity) {
  const ids = entity?.identifiers ?? {};
  const have = (t) => (t === 'canonicalName' ? !!entity?.name : !!ids[t]);
  const eligible = [], ineligible = [];
  for (const p of PRODUCERS) {
    const missing = p.requires.filter(t => !have(t));
    if (missing.length) ineligible.push({ id: p.id, label: p.label, missing }); else eligible.push(p.id);
  }
  return { eligible, ineligible };
}

/** The sentence for a reader when producers could not run: names each, the identifier it needs and what the entity carries. '' when all ran. */
export function ineligibleNote(entity) {
  const { ineligible } = producerEligibility(entity);
  if (!ineligible.length) return '';
  const carries = Object.keys(entity?.identifiers ?? {}).filter(k => entity.identifiers[k]).map(k => k === 'edgar' ? 'an SEC CIK' : k);
  return `Evidence sources not run for this entity because the identifier they require is not carried: ${ineligible.map(x => `${x.label} (requires ${x.missing.map(m => IDENTIFIER_LABELS[m] ?? m).join(' and ')})`).join('; ')}. The entity carries ${carries.length ? carries.join(', ') : 'no registry identifier'}; no identifier is substituted or inferred.`;
}
