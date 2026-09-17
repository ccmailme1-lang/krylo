// WO-2051 — Grounded Signal Integration
// WO-2052 — Signal Stabilization (adapter refactor — materialization now in rkmaterializer.js)
// Translates EDGAR 8-K RealityObjects into surfacerouter signal packets.
//
// Boundary rules:
//   NO direct EDGAR fetch — edgar8kconnector owns that.
//   NO createObject — rkmstore is a read-only source here.
//   NO metricsengine — no metric computation.
//   NO direct cone wiring — all routing via surfacerouter.
//   NO materialization arithmetic — rkmaterializer owns that.

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';
import {
  getProcessedEvents, fetchTargeted8KFilings, classifyEventClass, parseItems,
  computeMateriality, computeGroundedness,
} from './edgar8kconnector.js';
import { getById } from '../rkmstore.js';
import { materializeSignal, attenuateSecondary } from '../rkmaterializer.js';

// ── Event class → domain(s) map (locked) ─────────────────────────────────────
// Each event class maps to 1-2 domains. Multi-domain events emit one signal per domain.
const EVENT_DOMAIN_MAP = {
  EXECUTIVE_CHANGE:      ['capital', 'labor'],
  BANKRUPTCY:            ['capital', 'ownership'],
  BANKRUPTCY_TRIGGER:    ['capital', 'ownership'],
  ACQUISITION:           ['capital', 'ownership'],
  DEBT_ISSUANCE:         ['capital'],
  EQUITY_OFFERING:       ['capital', 'ownership'],
  EARNINGS_ANNOUNCEMENT: ['capital'],
  DELISTING_NOTICE:      ['capital', 'ownership'],
  AUDITOR_CHANGE:        ['capital'],
  FINANCIAL_RESTATEMENT: ['capital'],
  MATERIAL_CONTRACT:     ['capital'],
  CHANGE_IN_CONTROL:     ['ownership', 'capital'],
  OPERATIONAL_SHUTDOWN:  ['labor', 'capital'],
  REGULATORY_ACTION:     ['technology', 'capital'],
  CONTRACT_TERMINATION:  ['capital'],
  CHARTER_AMENDMENT:     ['ownership'],
  SHAREHOLDER_VOTE:      ['ownership'],
  ASSET_IMPAIRMENT:      ['capital'],
  SECURITY_MODIFICATION: ['capital', 'ownership'],
  ABS_UPDATE:            ['capital'],
  MINE_SAFETY:           ['labor'],
  UNKNOWN_MATERIAL_EVENT:['capital'],
};

// Fracture events per §20 Direction Honesty Principle — polarity = POLARITY.NEGATIVE.
const FRACTURE_EVENT_CLASSES = new Set([
  'BANKRUPTCY',
  'BANKRUPTCY_TRIGGER',
  'DELISTING_NOTICE',
  'OPERATIONAL_SHUTDOWN',
  'FINANCIAL_RESTATEMENT',
  'AUDITOR_CHANGE',
  'ASSET_IMPAIRMENT',
  'CONTRACT_TERMINATION',
]);

// ── Session dedup ─────────────────────────────────────────────────────────────
const _dispatched = new Set();

// ── Signal builder ────────────────────────────────────────────────────────────

function buildSignals(eventMeta) {
  // KRYL-1220 — canonicalId was already flowing through edgar8kconnector.js's _eventLog /
  // getProcessedEvents() unchanged; this function simply never read it. domaingravity.js
  // (97ea479) reads event.meta?.canonicalId — attaching it here is the only missing step,
  // no new resolution, no new field, no new connector invocation.
  const { realityObjectId, eventClass, materiality, groundedness, entityName, canonicalId, eventDate, ts } = eventMeta;

  const ro          = getById(realityObjectId);
  const stability   = ro?.truthStability ?? 1.0;
  const rawSignal   = materiality ?? 50;
  const rawConf     = (groundedness ?? 0.85) * 100;

  const primary    = materializeSignal({ signal: rawSignal, confidence: rawConf }, stability);
  const isFracture = FRACTURE_EVENT_CLASSES.has(eventClass);
  const domains    = EVENT_DOMAIN_MAP[eventClass] ?? ['capital'];

  return domains.map((domain, i) => {
    const { signal, confidence } = i === 0
      ? primary
      : attenuateSecondary(primary.signal, primary.confidence);

    const packet = {
      id:         `edgar8k-${realityObjectId}-${domain}`,
      source:     'EDGAR_8K',
      domain,
      signal,
      confidence,
      // KRYL-1093 — reconvergence tagging. One source event fans out into several domain
      // signals here. They cross into the domain field independently and recombine downstream,
      // where nothing could previously tell them apart from genuinely independent evidence.
      // originId groups the siblings; fanout > 1 marks a signal as one of a set, not a source
      // in its own right. Consumers computing cross-domain agreement must collapse on originId.
      originId:   realityObjectId,
      fanout:     domains.length,
      fanoutIndex: i,
      fs:         parseFloat((signal / 100).toFixed(3)),
      decay:      DECAY.DAILY,
      ts:         ts ?? Date.now(),  // observation/ingestion time — what domaingravity.js's live window reads
      eventClass,
      entityName,
      realityObjectId,
      // eventDate = the real historical filing/event date, kept as provenance/event time,
      // separate from ts (observation time). Neither field fabricates the other's meaning.
      meta: { canonicalId: canonicalId ?? null, eventDate: eventDate ?? null },
    };
    if (isFracture) packet.polarity = POLARITY.NEGATIVE;
    return packet;
  });
}

// ── Main sync ─────────────────────────────────────────────────────────────────

export function runEdgar8KSignalSync() {
  const events = getProcessedEvents();
  const batch  = [];
  let skipped  = 0;

  for (const eventMeta of events) {
    if (_dispatched.has(eventMeta.realityObjectId)) {
      skipped++;
      continue;
    }
    const signals = buildSignals(eventMeta);
    batch.push(...signals);
    _dispatched.add(eventMeta.realityObjectId);
  }

  if (batch.length > 0) surfaceRouter.dispatchBatch(batch);

  return {
    dispatched: batch.length,
    skipped,
    events:     events.length - skipped,
  };
}

// ── Accessors ─────────────────────────────────────────────────────────────────

export function getDispatchedCount() {
  return _dispatched.size;
}

// KRYL-1220 — targeted, entity-scoped 8-K signal sync. Same real EDGAR full-text search
// edgar8kconnector.js's ambient runEdgar8KSync() already uses, entity-narrowed (same
// best-effort narrowing pattern as secownershipconnector.js) and re-filtered client-side by
// real CIK match. Reuses buildSignals() unchanged (same domain fan-out, same materialize
// step, same locked EVENT_DOMAIN_MAP) — no new dispatch logic, no new domain semantics.
// Withholds (no dispatch) on no match — WITHHOLD beats fabricate, same as every other
// connector in this pipeline.
export async function runTargetedEdgar8KSignalSync({ entityCik, canonicalId, entityName, from, to } = {}) {
  if (!entityCik) return { dispatched: 0, matched: 0, total: 0, error: 'entityCik is required' };

  let hits;
  try {
    hits = await fetchTargeted8KFilings({ entityName, from, to });
  } catch (err) {
    return { dispatched: 0, matched: 0, total: 0, error: err.message };
  }

  const matches = hits.filter(h => {
    const src = h._source ?? {};
    const ciks = (src.ciks ?? []).map(String);
    if (src.entity_id != null) ciks.push(String(src.entity_id));
    if (src.cik != null) ciks.push(String(src.cik));
    return ciks.includes(String(entityCik));
  });

  const batch = [];
  for (const hit of matches) {
    const src        = hit._source ?? {};
    const accNo       = src.accession_no ?? hit._id ?? '';
    const filingDate  = src.file_date ?? src.period_of_report ?? new Date().toISOString().slice(0, 10);
    const items       = parseItems(src.items ?? '');
    const eventClass  = classifyEventClass(items);
    const materiality = computeMateriality(items, eventClass);
    const groundedness = computeGroundedness(true); // CIK-matched — entity confirmed, real filing

    // Real object, not persisted to rkmstore (that store belongs to the ambient/CanonicalEvent
    // path) — buildSignals() only reads truthStability off it via getById(), which safely
    // defaults to 1.0 when not found (same file, line ~66). No fabricated identity: this id is
    // deterministic from the real accession number, not invented.
    //
    // ts = dispatch time, NOT the historical filing date — same documented convention
    // secownershipconnector.js already uses for exactly this reason: domaingravity.js's pool
    // read (getAllSignals()/getDomainSignals()) filters out anything older than its window
    // (DEFAULT_WINDOW_MS, 5 min) at READ time, not just at push time. A real filing date (here,
    // routinely weeks old) would push successfully but never survive that filter — confirmed
    // directly: op="append" at every routing stage, zero drop until the read-time cutoff. The
    // real filingDate stays on the source hit/provenance chain; it is not fabricated by using
    // Date.now() here, it is which timestamp answers "when was this observed by KRYLO." The
    // real filing date is preserved separately as eventDate (meta), not discarded.
    const signals = buildSignals({
      realityObjectId: `edgar8k-targeted-${accNo}`,
      eventDate: filingDate,
      eventClass,
      materiality,
      groundedness,
      entityName: src.entity_name ?? src.display_names?.[0] ?? entityName ?? null,
      canonicalId,
      ts: Date.now(),
    });
    batch.push(...signals);
  }

  if (batch.length > 0) surfaceRouter.dispatchBatch(batch);

  return { dispatched: batch.length, matched: matches.length, total: hits.length };
}

export { EVENT_DOMAIN_MAP, FRACTURE_EVENT_CLASSES };
