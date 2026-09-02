// src/engine/cf/producer.js — CF parallel asynchronous producer (WS5).
//
// The integration boundary between the canonical CF substrate and live KRYLO,
// built to the WS5 constraints:
//   - PARALLEL, ASYNCHRONOUS — never on the guest path, never a prerequisite for
//     signal normalisation / publication / rendering (CF-004-INV-006).
//   - READ-ONLY POOL TAP — subscribes to subsignalbuffer.js (a passive tap that
//     "must never gain filtering, weighting, scoring" — its own doctrine). The
//     subscribe callback ONLY enqueues; all analytical work runs on tick().
//   - PERSISTENT PATHWAY CONSTRUCTION — feeds pathwaystore.js (IS-1/IS-4).
//   - INDEPENDENT FormationCandidate — its own object, never overwrites the
//     synchronous inferFormation(field.particles) result at the 3 existing call
//     sites (targetpacket.jsx / analysisfield.jsx / formationprospectusproducer.js).
//   - ZERO REPLACEMENT — this module is not imported by any of those call sites.
//
// CF-I7: reuses the synchronous admission machinery verbatim (inferFormation,
// admitCrossDomainRelationship via recordConvergence).

import { subscribe as tapSubsignal } from '../subsignalbuffer.js';
import { inferFormation } from '../formationinference.js';
import {
  resetFabric, ingest, admissibleParticles, recordConvergence, reconstruct,
  serialize, hydrate, compact, ioCounters, pathwayCount,
} from './pathwaystore.js';
import { recordAnalytical, recordIO } from './telemetry.js';

let _unsub = null;
let _interval = null;
let _pending = [];                 // records enqueued by the tap, drained on tick()
let _latestCandidate = null;       // the pre-computed CF read — getCFFormation() returns this
let _lastTick = 0;

// convert a §16 subsignal tuple → a CF ingest particle.
// Reference continuity (IS-1 §3 / WS1):
//   - Tier A: records sharing a canonicalEventId are the SAME source event
//     (fanout siblings) → same lineageKey, chained via dependsOn.
//   - default: `${source}:${domain}` — one monitoring stream per connector+domain
//     (a connector re-polling the same domain is one lineage; decoy-safe, matches
//     the fixture pattern). NEVER keyed on entity/subject alone (X3 §3.5).
function toParticle(rec) {
  const conf = typeof rec.confidence === 'number'
    ? (rec.confidence > 1 ? rec.confidence / 100 : rec.confidence)   // DEFECT-WO1-CONF tolerance
    : 0.5;
  const val = typeof rec.signal === 'number' ? rec.signal / 100 : conf;
  const lineageKey = rec.canonicalEventId
    ? `evt:${rec.canonicalEventId}`
    : `${rec.source ?? 'UNKNOWN'}:${rec.domain}`;
  return {
    domain: rec.domain,
    magnitude: Math.max(0, Math.min(1, val)),
    polarity: rec.polarity === 'NEGATIVE' || rec.polarity === 'fracture' ? 'fracture' : 'constructive',
    ts: rec.ts,
    lineageKey,
    obsId: `${lineageKey}#${rec.ts}`,
    subject: rec.canonicalEventId ?? null,
    source: rec.source ?? null,
  };
}

/**
 * startCFProducer — begin the parallel CF read. Subscribes to the pool tap and
 * (optionally) schedules ticks. The subscribe callback does NO analytical work.
 * @param {{ tickMs?: number|null, fresh?: boolean }} opts
 *   tickMs null → manual tick() only (tests / server-scheduled).
 */
export function startCFProducer({ tickMs = null, fresh = true, snapshot = null } = {}) {
  stopCFProducer();
  if (fresh) resetFabric();
  if (snapshot) hydrate(snapshot);
  _pending = [];
  _latestCandidate = null;
  _unsub = tapSubsignal(rec => { _pending.push(rec); });   // enqueue only — INV-006
  if (tickMs != null) _interval = setInterval(tick, tickMs);
  return { tick, stop: stopCFProducer };
}

export function stopCFProducer() {
  if (_unsub) { _unsub(); _unsub = null; }
  if (_interval) { clearInterval(_interval); _interval = null; }
}

/**
 * tick — drain the queue into the pathway store and recompute the CF
 * FormationCandidate. All work here is telemetered analytical work; it is never
 * called from a render path.
 */
export function tick() {
  const batch = _pending.splice(0, _pending.length);
  return recordAnalytical('cf.tick', () => {
    if (batch.length) ingest(batch.map(toParticle));
    const particles = admissibleParticles();
    const f = inferFormation(particles);
    if (f) recordConvergence(f.participatingDomains);
    const participating = f ? [...new Set(f.participatingDomains)].sort() : [];
    _latestCandidate = f ? {
      kind: 'CF_FORMATION_CANDIDATE',                       // distinct from a synchronous formation
      participatingDomains: participating,
      reconstructable: reconstruct(participating).complete,
      pathways: pathwayCount(),
      computedAt: Date.now(),
      label: 'COGNITIVE FABRIC READ',                       // for the distinct render slot
    } : null;
    recordIO(ioCounters());
    _lastTick = Date.now();
    return _latestCandidate;
  }, { enqueuedAt: batch[0]?._enqueuedAt });
}

/**
 * getCFFormation — the pre-computed CF read for the distinct render slot. O(1),
 * no analytical work, safe to call from a render path (INV-006 c).
 */
export function getCFFormation() { return _latestCandidate; }

/** producerState — inspection only. */
export function producerState() {
  return { subscribed: !!_unsub, scheduled: !!_interval, pending: _pending.length, lastTick: _lastTick };
}

/** snapshotProducer / compactProducer — persistence hooks (WS2). */
export function snapshotProducer() { return serialize(); }
export function compactProducer(opts) { return compact(opts); }
