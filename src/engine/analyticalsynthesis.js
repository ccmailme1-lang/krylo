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
import { admittedFormationSentence } from './admittedformation.js';

export const STATUS = Object.freeze({ DOCUMENTED: 'DOCUMENTED', SUPPORTED: 'SUPPORTED', INFERRED: 'INFERRED', UNRESOLVED: 'UNRESOLVED' });
const money = (a) => `${a.raw}${a.wording ? ` (${a.wording})` : ''}`;
const day = (iso) => String(iso ?? '').slice(0, 10);

export function buildSynthesis({ subject = 'the subject', relationships = [], evidenceFor = () => null, labelOf = (id) => id, formation = null, change = null, admissionReport = null } = {}) {
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
  }

  // 2. Capital events, as the filings state them.
  for (const { r, ev } of cap.slice(0, 6)) {
    const partyName = labelOf(r.part[1]);
    const who = r.nuId?.partyQualifier === 'UNNAMED_AFFILIATE_OF' ? `an unnamed affiliate of ${partyName}` : partyName;
    const amt = ev.amounts?.length ? ` ${ev.amounts.slice(0, 2).map(money).join(' · ')} as stated;` : '';
    add(STATUS.DOCUMENTED, `${day(ev.filingDate)}: ${labelOf(r.part[0])} reported a capital event (${ev.instrument}) involving ${who}${ev.counterpartyRole ? `, ${ev.counterpartyRole}` : ''};${amt} no magnitude is derived.`,
      [{ relationshipId: r.id, accession: ev.accession, form: ev.form, filingDate: ev.filingDate, passage: ev.passage, match: ev.counterpartyMatch?.outcome }]);
  }

  // 3. Ownership change over two 12-month periods, as the dated filings classify it.
  for (const rec of (change?.relationships ?? []).filter(x => ['NEW', 'DISSOLVED'].includes(x.existence?.state) || x.configuration?.state === 'RECONFIGURED')) {
    const e0 = rec.evidence?.asOfE0, p1 = (rec.evidence?.inP1 ?? []).slice(-1)[0];
    const parts = [e0 ? `${e0.percent}% in ${e0.form} ${e0.accession}` : 'no filing as of the start of the current period', p1 ? `${p1.percent}% in ${p1.form} ${p1.accession}` : 'no filing in the current period'];
    add(STATUS.SUPPORTED, `${rec.holderName} (class CUSIP ${rec.cusip ?? 'not recovered'}): ${rec.existence.state}${rec.configuration?.state === 'RECONFIGURED' ? ', RECONFIGURED' : ''} — ${parts.join(' → ')}. Observed from reported filings; the reason a position changed is not established by them.`,
      [e0, p1].filter(Boolean).map(o => ({ accession: o.accession, form: o.form, filingDate: o.filingDate })), { rules: rec.rules });
  }

  // 4. Structure over the admitted graph: repeat counterparties and holders who are also counterparties.
  const byParty = new Map();
  for (const { r, ev } of cap) { const k = r.part[1]; (byParty.get(k) ?? byParty.set(k, []).get(k)).push({ r, ev }); }
  for (const [party, list] of byParty) {
    if (list.length < 2) continue;
    const name = labelOf(party); const ids = list.map(x => ({ relationshipId: x.r.id, accession: x.ev.accession, filingDate: x.ev.filingDate }));
    add(STATUS.SUPPORTED, `${name} is named as a counterparty in ${list.length} of the ${cap.length} admitted capital events (${list.map(x => day(x.ev.filingDate)).join(', ')}).`, ids);
    add(STATUS.INFERRED, `The repeated naming of ${name} points to a recurring financing relationship with ${subject}; the filings document each event, not the relationship over time.`, ids, { rests_on: ['recurrence count above'] });
  }
  const holders = new Set(relationships.filter(r => r.type === 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE').map(r => r.part[1]));
  for (const [party, list] of byParty) {
    if (!holders.has(party)) continue;
    const holderRel = relationships.find(r => r.type === 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE' && r.part[1] === party);
    add(STATUS.SUPPORTED, `${labelOf(party)} appears both as a disclosed holder and as a capital-event counterparty of ${subject}.`, [{ relationshipId: holderRel.id, accession: evidenceFor(holderRel.id)?.provenance?.accession }, ...list.slice(0, 3).map(x => ({ relationshipId: x.r.id, accession: x.ev.accession }))]);
    add(STATUS.INFERRED, `${labelOf(party)} may hold more than one role toward ${subject} (investor and financing counterparty); the filings document each role separately.`, [{ relationshipId: holderRel.id }], { rests_on: ['dual presence above'] });
  }

  // 5. What is not resolved.
  const unres = (admissionReport?.rejected ?? []).filter(x => x.outcome !== 'SELF');
  if (unres.length) {
    const names = [...new Set(unres.map(x => `${x.counterparty} (${x.outcome === 'UNRESOLVED' ? 'unresolved' : String(x.outcome).toLowerCase().replace(/_/g, ' ')})`))];
    add(STATUS.UNRESOLVED, `${names.length} counterpart${names.length !== 1 ? 'ies' : 'y'} named in the capital-event filings could not be matched to an identified entity and ${names.length !== 1 ? 'are' : 'is'} not admitted: ${names.slice(0, 6).join('; ')}${names.length > 6 ? `; +${names.length - 6} more` : ''}. The filing text names them; their identity is not confirmed.`, unres.slice(0, 6).map(x => ({ accession: x.accession, counterparty: x.counterparty })));
  }
  if (admissionReport?.deferred) add(STATUS.UNRESOLVED, `${admissionReport.deferred} further counterparty mention${admissionReport.deferred !== 1 ? 's were' : ' was'} not matched in this analysis (matching is limited per analysis); a refresh continues where this one stopped.`, []);
  const indet = (change?.relationships ?? []).filter(x => x.existence?.state === 'INDETERMINATE');
  if (indet.length) add(STATUS.UNRESOLVED, `${indet.length} ownership position${indet.length !== 1 ? 's are' : ' is'} INDETERMINATE over the two periods (${[...new Set(indet.map(x => x.existence.reason))].join(', ')}): the retrieved filings do not support a conclusion about whether the position persists.`, indet.slice(0, 6).map(x => ({ holder: x.holderName, cusip: x.cusip })));
  if (cap.length) add(STATUS.UNRESOLVED, 'Capital-event magnitude is not assessed in this version (INDETERMINATE): amounts are quoted from the filings and no size, intensity or concentration of capital is derived from them.', []);

  const counts = out.reduce((c, s) => { c[s.status] = (c[s.status] ?? 0) + 1; return c; }, {});
  return { statements: out, counts };
}
