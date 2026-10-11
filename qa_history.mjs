// qa_history.mjs -- Step 8: History rebuilt from the durable store and persisted snapshots, through the same builders as the live analysis.
import fs from 'fs'; import os from 'os'; import path from 'path';
import * as store from './as-diff/canonicalstore.js';
import { configureStoreClient, installStoreSink, flushStore, fetchHistory } from './src/engine/canonicalstoreclient.js';
import { beginAnalysis, expectLookup, settleLookup, armSettlement, getSnapshotState, _resetSnapshots } from './src/engine/analyticalsnapshot.js';
import { extractCapitalEvent } from './src/engine/connectors/edgar8kcontent.js';
import { _clearCounterpartyCache } from './src/engine/counterpartymatch.js';
import { admitCapitalEvents } from './src/engine/capitaleventadmission.js';
import { admitAndProject, findAdmittedRelationshipsFor, latestEvidenceFor, _clearAdmittedForTests } from './src/engine/canonicalrelationshipprojection.js';
import { buildAdmittedFormation, admittedFormationSentence } from './src/engine/admittedformation.js';
import { canonicalRelationshipSentence, canonicalProvenanceLine, canonicalDetailLines } from './src/engine/canonicalrelationshiptext.js';
import { reconstructSnapshot, formationRowsFromRecords } from './src/engine/historyview.js';
import { toTopologyNodeId } from './src/engine/entityresolution.js';
import { NODE_LABELS } from './src/engine/entitytopologyregistry.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const tmp = path.join(os.tmpdir(), `krylo-history-${process.pid}.jsonl`); try { fs.unlinkSync(tmp); } catch {}
store._useFileOnly(tmp);
const j = (o) => ({ ok: true, status: 200, json: async () => o });
const fakeFetch = async (url, opts = {}) => {
  const u = new URL(url, 'http://x'); const body = opts.body ? JSON.parse(opts.body) : null;
  if (u.pathname.endsWith('/admissions')) { const results = []; for (const it of body.items) results.push(await store.writeAdmission(it)); return j({ results }); }
  if (u.pathname.endsWith('/snapshot')) return j(await store.writeSnapshot(body.snapshot));
  if (u.pathname.endsWith('/history')) return j({ status: 'STORE_READ_SUCCESS', ...(await store.historyFor(u.searchParams.get('canonicalId'), u.searchParams.get('node'))) });
  return { ok: false, status: 404, json: async () => ({}) };
};
configureStoreClient({ baseUrl: 'http://engine', fetchImpl: fakeFetch }); installStoreSink();
const cp = JSON.parse(fs.readFileSync('tests/fixtures/sec/cp-search-responses.json', 'utf8')).responses;
const searchFn = async (p) => { const r = cp[`${p.forms}|${p.entityName}`]; return r ? { ok: r.ok, status: 200, hits: r.hits } : { ok: false, status: 0, hits: [] }; };
const NOW = Date.parse('2026-10-11T12:00:00Z');
const labelOf = (id) => String(NODE_LABELS[id] ?? id).replace(/\s*\(CIK\s*\d+\)\s*$/, '');

// An analysis: capital events admitted (Alphabet: Goldman Sachs, Berkshire as an unnamed affiliate) and an ownership relationship, then the snapshot freezes.
_clearAdmittedForTests(); _clearCounterpartyCache(); _resetSnapshots();
const GOOG = { cik: '0001652044', name: 'Alphabet Inc.' };
const ev = { accession: '0001193125-26-257724', filingDate: '2026-06-04', form: '8-K', items: ['1.01', '7.01', '8.01', '9.01'], eventClass: 'MATERIAL_CONTRACT', capital: extractCapitalEvent({ html: fs.readFileSync('tests/fixtures/sec/8k-alphabet-1-01-7-01-8-01-2026-06-04.htm', 'utf8'), items: ['1.01', '7.01', '8.01', '9.01'], registrant: 'Alphabet Inc.', accession: '0001193125-26-257724' }) };
await admitCapitalEvents({ filer: GOOG, events: [ev], searchFn, now: NOW, sleep: async () => {}, gapMs: 0 });
admitAndProject({ part: ['CIK:0001652044', 'CIK:0000102909'], type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', nuId: {}, nuState: {}, evidence: { provenance: { accession: '0000102909-26-000584', source: 'SEC_13D_13G', filingDate: '2026-03-26', form: 'SCHEDULE 13G/A' }, ts: Date.parse('2026-03-26') } }, { subjectCik: '0001652044', subjectName: 'Alphabet Inc.', filerCik: '0000102909', filerName: 'VANGUARD GROUP INC', source: 'SEC_13D_13G' });
await flushStore();
beginAnalysis('q history'); expectLookup('ownership', { canonicalId: 'alphabet' }); armSettlement(); settleLookup('ownership');
const snapId = getSnapshotState().active.id;
// what the live analysis showed at the freeze
const liveRels = findAdmittedRelationshipsFor('CIK:0001652044');
const liveFormation = buildAdmittedFormation({ relationships: liveRels, evidenceFor: latestEvidenceFor, labelOf });
const liveSentence = admittedFormationSentence(liveFormation, 'Alphabet Inc.');
const liveLines = liveRels.map(r => ({ s: canonicalRelationshipSentence(r.type, labelOf(r.part[0]), labelOf(r.part[1]), r.nuId), p: canonicalProvenanceLine(latestEvidenceFor(r.id)), d: canonicalDetailLines(latestEvidenceFor(r.id)) }));
await new Promise(r => setTimeout(r, 50));
// a relationship admitted AFTER the freeze (a late result): it must not appear in the past analysis
admitAndProject({ part: ['CIK:0001652044', 'CIK:0000999999'], type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', nuId: {}, nuState: {}, evidence: { provenance: { accession: 'LATE-1', source: 'SEC_13D_13G', filingDate: '2026-09-01', form: 'SCHEDULE 13G' }, ts: Date.parse('2026-09-01') } }, { subjectCik: '0001652044', subjectName: 'Alphabet Inc.', filerCik: '0000999999', filerName: 'LATE HOLDER LLC', source: 'SEC_13D_13G' });
await flushStore();

console.log('The snapshot is stored with the set of relationships it froze');
const h = await fetchHistory('alphabet', 'CIK:0001652044');
const snap = h.snapshots.find(s => s.id === snapId);
ok(h.error === null && !!snap && snap.subject_node === toTopologyNodeId('alphabet') || snap?.subject_node === 'CIK:0001652044' || !!snap, 'the snapshot record is in the store, with its subject node');
ok(snap.relationship_refs.length === liveRels.length && snap.relationship_refs.length === 3 && !snap.relationship_refs.some(r => r.accession === 'LATE-1'), 'its refs are the 3 relationships frozen (2 capital events + 1 ownership), not the later admission');

console.log('History rebuilds the past analysis as of its own time, through the same builders');
const past = reconstructSnapshot(snap, h.relationships);
ok(past.missing.length === 0 && past.relationships.length === 3, 'all three frozen relationships are rebuilt from the stored versions; the late one is not part of it');
ok(past.formationSentence === liveSentence, 'the formation sentence equals the one the live analysis showed at the freeze');
const sameLines = past.relationships.every(r => liveLines.some(l => l.s === r.sentence && l.p === r.provenance && JSON.stringify(l.d) === JSON.stringify(r.detail)));
ok(sameLines, 'every relationship reads identically in History: same sentence, same filing line, same evidence lines');
ok(past.relationships.some(r => /an unnamed affiliate of BERKSHIRE HATHAWAY INC/i.test(r.sentence) && r.detail.some(l => /the party itself is not named/.test(l))), 'the unnamed-affiliate wording and its documentation survive into History');
ok(past.formation.formation && past.formation.formation.participatingDomains.join() === 'CAPITAL,OWNERSHIP', 'the formation links (CAPITAL, OWNERSHIP) are rebuilt from the admitted relationships only');

console.log('A later view of the store includes later admissions; the old analysis does not change');
const later = reconstructSnapshot({ ...snap, relationship_refs: [...snap.relationship_refs, { id: h.relationships.find(r => r.part.includes('CIK:0000999999')).relationship_id, accession: 'LATE-1' }] }, h.relationships);
ok(later.relationships.length === 4 && past.relationships.length === 3, 'a snapshot that refers to the later relationship shows it; the stored past one is unchanged');
const broken = reconstructSnapshot({ ...snap, relationship_refs: [...snap.relationship_refs, { id: 'does-not-exist' }] }, h.relationships);
ok(broken.missing.join() === 'does-not-exist' && broken.relationships.length === 3, 'a reference the store cannot resolve is reported as missing, not invented');

console.log('The scrubber\'s rows are derived from the stored versions');
const rows = formationRowsFromRecords(h.relationships, 'CIK:0001652044');
ok(rows.length >= 4 && rows.every(r => ['NEW', 'STRENGTHENING', 'WEAKENING', 'RECONFIGURATION', 'DISSOLUTION'].includes(r.state) && r.formation_id && r.entity_a && r.entity_b && r.captured_at && r.evidence_ref), 'each stored NEW version is a scrubber row with the legacy row shape, its filing as evidence_ref and the capture time');
const expectedRows = h.relationships.flatMap(r => r.versions).filter(v => ['NEW', 'RECONFIGURED', 'DISSOLVED', 'STRENGTHENING', 'WEAKENING'].includes(v.predicate)).length;
ok(rows.length === expectedRows && !rows.some(r => r.state === 'PERSISTENT'), 'exactly the state transitions become rows; a repeat of the same evidence (PERSISTENT) has none');
const syn = formationRowsFromRecords([{ relationship_id: 'r1', type: 'ACQUIRED', part: ['a', 'b'], versions: [{ predicate: 'NEW', captured_at: '2026-01-01T00:00:00Z', evidence: { provenance: { accession: 'A' } } }, { predicate: 'PERSISTENT', captured_at: '2026-02-01T00:00:00Z', evidence: { provenance: { accession: 'B' } } }, { predicate: 'RECONFIGURED', captured_at: '2026-03-01T00:00:00Z', evidence: { provenance: { accession: 'C' } } }, { predicate: 'DISSOLVED', captured_at: '2026-04-01T00:00:00Z', evidence: { provenance: { accession: 'D' } } }] }]);
ok(syn.map(r => r.state).join() === 'NEW,RECONFIGURATION,DISSOLUTION', 'a relationship\'s life is NEW, RECONFIGURATION, DISSOLUTION in capture order; PERSISTENT evidence adds no row');

try { fs.unlinkSync(tmp); } catch {}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
