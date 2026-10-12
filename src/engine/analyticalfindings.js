// analyticalfindings.js -- findings-first structural synthesis (integrated plan, workstream 4; 8/10 objective). Pure.
// A finding answers part of the question the guest asked from what the ADMITTED relationships, the source-dated change record and the admission report
// establish. It is not a verdict and not a recommendation (CLAUDE.md section 21): it states structure, change, what is established and what is not.
// Every finding carries what the standard in v0.4 section 6 asks for: its supporting admitted relationships (ids, for provenance), the participants,
// the temporal basis, an evidentiary strength (DOCUMENTED / SUPPORTED / INFERRED / UNRESOLVED), the alternative readings that stay open, and why it
// matters to THIS question. The same builder runs for Analysis (the displayed snapshot) and History (the stored snapshot), so they cannot differ.
//
//   buildFindings({ subject, relationships, evidenceFor, labelOf, formation, change, admissionReport, questionDomains }) -> { findings, lead }
//   questionDomainsFrom(text) -> array of the domains the question names, or null when it names none (every domain with an admitted relationship is relevant)
import { domainsOf } from './admittedformation.js';

export const STRENGTH = Object.freeze({ DOCUMENTED: 'DOCUMENTED', SUPPORTED: 'SUPPORTED', INFERRED: 'INFERRED', UNRESOLVED: 'UNRESOLVED' });
const DOMAIN_WORDS = {
  OWNERSHIP: /\b(?:own(?:ers?|ership|s|ed)?|holders?|holdings?|stakes?|shareholders?|control)\b/i,
  CAPITAL: /\b(?:capital|financ\w*|offerings?|debt|equity|raise[sd]?|funding|underwrit\w*|credit|acquisitions?|acquir\w*|mergers?|deals?)\b/i,
  TECHNOLOGY: /\b(?:technolog\w*|patents?|software|platforms?|infrastructure|supplier|suppliers|dependenc\w*)\b/i,
  KNOWLEDGE: /\b(?:knowledge|research|publications?|intellectual|science|scientific|papers?)\b/i,
  LABOR: /\b(?:labou?r|workforce|employ\w*|leadership|executives?|hiring|talent|management\s+changes?)\b/i,
  MEDIA: /\b(?:media|press|news|attention|coverage|sentiment|public)\b/i,
};
export function questionDomainsFrom(text) {
  const t = String(text ?? '');
  if (/\b(?:all\s+six|six\s+domains|every\s+domain|across\s+all)\b/i.test(t)) return Object.keys(DOMAIN_WORDS);
  const hit = Object.keys(DOMAIN_WORDS).filter(d => DOMAIN_WORDS[d].test(t));
  return hit.length ? hit : null;
}

// The domains that have a relationship type producing admitted relationships from a live source today, and the source (the one authoritative place; update it when a
// ratified type begins producing). A named domain WITHOUT a producer cannot be covered at all; a named domain WITH a producer but no relationship for this company
// means the filings read name none, which is a different statement and is worded differently.
export const PRODUCING_DOMAINS = Object.freeze({
  OWNERSHIP: 'SEC Schedule 13D/13G beneficial-ownership disclosures',
  CAPITAL: 'SEC 8-K capital events and acquisitions (Items 1.01, 2.01, 2.03, 3.02)',
});

const day = (iso) => String(iso ?? '').slice(0, 10);
const plural = (n, one, many) => `${n} ${n === 1 ? one : (many ?? one + 's')}`;
const list = (xs, max = 3) => xs.length <= max ? xs.join(', ') : `${xs.slice(0, max).join(', ')} and ${xs.length - max} more`;
const ids = (rels) => rels.slice(0, 24).map(r => ({ relationshipId: r.id }));

export function buildFindings({ subject = 'the subject', relationships = [], evidenceFor = () => null, labelOf = (id) => id, formation = null, change = null, admissionReport = null, questionDomains = null } = {}) {
  const findings = []; let n = 0;
  const add = (f) => { findings.push({ id: `f${++n}`, participants: [], alternatives: [], evidence: [], temporal: null, ...f }); return findings[findings.length - 1]; };
  const asked = questionDomains && questionDomains.length ? new Set(questionDomains) : null;
  const matters = (domains, whenAsked, whenNot) => (!asked || domains.some(d => asked.has(d))) ? whenAsked : whenNot;

  // 1. Ownership: who has disclosed, what changed, what cannot be confirmed as current.
  const own = relationships.filter(r => r.type === 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE');
  if (own.length) {
    const recs = change?.relationships ?? [];
    const by = (f) => recs.filter(f);
    const dissolved = by(r => r.existence?.state === 'DISSOLVED'), fresh = by(r => r.existence?.state === 'NEW'), indet = by(r => r.existence?.state === 'INDETERMINATE');
    const strengthened = by(r => /STRENGTHENING|WEAKENING/.test(r.summary ?? ''));
    const parts = [];
    if (change) {
      if (dissolved.length) parts.push(`${plural(dissolved.length, 'holder')} reported ending ${dissolved.length === 1 ? 'its' : 'their'} position (${list(dissolved.map(r => r.holderName))})`);
      if (fresh.length) parts.push(`${plural(fresh.length, 'holder')} newly reported a position (${list(fresh.map(r => r.holderName))})`);
      if (strengthened.length) parts.push(`${plural(strengthened.length, 'position')} changed in size`);
      if (indet.length) parts.push(`${plural(indet.length, 'position')} cannot be confirmed as current because no filing was returned for the current period (${list(indet.map(r => r.holderName))})`);
    }
    const e0 = recs[0]?.periods?.E0;
    add({
      kind: 'OWNERSHIP_STRUCTURE', domains: ['OWNERSHIP'], strength: STRENGTH.SUPPORTED,
      headline: `${plural(new Set(own.map(r => r.part[1])).size, 'holder has', 'holders have')} disclosed beneficial ownership in ${subject}${change ? (parts.length ? `; over the two most recent 12-month periods, ${parts.join('; ')}.` : '; no change over the two most recent 12-month periods is evidenced.') : '; change over time has not been assessed in this analysis.'}`,
      supporting: ids(own), participants: [...new Set(own.map(r => labelOf(r.part[1])))].slice(0, 8),
      temporal: change ? `two adjacent 12-month periods compared by source event dates${e0 ? `, as of ${e0}` : ''}` : 'filing dates only (no comparison run)',
      alternatives: [
        ...(dissolved.length ? ['A zero-percent filing ends that filer\'s own reporting; it does not show the shares were sold, and a related filer may report them.'] : []),
        ...(indet.length ? ['No filing in the current period does not show a position ended: a holder below a reporting threshold or a filing the search did not return cannot be told apart here.'] : []),
        ...(!change ? ['Without the two-period comparison, which of these positions are current is not established.'] : []),
      ],
      significance: matters(['OWNERSHIP'], 'This is the ownership part of the question: who has disclosed a holding, what changed, and what cannot be confirmed.', 'Context for the question: the ownership structure behind it.'),
      evidence: recs.filter(r => ['DISSOLVED', 'NEW', 'INDETERMINATE'].includes(r.existence?.state)).slice(0, 8).map(r => ({ holder: r.holderName, accession: (r.evidence?.inP1 ?? []).slice(-1)[0]?.accession ?? r.evidence?.asOfE0?.accession ?? null, state: r.existence?.state })),
    });
    // 1b. A documented realignment between related filers (the filings themselves state it).
    const realigned = recs.filter(r => r.configuration?.state === 'RECONFIGURED' && r.configuration?.participants?.basis);
    if (realigned.length) {
      const basis = [...new Set(realigned.map(r => r.configuration.participants.basis))][0];
      add({
        kind: 'OWNERSHIP_REALIGNMENT', domains: ['OWNERSHIP'], strength: STRENGTH.DOCUMENTED,
        headline: `${list([...new Set(realigned.map(r => r.holderName))], 4)}: reported ownership moved between related filers, as the filings state it (${basis}).`,
        supporting: ids(own.filter(r => realigned.some(x => labelOf(r.part[1]) === x.holderName))), participants: [...new Set(realigned.map(r => r.holderName))].slice(0, 6),
        temporal: 'event dates of the filings cited', alternatives: ['The filings document the realignment of reporting between the filers; they do not establish why it was done.'],
        significance: matters(['OWNERSHIP'], 'A holder that appears to leave and another that appears to arrive may be one change of reporting entity, not a change in who owns; this is the ownership change the question asks about.', 'Explains an apparent ownership change in the record.'),
        evidence: realigned.slice(0, 6).map(r => ({ holder: r.holderName, accession: (r.evidence?.inP1 ?? []).slice(-1)[0]?.accession ?? null })),
      });
    }
  }

  // 2. Financing: capital events and who they name.
  const cap = relationships.filter(r => r.type === 'CAPITAL_EVENT_INVOLVES').map(r => ({ r, ev: evidenceFor(r.id)?.provenance })).filter(x => x.ev);
  if (cap.length) {
    const events = new Set(cap.map(x => x.ev.accession)), parties = new Map();
    for (const x of cap) (parties.get(x.r.part[1]) ?? parties.set(x.r.part[1], new Set()).get(x.r.part[1])).add(x.ev.accession);
    const recurring = [...parties].filter(([, s]) => s.size > 1).map(([p]) => labelOf(p));
    const dates = cap.map(x => day(x.ev.filingDate)).sort();
    const unresolved = [...new Set((admissionReport?.rejected ?? []).filter(x => x.outcome !== 'SELF' && (x.kind ?? 'CAPITAL_EVENT') === 'CAPITAL_EVENT').map(x => x.counterparty))];
    const instruments = [...new Set(cap.map(x => x.ev.instrument).filter(Boolean))];
    add({
      kind: 'FINANCING', domains: ['CAPITAL'], strength: STRENGTH.SUPPORTED,
      headline: `${subject} reported ${plural(events.size, 'capital event')} (${dates[0] === dates[dates.length - 1] ? dates[0] : `${dates[0]} to ${dates[dates.length - 1]}`}) naming ${plural(parties.size, 'identified counterparty', 'identified counterparties')}${instruments.length ? ` across ${list(instruments, 3)}` : ''}${recurring.length ? `; ${list(recurring)} ${recurring.length === 1 ? 'is' : 'are'} named in more than one event` : ''}${unresolved.length ? `; ${plural(unresolved.length, 'other named party', 'other named parties')} could not be identified` : ''}.`,
      supporting: ids(cap.map(x => x.r)), participants: [...parties.keys()].map(labelOf).slice(0, 8),
      temporal: `filing dates ${dates[0]} to ${dates[dates.length - 1]}`,
      alternatives: ['Being named in a filing documents participation in that event; it does not establish the terms of a continuing relationship.', ...(unresolved.length ? [`Not identified, so not admitted: ${list(unresolved, 4)}.`] : []), 'Amounts are quoted as the filings state them; no size or intensity of capital is derived.'],
      significance: matters(['CAPITAL'], 'This is the financing part of the question: which institutions the company dealt with in its recent capital events.', 'Context for the question: how the company has recently raised or arranged capital.'),
      evidence: cap.slice(0, 8).map(x => ({ accession: x.ev.accession, filingDate: x.ev.filingDate, counterparty: labelOf(x.r.part[1]) })),
    });
  }

  // 3. Acquisitions the filings state.
  const acq = relationships.filter(r => r.type === 'ACQUIRED').map(r => ({ r, ev: evidenceFor(r.id)?.provenance })).filter(x => x.ev?.source === 'SEC_8K_ACQUISITION')
    .sort((a, b) => String(b.ev.filingDate).localeCompare(String(a.ev.filingDate)));
  for (const { r, ev } of acq.slice(0, 3)) {
    const a = labelOf(r.part[0]), b = labelOf(r.part[1]);
    add({
      kind: 'ACQUISITION', domains: ['CAPITAL', 'OWNERSHIP'], strength: STRENGTH.DOCUMENTED,
      headline: ev.dealStatus === 'CLOSED' ? `${a} completed its acquisition of ${b} (reported ${day(ev.filingDate)}).` : `${a} entered an agreement to acquire ${b}; the deal is pending as the latest filing read states it (reported ${day(ev.filingDate)}).`,
      supporting: [{ relationshipId: r.id }], participants: [a, b], temporal: `filing date ${day(ev.filingDate)}`,
      alternatives: ['Only Items 1.01 and 2.01 are read: a completion or termination disclosed under another Item (for example 7.01 or 8.01) is not seen here, so a pending status may be out of date.'],
      significance: matters(['CAPITAL', 'OWNERSHIP'], 'A stated acquisition changes who controls and finances the company or its target; it is part of the capital and ownership structure the question asks about.', 'Context for the question: a stated acquisition.'),
      evidence: [{ accession: ev.accession, filingDate: ev.filingDate, passage: ev.passage }],
    });
  }

  // 4. What connects the domains, or why nothing does.
  if (relationships.length && formation?.structure) {
    const s = formation.structure;
    if (formation.formation?.links?.length) {
      const links = formation.formation.links;
      const via = [...new Set(links.flatMap(l => l.via.map(v => v.label)))];
      add({
        kind: 'CROSS_DOMAIN', domains: [...new Set(links.flatMap(l => [l.a, l.b]))], strength: STRENGTH.SUPPORTED,
        headline: `Admitted relationships connect ${list(formation.formation.participatingDomains, 4)}: ${links.map(l => `${l.a} and ${l.b} (${l.pairType}${l.via.length ? `, through ${list(l.via.map(v => v.label), 2)}` : ''})`).join('; ')}.`,
        supporting: ids(relationships.filter(r => links.some(l => l.relationshipIds.includes(r.id)))), participants: via.slice(0, 6),
        temporal: 'as admitted in this snapshot', alternatives: ['A connection through the company itself shows that evidence exists in both domains; it does not by itself show that one caused or funded the other.'],
        significance: 'This is the cross-domain structure the admitted evidence establishes.',
      });
    } else {
      add({
        kind: 'CROSS_DOMAIN', domains: s.domains, strength: STRENGTH.SUPPORTED,
        headline: `No cross-domain structure is established: the ${plural(s.relationships, 'admitted relationship')} speak${s.relationships === 1 ? 's' : ''} to ${s.domains.length === 1 ? `one domain only (${s.domains[0]})` : 'domains with no shared participant'}.`,
        supporting: ids(relationships), temporal: 'as admitted in this snapshot',
        alternatives: ['Evidence in other domains may exist at field level, but it is not tied to this company as a relationship, so it is not part of the structure.'],
        significance: matters(s.domains.length ? s.domains : [], 'The question asks how domains connect; on the admitted evidence they do not yet.', 'Context for the question: how far the established structure reaches.'),
      });
    }
  }

  // 5. Domains the question names that have no admitted relationship for this company.
  const covered = new Set(relationships.flatMap(r => domainsOf(r, evidenceFor(r.id))));
  const wanted = asked ? [...asked] : [];
  const noProducer = wanted.filter(d => !covered.has(d) && !PRODUCING_DOMAINS[d]);
  const noneFound = wanted.filter(d => !covered.has(d) && PRODUCING_DOMAINS[d]);
  if (noneFound.length) {
    add({
      kind: 'NONE_FOUND', domains: noneFound, strength: STRENGTH.UNRESOLVED,
      headline: `No admitted relationship ties ${subject} to ${list(noneFound, 6)} in the filings read: ${noneFound.map(d => `${d} is read from ${PRODUCING_DOMAINS[d]}`).join('; ')}, and none of those filings in the period searched names an identified party or transaction that qualifies.`,
      supporting: [], temporal: 'the filing period searched for this analysis', alternatives: ['This states what the filings read contain, not that no such relationship exists: filings outside the period or the Items read, and parties that could not be identified, are not seen here.'],
      significance: 'The question names these domains; the analysis says what was read and found, rather than leaving the domain silent.',
    });
  }
  if (noProducer.length) {
    add({
      kind: 'COVERAGE_LIMIT', domains: noProducer, strength: STRENGTH.UNRESOLVED,
      headline: `No admitted relationship ties ${subject} to ${list(noProducer, 6)}: no relationship type is currently producing admitted relationships for ${noProducer.length === 1 ? 'that domain' : 'those domains'}, so nothing there can be stated as part of ${subject}'s structure.`,
      supporting: [], temporal: null, alternatives: ['Field-level observations in these domains may exist; they are not company-bound evidence and are not presented as relationships.'],
      significance: 'The question names these domains; the analysis states plainly that they are not covered rather than implying they were checked and found empty.',
    });
  }

  // Order: findings that speak to the question's domains first; the coverage limit last.
  const rel = (f) => (asked ? (f.domains.some(d => asked.has(d)) ? 0 : 1) : 0);
  findings.sort((a, b) => ((a.kind === 'COVERAGE_LIMIT' || a.kind === 'NONE_FOUND') - (b.kind === 'COVERAGE_LIMIT' || b.kind === 'NONE_FOUND')) || rel(a) - rel(b));
  return { findings, lead: findings[0] ?? null };
}
