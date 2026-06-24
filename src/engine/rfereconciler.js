// WO-1861 — RFE State Reconciler
// Hysteresis buffer preventing executive output flicker from entropy fluctuation.
// Prevents cross-consumer inconsistency — shared map keyed by session ID.
//
// K=2: UNCLASSIFIED requires 2 consecutive samples before suppression fires.
// N=3: RESOLVED degrades to lower state only after 3 consecutive lower-state samples.

const K = 2; // consecutive UNCLASSIFIED threshold
const N = 3; // consecutive degradation threshold (matches convergenceclassifier.js buffer)

const HISTORY_LEN   = N;
const STATE_RANK    = { RESOLVED: 2, MULTI_ROLE_OVERLAP: 1, UNCLASSIFIED: 0 };
const MAX_SESSIONS  = 50; // prune cap — prevents unbounded growth

const _history    = new Map(); // sessionKey → RfeData[]
const _lastStable = new Map(); // sessionKey → RfeData

function stateRank(rfe) {
  return rfe ? (STATE_RANK[rfe.state] ?? -1) : -1;
}

function sessionKey(session) {
  return session?.id ?? session?.query ?? 'default';
}

function pushHistory(key, rfe) {
  const h = _history.get(key) ?? [];
  h.push(rfe);
  if (h.length > HISTORY_LEN) h.shift();
  _history.set(key, h);
}

function prune() {
  if (_lastStable.size > MAX_SESSIONS) {
    const oldest = _lastStable.keys().next().value;
    _lastStable.delete(oldest);
    _history.delete(oldest);
  }
}

// reconcile — returns the stabilized RfeData for this session.
// freshRfe: { state, confidence, entropy } from the latest classify() call,
//           or null when Phase A/B fallback fired or classify() threw.
export function reconcile(session, freshRfe) {
  const key = sessionKey(session);

  // Null input: clear session state and pass null through.
  if (freshRfe === null) {
    _history.delete(key);
    _lastStable.delete(key);
    return null;
  }

  pushHistory(key, freshRfe);
  prune();

  const stable = _lastStable.get(key) ?? null;

  // No stable state yet, or fresh is same rank or better → accept immediately.
  if (!stable || stateRank(freshRfe) >= stateRank(stable)) {
    _lastStable.set(key, freshRfe);
    return freshRfe;
  }

  // Fresh is worse than stable → apply hysteresis.
  const threshold = freshRfe.state === 'UNCLASSIFIED' ? K : N;
  const history   = _history.get(key);
  const tail      = history.slice(-threshold);

  // Degrade only when the last `threshold` consecutive samples are all at or below fresh rank.
  const allWorse = tail.length === threshold
    && tail.every(s => stateRank(s) <= stateRank(freshRfe));

  if (allWorse) {
    _lastStable.set(key, freshRfe);
    return freshRfe;
  }

  // Hold stable state — absorb the transient degradation.
  return stable;
}

// clearSession — explicit reset for a session (call on new query or session teardown).
export function clearSession(session) {
  const key = sessionKey(session);
  _history.delete(key);
  _lastStable.delete(key);
}
