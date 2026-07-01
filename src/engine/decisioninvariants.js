// WO-2063 — Decision Invariant Schema
// Typed interface contract for the 8 universal Decision Invariants.
// SEMANTIC CONTRACT LAYER ONLY — no computation, no weighting, no normalization.
// Invariants are derivative outputs populated by WO-2066 (Metric Adapter) after domain execution.
// They are NOT primary representations — they are extracted from domain-native reasoning output.

export const DECISION_INVARIANTS = [
  'COST',
  'VALUE',
  'TIME',
  'RISK',
  'LEVERAGE',
  'FLEXIBILITY',
  'CONFIDENCE',
  'MOMENTUM',
];

// Invariant field contract (schema for each populated invariant):
//
//   invariant:    string          — one of DECISION_INVARIANTS
//   raw:          number | null   — scalar [0–100] or null if undefined
//   direction:    'UP' | 'DOWN' | 'NEUTRAL' | null
//   label:        string          — human-readable domain-agnostic descriptor
//   sourceMetric: string          — domain-native metric that mapped here
//   confidence:   number | null   — [0–1] confidence in this mapping (not itself a Decision Invariant)
//   populated:    boolean         — false = not yet mapped from domain output

export function makeInvariant(invariant, fields = {}) {
  if (!DECISION_INVARIANTS.includes(invariant)) {
    throw new Error(`Unknown Decision Invariant: ${invariant}`);
  }
  const raw = fields.raw ?? null;
  return {
    invariant,
    raw,
    direction:    fields.direction    ?? null,
    label:        fields.label        ?? '',
    sourceMetric: fields.sourceMetric ?? '',
    confidence:   fields.confidence   ?? null,
    populated:    raw !== null && raw !== undefined,
  };
}

// Initialize an empty invariant set — all 8 unpopulated
export function makeInvariantSet() {
  return Object.fromEntries(
    DECISION_INVARIANTS.map(inv => [inv, makeInvariant(inv)])
  );
}

// True if at least one invariant has been mapped
export function isPopulated(invariantSet) {
  return DECISION_INVARIANTS.some(inv => invariantSet[inv]?.populated);
}

// True if all 8 invariants have been mapped
export function isComplete(invariantSet) {
  return DECISION_INVARIANTS.every(inv => invariantSet[inv]?.populated);
}
