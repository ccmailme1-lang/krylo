// qa_canonicalstore.mjs -- Step 4: the durable, versioned Canonical Relationship Store. Server module (file fallback, a temp file) + client
// (sink, hydrate, snapshot, registrant cache) wired in-process through a fake of the /v1/canonical-store routes. Nothing touches the dev data.
import fs from 'fs'; import os from 'os'; import path from 'path';
import * as store from './as-diff/canonicalstore.js';
import { configureStoreClient, installStoreSink, flushStore, hydrateFor, persistSnapshot, registryCache, identityKeyOf } from './src/engine/canonicalstoreclient.js';
import { admitAndProject, findAdmittedRelationshipsFor, latestEvidenceFor, _clearAdmittedForTests } from './src/engine/canonicalrelationshipprojection.js';
import { NODE_LABELS } from './src/engine/entitytopologyregistry.js';
import './src/engine/ratifiedrelationshiptypes.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const tmp = path.join(os.tmpdir(), `krylo-canon-${process.pid}.jsonl`); try { fs.unlinkSync(tmp); } catch {}
store._useFileOnly(tmp);

// a fake of the engine routes, calling the real server module
const fakeFetch = async (url, opts = {}) => {
  const u = new URL(url, 'http://x'); const body = opts.body ? JSON.parse(opts.body) : null; const j = (o) => ({ ok: true, status: 200, json: async () => o });
  if (u.pathname.endsWith('/admissions')) { const results = []; for (const it of body.items) results.push(await store.writeAdmission(it)); return j({ status: 'BATCH_COMPLETE', results }); }
  if (u.pathname.endsWith('/relationships')) return j({ relationships: await store.relationshipsForNodes(u.searchParams.getAll('node')) });
  if (u.pathname.endsWith('/snapshot') && opts.method === 'POST') return j(await store.writeSnapshot(body.snapshot));
  if (u.pathname.endsWith('/snapshots')) return j({ snapshots: await store.snapshotsFor(u.searchParams.get('canonicalId')) });
  if (u.pathname.endsWith('/match') && opts.method === 'POST') return j(await store.writeMatch(body.name_key, body.outcome));
  if (u.pathname.endsWith('/match')) return j({ match: await store.readMatch(u.searchParams.get('name_key')) });
  return { ok: false, status: 404, json: async () => ({}) };
};
configureStoreClient({ baseUrl: 'http://engine', fetchImpl: fakeFetch }); installStoreSink();

const SUBJ = 'CIK:0000000777', PARTY = 'CIK:0000000888';
const assertion = (acc, party = PARTY) => ({ part: [SUBJ, party], type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', nuId: {}, nuState: {}, evidence: { provenance: { accession: acc, source: 'SEC_13D_13G', filingDate: '2026-03-26', form: 'SCHEDULE 13G/A' }, ts: Date.parse('2026-03-26') } });
const meta = { subjectCik: '0000000777', subjectName: 'Test Issuer', filerCik: '0000000888', filerName: 'Test Holder', source: 'SEC_13D_13G' };

console.log('Server module: identity, append-only versions, idempotence');
const key = identityKeyOf({ part: [SUBJ, PARTY], type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', phiClass: 'Semantic', nuId: {} });
const item = (acc, pred = 'NEW') => ({ identity_key: key, type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', phi_class: 'Semantic', part: [SUBJ, PARTY], nu_id: {}, predicate: pred, nu_state: {}, evidence: { provenance: { accession: acc }, ts: 1 }, labels: { [SUBJ]: 'Test Issuer (CIK 0000000777)' }, meta });
const w1 = await store.writeAdmission(item('A-1')); const w1b = await store.writeAdmission(item('A-1', 'PERSISTENT')); const w1c = await store.writeAdmission(item('A-1'));
ok(w1b.written === false && w1b.version === 1, 'the same evidence arriving as PERSISTENT (the in-memory store\'s view of a repeat) is not a new version');
ok(w1.created && w1.version === 1 && w1.written, 'the first admission creates the relationship (stable id) and version 1');
ok(w1c.written === false && w1c.version === 1 && w1c.relationship_id === w1.relationship_id, 're-analysing the same evidence appends nothing (idempotent)');
const w2 = await store.writeAdmission(item('A-2', 'PERSISTENT'));
ok(w2.version === 2 && w2.written && w2.relationship_id === w1.relationship_id, 'new evidence on the same relationship is version 2; the id does not change');
const other = await store.writeAdmission({ ...item('A-1'), identity_key: key + 'x', part: [SUBJ, 'CIK:0000000999'] });
ok(other.relationship_id !== w1.relationship_id && other.created, 'a different relationship has a different id');
const rels = await store.relationshipsForNodes([PARTY]);
ok(rels.length === 1 && rels[0].versions.map(v => v.version).join() === '1,2' && rels[0].versions[0].evidence.provenance.accession === 'A-1', 'a node read returns the relationship with every version, oldest first');
ok((await store.relationshipsForNodes(['CIK:0000000000'])).length === 0, 'a node with nothing stored returns nothing');
ok(fs.readFileSync(tmp, 'utf8').split('\n').filter(Boolean).every(l => { try { JSON.parse(l); return true; } catch { return false; } }), 'the file is append-only JSON lines');

console.log('Client: the single write path persists; a new page session recovers the same ids');
_clearAdmittedForTests();
const a1 = admitAndProject(assertion('B-1', 'CIK:0000000555'), { ...meta, filerCik: '0000000555', filerName: 'Holder Five' });
await flushStore();
const persisted = await store.relationshipsForNodes(['CIK:0000000555']);
ok(a1.admitted && persisted.length === 1 && persisted[0].versions.length === 1 && persisted[0].versions[0].predicate === 'NEW', 'an admission through admitAndProject is written through as version 1');
const idAtFirst = persisted[0].relationship_id;
_clearAdmittedForTests();                                   // a new page session: the in-memory store is empty
ok(findAdmittedRelationshipsFor('CIK:0000000555').length === 0, 'a fresh session starts with an empty in-memory store');
const h = await hydrateFor(['CIK:0000000555']);
const back = findAdmittedRelationshipsFor('CIK:0000000555');
ok(h.restored === 1 && back.length === 1 && back[0].id === idAtFirst, 'hydrate restores the relationship with its STABLE id');
ok(latestEvidenceFor(back[0].id)?.provenance?.accession === 'B-1', 'and its evidence');
const again = admitAndProject(assertion('B-1', 'CIK:0000000555'), { ...meta, filerCik: '0000000555', filerName: 'Holder Five' });
await flushStore();
ok(again.predicate === 'PERSISTENT' && again.relationship.id === idAtFirst, 're-admitting the same relationship after a restore is PERSISTENT, not NEW (same id)');
ok((await store.relationshipsForNodes(['CIK:0000000555']))[0].versions.length === 1, 'and the store did not add a duplicate version');
const newEv = admitAndProject(assertion('B-2', 'CIK:0000000555'), { ...meta, filerCik: '0000000555', filerName: 'Holder Five' }); await flushStore();
ok((await store.relationshipsForNodes(['CIK:0000000555']))[0].versions.length === 2, 'new evidence adds version 2');
const failRead = await (async () => { configureStoreClient({ baseUrl: 'http://engine', fetchImpl: async () => { throw new Error('ECONNREFUSED'); } }); const r = await hydrateFor(['CIK:0000000555']); configureStoreClient({ baseUrl: 'http://engine', fetchImpl: fakeFetch }); return r; })();
ok(failRead.restored === 0 && /ECONNREFUSED/.test(failRead.error) && findAdmittedRelationshipsFor('CIK:0000000555').length === 1, 'an unreachable store is reported and leaves the in-memory store untouched');

console.log('Snapshots and the registrant cache');
await persistSnapshot({ id: 'snap-t1', query: 'q', canonicalId: 'test-co', generatedAt: Date.now(), lookups: [{ kind: 'ownership', state: 'OK' }], change: null }, [{ id: idAtFirst, type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE' }]);
await persistSnapshot({ id: 'snap-t1', query: 'q', canonicalId: 'test-co', generatedAt: Date.now(), lookups: [{ kind: 'ownership', state: 'OK' }], change: { state: 'done', pinnedAt: 1 } }, [{ id: idAtFirst }]);
const snaps = await store.snapshotsFor('test-co');
ok(snaps.length === 1 && snaps[0].id === 'snap-t1' && snaps[0].change?.state === 'done' && snaps[0].relationship_refs.length === 1, 'a snapshot is stored once; the later write (the pinned temporal result) is its state');
await registryCache.put('nvidia', { exact: [{ cik: '0001045810' }], similar: [], failed: false });
const got = await registryCache.get('nvidia');
ok(got?.exact?.[0]?.cik === '0001045810', 'a registrant search result is cached and read back');
const mt = await store.readMatch('nvidia'); ok(mt && mt.retrieved_at, 'the cache entry carries its retrieval time in the store');

try { fs.unlinkSync(tmp); } catch {}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
