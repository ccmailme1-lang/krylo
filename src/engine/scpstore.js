// WO-2007.1 — Signal Candidate Package Store
// SCP is the single output unit of the Recon Layer.
// status: 'CANDIDATE_ONLY' is set on write and CANNOT be mutated — no code path alters it.
// Max 50 SCPs — FIFO eviction of lowest-scoring entries above capacity.

const MAX_SCPS          = 50;
const SCORE_FLOOR       = 0.35;

let _store  = [];
let _nextId = 1;

function padId(n) { return `SCP-${String(n).padStart(4, '0')}`; }

// createSCP — validates, enforces budget, inserts. Returns id or null if below floor.
export function createSCP({
  hypothesis,
  target_signal,
  observed_gap,
  candidate_upstream_sources = [],
  genealogy_chain            = [],
  expected_lead_time,
  outcome_lag_distribution   = null,
  information_gain_score,
  causal_confidence_score,
  observability_score,
  integration_cost_estimate,
  exploration_score,
  causal_validity,
  negative_genealogy_constraints = [],
  regime_conditions              = [],
  recommendation,
}) {
  if (exploration_score < SCORE_FLOOR) return null;

  if (_store.length >= MAX_SCPS) {
    _store.sort((a, b) => a.exploration_score - b.exploration_score);
    if (_store[0].exploration_score >= exploration_score) return null;
    _store.shift();
  }

  const scp = {
    id:                            padId(_nextId++),
    hypothesis,
    target_signal,
    observed_gap,
    candidate_upstream_sources,
    genealogy_chain,
    expected_lead_time,
    outcome_lag_distribution,
    information_gain_score,
    causal_confidence_score,
    observability_score,
    integration_cost_estimate,
    exploration_score,
    causal_validity,
    negative_genealogy_constraints,
    regime_conditions,
    recommendation,
    status: 'CANDIDATE_ONLY',    // immutable — never altered after write
    ts:     Date.now(),
  };

  _store.push(scp);
  return scp.id;
}

export function getAllSCPs()    { return _store.map(s => ({ ...s })); }
export function getSCP(id)     { const s = _store.find(s => s.id === id); return s ? { ...s } : null; }
export function getRankedSCPs(){ return [..._store].sort((a, b) => b.exploration_score - a.exploration_score).map(s => ({ ...s })); }
export function getSCPsByValidity(v) { return _store.filter(s => s.causal_validity === v).map(s => ({ ...s })); }
export function clearSCPs()    { _store = []; }

export function getReconStats() {
  const byValidity = { IDENTIFIABLE: 0, CONFOUNDED: 0, UNRESOLVED: 0 };
  for (const s of _store) byValidity[s.causal_validity] = (byValidity[s.causal_validity] ?? 0) + 1;
  return { total: _store.length, capacity: MAX_SCPS, scoreFloor: SCORE_FLOOR, byValidity };
}
