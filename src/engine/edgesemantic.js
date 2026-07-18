// edgesemantic.js — KRYL-1044 EDGE Semantic Layer (classification only).
// Founder-scoped (2026-07-18): build the NEW part — the ontology of evidence-backed structural
// ASYMMETRY MECHANISMS — and route enforcement through EXISTING modules, NOT a parallel layer (§4):
//   E1 evidence-required   → evidencetiers.js          E4 unknown-preservation → epistemictransparency.js
//   E2 provenance-required → epistemictransparency.js  E7 no-forward-inference → causalvaliditygate.js
//   CI doctrine suite      → KRYL-1039
// EDGE describes STRUCTURE and produces NO actions. Pipeline: …Evidence → EDGE → Structural Confirmation.
//
// What is genuinely EDGE-specific and enforced HERE (at the EDGE record's own schema):
//   E3 execution-boundary — an EDGE record may contain NO action field (buy/sell/order/target_price/
//      recommendation). Mechanism ≠ outcome is enforced structurally: those keys are forbidden.
//   E4 unknown cannot collapse — missing/insufficient evidence yields EDGE_UNKNOWN, never a default type.
//   E5 layer-direction — classifyEdge consumes Evidence and emits EDGE; the reverse is not exported.
//   E6 no semantic escalation — an EDGE's confidence may not exceed the evidence confidence it rests on.

// The asymmetry-type ontology. Each is a MECHANISM (a structural imbalance), never an outcome.
export const EDGE_TYPES = Object.freeze({
  LIQUIDITY_IMBALANCE:      { label: 'Liquidity imbalance',      domains: ['CAPITAL'],              mechanism: 'supply/demand for capital is structurally unbalanced' },
  SUPPLY_CONSTRAINT:        { label: 'Supply constraint',        domains: ['CAPITAL', 'TECHNOLOGY'], mechanism: 'a physical/productive input is structurally scarce' },
  OWNERSHIP_CONCENTRATION:  { label: 'Ownership concentration',  domains: ['OWNERSHIP'],            mechanism: 'control/ownership is structurally concentrated' },
  TIMING_WINDOW:            { label: 'Timing window',            domains: ['CAPITAL', 'MEDIA'],      mechanism: 'a structural window is open for a bounded period' },
  OPTION_CONVEXITY:         { label: 'Option convexity',         domains: ['CAPITAL'],              mechanism: 'payoff structure is asymmetric/convex to a move' },
  INFORMATION_ASYMMETRY:    { label: 'Information asymmetry',     domains: ['KNOWLEDGE', 'MEDIA'],    mechanism: 'material information is unevenly distributed' },
});

// E4 — the unknown ladder. UNKNOWN/ABSENT are first-class states, not null; they cannot collapse.
export const EDGE_STATE = Object.freeze(['EDGE_UNKNOWN', 'ABSENT', 'OBSERVED', 'CONTESTED', 'STALE']);

// E3 — an EDGE record classifies structure; it may never carry an action/outcome. These keys are banned.
export const FORBIDDEN_ACTION_KEYS = Object.freeze(['buy', 'sell', 'order', 'target_price', 'recommendation', 'action', 'position']);

/**
 * classifyEdge({ edgeType, state, evidence, provenance }) → EDGE record
 * Evidence → EDGE (E5). Returns an EDGE_UNKNOWN record when evidence/provenance is missing (E1/E2/E4:
 * unknown cannot collapse into a typed classification). Confidence is capped at the evidence's own
 * confidence (E6 — no semantic escalation). NO action field is ever produced (E3).
 */
export function classifyEdge({ edgeType, state = 'OBSERVED', evidence = null, provenance = null } = {}) {
  const known = EDGE_TYPES[edgeType];
  const evConf = typeof evidence?.confidence === 'number' ? evidence.confidence : null;

  // E1/E2/E4 — no evidence or no provenance → UNKNOWN, never a fabricated typed edge.
  if (!known || !evidence || !provenance || evConf == null) {
    return {
      edgeType: known ? edgeType : null,
      state: 'EDGE_UNKNOWN',
      mechanism: known?.mechanism ?? null,
      confidence: null,
      provenance: provenance ?? null,
      reason: !known ? 'UNKNOWN_EDGE_TYPE' : !evidence ? 'E1_NO_EVIDENCE' : !provenance ? 'E2_NO_PROVENANCE' : 'E1_NO_EVIDENCE_CONFIDENCE',
    };
  }

  return {
    edgeType,
    state: EDGE_STATE.includes(state) ? state : 'EDGE_UNKNOWN',
    mechanism: known.mechanism,
    domains: known.domains,
    confidence: evConf,           // E6 — inherits evidence confidence, never exceeds it
    provenance,
  };
}

/**
 * validateEdgeRecord(edge) → { valid, errors[] }
 * The CI-callable gate for EDGE records (the EDGE-specific invariants; E1/E2/E4/E7 also covered by the
 * existing modules referenced above). Fails on: unknown type, invalid state, any forbidden action key
 * (E3), OBSERVED/CONTESTED without provenance+confidence (E1/E2), or confidence > evidence (E6).
 */
export function validateEdgeRecord(edge, { evidenceConfidence = null } = {}) {
  const errors = [];
  if (!edge || typeof edge !== 'object') return { valid: false, errors: ['edge must be an object'] };

  if (edge.edgeType != null && !EDGE_TYPES[edge.edgeType]) errors.push(`unknown edgeType: ${edge.edgeType}`);
  if (!EDGE_STATE.includes(edge.state)) errors.push(`invalid state: ${edge.state}`);

  // E3 — execution boundary. Mechanism, never outcome.
  for (const k of FORBIDDEN_ACTION_KEYS) if (k in edge) errors.push(`E3 execution-boundary: forbidden action field "${k}"`);

  // E1/E2 — a typed, asserted edge must rest on evidence confidence + provenance.
  const asserted = edge.state === 'OBSERVED' || edge.state === 'CONTESTED';
  if (asserted) {
    if (edge.confidence == null) errors.push('E1: asserted edge requires a confidence from evidence');
    if (edge.provenance == null) errors.push('E2: asserted edge requires provenance');
  }

  // E6 — no semantic escalation.
  if (evidenceConfidence != null && edge.confidence != null && edge.confidence > evidenceConfidence + 1e-9) {
    errors.push(`E6 no-escalation: edge confidence ${edge.confidence} > evidence ${evidenceConfidence}`);
  }

  return { valid: errors.length === 0, errors };
}
