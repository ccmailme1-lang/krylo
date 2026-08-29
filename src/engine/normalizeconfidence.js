// normalizeconfidence.js — WO-1 / DEFECT-WO1-CONF.
//
// One invariant for the shared signal substrate (specs/SPEC-connector-event-contract.md §3):
//
//   confidence entering the substrate is on the 0–100 scale, OR it is explicitly
//   absent (null). It is NEVER ambiguous between 0–1 and 0–100, and a missing
//   value is NEVER a fabricated 50.
//
// Applied once, at the connector → substrate boundary (surfaceRouter.dispatchBatch),
// BEFORE topology amplify / suppress / jitter (which already assume 0–100) and
// before the _pool ingest. Downstream code may then assume the invariant.
//
// Rule (matches the WO-1 acceptance table):
//   0.0   → 0        (0–1 scale)
//   0.5   → 50       (0–1 scale)
//   1.0   → 100      (0–1 scale — the boundary case resolves toward the dominant convention)
//   50    → 50       (already 0–100)
//   100   → 100      (already 0–100)
//   missing / non-number / NaN → null   (ABSENT, not 50)
//   < 0  or  > 100 (after the scale decision) → unit violation → null + flag

export function normalizeConfidence(raw) {
  if (typeof raw !== 'number' || Number.isNaN(raw)) {
    return { value: null, violation: false };          // absent — legitimate
  }
  if (raw < 0)                return { value: null, violation: true };
  if (raw <= 1)              return { value: raw * 100, violation: false };  // 0–1 scale
  if (raw <= 100)            return { value: raw,       violation: false };  // already 0–100
  return { value: null, violation: true };             // > 100 — cannot be either scale
}
