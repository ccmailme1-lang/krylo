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
import { getProcessedEvents } from './edgar8kconnector.js';
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
  const { realityObjectId, eventClass, materiality, groundedness, entityName, ts } = eventMeta;

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
      ts:         ts ?? Date.now(),
      eventClass,
      entityName,
      realityObjectId,
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

export { EVENT_DOMAIN_MAP, FRACTURE_EVENT_CLASSES };
