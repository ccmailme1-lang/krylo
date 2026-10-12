// benchmarkprobe.js -- measurement tooling for the benchmark milestones (specs/benchmark). Run in the page after an analysis: it reads the DISPLAYED
// snapshot's frozen state and reports (1) whether every synthesis statement is supported by its evidence, (2) the admitted-relationship structure,
// and (3) the formation as Analysis shows it versus as History rebuilds it from the durable store, so agreement is checked, not assumed.
import { getSnapshotState, getPinnedChange } from './analyticalsnapshot.js';
import { findAdmittedRelationshipsFor, latestEvidenceFor } from './canonicalrelationshipprojection.js';
import { toTopologyNodeId } from './entityresolution.js';
import { NODE_LABELS } from './entitytopologyregistry.js';
import { buildAdmittedFormation, admittedFormationSentence } from './admittedformation.js';
import { buildSynthesis } from './analyticalsynthesis.js';
import { buildFindings, questionDomainsFrom } from './analyticalfindings.js';
import { fetchHistory } from './canonicalstoreclient.js';
import { reconstructSnapshot } from './historyview.js';

/** A finding must stand on admitted relationships in the frozen set, carry a valid strength, the basis it claims and why it matters to the question. */
export function validateFindings(findings, rels, evidenceFor) {
  const ids = new Set(rels.map(r => r.id)); const problems = [];
  for (const f of findings) {
    if (!['DOCUMENTED', 'SUPPORTED', 'INFERRED', 'UNRESOLVED'].includes(f.strength)) problems.push(`${f.id} ${f.kind}: no valid strength`);
    for (const s of f.supporting ?? []) if (!ids.has(s.relationshipId)) problems.push(`${f.id} ${f.kind}: supporting relationship ${String(s.relationshipId).slice(0, 8)} is not in the frozen set`);
    if (f.strength !== 'UNRESOLVED' && !(f.supporting ?? []).length) problems.push(`${f.id} ${f.kind} ${f.strength}: asserts without supporting relationships`);
    if (f.strength === 'DOCUMENTED' && !(f.evidence ?? []).some(e => e.accession)) problems.push(`${f.id} ${f.kind} DOCUMENTED: no filing accession in its evidence`);
    if (!f.headline || !f.significance || !Array.isArray(f.alternatives)) problems.push(`${f.id} ${f.kind}: missing headline, significance or alternatives`);
  }
  return { findings: findings.length, problems };
}

export function validateSynthesis(syn, rels, evidenceFor, report) {
  const byId = new Map(rels.map(r => [r.id, r])); const problems = [];
  for (const st of syn.statements) {
    const refIds = st.evidence.filter(e => e.relationshipId).map(e => e.relationshipId);
    for (const id of refIds) if (!byId.has(id)) problems.push(`${st.id} ${st.status}: relationship ${String(id).slice(0, 8)} is not in the frozen set`);
    if (st.status !== 'UNRESOLVED' && st.evidence.length === 0) problems.push(`${st.id} ${st.status}: asserts without evidence`);
    if (st.status === 'DOCUMENTED') {
      const e = st.evidence[0]; const p = e?.relationshipId ? evidenceFor(e.relationshipId)?.provenance : null;
      if (!(e?.accession && p && p.accession === e.accession && e.passage && p.counterpartyName && e.passage.includes(p.counterpartyName))) problems.push(`${st.id} DOCUMENTED: accession/passage do not match the admitted relationship's evidence`);
    }
    if (st.status === 'SUPPORTED') {
      const m = st.text.match(/is named as a counterparty in (\d+) of the (\d+) admitted capital events/);
      if (m) {
        const cap = rels.filter(r => r.type === 'CAPITAL_EVENT_INVOLVES'); const party = refIds.length ? byId.get(refIds[0])?.part?.[1] : null;
        const n = cap.filter(r => r.part[1] === party).length;
        if (!(Number(m[1]) === n && Number(m[2]) === cap.length)) problems.push(`${st.id} SUPPORTED: the count (${m[1]} of ${m[2]}) does not match the admitted relationships (${n} of ${cap.length})`);
      }
    }
    if (st.status === 'INFERRED') {
      if (!st.rests_on?.length || !st.evidence.length) problems.push(`${st.id} INFERRED: does not name what it rests on or its evidence`);
      if (/point(s)? to|may hold/.test(st.text) === false) problems.push(`${st.id} INFERRED: not worded as an inference`);
    }
    if (st.status === 'UNRESOLVED' && /could not be matched to an identified entity/.test(st.text)) {
      const listed = (report?.rejected ?? []).map(x => x.counterparty);
      for (const e of st.evidence) if (e.counterparty && !listed.includes(e.counterparty)) problems.push(`${st.id} UNRESOLVED: ${e.counterparty} is not in the admission report`);
    }
  }
  return { statements: syn.statements.length, problems };
}

/** Probe the displayed analysis. Returns null when no snapshot is displayed; { unresolved: true } for an analysis with no resolved entity. */
export async function probeActiveAnalysis() {
  const snap = getSnapshotState().active; if (!snap) return null;
  if (!snap.canonicalId) return { snapshotId: snap.id, unresolved: true };
  const node = toTopologyNodeId(snap.canonicalId);
  const rels = findAdmittedRelationshipsFor(node);
  const labelOf = (id) => String(NODE_LABELS[id] ?? id).replace(/\s*\(CIK\s*\d+\)\s*$/, '');
  const subject = labelOf(node);
  const formation = buildAdmittedFormation({ relationships: rels, evidenceFor: latestEvidenceFor, labelOf });
  const analysisSentence = admittedFormationSentence(formation, subject);
  const change = getPinnedChange(snap.canonicalId);
  const report = snap.reports?.capitalAdmission ?? null;
  const syn = buildSynthesis({ subject, relationships: rels, evidenceFor: latestEvidenceFor, labelOf, formation, change: change?.result ?? null, admissionReport: report });
  const validation = validateSynthesis(syn, rels, latestEvidenceFor, report);
  const found = buildFindings({ subject, relationships: rels, evidenceFor: latestEvidenceFor, labelOf, formation, change: change?.result ?? null, admissionReport: report, questionDomains: questionDomainsFrom(snap.query) });
  const findingsValidation = validateFindings(found.findings, rels, latestEvidenceFor);
  let past = null, historyError = null;
  for (let i = 0; i < 8 && !past; i++) {                                   // the snapshot record is written a moment after the freeze
    const h = await fetchHistory(snap.canonicalId, node);
    if (h.error) { historyError = h.error; break; }
    const s = h.snapshots.find(x => x.id === snap.id);
    if (s) past = reconstructSnapshot(s, h.relationships); else await new Promise(r => setTimeout(r, 700));
  }
  return {
    snapshotId: snap.id, canonicalId: snap.canonicalId, subject, relationships: rels.length, byType: formation.structure.byType,
    admittedDomains: formation.structure.domains, linkedDomains: formation.structure.linkedDomains, links: formation.structure.links,
    findings: found.findings.map(f => ({ kind: f.kind, strength: f.strength, headline: f.headline, supporting: f.supporting.length })), findingsValidation,
    historyFindingsAgree: !!past && JSON.stringify((past.findings ?? []).map(f => f.headline)) === JSON.stringify(found.findings.map(f => f.headline)),
    analysisSentence, historySentence: past?.formationSentence ?? null, historyRelationships: past?.relationships.length ?? null, historyError,
    synthesisCounts: syn.statements.reduce((c, s) => { c[s.status] = (c[s.status] ?? 0) + 1; return c; }, {}), synthesisValidation: validation,
    admission: report ? { admitted: report.admitted, rejected: report.rejected.length, deferred: report.deferred } : null,
  };
}
