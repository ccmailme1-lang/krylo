// relationshipchangeservice.js -- KRYL-1386. Runs the source-dated comparison for one resolved entity and keeps the
// latest result per entity (in memory, like canonical rho: not persisted). Browser use goes through the engine's
// /api/edgar and /api/edgar-document proxies; a base URL can be passed for scripts. Emits 'krylo-change-updated'.
import { retrieveOwnershipObservations, retrievalWindow } from './connectors/ownershiphistory.js';
import { classifyOwnershipChange } from './relationshipchange.js';

const _results = new Map();   // canonicalId -> { state:'running'|'done'|'failed', startedAt, finishedAt, result?, error? }

export const getRelationshipChange = (canonicalId) => _results.get(canonicalId) ?? null;

const emit = (canonicalId) => {
  try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('krylo-change-updated', { detail: { canonicalId } })); } catch { /* no window */ }
};

export async function runRelationshipChange({ issuerCik, issuerName, canonicalId, T = new Date().toISOString().slice(0, 10), baseUrl = '', fetchImpl = (typeof fetch !== 'undefined' ? fetch : null), sleep, searchGapMs, docGapMs, timeoutMs = 120_000 }) {
  if (!issuerCik || !canonicalId || !fetchImpl) return null;
  _results.set(canonicalId, { state: 'running', startedAt: Date.now() });
  emit(canonicalId);
  const wait = sleep ?? ((ms) => new Promise(r => setTimeout(r, ms)));
  const searchFn = async (p) => {
    const r = await fetchImpl(`${baseUrl}/api/edgar?` + new URLSearchParams({ forms: p.forms, dateRange: 'custom', startdt: p.startdt, enddt: p.enddt, hits: p.hits, entityName: p.entityName ?? '' }));
    if (!r.ok) return { ok: false, status: r.status, hits: [] };
    const j = await r.json().catch(() => null);
    return j?.hits ? { ok: true, status: 200, hits: j.hits.hits ?? [] } : { ok: false, status: 200, hits: [] };
  };
  const docFn = async ({ cik, accession, file }) => {
    const r = await fetchImpl(`${baseUrl}/api/edgar-document?` + new URLSearchParams({ cik, accession: String(accession).replace(/-/g, ''), file }));
    return { ok: r.ok, status: r.status, text: r.ok ? await r.text() : '' };
  };
  try {
    const win = retrievalWindow(T);
    const fetched = await Promise.race([
      retrieveOwnershipObservations({ issuerCik, issuerName, from: win.from, to: win.to, searchFn, docFn, sleep: wait, ...(searchGapMs != null ? { searchGapMs } : {}), ...(docGapMs != null ? { docGapMs } : {}) }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('relationship-change retrieval timed out')), timeoutMs)),
    ]);
    const result = classifyOwnershipChange({ observations: fetched.observations, T, coverage: fetched.coverage, issuerName });
    _results.set(canonicalId, { state: 'done', startedAt: _results.get(canonicalId)?.startedAt, finishedAt: Date.now(), result, retrieval: { excluded: fetched.excluded, coverage: fetched.coverage } });
  } catch (e) {
    _results.set(canonicalId, { state: 'failed', startedAt: _results.get(canonicalId)?.startedAt, finishedAt: Date.now(), error: String(e?.message ?? e) });
  }
  emit(canonicalId);
  return _results.get(canonicalId);
}
