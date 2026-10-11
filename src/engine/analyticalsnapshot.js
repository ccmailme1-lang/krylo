// analyticalsnapshot.js -- KRYL-1398 (implements the KRYL-1389 spec; Founder ruling 2026-10-10: frozen INPUT).
// One analytical snapshot per completed query run. The snapshot is the frozen state of everything the surfaces read:
//   * the signal pool (domaingravity.js freezePool: every reader sees the copy taken at freeze time, windows measured from it)
//   * canonical rho (canonicalrelationshipprojection.js freezeRho: same idea for relationships and their evidence)
//   * the subject lookups' terminal states (OK | FAILED | TIMEOUT) and the relationship-change result pinned on first retrieval
// Settlement (the freeze point): every dispatched subject lookup is terminal, or SETTLE_TIMEOUT_MS after submit, whichever is
// first. A query with no subject lookups freezes at submit. A result arriving after the freeze changes nothing: it is available
// to the next explicit refresh. Refresh builds the replacement (lookups + pinned change) while the current snapshot stays
// displayed, then swaps pool, rho and the active snapshot in one synchronous step; a failed refresh keeps the last valid snapshot.
//
// Surfaces call getSnapshotState() / useAnalyticalSnapshot(); before the freeze status is 'checking' and they show only that.
import { freezePool, unfreezePool } from './domaingravity.js';
import { freezeRho, unfreezeRho, findAdmittedRelationshipsFor, latestEvidenceFor } from './canonicalrelationshipprojection.js';
import { toTopologyNodeId } from './entityresolution.js';
import { persistSnapshot, identityKeyOf } from './canonicalstoreclient.js';
import { getAdmissionReport } from './admissionreport.js';
import { getRelationshipChange } from './relationshipchangeservice.js';

export const SETTLE_TIMEOUT_MS = 45_000;       // decided contract (rubric item 5)
export const REFRESH_TIMEOUT_MS = 150_000;     // a refresh also waits for the pinned relationship-change run

let _seq = 0;
let _run = null;                               // in-flight run | null
let _active = null;                            // the frozen snapshot | null
let _history = [];                             // session history: { id, generatedAt, query, canonicalId, lookups }
let _status = 'idle';                          // idle | checking | ready
let _refresh = { running: false, error: null };
let _view = null;                              // cached state object (stable reference between changes)
const _subs = new Set();

function rebuildView() {
  _view = Object.freeze({ status: _status, active: _active, history: _history, refresh: _refresh, query: _run?.query ?? _active?.query ?? null });
}
function emit() {
  rebuildView();
  for (const fn of _subs) { try { fn(); } catch { /* subscriber error never blocks the freeze */ } }
  try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('krylo-snapshot-changed', { detail: { status: _status, id: _active?.id ?? null } })); } catch { /* no window */ }
}
rebuildView();

export const subscribeSnapshot = (fn) => { _subs.add(fn); return () => _subs.delete(fn); };
export const getSnapshotState = () => _view;

/** Start a run. A new query abandons any run in flight and shows 'checking'; a refresh keeps the current snapshot displayed. */
export function beginAnalysis(query, { refresh = false, timeoutMs } = {}) {
  if (refresh && (_status !== 'ready' || _refresh.running)) return null;           // nothing to refresh, or one already running
  if (_run) { clearTimeout(_run.timer); _run.dead = true; }
  const run = { id: `snap-${Date.now().toString(36)}-${++_seq}`, query, startedAt: Date.now(), refresh, lookups: new Map(), armed: false, frozen: false, dead: false, canonicalId: null, timer: null };
  run.timer = setTimeout(() => onTimeout(run), timeoutMs ?? (refresh ? REFRESH_TIMEOUT_MS : SETTLE_TIMEOUT_MS));
  _run = run;
  if (refresh) _refresh = { running: true, error: null };
  else { _status = 'checking'; _active = null; unfreezePool(); unfreezeRho(); _refresh = { running: false, error: null }; }
  emit();
  return run.id;
}

export function expectLookup(kind, { canonicalId = null } = {}) {
  if (!_run || _run.frozen || _run.dead) return false;
  _run.lookups.set(kind, { kind, state: 'RUNNING', error: null, startedAt: Date.now(), finishedAt: null });
  if (canonicalId && !_run.canonicalId) _run.canonicalId = canonicalId;
  return true;
}

/** A lookup reached a terminal state. Returns false (and changes nothing) when the run is already frozen or abandoned. */
export function settleLookup(kind, error = null) {
  const run = _run;
  if (!run || run.frozen || run.dead) return false;
  const l = run.lookups.get(kind);
  if (!l || l.state !== 'RUNNING') return false;
  l.state = error ? 'FAILED' : 'OK'; l.error = error ? String(error) : null; l.finishedAt = Date.now();
  check(run);
  return true;
}

/** Called once the synchronous registration of lookups for a submit is done; a run with none freezes now. */
export function armSettlement() {
  if (!_run || _run.frozen || _run.dead) return;
  _run.armed = true;
  check(_run);
}

function check(run) {
  if (!run.armed || run.frozen || run.dead) return;
  for (const l of run.lookups.values()) if (l.state === 'RUNNING') return;
  freezeRun(run);
}
function onTimeout(run) {
  if (run.frozen || run.dead) return;
  for (const l of run.lookups.values()) if (l.state === 'RUNNING') { l.state = 'TIMEOUT'; l.error = null; l.finishedAt = Date.now(); }
  run.armed = true;
  freezeRun(run);
}

// The durable record of a snapshot: its lookups, the relationship set it froze (id, type, the evidence that stood latest) and the pinned temporal result.
function persist(snap) {
  try {
    const refs = snap.canonicalId ? findAdmittedRelationshipsFor(toTopologyNodeId(snap.canonicalId)).map(r => ({ id: r.id, identityKey: identityKeyOf(r), type: r.type, nuId: r.nuId, accession: latestEvidenceFor(r.id)?.provenance?.accession ?? null, predicate: latestEvidenceFor(r.id)?.predicate ?? null })) : [];
    persistSnapshot({ ...snap, subjectNode: snap.canonicalId ? toTopologyNodeId(snap.canonicalId) : null }, refs);
  } catch { /* persistence is best effort */ }
}

function copyChange(e) { return e ? { ...e, pinnedAt: Date.now() } : null; }
const isTerminal = (e) => !!e && (e.state === 'done' || e.state === 'failed');

function freezeRun(run) {
  run.frozen = true; clearTimeout(run.timer);
  if (_run === run) _run = null;
  const lookups = [...run.lookups.values()].map(l => ({ kind: l.kind, state: l.state, error: l.error, finishedAt: l.finishedAt }));
  if (run.refresh) {
    // A refresh may not replace a good analysis with a worse one: if any lookup that was OK in the current snapshot is not OK now
    // (failed or timed out), or nothing was obtained at all, the refresh fails and the last valid snapshot stays.
    const was = new Map((_active?.lookups ?? []).map(l => [l.kind, l.state]));
    const worse = lookups.filter(l => was.get(l.kind) === 'OK' && l.state !== 'OK').map(l => `${l.kind} ${l.state === 'TIMEOUT' ? 'timed out' : 'failed'}`);
    const obtained = lookups.some(l => l.state === 'OK');
    if (worse.length || (lookups.length && !obtained)) {
      _refresh = { running: false, error: `${worse.length ? worse.join(', ') : 'every lookup failed or timed out'}; the previous analysis is unchanged` };
      emit(); return;
    }
  }
  try {
    const at = Date.now();
    const change = run.canonicalId ? getRelationshipChange(run.canonicalId) : null;
    // The pin: a refresh pins the result its own forced run produced; a first run pins whatever terminal result exists now, else on first retrieval.
    const pinned = isTerminal(change) && (!run.refresh || run.lookups.get('change')?.state === 'OK' || run.lookups.get('change')?.state === 'FAILED') ? copyChange(change) : null;
    freezePool(run.id, at); freezeRho(run.id);                                   // one synchronous swap: pool, rho and the active snapshot
    const snap = { id: run.id, generatedAt: at, query: run.query, canonicalId: run.canonicalId, lookups, change: pinned, reports: { capitalAdmission: run.canonicalId ? getAdmissionReport(run.canonicalId) : null }, refreshOf: run.refresh ? (_active?.id ?? null) : null };
    _active = snap; _status = 'ready'; persist(snap);
    _history = [..._history, { id: snap.id, generatedAt: at, query: run.query, canonicalId: run.canonicalId, lookups }];
    _refresh = { running: false, error: null };
  } catch (e) {
    if (run.refresh) { _refresh = { running: false, error: `the refresh failed (${String(e?.message ?? e)}); the previous analysis is unchanged` }; }
    else { _status = 'ready'; _active = null; }
  }
  emit();
}

/** Explicit refresh: the caller (fireTopicConnectors with refresh) registers the lookups; the swap happens at settlement. */
export function refreshAvailable() { return _status === 'ready' && !_refresh.running && !!_active; }

/** The relationship-change result for this subject: the snapshot's pinned result when a snapshot is frozen for it. */
export function getPinnedChange(canonicalId) {
  if (_status !== 'ready' || !_active || !canonicalId || _active.canonicalId !== canonicalId) return canonicalId ? getRelationshipChange(canonicalId) : null;
  if (_active.change) return _active.change;
  const e = getRelationshipChange(canonicalId);
  if (isTerminal(e)) { _active.change = copyChange(e); persist(_active); return _active.change; }   // first retrieved result, pinned with its retrieval time
  return e;                                                                       // still running: stated as running
}

/** The terminal state of a lookup in the frozen snapshot for this subject, or null when none is frozen for it. */
export function frozenLookup(canonicalId, kind) {
  if (_status !== 'ready' || !_active || _active.canonicalId !== canonicalId) return null;
  return _active.lookups.find(l => l.kind === kind) ?? null;
}

export const _resetSnapshots = () => {
  if (_run) clearTimeout(_run.timer);
  _run = null; _active = null; _history = []; _status = 'idle'; _refresh = { running: false, error: null }; _seq = 0;
  unfreezePool(); unfreezeRho(); emit();
};
