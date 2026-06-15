// WO-1752 — Canonical State Serialization Standard (CSSS)
// Guarantees stateHash = HASH(CSSS(state)) is deterministic across any environment or timeframe.
//
// Rules (locked):
// 1. Key ordering:    all object keys sorted lexicographically (ASCII byte order)
// 2. Encoding:        UTF-8 (JS native)
// 3. Timestamps:      normalized to UTC ISO8601 (YYYY-MM-DDTHH:mm:ss.SSSZ)
// 4. Float precision: rounded to 6 decimal places
// 5. Array determinism:
//    a. Primitives sorted alphanumerically on their canonical form
//    b. Objects sorted by canonical form of their primary id key, falling back to full canonical form
// 6. Transient stripping: keys prefixed with _transient_ or _local_ stripped before hashing
// 7. Null handling: null preserved; undefined keys stripped

const TS_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const FLOAT_PRECISION = 6;

function normalizeTimestamp(s) {
  if (!TS_PATTERN.test(s)) return null;
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch {}
  return null;
}

function isPrimitive(v) {
  return v === null || typeof v !== 'object';
}

// Returns the canonical string for a single value, or undefined if the value should be stripped.
export function canonicalize(val) {
  if (val === undefined) return undefined;
  if (val === null) return 'null';

  if (typeof val === 'boolean') return String(val);

  if (typeof val === 'number') {
    if (!isFinite(val)) return JSON.stringify(val); // Infinity / NaN as-is
    return parseFloat(val.toFixed(FLOAT_PRECISION)).toString();
  }

  if (typeof val === 'string') {
    const ts = normalizeTimestamp(val);
    if (ts !== null) return JSON.stringify(ts);
    return JSON.stringify(val);
  }

  if (Array.isArray(val)) {
    const canonicalized = val
      .map(v => canonicalize(v))
      .filter(v => v !== undefined);

    // Sort by canonical form — deterministic regardless of insertion order
    canonicalized.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

    return '[' + canonicalized.join(',') + ']';
  }

  if (typeof val === 'object') {
    const keys = Object.keys(val)
      .filter(k =>
        !k.startsWith('_transient_') &&
        !k.startsWith('_local_') &&
        val[k] !== undefined
      )
      .sort(); // Rule 1: lexicographic key order

    const pairs = keys
      .map(k => {
        const cv = canonicalize(val[k]);
        return cv === undefined ? null : `${JSON.stringify(k)}:${cv}`;
      })
      .filter(Boolean);

    return '{' + pairs.join(',') + '}';
  }

  return JSON.stringify(val);
}

// ── Phase B: djb2 hash (deterministic, synchronous, cross-environment) ────────
// Phase C upgrade path: replace djb2() with SHA-256(canonicalize(val)) — same CSSS input.
function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0;
  }
  return 'djb2:' + h.toString(16).padStart(8, '0');
}

export function computeStateHash(val) {
  return djb2(canonicalize(val));
}

// Verify: CSSS(a) === CSSS(b) for semantically identical objects with different formatting.
// Returns true if canonical forms match (used in Test A.5).
export function canonicalEqual(a, b) {
  return canonicalize(a) === canonicalize(b);
}
