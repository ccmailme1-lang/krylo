// KRYL-1091 — EDGAR 8-K → Evidence Graph adapter.
//
// The join that was missing. Connectors emit §16 pool signals; the evidence graph consumes
// evidence NODES. Nothing converted one to the other, so createCanonicalEvent() had zero
// callers and every downstream consumer (computeSCI, computeIndependence,
// computeStructuralDivergence, computeStructuralMomentum) sat idle with no input.
//
// This module builds CanonicalEvents from already-processed 8-K filings. It is the evidence-side
// sibling of edgar8ksignal.js (which builds the signal-side packets from the same source).
//
// Boundary rules (mirrors edgar8ksignal.js):
//   NO direct EDGAR fetch     — edgar8kconnector owns that.
//   NO createObject           — rkmstore is a read-only source here.
//   NO metric computation     — SCI/EIM/momentum are computed by their own engines, downstream.
//   NO cone wiring            — this module never touches surfacerouter or a cone.
//   NO signal dispatch        — edgar8ksignal owns the signal path; these are parallel, not chained.
//
// Evidence type: every 8-K maps to SEC_FILING. That is what an 8-K literally is — no
// interpretation, no per-event-class judgement. SEC_FILING carries entityBound: true and
// canCreateCanonicalEvent: true in evidencetiers.js, both of which this adapter relies on.

import { createEvidenceNode, createCanonicalEvent } from '../identitykernel.js';
import { getAnchorStrength } from '../structuralconfirmation.js';
import { getProcessedEvents } from './edgar8kconnector.js';
import { getById } from '../rkmstore.js';

const EVIDENCE_TYPE = 'SEC_FILING';

// identityId → CanonicalEvent. One event per resolved entity, holding that entity's filings.
const _events = new Map();

// ── Node construction ────────────────────────────────────────────────────────
// One evidence node per 8-K filing. Node id is the RealityObject id, which is stable across
// syncs, so re-running does not duplicate nodes.
function toEvidenceNode(logEntry) {
  const ro   = getById(logEntry.realityObjectId);
  const meta = ro?.metadata ?? {};

  const filingDate = meta.filingDate ?? null;
  const timestamp  = filingDate ? new Date(filingDate) : new Date(logEntry.ts);

  return createEvidenceNode({
    id:           logEntry.realityObjectId,
    seedId:       logEntry.realityObjectId,
    evidenceType: EVIDENCE_TYPE,
    content:      ro?.title ?? `8-K — ${logEntry.eventClass}`,
    timestamp:    isNaN(timestamp.getTime()) ? new Date(logEntry.ts) : timestamp,
    metadata: {
      // entityVerified drives computeSCI's ENTITY_DISCOUNT. SEC_FILING is entityBound, so this
      // is only true when entity resolution actually matched a canonical entity card — a CIK
      // alone is not a verified entity binding.
      entityVerified:  !!logEntry.canonicalId,
      cik:             meta.cik             ?? null,
      accessionNumber: meta.accessionNumber ?? null,
      ticker:          meta.ticker          ?? null,
      canonicalName:   logEntry.entityName  ?? meta.canonicalName ?? null,
      eventClass:      logEntry.eventClass,
      allEventClasses: logEntry.allEventClasses ?? [],
      items:           meta.items           ?? [],
      materiality:     logEntry.materiality,
      groundedness:    logEntry.groundedness,
      sourceURL:       meta.sourceURL       ?? null,
      filingDate,
      source:          'SEC_EDGAR',
    },
  });
}

// ── Grouping ─────────────────────────────────────────────────────────────────
// Partition key is (entity, eventClass). Entity comes first and is absolute — filings by
// different companies are never the same event, regardless of how similar their evidence looks.
// eventClass separates distinct matters within one filer: a BANKRUPTCY and an EXECUTIVE_CHANGE
// from the same company are two events, not one.
//
// Why resolveIdentity() is NOT used here (identitykernel.js:322):
//   shouldMerge gates on computeStructuralSimilarity (identitykernel.js:203), which compares
//   evidenceType sets only — it has no entity awareness. Every 8-K is SEC_FILING, so any two
//   filings score similarity 1.0 whoever filed them, leaving temporal overlap as the sole
//   barrier. Feeding per-filing events to the resolver would merge unrelated companies.
//   Entity-aware similarity is a kernel change (WO-2004 territory), not an adapter change.
//
// Known coarseness, stated rather than hidden: two separate executive changes a year apart
// still land in one event. Splitting them needs a real same-matter signal, which the 8-K
// metadata does not carry. Inventing a date-proximity threshold here would be fabricating
// identity, so the partition stays coarse and honest.
function entityKeyFor(logEntry) {
  if (logEntry.canonicalId) return `ENTITY::${logEntry.canonicalId}`;
  const cik = getById(logEntry.realityObjectId)?.metadata?.cik;
  return cik ? `CIK::${cik}` : null;              // not attributable to a filer
}

function groupKeyFor(logEntry) {
  const entity = entityKeyFor(logEntry);
  if (!entity) return null;
  return `${entity}::${logEntry.eventClass ?? 'UNKNOWN_MATERIAL_EVENT'}`;
}

// ── Sync ─────────────────────────────────────────────────────────────────────
// Rebuilds each (entity, eventClass) CanonicalEvent from the filings known for it. identityId
// is derived from the group key, so lineage is stable across runs rather than a fresh UUID.
export function runEdgar8KEvidenceSync() {
  const processed = getProcessedEvents();
  if (!processed.length) return { events: 0, nodes: 0, skipped: 0 };

  const grouped = new Map();
  let skipped = 0;

  for (const entry of processed) {
    const key = groupKeyFor(entry);
    if (!key) { skipped++; continue; }   // no canonical id and no CIK — not attributable
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(entry);
  }

  let nodeCount = 0;

  for (const [key, entries] of grouped) {
    const nodes = new Map();
    let earliest = null;
    let latest   = null;

    for (const entry of entries) {
      const node = toEvidenceNode(entry);
      nodes.set(node.id, node);
      const t = node.timestamp.getTime();
      if (earliest === null || t < earliest) earliest = t;
      if (latest   === null || t > latest)   latest   = t;
    }

    if (nodes.size === 0) continue;
    nodeCount += nodes.size;

    const rootSeeds = [Array.from(nodes.values())
      .sort((a, b) => a.timestamp - b.timestamp)[0].seedId];

    const event = createCanonicalEvent({
      nodes,
      edges: [],              // no causal edges asserted between filings — none are observed
      rootSeeds,
      identityId:  key,
      entityKey:   entityKeyFor(entries[0]),   // KRYL-1092 — absolute merge gate in the kernel
      lineageRoot: rootSeeds[0],
      timeWindow:  { start: new Date(earliest), end: new Date(latest) },
      getAnchorStrength,
    });

    _events.set(key, event);
  }

  return { events: _events.size, nodes: nodeCount, skipped };
}

// ── Read API ─────────────────────────────────────────────────────────────────
export function getCanonicalEvents() {
  return Array.from(_events.values());
}

export function getCanonicalEventById(identityId) {
  return _events.get(identityId) ?? null;
}

export function getCanonicalEventCount() {
  return _events.size;
}

export function resetCanonicalEvents() {
  _events.clear();
}
