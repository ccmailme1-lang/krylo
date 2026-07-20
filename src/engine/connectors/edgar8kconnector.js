// WO-2047 — EDGAR 8-K Event Connector
// Polls SEC EDGAR full-text search for 8-K filings.
// Resolves entities, classifies events, computes groundedness + materiality.
// Creates RealityObjects via rkmstore.js.
//
// Boundary rules:
//   NO surfacerouter — signal dispatch belongs to WO-2051.
//   NO metricsengine — no metric computation here.
//   NO inference — eventClass is a deterministic item-number lookup.
//   NO EDGAR Form D — that is WO-1720 / useedgarsignals.js.
//   entityresolution.js → read-only. rkmstore.js → write consumer.

import { resolve as resolveEntity } from '../entityresolution.js';
import { createObject, weightForClass, OBJECT_TYPE, EPISTEMIC_STATE } from '../rkmstore.js';
import { EPISTEMIC_CLASS } from '../evidencetiers.js';

const EDGAR_BASE    = '/api/edgar';
// KRYL-1094 — was 1. A single-day window returns zero on every weekend and market holiday,
// which is indistinguishable from an outage and made the connector look permanently down.
// 7 days always spans business days. Re-fetching costs nothing: _processed dedups by accession,
// so already-seen filings are skipped, and MAX_HITS still caps volume per call.
const LOOKBACK_DAYS = 7;
const MAX_HITS      = 40;

// KRYL-1094 — one retry with backoff. SEC rate-limits by IP; a single 429/503 previously
// blanked the whole cycle until the next 5-minute tick.
const FETCH_RETRIES  = 1;
const RETRY_DELAY_MS = 1500;

// Absence is a classified state (§22), never a silent empty array.
export const SYNC_STATUS = Object.freeze({
  OK:           'OK',            // fetch succeeded, filings returned
  EMPTY_WINDOW: 'EMPTY_WINDOW',  // fetch succeeded, no filings in range — real, not a failure
  FETCH_FAILED: 'FETCH_FAILED',  // could not reach the source — absence is unknown, not zero
});

// ── 8-K Item → Event Class map ────────────────────────────────────────────────
// Deterministic — no inference. Unknown items → UNKNOWN_MATERIAL_EVENT; never discarded.
// null = exhibit-only item (9.01) — skip for event classification, not for evidence.
const ITEM_EVENT_CLASS = {
  '1.01': 'MATERIAL_CONTRACT',
  '1.02': 'CONTRACT_TERMINATION',
  '1.03': 'BANKRUPTCY',
  '1.04': 'MINE_SAFETY',
  '2.01': 'ACQUISITION',
  '2.02': 'EARNINGS_ANNOUNCEMENT',
  '2.03': 'DEBT_ISSUANCE',
  '2.04': 'BANKRUPTCY_TRIGGER',
  '2.05': 'OPERATIONAL_SHUTDOWN',
  '2.06': 'ASSET_IMPAIRMENT',
  '3.01': 'DELISTING_NOTICE',
  '3.02': 'EQUITY_OFFERING',
  '3.03': 'SECURITY_MODIFICATION',
  '4.01': 'AUDITOR_CHANGE',
  '4.02': 'FINANCIAL_RESTATEMENT',
  '5.01': 'CHANGE_IN_CONTROL',
  '5.02': 'EXECUTIVE_CHANGE',
  '5.03': 'CHARTER_AMENDMENT',
  '5.07': 'SHAREHOLDER_VOTE',
  '6.01': 'ABS_UPDATE',
  '6.02': 'ABS_UPDATE',
  '6.03': 'ABS_UPDATE',
  '6.04': 'ABS_UPDATE',
  '6.05': 'ABS_UPDATE',
  '7.01': 'REGULATORY_ACTION',
  '8.01': 'UNKNOWN_MATERIAL_EVENT',
  '9.01': null,  // exhibits only — not an event class, but still evidence
};

// Items that floor materiality at 70 regardless of other factors
const HIGH_MATERIALITY_ITEMS = new Set([
  '1.03', '2.01', '2.03', '2.04', '3.01', '4.01', '4.02', '5.01', '5.02',
]);

// ── State (session-scoped) ────────────────────────────────────────────────────

// Dedup: CIK+accession key → never re-processed (idempotency guarantee)
const _processed = new Set();

// Dead-letter queue — failures isolated here; pipeline never halts
const _deadLetter = [];

// Event log: accessionKey → event metadata — consumed by WO-2051
const _eventLog = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────

function accessionKey(cik, accessionNo) {
  return `${String(cik).padStart(10, '0')}::${accessionNo}`;
}

// Extract item numbers from EDGAR items string ("1.01 5.02", "Item 2.01", etc.)
function parseItems(rawItems) {
  if (!rawItems) return [];
  const matches = String(rawItems).matchAll(/(\d+\.\d+)/g);
  return [...matches].map(m => m[1]);
}

// Primary event class = first non-exhibit item in the list
function classifyEventClass(items) {
  for (const item of items) {
    const cls = ITEM_EVENT_CLASS[item];
    if (cls === undefined) continue;  // unrecognized item number — keep scanning
    if (cls === null) continue;       // exhibit item — skip
    return cls;
  }
  return 'UNKNOWN_MATERIAL_EVENT';
}

// All event classes present in a filing (multi-item 8-Ks are common)
function classifyAllEventClasses(items) {
  const classes = new Set();
  for (const item of items) {
    const cls = ITEM_EVENT_CLASS[item];
    if (cls && cls !== null) classes.add(cls);
  }
  if (classes.size === 0) classes.add('UNKNOWN_MATERIAL_EVENT');
  return Array.from(classes);
}

// Groundedness: 8-K = signed legal disclosure under Reg FD.
// 0.98 if entity resolved (full provenance); 0.85 if entity unknown (filing still real).
function computeGroundedness(entityResolved) {
  return entityResolved ? 0.98 : 0.85;
}

// Materiality: 0–100. Deterministic item-based formula — no inference.
function computeMateriality(items, eventClass) {
  const base       = items.some(i => HIGH_MATERIALITY_ITEMS.has(i)) ? 70 : 40;
  const itemBonus  = Math.min(20, Math.max(0, (items.length - 1) * 5));
  const unknownPenalty = eventClass === 'UNKNOWN_MATERIAL_EVENT' ? -10 : 0;
  return Math.min(100, Math.max(0, base + itemBonus + unknownPenalty));
}

// 8-K items are STRUCTURAL evidence — signed legal disclosures
function buildEpistemicWeights(count) {
  return Array(count).fill(weightForClass(EPISTEMIC_CLASS.STRUCTURAL));
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetch8KFilings() {
  const startdt = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString().slice(0, 10);
  const enddt   = new Date().toISOString().slice(0, 10);

  const params = new URLSearchParams({
    forms:     '8-K',
    dateRange: 'custom',
    startdt,
    enddt,
    hits:      String(MAX_HITS),
  });

  let lastErr;
  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
    try {
      const res = await fetch(`${EDGAR_BASE}?${params}`);
      if (!res.ok) throw new Error(`EDGAR 8-K fetch HTTP ${res.status}`);
      const json = await res.json();
      return json.hits?.hits ?? [];
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

// ── Process single filing ─────────────────────────────────────────────────────

function processHit(hit) {
  const src    = hit._source ?? {};
  const cik    = src.entity_id ?? src.file_num ?? src.cik ?? 'UNKNOWN';
  const accNo  = src.accession_no ?? hit._id ?? '';
  const key    = accessionKey(cik, accNo);

  if (_processed.has(key)) return null;

  const entityName = src.entity_name ?? src.display_names?.[0] ?? '';
  const filingDate = src.file_date ?? src.period_of_report ?? new Date().toISOString().slice(0, 10);
  const items      = parseItems(src.items ?? '');
  const eventClass = classifyEventClass(items);
  const allClasses = classifyAllEventClasses(items);

  const entityCard  = entityName ? resolveEntity(entityName) : null;
  const canonicalId = entityCard?.canonicalId ?? null;

  const groundedness = computeGroundedness(!!entityCard);
  const materiality  = computeMateriality(items, eventClass);

  // Evidence: one entry per distinct item number (each item = separate legal disclosure)
  const evidenceIds = items.length > 0
    ? items.map(i => `${accNo}::item-${i}`)
    : [`${accNo}::main`];

  const obj = createObject({
    identityId:       canonicalId,
    objectType:       OBJECT_TYPE.EVENT,
    title:            `${entityName || cik}: 8-K — ${eventClass}`,
    summary:          `SEC 8-K — items: ${items.join(', ') || 'unspecified'}. Filed ${filingDate}.`,
    observedAt:       new Date(filingDate).toISOString(),
    validFrom:        new Date(filingDate).toISOString(),
    state:            'DISCLOSED',
    epistemicState:   EPISTEMIC_STATE.VERIFIED,
    evidence:         evidenceIds,
    epistemicWeights: buildEpistemicWeights(evidenceIds.length),
    genealogy:        {},
    metadata: {
      source:          'SEC_EDGAR',
      filingType:      '8-K',
      accessionNumber: accNo,
      cik,
      ticker:          entityCard?.identifiers?.ticker ?? null,
      canonicalName:   entityCard?.canonicalName ?? entityName,
      items,
      eventClass,
      allEventClasses: allClasses,
      groundedness,
      materiality,
      sourceURL:       accNo ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=8-K&dateb=&owner=include&count=40` : null,
      filingDate,
    },
    sourceId: `EDGAR::${accNo}`,
  });

  _processed.add(key);
  _eventLog.set(key, {
    realityObjectId: obj.id,
    eventClass,
    allEventClasses: allClasses,
    materiality,
    groundedness,
    canonicalId,
    entityName: entityCard?.canonicalName ?? entityName,
    ts: Date.now(),
  });

  return obj;
}

// ── Main sync ─────────────────────────────────────────────────────────────────

export async function runEdgar8KSync() {
  let hits;
  try {
    hits = await fetch8KFilings();
  } catch (err) {
    // KRYL-1094 — a failed fetch is NOT an empty window. Previously both returned the same
    // empty shape, so an outage and a quiet Sunday were indistinguishable to every caller.
    _deadLetter.push({ phase: 'FETCH', error: err.message, ts: Date.now() });
    console.warn('[EDGAR 8-K] fetch failed —', err.message);
    return { processed: [], total: 0, new: 0, skipped: 0,
             status: SYNC_STATUS.FETCH_FAILED, error: err.message,
             deadLetter: _deadLetter.length };
  }

  const processed = [];

  for (const hit of hits) {
    try {
      const obj = processHit(hit);
      if (obj) processed.push(obj);
    } catch (err) {
      _deadLetter.push({ phase: 'PROCESS', hit: hit._id, error: err.message, ts: Date.now() });
    }
  }

  return {
    processed,
    total:      hits.length,
    new:        processed.length,
    skipped:    hits.length - processed.length,
    status:     hits.length === 0 ? SYNC_STATUS.EMPTY_WINDOW : SYNC_STATUS.OK,
    deadLetter: _deadLetter.length,
  };
}

// ── Public accessors (WO-2051 consumption boundary) ───────────────────────────

export function getProcessedEvents() {
  return Array.from(_eventLog.entries()).map(([key, meta]) => ({ key, ...meta }));
}

export function getDeadLetter() {
  return [..._deadLetter];
}

export function clearDeadLetter() {
  _deadLetter.length = 0;
}

export function isProcessed(cik, accessionNo) {
  return _processed.has(accessionKey(cik, accessionNo));
}

// Expose ITEM_EVENT_CLASS for WO-2051 domain routing decisions
export { ITEM_EVENT_CLASS };
