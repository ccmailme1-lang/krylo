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
import { fetchCapitalEvent, CAPITAL_EVENT_ITEMS } from './edgar8kcontent.js'; // KRYL-1399 step B
import { materializeSignal, attenuateSecondary } from '../rkmaterializer.js';

// ── Event class → domain(s) map (locked) ─────────────────────────────────────
// Each event class maps to 1-2 domains. Multi-domain events emit one signal per domain.
import { EVENT_DOMAIN_MAP } from '../eventdomains.js';   // moved to its own module; re-exported below

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

const ACQUISITION_EXTRA_DOCS = 4;  // KRYL-1409: further Item 1.01 / 2.01 filings read for acquisitions only (their capital-event content is not surfaced), so frequent credit and indenture filings do not crowd an acquisition out
const CAPITAL_DOC_LIMIT = 8;      // the newest capital-event filings whose text is read per lookup (the brief lists 8)
const CAPITAL_DOC_GAP_MS = 400;    // spacing between document requests (SEC fair access; the engine proxy also spaces)

// ── Session dedup ─────────────────────────────────────────────────────────────
const _dispatched = new Set();

// ── Signal builder ────────────────────────────────────────────────────────────

function buildSignals(eventMeta) {
  // KRYL-1220 — canonicalId was already flowing through edgar8kconnector.js's _eventLog /
  // getProcessedEvents() unchanged; this function simply never read it. domaingravity.js
  // (97ea479) reads event.meta?.canonicalId — attaching it here is the only missing step,
  // no new resolution, no new field, no new connector invocation.
  const { realityObjectId, eventClass, materiality, groundedness, entityName, canonicalId, eventDate, accession, capitalEvent, ts } = eventMeta;

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
      // KRYL-1399 step A: the filing's accession travels with the observation (domaingravity.js keeps it with eventClass).
      meta: { canonicalId: canonicalId ?? null, eventDate: eventDate ?? null, accession: accession ?? null, capitalEvent: capitalEvent ?? null },
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

  // KRYL-1399 step B: for the newest filings that carry a capital-event item, read the Item text and quote the amount, instrument
  // and counterparties it states (edgar8kcontent.js). Sequential and spaced (SEC rate limits); a document that cannot be obtained is
  // recorded as NOT_OBTAINED, never as an empty event. Only the newest CAPITAL_DOC_LIMIT are read: the rest stay date and class only.
  const capitalEvents = new Map();
  const fileDate = (h) => String(h._source?.file_date ?? '');
  const toRead = [...matches].sort((a, b) => fileDate(b).localeCompare(fileDate(a)))
    .filter(h => parseItems(h._source?.items ?? '').some(i => CAPITAL_EVENT_ITEMS.includes(i))).slice(0, CAPITAL_DOC_LIMIT);
  for (const hit of toRead) {
    const src = hit._source ?? {};
    const file = String(hit._id ?? '').split(':')[1] ?? null;
    capitalEvents.set(hit._id, await fetchCapitalEvent({ cik: entityCik, accession: src.adsh, file, items: parseItems(src.items ?? ''), registrant: entityName ?? src.display_names?.[0] ?? '' }));
    await new Promise(r => setTimeout(r, CAPITAL_DOC_GAP_MS));
  }

  // KRYL-1409: acquisition candidates come from the SAME document reads (extractCapitalEvent computes them from the same Item text). Filings beyond the
  // newest CAPITAL_DOC_LIMIT that carry Item 1.01 or 2.01 are read too, for acquisitions only.
  const acqOnly = new Map();
  const extras = [...matches].sort((a, b) => fileDate(b).localeCompare(fileDate(a)))
    .filter(h => !capitalEvents.has(h._id) && parseItems(h._source?.items ?? '').some(i => i === '1.01' || i === '2.01')).slice(0, ACQUISITION_EXTRA_DOCS);
  for (const hit of extras) {
    const src = hit._source ?? {};
    const file = String(hit._id ?? '').split(':')[1] ?? null;
    acqOnly.set(hit._id, await fetchCapitalEvent({ cik: entityCik, accession: src.adsh, file, items: parseItems(src.items ?? ''), registrant: entityName ?? src.display_names?.[0] ?? '' }));
    await new Promise(r => setTimeout(r, CAPITAL_DOC_GAP_MS));
  }

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
      accession: src.adsh ?? (String(accNo).split(':')[0] || null),
      capitalEvent: capitalEvents.get(hit._id) ?? null,
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

  // KRYL-1401: the extracted capital events, for counterparty matching and admission (capitaleventadmission.js)
  const capitalEventList = toRead.map(h => { const src = h._source ?? {}; const items = parseItems(src.items ?? ''); return { accession: src.adsh, filingDate: src.file_date ?? null, form: '8-K', items, eventClass: classifyEventClass(items), capital: capitalEvents.get(h._id) ?? null }; })
    .filter(e => e.capital?.attempted && e.accession);
  const acquisitionEvents = [...toRead, ...extras].map(h => { const src = h._source ?? {}; const items = parseItems(src.items ?? ''); const ev = capitalEvents.get(h._id) ?? acqOnly.get(h._id); return { accession: src.adsh, filingDate: src.file_date ?? null, form: '8-K', items, acquisition: ev?.acquisition ?? { candidates: [], skipped: [] } }; })
    .filter(e => e.accession && (e.acquisition.candidates.length || e.acquisition.skipped.some(x => /^AMBIGUOUS/.test(x.reason))));
  return { dispatched: batch.length, matched: matches.length, total: hits.length, capitalEvents: capitalEventList, acquisitionEvents };
}

export { EVENT_DOMAIN_MAP, FRACTURE_EVENT_CLASSES, buildSignals };
