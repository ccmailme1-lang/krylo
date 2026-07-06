// KRYL-969 Phase 1 — Narrative Snapshot Store
// Append-only, observational record of an entity's own declared self-description
// (regulatory filing narrative, archived homepage/About text, self-issued press release,
// or a structured business-classification code) at a point in time.
// Locked contract: specs/KRYL-969-identity-evolution-engine.md §2/§6/§7
//
// Sibling to entitystateledger.js (KRYL-974), not an extension of it — that ledger's
// schema is signal_snapshot/metric_snapshot (numeric, observed-output-only) and is
// unaware this module exists. This module never reads or writes entitystateledger.js.
//
// This module does not extract, vectorize, score, or compare anything. It stores
// raw_text verbatim. Extraction/vectorization/drift/comparison are later, separate,
// not-yet-hardened phases (see spec NOTES).

const STORE_KEY = 'krylo_narrative_snapshots_v1';

export const SOURCE = {
  EDGAR:            'EDGAR',
  WAYBACK:          'WAYBACK',
  COMPANIES_HOUSE:  'COMPANIES_HOUSE',
};

function readStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]'); }
  catch { return []; }
}

function writeStore(entries) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(entries)); }
  catch { /* storage unavailable — degrades to no-op, never throws */ }
}

// Append a new NarrativeSnapshot. No update/delete API exists — append-only.
// entityId must already be resolved via entityresolution.js's buildCanonicalId() —
// this module does not resolve or normalize entity names itself.
export function recordNarrativeSnapshot({
  entityId,
  source,
  sourceUrl,
  contentDate,
  rawText,
  sourceRef = {},
}) {
  if (!entityId) throw new Error('recordNarrativeSnapshot: entityId is required');
  if (!SOURCE[source]) throw new Error(`recordNarrativeSnapshot: unknown source "${source}"`);
  if (!contentDate) throw new Error('recordNarrativeSnapshot: contentDate is required');

  const entry = {
    entity_id:       entityId,
    source,
    source_url:      sourceUrl ?? null,
    captured_at:     new Date().toISOString(),
    content_date:    new Date(contentDate).toISOString(),
    raw_text:        rawText ?? '',
    source_ref:      sourceRef,
    epistemic_class: 'NARRATIVE',
  };

  const entries = readStore();
  entries.push(entry);
  writeStore(entries);

  return entry;
}

// Read-only query — all snapshots for one entity, oldest content_date first.
export function getSnapshotsForEntity(entityId) {
  return readStore()
    .filter(e => e.entity_id === entityId)
    .sort((a, b) => new Date(a.content_date) - new Date(b.content_date));
}

// Read-only query — all snapshots for one entity from a single source.
export function getSnapshotsForEntityBySource(entityId, source) {
  return getSnapshotsForEntity(entityId).filter(e => e.source === source);
}
