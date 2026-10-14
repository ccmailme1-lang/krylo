// analyticalsynthesis.js -- Step 6 of the decision record (2026-10-11): structural synthesis with transparent evidence attribution.
// It assembles what the admitted relationships, their filings and the temporal comparison establish about a subject into statements. Every statement
// carries one evidentiary status and the evidence it stands on; nothing is withheld because of what a reader might infer, and nothing is stated at a
// higher status than its evidence:
//   DOCUMENTED  stated in the source (a quoted filing passage, a reported position).
//   SUPPORTED   licensed by the admitted relationships and their evidence (a classification of dated filings, a count over admitted relationships,
//               a link between domains).
//   INFERRED    a reasonable implication of the supported structure that goes beyond what is directly documented; it names the supported
//               statements it rests on and is never worded as established.
//   UNRESOLVED  evidence is missing, insufficient, contradictory or not yet obtained (an unmatched counterparty, an INDETERMINATE classification,
//               a measure not assessed).
// Pure: inputs are the admitted relationships (the displayed snapshot's frozen view), the pinned temporal result and the capital-event admission report.
//
//   buildSynthesis({ subject, relationships, evidenceFor, labelOf, formation, change, admissionReport }) -> { statements, counts }
import { admittedFormationSentence, formationLeadsSentence } from './admittedformation.js';

export const STATUS = Object.freeze({ DOCUMENTED: 'DOCUMENTED', SUPPORTED: 'SUPPORTED', INFERRED: 'INFERRED', UNRESOLVED: 'UNRESOLVED' });
const money = (a) => `${a.raw}${a.wording ? ` (${a.wording})` : ''}`;
const day = (iso) => String(iso ?? '').slice(0, 10);

export function buildSynthesis({ subject = 'the subject', relationships = [], evidenceFor = () => null, labelOf = (id) => id, formation = null, change = null, admissionReport = null, laborReport = null } = {}) {
  const out = []; let n = 0;
  const add = (status, text, evidence = [], extra = {}) => { out.push({ id: `s${++n}`, status, text, evidence, ...extra }); return out[out.length - 1]; };
  const cap = relationships.filter(r => r.type === 'CAPITAL_EVENT_INVOLVES').map(r => ({ r, ev: evidenceFor(r.id)?.provenance })).filter(x => x.ev)
    .sort((a, b) => String(b.ev.filingDate).localeCompare(String(a.ev.filingDate)));

  // 1. The formation the admitted relationships establish (or why none).
  // Found by the milestone-1 validator: a statement may not be SUPPORTED without relationships behind it. With relationships but no link, the statement stands on
  // those relationships (they speak to one domain only); with none admitted it is an absence, so it is UNRESOLVED and says so.
  if (formation) {
    const ids = (formation.formation ? formation.formation.relationships : relationships.map(r => r.id)).slice(0, 20).map(id => ({ relationshipId: id }));
    add(formation.structure.relationships ? STATUS.SUPPORTED : STATUS.UNRESOLVED, admittedFormationSentence(formation, subject), formation.structure.relationships ? ids : [], { basis: 'admitted relationships' });
    // Founder ruling 2026-10-14: pairs joined only by a shared participant are not a formation; whether those domains are connected is NOT established, so the statement is UNRESOLVED.
    if (formation.leads?.length) add(STATUS.UNRESOLVED, `${formationLeadsSentence(formation)} Whether these domains are connected for ${subject} is not established by the admitted relationships.`, [], { basis: 'admitted relationships' });
  }

  // 2. Capital events, as the filings state them.
  for (const { r, ev } of cap.slice(0, 6)) {
    const partyName = labelOf(r.part[1]);
    const who = r.nuId?.partyQualifier === 'UNNAMED_AFFILIATE_OF' ? `an unnamed affiliate of ${partyName}` : partyName;
    const amt = ev.amounts?.length ? ` ${ev.amounts.slice(0, 2).map(money).join(' · ')} as stated;` : '';
    add(STATUS.DOCUMENTED, `${day(ev.filingDate)}: ${labelOf(r.part[0])} reported a capital event (${ev.instrument}) involving ${who}${ev.counterpartyRole ? `, ${ev.counterpartyRole}` : ''};${amt} no magnitude is derived.`,
      [{ relationshipId: r.id, accession: ev.accession, form: ev.form, filingDate: ev.filingDate, passage: ev.passage, match: ev.counterpartyMatch?.outcome }]);
  }

  // 2b. Acquisitions (KRYL-1409), as the filing states them: an agreement (Item 1.01, pending) or a completion (Item 2.01). The deal status is the filing's own.
  const acq = relationships.filter(r => r.type === 'ACQUIRED').map(r => ({ r, ev: evidenceFor(r.id)?.provenance })).filter(x => x.ev?.source === 'SEC_8K_ACQUISITION')
    .sort((a, b) => String(b.ev.filingDate).localeCompare(String(a.ev.filingDate)));
  for (const { r, ev } of acq.slice(0, 6)) {
    const a = labelOf(r.part[0]), b = labelOf(r.part[1]);
    const what = ev.dealStatus === 'CLOSED' ? `${a} completed its acquisition of ${b} (Item ${ev.item})` : `${a} entered an agreement to acquire ${b}${ev.agreement ? ` (${ev.agreement}, Item ${ev.item}; pending)` : ' (pending)'}`;
    add(STATUS.DOCUMENTED, `${day(ev.filingDate)}: ${what}; the filing is the source of the deal status and no value or outcome is derived.`,
      [{ relationshipId: r.id, accession: ev.accession, form: ev.form, filingDate: ev.filingDate, passage: ev.passage, match: ev.counterpartyMatch?.outcome }]);
  }

  // 2c. Officers and directors (KRYL-1411), as SEC Forms 3, 4 and 5 state them. A role is "as of" its filing; no end of a role is stated by these forms.
  const lab = relationships.filter(r => r.type === 'HAS_OFFICER_OR_DIRECTOR_DISCLOSURE').map(r => ({ r, ev: evidenceFor(r.id)?.provenance })).filter(x => x.ev?.source === 'SEC_FORM_3_4_5');
  if (lab.length) {
    const people = new Set(lab.map(x => x.r.part[1]));
    const dirs = lab.filter(x => x.r.nuId?.role === 'DIRECTOR').length, offs = lab.filter(x => x.r.nuId?.role === 'OFFICER').length;
    const titles = [...new Set(lab.filter(x => x.r.nuId?.role === 'OFFICER').map(x => x.ev.officerTitle).filter(Boolean))].slice(0, 3);
    add(STATUS.SUPPORTED, `${people.size} ${people.size === 1 ? 'person is' : 'people are'} disclosed as officers or directors of ${subject} in SEC Forms 3, 4 and 5 (${dirs} director role${dirs !== 1 ? 's' : ''}, ${offs} officer role${offs !== 1 ? 's' : ''}${titles.length ? `; titles as written include ${titles.join('; ')}` : ''}); each role is stated as of its own filing and no end of a role is stated by these forms.`,
      lab.slice(0, 20).map(x => ({ relationshipId: x.r.id, accession: x.ev.accession, form: x.ev.form, filingDate: x.ev.filingDate })));
    const holderRels = relationships.filter(r => r.type === 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE');
    let shown = 0;
    for (const person of people) {
      const h = holderRels.find(r => r.part[1] === person); if (!h || shown >= 3) continue; shown++;
      const l = lab.find(x => x.r.part[1] === person);
      add(STATUS.SUPPORTED, `${labelOf(person)} is disclosed both as ${lab.filter(x => x.r.part[1] === person).map(x => x.r.nuId?.role === 'DIRECTOR' ? 'a director' : 'an officer').join(' and ')} of ${subject} and as a beneficial-ownership filer in ${subject}; the filings document each role separately.`,
        [{ relationshipId: h.id, accession: evidenceFor(h.id)?.provenance?.accession }, { relationshipId: l.r.id, accession: l.ev.accession }]);
    }
  }
  // 2d. Officers and directors of a private SEC filer, as its own Form D states them (KRYL-1413). The people are identified only by the names in that filing.
  const labD = relationships.filter(r => r.type === 'HAS_FORM_D_OFFICER_OR_DIRECTOR_DISCLOSURE').map(r => ({ r, ev: evidenceFor(r.id)?.provenance })).filter(x => x.ev?.source === 'SEC_FORM_D');
  if (labD.length) {
    const people = new Set(labD.map(x => x.r.part[1]));
    const dirs = labD.filter(x => x.r.nuId?.role === 'DIRECTOR').length, offs = labD.filter(x => x.r.nuId?.role === 'OFFICER').length;
    add(STATUS.SUPPORTED, `${people.size} ${people.size === 1 ? 'person is' : 'people are'} stated as officers or directors of ${subject} in its own Form D (${dirs} director role${dirs !== 1 ? 's' : ''}, ${offs} executive-officer role${offs !== 1 ? 's' : ''}); each role is stated as of that filing, no end of a role is stated, and the people are identified only by the names the filing states (the person has no SEC CIK and is not matched to any other person or entity).`,
      labD.slice(0, 20).map(x => ({ relationshipId: x.r.id, accession: x.ev.accession, form: x.ev.form, filingDate: x.ev.filingDate })));
  }
  // 2e. Clinical-trial sponsorship (KRYL-1414), as ClinicalTrials.gov states it. The registry never creates identity: the sponsor equals the resolved entity's legal name.
  const trials = relationships.filter(r => r.type === 'LEAD_SPONSOR_OF_CLINICAL_TRIAL').map(r => ({ r, ev: evidenceFor(r.id)?.provenance })).filter(x => x.ev?.source === 'CLINICALTRIALS_GOV');
  if (trials.length) {
    const byStatus = {}; for (const x of trials) byStatus[x.ev.overallStatus ?? 'status not stated'] = (byStatus[x.ev.overallStatus ?? 'status not stated'] ?? 0) + 1;
    add(STATUS.SUPPORTED, `${subject} is the lead (industry) sponsor of ${trials.length} registered clinical stud${trials.length !== 1 ? 'ies' : 'y'} on ClinicalTrials.gov among the newest read (${Object.entries(byStatus).map(([k, n]) => `${n} ${String(k).toLowerCase().replace(/_/g, ' ')}`).join(', ')}); each status is as of that record's last update, and the registry states the sponsorship, not the studies' results.`,
      trials.slice(0, 20).map(x => ({ relationshipId: x.r.id, accession: x.ev.nctId, form: x.ev.form, filingDate: x.ev.lastUpdated })));
  }
  // 2f. Granted-patent assignment (KRYL-1416), as the USPTO PatentsView table states it. Only the exact legal name of the resolved company matches.
  const pats = relationships.filter(r => r.type === 'ASSIGNEE_OF_GRANTED_PATENT').map(r => ({ r, ev: evidenceFor(r.id)?.provenance })).filter(x => x.ev?.source === 'USPTO_PATENTSVIEW_BULK');
  const isSub = (x) => x.ev.assigneeMatch === 'EXACT_LEGAL_NAME_OF_EXHIBIT_21_SUBSIDIARY';
  const patsDirect = pats.filter(x => !isSub(x)), patsSub = pats.filter(isSub);
  const patRefs = (xs) => xs.slice(0, 20).map(x => ({ relationshipId: x.r.id, accession: x.ev.accession, form: x.ev.form, filingDate: x.ev.fileAsOf }));
  const patIds = (xs) => `US ${xs.slice(0, 3).map(x => x.ev.patentId).join(', US ')}${xs.length > 3 ? ', …' : ''}`;
  if (patsDirect.length) {
    add(STATUS.SUPPORTED, `The USPTO PatentsView granted-patent table lists ${subject} (exact legal name) as the assignee of ${patsDirect.length} granted patent${patsDirect.length !== 1 ? 's' : ''} among the newest read (${patIds(patsDirect)}); the dataset file is dated ${String(patsDirect[0].ev.fileAsOf).slice(0, 10)}, and patents assigned to a similarly named company, or to a subsidiary the company's own Form 10-K Exhibit 21 does not list, are different legal entities and are not counted.`, patRefs(patsDirect));
  }
  if (patsSub.length) {
    const subNames = [...new Set(patsSub.map(x => x.ev.subsidiary?.name))].slice(0, 4), x21 = patsSub[0].ev.subsidiary?.exhibit21 ?? {};
    add(STATUS.SUPPORTED, `The USPTO PatentsView granted-patent table lists ${patsSub.length} granted patent${patsSub.length !== 1 ? 's' : ''} among the newest read (${patIds(patsSub)}) as assigned to ${subNames.join(', ')}, named exactly in the Exhibit 21 of ${subject}'s own Form 10-K (accession ${x21.accession}, filed ${x21.filedAt}); the exhibit is as of its filing date and does not state that the subsidiary held a patent when it was granted, and patents of entities the exhibit does not name are not counted. The dataset file is dated ${String(patsSub[0].ev.fileAsOf).slice(0, 10)}.`, patRefs(patsSub));
  }
  if (pats.length) {
    // Ratified 2026-10-13 (Intel): the same granted patents also support KNOWLEDGE, identified here as patent-derived knowledge evidence only.
    add(STATUS.SUPPORTED, `KNOWLEDGE is shown for ${subject} from patent-derived evidence only: the ${pats.length} granted patent${pats.length !== 1 ? 's' : ''} above (${patIds(pats)}), as the USPTO PatentsView table states them. This does not establish research impact, author affiliation, publications or any other knowledge relationship, and it forms no link to another domain.`, patRefs(pats));
  }
  // 2h. The company's own published pages (KRYL-1419): who the page lists with which role, and the round it announces, each as the company's own statement.
  const pageRel = relationships.map(r => ({ r, ev: evidenceFor(r.id)?.provenance })).filter(x => x.ev?.source === 'ISSUER_PAGE');
  const pageRoles = pageRel.filter(x => x.r.type === 'HAS_STATED_ROLE_ON_ISSUER_PAGE'), pageLeads = pageRel.filter(x => x.r.type === 'LED_FUNDING_ROUND_PER_ISSUER');
  const pageRefs = (xs) => xs.slice(0, 20).map(x => ({ relationshipId: x.r.id, accession: x.ev.url, form: 'Issuer web page', filingDate: String(x.ev.retrievedAt).slice(0, 10) }));
  if (pageRoles.length) {
    add(STATUS.SUPPORTED, `${subject}'s own leadership page lists ${pageRoles.length} ${pageRoles.length !== 1 ? 'people' : 'person'} with roles (${pageRoles.slice(0, 3).map(x => `${x.ev.personName}, ${x.ev.role}`).join('; ')}${pageRoles.length > 3 ? '; …' : ''}), read ${String(pageRoles[0].ev.retrievedAt).slice(0, 10)}; this is the company's own statement, not independently confirmed, not a filing, and a listing on a web page is not a formal officer disclosure; board membership is not stated.`, pageRefs(pageRoles));
  }
  if (pageLeads.length) {
    const e = pageLeads[0].ev;
    add(STATUS.SUPPORTED, `${subject}'s own announcement states ${e.round}, ${e.amount}${e.valuation ? ` at a valuation of ${e.valuation}` : ''}, led by ${pageLeads.map(x => x.ev.investorName).join(' and ')}${e.announcementDate ? ` (announcement dated ${e.announcementDate})` : ''}; this is the company's own statement, not independently confirmed; it states no other investor and no later round.`, pageRefs(pageLeads));
  }
  // 2g. Dated articles whose title names the company (KRYL-1418): the naming and its citation, nothing more.
  const arts = relationships.filter(r => r.type === 'NAMED_IN_ARTICLE').map(r => ({ r, ev: evidenceFor(r.id)?.provenance })).filter(x => x.ev?.source === 'GDELT');
  if (arts.length) {
    add(STATUS.SUPPORTED, `${arts.length} dated article${arts.length !== 1 ? 's' : ''} name${arts.length === 1 ? 's' : ''} ${subject} in ${arts.length === 1 ? 'its' : 'their'} title, as GDELT states ${arts.length === 1 ? 'it' : 'them'} (${arts.slice(0, 2).map(x => `${x.ev.domain}, first seen ${x.ev.seenDate}`).join('; ')}${arts.length > 2 ? '; …' : ''}); the relationship established is only that the title names the company's SEC registered name, and no endorsement, causation, event participation or other connection is inferred.`,
      arts.slice(0, 20).map(x => ({ relationshipId: x.r.id, accession: x.ev.url, form: 'GDELT article', filingDate: x.ev.seenDate })));
  }
  if (laborReport?.capped) add(STATUS.UNRESOLVED, `${laborReport.personsSeen - laborReport.personsRead} further reporting person${laborReport.personsSeen - laborReport.personsRead !== 1 ? 's' : ''} in the insider forms searched ${laborReport.personsSeen - laborReport.personsRead !== 1 ? 'were' : 'was'} not read in this analysis (the newest ${laborReport.personsRead} are read per analysis), so their roles are not shown.`, []);

  // 3. Ownership change over two 12-month periods, as the dated filings classify it.
  for (const rec of (change?.relationships ?? []).filter(x => ['NEW', 'DISSOLVED'].includes(x.existence?.state) || x.configuration?.state === 'RECONFIGURED')) {
    const e0 = rec.evidence?.asOfE0, p1 = (rec.evidence?.inP1 ?? []).slice(-1)[0];
    const parts = [e0 ? `${e0.percent}% in ${e0.form} ${e0.accession}` : 'no filing as of the start of the current period', p1 ? `${p1.percent}% in ${p1.form} ${p1.accession}` : 'no filing in the current period'];
    add(STATUS.SUPPORTED, `${rec.holderName} (class CUSIP ${rec.cusip ?? 'not recovered'}): ${rec.existence.state}${rec.configuration?.state === 'RECONFIGURED' ? ', RECONFIGURED' : ''} — ${parts.join(' → ')}. Observed from reported filings; the reason a position changed is not established by them.`,
      [e0, p1].filter(Boolean).map(o => ({ accession: o.accession, form: o.form, filingDate: o.filingDate })), { rules: rec.rules });
  }

  // 4. Structure over the admitted graph: repeat counterparties and holders who are also counterparties.
  // The subject is the participant common to the admitted relationships. A relationship in which the SUBJECT is the holder or the counterparty (it was filed by another company) says nothing about
  // the subject's own holders and counterparties, so it takes no part in the statements below (found 2026-10-14: "NVIDIA appears both as a disclosed holder and as a counterparty of NVIDIA").
  const nodeCount = new Map(); for (const r of relationships) for (const n of r.part) nodeCount.set(n, (nodeCount.get(n) ?? 0) + 1);
  const subjectNode = [...nodeCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const byParty = new Map();
  for (const { r, ev } of cap) { if (r.part[0] !== subjectNode) continue; const k = r.part[1]; (byParty.get(k) ?? byParty.set(k, []).get(k)).push({ r, ev }); }
  for (const [party, list] of byParty) {
    if (list.length < 2) continue;
    const name = labelOf(party); const ids = list.map(x => ({ relationshipId: x.r.id, accession: x.ev.accession, filingDate: x.ev.filingDate }));
    add(STATUS.SUPPORTED, `${name} is named as a counterparty in ${list.length} of the ${cap.length} admitted capital events (${list.map(x => day(x.ev.filingDate)).join(', ')}).`, ids);
    add(STATUS.INFERRED, `The repeated naming of ${name} points to a recurring financing relationship with ${subject}; the filings document each event, not the relationship over time.`, ids, { rests_on: ['recurrence count above'] });
  }
  const holders = new Set(relationships.filter(r => r.type === 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE' && r.part[0] === subjectNode).map(r => r.part[1]));
  for (const [party, list] of byParty) {
    if (!holders.has(party) || party === subjectNode) continue;
    const holderRel = relationships.find(r => r.type === 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE' && r.part[0] === subjectNode && r.part[1] === party);
    add(STATUS.SUPPORTED, `${labelOf(party)} appears both as a disclosed holder and as a capital-event counterparty of ${subject}.`, [{ relationshipId: holderRel.id, accession: evidenceFor(holderRel.id)?.provenance?.accession }, ...list.slice(0, 3).map(x => ({ relationshipId: x.r.id, accession: x.ev.accession }))]);
    add(STATUS.INFERRED, `${labelOf(party)} may hold more than one role toward ${subject} (investor and financing counterparty); the filings document each role separately.`, [{ relationshipId: holderRel.id }], { rests_on: ['dual presence above'] });
  }

  // 5. What is not resolved.
  const unres = (admissionReport?.rejected ?? []).filter(x => x.outcome !== 'SELF');
  if (unres.length) {
    const names = [...new Set(unres.map(x => `${x.counterparty} (${x.outcome === 'UNRESOLVED' ? 'unresolved' : String(x.outcome).toLowerCase().replace(/_/g, ' ')})`))];
    add(STATUS.UNRESOLVED, `${names.length} counterpart${names.length !== 1 ? 'ies' : 'y'} named in the capital-event and acquisition filings could not be matched to an identified entity and ${names.length !== 1 ? 'are' : 'is'} not admitted: ${names.slice(0, 6).join('; ')}${names.length > 6 ? `; +${names.length - 6} more` : ''}. The filing text names them; their identity is not confirmed.`, unres.slice(0, 6).map(x => ({ accession: x.accession, counterparty: x.counterparty })));
  }
  const amb = admissionReport?.acquisitionAmbiguous ?? [];
  if (amb.length) add(STATUS.UNRESOLVED, `${amb.length} acquisition filing${amb.length !== 1 ? 's name' : ' names'} more than one possible counterparty or leave${amb.length !== 1 ? '' : 's'} the direction of the acquisition unstated, so no acquisition is admitted from ${amb.length !== 1 ? 'them' : 'it'}.`, amb.slice(0, 6).map(x => ({ accession: x.accession })));
  if (admissionReport?.deferred) add(STATUS.UNRESOLVED, `${admissionReport.deferred} further counterparty mention${admissionReport.deferred !== 1 ? 's were' : ' was'} not matched in this analysis (matching is limited per analysis); a refresh continues where this one stopped.`, []);
  const indet = (change?.relationships ?? []).filter(x => x.existence?.state === 'INDETERMINATE');
  if (indet.length) add(STATUS.UNRESOLVED, `${indet.length} ownership position${indet.length !== 1 ? 's are' : ' is'} INDETERMINATE over the two periods (${[...new Set(indet.map(x => x.existence.reason))].join(', ')}): the retrieved filings do not support a conclusion about whether the position persists.`, indet.slice(0, 6).map(x => ({ holder: x.holderName, cusip: x.cusip })));
  if (cap.length) add(STATUS.UNRESOLVED, 'Capital-event magnitude is not assessed in this version (INDETERMINATE): amounts are quoted from the filings and no size, intensity or concentration of capital is derived from them.', []);

  const counts = out.reduce((c, s) => { c[s.status] = (c[s.status] ?? 0) + 1; return c; }, {});
  return { statements: out, counts };
}
