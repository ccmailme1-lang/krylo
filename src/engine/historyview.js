// historyview.js -- Step 8 of the decision record (2026-10-11): History is a consumer of the durable Canonical Relationship Store and of persisted
// analytical snapshots. A past analysis is rebuilt as of its own time from the snapshot record (the set of relationships it froze, each with the evidence
// that stood latest) and the stored relationship versions, then passed through the SAME builders the live analysis uses (admitted formation, relationship
// text, evidence lines), so History cannot present a different interpretation of the same state. Pure.
import { buildAdmittedFormation, admittedFormationSentence } from './admittedformation.js';
import { canonicalRelationshipSentence, canonicalProvenanceLine, canonicalDetailLines } from './canonicalrelationshiptext.js';

/** @param {object} snapshot a stored snapshot row  @param {object[]} records stored relationships with versions (the store's /history response) */
export function reconstructSnapshot(snapshot, records) {
  const byId = new Map((records ?? []).map(r => [r.relationship_id, r]));
  const labels = {};
  for (const r of records ?? []) for (const v of r.versions ?? []) Object.assign(labels, v.labels ?? {});
  const labelOf = (id) => String(labels[id] ?? id).replace(/\s*\(CIK\s*\d+\)\s*$/, '');
  const rels = [], evidence = new Map(), missing = [];
  for (const ref of snapshot.relationship_refs ?? []) {
    const rec = byId.get(ref.id); const vs = rec?.versions ?? [];
    // the version whose evidence stood latest when the snapshot froze (matched by the filing's accession), else the last stored one
    const v = (ref.accession ? [...vs].reverse().find(x => x.evidence?.provenance?.accession === ref.accession) : null) ?? vs[vs.length - 1];
    if (!rec || !v) { missing.push(ref.id); continue; }
    rels.push({ id: rec.relationship_id, type: rec.type, part: rec.part, nuId: rec.nu_id ?? {} });
    evidence.set(rec.relationship_id, { provenance: v.evidence?.provenance ?? null, predicate: v.predicate, nuState: v.nu_state, ts: v.evidence?.ts ?? null });
  }
  const evidenceFor = (id) => evidence.get(id) ?? null;
  const subject = snapshot.subject_node ? labelOf(snapshot.subject_node) : (snapshot.canonical_id ?? 'the subject');
  const formation = buildAdmittedFormation({ relationships: rels, evidenceFor, labelOf });
  const chg = snapshot.change?.result?.relationships ?? [];
  const states = {}; for (const r of chg) states[r.existence?.state] = (states[r.existence?.state] ?? 0) + 1;
  return {
    id: snapshot.id, generatedAt: snapshot.generated_at, query: snapshot.query, subject, lookups: snapshot.lookups ?? [],
    refreshOf: snapshot.refresh_of ?? null,
    relationships: rels.map(r => ({ id: r.id, type: r.type, sentence: canonicalRelationshipSentence(r.type, labelOf(r.part[0]), labelOf(r.part[1]), r.nuId), provenance: canonicalProvenanceLine(evidenceFor(r.id)), detail: canonicalDetailLines(evidenceFor(r.id)) })),
    formation, formationSentence: admittedFormationSentence(formation, subject),
    change: snapshot.change ? { retrievedAt: snapshot.change.finishedAt ?? null, pinnedAt: snapshot.change.pinnedAt ?? null, units: chg.length, byExistence: states } : null,
    missing,
  };
}

// The MAP's formation-history scrubber reads rows of { formation_id, entity_a, entity_b, relationship_type, state, evidence_ref, provenance, trigger, captured_at }
// (the shape KRYL-1334 introduced). For a resolved entity these rows are now DERIVED from the stored relationship versions instead of the legacy
// formation_state table, so the scrubber cannot differ from the store the analysis reads. A repeat of the same evidence (predicate PERSISTENT) is not a state
// transition and produces no row (a stable stretch is the absence of a row, as the scrubber already treats it).
const ROW_STATE = { NEW: 'NEW', STRENGTHENING: 'STRENGTHENING', WEAKENING: 'WEAKENING', RECONFIGURED: 'RECONFIGURATION', DISSOLVED: 'DISSOLUTION' };
export function formationRowsFromRecords(records, subjectNode = null) {
  const rows = [];
  for (const rec of records ?? []) for (const v of rec.versions ?? []) {
    const state = ROW_STATE[v.predicate]; if (!state) continue;
    const p = v.evidence?.provenance ?? {};
    rows.push({ formation_id: rec.relationship_id, subject_scope: subjectNode, entity_a: rec.part?.[0], entity_b: rec.part?.[1], relationship_type: rec.type, state,
      evidence_ref: p.accession ?? null, provenance: { accession: p.accession ?? null, form: p.form ?? null, filingDate: p.filingDate ?? null, source: p.source ?? null },
      trigger: 'material_change', captured_at: v.captured_at });
  }
  return rows.sort((a, b) => String(a.captured_at).localeCompare(String(b.captured_at)));
}
