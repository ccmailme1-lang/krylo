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

// The identity class an entity was admitted under: the SEC Form D issuer class is recorded on the entity card (secformdissuer.js); every other entity (the static registry and the
// listed-company path) is REGISTRY_OR_LISTED. A producer may restrict the identity classes it supports.
export const CLASS_LABELS = Object.freeze({ REGISTRY_OR_LISTED: 'registry or listed SEC companies', SEC_FORM_D_ISSUER: 'private SEC filers (Form D)', GLEIF_LEI: 'entities identified by a GLEIF LEI' });
const ENTITY_LABELS = Object.freeze({ REGISTRY_OR_LISTED: 'a registry or listed SEC company', SEC_FORM_D_ISSUER: 'a private SEC filer (Form D)', GLEIF_LEI: 'an entity identified by a GLEIF LEI (not an SEC filer)' });
const classOf = (entity) => entity?.admissionClass ?? 'REGISTRY_OR_LISTED';

export const IDENTIFIER_LABELS = Object.freeze({ edgar: 'an SEC CIK', lei: 'an LEI', uei: 'a federal contractor UEI', companiesHouse: 'a UK Companies House number', canonicalName: 'a verified canonical name' });

export const PRODUCERS = Object.freeze([
  { id: 'ownership', classes: ['REGISTRY_OR_LISTED'], label: 'SEC beneficial-ownership disclosures (Schedules 13D and 13G)', requires: ['edgar'], produces: 'relationship HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', evidence: 'the filing states the holder and the issuer, both by SEC CIK', why: 'the SEC dataset is keyed by the issuer CIK' },
  { id: '8k', classes: ['REGISTRY_OR_LISTED'], label: 'SEC 8-K filings (capital events and acquisitions, Items 1.01, 2.01, 2.03, 3.02)', requires: ['edgar'], produces: 'relationships CAPITAL_EVENT_INVOLVES and ACQUIRED', evidence: 'the Item text states the event; the other party is matched to an identified registrant', why: 'the SEC dataset is keyed by the filer CIK' },
  { id: 'counterparty', classes: ['REGISTRY_OR_LISTED'], label: 'counterparty matching for the 8-K events', requires: ['edgar'], produces: 'identity of the named parties (matching outcome carried as returned)', evidence: 'exact normalized name, unique registrant', why: 'it matches the parties named in this issuer\'s 8-K filings' },
  { id: 'labor', classes: ['REGISTRY_OR_LISTED'], label: 'SEC insider forms (Forms 3, 4 and 5): officers and directors', requires: ['edgar'], produces: 'relationship HAS_OFFICER_OR_DIRECTOR_DISCLOSURE', evidence: 'the filing states the role; both parties by SEC CIK', why: 'the insider forms are keyed by the issuer CIK' },
  { id: 'formd-people', classes: ['SEC_FORM_D_ISSUER'], label: 'the issuer\'s own Form D: executive officers and directors', requires: ['edgar'], produces: 'relationship HAS_FORM_D_OFFICER_OR_DIRECTOR_DISCLOSURE', evidence: 'the Form D states the role; the person is identified only by the name the filing states, scoped to the issuer', why: 'the Form D is keyed by the issuer CIK' },
  { id: 'clinical', classes: ['REGISTRY_OR_LISTED', 'SEC_FORM_D_ISSUER'], label: 'ClinicalTrials.gov lead sponsorship', requires: ['edgar', 'canonicalName'], produces: 'relationship LEAD_SPONSOR_OF_CLINICAL_TRIAL', evidence: 'the registry states the study and its lead sponsor; admitted only when the sponsor name equals the already-resolved entity\'s legal name', why: 'the sponsor is matched to an entity already resolved by its SEC CIK; the registry never creates identity' },
  { id: 'patents', classes: ['REGISTRY_OR_LISTED', 'SEC_FORM_D_ISSUER', 'GLEIF_LEI'], requiresAny: [['edgar', 'canonicalName'], ['lei', 'canonicalName']], label: 'USPTO PatentsView granted-patent assignees (local bulk file)', requires: ['edgar', 'canonicalName'], produces: 'relationship ASSIGNEE_OF_GRANTED_PATENT', evidence: 'the USPTO granted-patent table lists the company, by its exact legal name, as assignee', why: 'the assignee is matched to an entity already resolved by its SEC CIK; the table never creates identity' },
  { id: 'media', classes: ['REGISTRY_OR_LISTED'], label: 'GDELT dated articles naming the company (SEC registered name)', requires: ['edgar', 'canonicalName'], produces: 'observation only (MEDIA), never a relationship', evidence: 'GDELT returns the article for the exact phrase of the SEC registered name; title, domain and date as GDELT states them', why: 'the phrase is the company\'s SEC registered name, so the entity must carry an SEC CIK' },
  { id: 'capital', label: 'USAspending awards (name-based observation)', requires: ['canonicalName'], produces: 'observation only, never a relationship', evidence: 'federal award history for the resolved name', why: 'the lookup is by recipient name; its result is an observation, not company-bound evidence' },
]);

/** Which producers can run for an entity, and for each that cannot, the identifier types it is missing. */
export function producerEligibility(entity) {
  const ids = entity?.identifiers ?? {};
  const have = (t) => (t === 'canonicalName' ? !!entity?.name : !!ids[t]);
  const eligible = [], ineligible = [];
  for (const p of PRODUCERS) {
    const alts = p.requiresAny ?? [p.requires];                      // a producer keyed by one of several identifiers (patents: an SEC CIK, or an LEI confirmed by GLEIF)
    const missing = alts.map(a => a.filter(t => !have(t))).sort((x, y) => x.length - y.length)[0];
    const wrongClass = p.classes && !p.classes.includes(classOf(entity));
    if (missing.length || wrongClass) ineligible.push({ id: p.id, label: p.label, missing, ...(wrongClass ? { wrongClass: true, supports: p.classes } : {}) }); else eligible.push(p.id);
  }
  return { eligible, ineligible };
}

/** The sentence for a reader when producers could not run: names each, the identifier it needs and what the entity carries. '' when all ran. */
export function ineligibleNote(entity) {
  // A producer that cannot run for want of an identifier is a gap and is always named. A producer that simply does not apply to the entity's identity class is named only for
  // entities admitted under a non-default class (so a listed company is not told that the private-filer producer did not run).
  const ineligible = producerEligibility(entity).ineligible.filter(x => !x.wrongClass || entity?.admissionClass);
  if (!ineligible.length) return '';
  const carries = Object.keys(entity?.identifiers ?? {}).filter(k => entity.identifiers[k]).map(k => k === 'edgar' ? 'an SEC CIK' : k);
  const why = (x) => (x.missing.length ? `requires ${x.missing.map(m => IDENTIFIER_LABELS[m] ?? m).join(' and ')}` : `supports only ${x.supports.map(c => CLASS_LABELS[c] ?? c).join(' and ')}; this entity is ${ENTITY_LABELS[classOf(entity)] ?? classOf(entity)}`);
  return `Evidence sources not run for this entity: ${ineligible.map(x => `${x.label} (${why(x)})`).join('; ')}. The entity carries ${carries.length ? carries.join(', ') : 'no registry identifier'}; no identifier is substituted or inferred.`;
}
