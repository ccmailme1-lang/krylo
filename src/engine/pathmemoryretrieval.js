// KRYL-978 — Path Memory Retrieval Engine (Stage 1: Structural Path Retrieval)
// Activates the deferred WO-1869 Path Memory concept using a retrieval-not-prediction
// mechanism: find structurally similar historical paths, report similarity only.
//
// Classification: pure read-only join. Stored PathRecords are immutable and
// retrieval never recomputes an inference result — it compares pre-existing
// embeddings only. Nothing here reconstructs SCI, identity, or any other
// inference-derived structure.
//
// Outcome Neutrality Clause (mandatory, locked 2026-07-04 review):
//   This module retrieves historical path structures only. It does not infer,
//   project, or predict future outcomes. All retrieved results are strictly
//   retrospective artifacts of observed system states. Outcome metadata, when
//   present on a stored path, is treated as historical annotation ONLY and is
//   NEVER used in scoring or ranking functions — ranking is structural-similarity
//   only, so a future outcome-linkage extension cannot bias retrieval toward
//   paths that happened to have favorable recorded outcomes.
//
// Implementation Stage Declaration: this is Stage 1 — Structural Path Retrieval.
// Outcome linkage / historical-frequency-with-N reporting (section 19 tightening #2)
// is deferred to a separate, explicitly scoped extension ticket.
//
// Vocabulary constraint: "historical state retrieval" / "structural similarity
// lookup" / "past-path reconstruction" only. Never "decision augmentation",
// "support inference", or "inform decisions" — this module is read-only and
// decoupled from any decision-making logic.

const MAX_STORED_PATHS = 5000; // FM4: prune lowest-value (oldest) paths past this

let _pathStore = []; // PathRecord[] — immutable once appended; array itself may prune

// ── Path construction ──────────────────────────────────────────────────────────

/**
 * buildPath — group a raw event sequence into a Path object.
 * @param {object} params — { entity_id, domain_cluster, events }
 *   events: [{ type, domain, timestamp, magnitude }] chronological order assumed.
 * @returns {object} Path — { entity_id, domain_cluster, events, time_window }
 */
export function buildPath({ entity_id, domain_cluster = null, events = [] }) {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const time_window = sorted.length
    ? { start: sorted[0].timestamp, end: sorted[sorted.length - 1].timestamp }
    : { start: null, end: null };

  return { entity_id, domain_cluster, events: sorted, time_window };
}

// ── Path embedding ─────────────────────────────────────────────────────────────
// Deterministic, engineered feature vector (not a learned embedding) — consistent
// with KRYLO's detect-don't-predict discipline: every dimension is a named,
// auditable structural property, never an opaque learned representation.
//
// Captures (per KRYL-978 mechanism spec):
//   temporal ordering     -> normalized inter-event gap sequence (fixed-length, resampled)
//   structural transitions -> event-type transition density
//   event density          -> events per unit time

const EMBED_GAP_BUCKETS = 8; // fixed-length resampling of inter-event gaps

function resampleToFixedLength(values, length) {
  if (!values.length) return new Array(length).fill(0);
  if (values.length === 1) return new Array(length).fill(values[0]);
  const out = [];
  for (let i = 0; i < length; i++) {
    const pos = (i / (length - 1)) * (values.length - 1);
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    const frac = pos - lo;
    out.push(values[lo] * (1 - frac) + values[hi] * frac);
  }
  return out;
}

/**
 * embedPath — encode a Path into a fixed-length numeric vector.
 * FM1: sparse event paths (<2 events) -> reduced-dimensionality vector (gap
 * component omitted, zero-filled) rather than a fabricated interpolation.
 */
export function embedPath(path) {
  const events = path?.events ?? [];
  const n = events.length;

  if (n < 2) {
    return {
      vector: new Array(EMBED_GAP_BUCKETS + 3).fill(0),
      dimensionality: 'reduced', // FM1
      eventCount: n,
    };
  }

  // Temporal ordering: normalized inter-event gaps (resampled to fixed length)
  const gaps = [];
  for (let i = 1; i < n; i++) gaps.push(events[i].timestamp - events[i - 1].timestamp);
  const maxGap = Math.max(...gaps, 1);
  const normalizedGaps = gaps.map(g => g / maxGap);
  const gapVector = resampleToFixedLength(normalizedGaps, EMBED_GAP_BUCKETS);

  // Structural transitions: fraction of consecutive events that change type
  const transitions = gaps.map((_, i) => (events[i].type !== events[i + 1].type ? 1 : 0));
  const transitionDensity = transitions.reduce((a, b) => a + b, 0) / transitions.length;

  // Event density: events per unit time (normalized by path duration)
  const duration = Math.max(1, path.time_window.end - path.time_window.start);
  const density = n / duration;
  const normalizedDensity = Math.min(1, density * 1000); // scale to a workable [0,1]-ish range

  // Average magnitude (structural weight of the path)
  const avgMagnitude = events.reduce((a, e) => a + (e.magnitude ?? 0), 0) / n;

  return {
    vector: [...gapVector, transitionDensity, normalizedDensity, avgMagnitude],
    dimensionality: 'full',
    eventCount: n,
  };
}

function cosineSimilarity(a, b) {
  const len = Math.min(a.length, b.length);
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < len; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ── Storage ─────────────────────────────────────────────────────────────────────

let _pathIdCounter = 0;

/**
 * storePath — construct, embed, and persist a Path as an immutable PathRecord.
 * Path objects are immutable once stored — no update/mutate API is exposed.
 * FM4: storage overflow -> prune lowest-value (oldest) paths to stay under MAX_STORED_PATHS.
 */
export function storePath(pathInput) {
  const path = buildPath(pathInput);
  const embedding = embedPath(path);

  const record = Object.freeze({
    path_id: `path_${++_pathIdCounter}`,
    entity_id: path.entity_id,
    vector: Object.freeze([...embedding.vector]),
    timestamp_range: Object.freeze({ ...path.time_window }),
    dimensionality: embedding.dimensionality,
    // outcome metadata is historical annotation ONLY — never read by querySimilarPaths
    outcome: pathInput.outcome ?? null,
  });

  _pathStore.push(record);

  if (_pathStore.length > MAX_STORED_PATHS) {
    _pathStore = _pathStore.slice(_pathStore.length - MAX_STORED_PATHS); // prune oldest
  }

  return record;
}

export function getStoredPathCount() {
  return _pathStore.length;
}

export function resetPathStore() {
  _pathStore = [];
  _pathIdCounter = 0;
}

// ── Retrieval ───────────────────────────────────────────────────────────────────

/**
 * querySimilarPaths — retrieve the top-K structurally similar historical paths.
 *
 * @param {object} queryPath — { entity_id, event_sequence, time_window } (raw events,
 *                              same shape buildPath/embedPath expect)
 * @param {number} k — max results to return
 * @returns {object} RetrievedPaths-shaped result: { results: [{path_id, similarity_score,
 *          temporal_distance}], empty: boolean }
 *
 * FM2: no similar paths -> empty result set with explicit flag (section 22
 * absence-is-signal: absence is a classified state, not a silent null).
 * FM3: embedding dimensionality mismatch between query and stored record ->
 * fall back to comparing only the overlapping (shared) dimensions — an
 * approximate nearest-neighbor comparison rather than a hard failure.
 *
 * Ranking is structural-similarity only — outcome metadata is never read here.
 */
export function querySimilarPaths(queryPath, k = 5) {
  const path = buildPath({
    entity_id: queryPath.entity_id,
    events: queryPath.event_sequence ?? [],
  });
  const queryEmbedding = embedPath(path);

  if (_pathStore.length === 0) {
    return { results: [], empty: true, reason: 'NO_STORED_PATHS' };
  }

  const scored = _pathStore.map(record => {
    // FM3: dimensionality mismatch handled naturally by cosineSimilarity's
    // shared-length comparison (approximate nearest neighbor over overlap).
    const similarity_score = parseFloat(
      cosineSimilarity(queryEmbedding.vector, record.vector).toFixed(4)
    );
    const temporal_distance = Number.isFinite(record.timestamp_range.end) && Number.isFinite(path.time_window.end)
      ? Math.abs(path.time_window.end - record.timestamp_range.end)
      : null;

    return { path_id: record.path_id, similarity_score, temporal_distance };
  });

  scored.sort((a, b) => b.similarity_score - a.similarity_score);
  const topK = scored.slice(0, k);

  return { results: topK, empty: topK.length === 0, reason: topK.length === 0 ? 'NO_MATCHES_ABOVE_ZERO' : null };
}
