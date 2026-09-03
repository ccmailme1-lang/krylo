// src/engine/cf/pathwaystore.js — CF canonical pathway substrate (IS-4).
//
// Rewritten against the ratified contracts, NOT patched from cfpathwaystore.js
// (a frozen experiment fixture). Specs:
//   SPEC-cf-pathway-data-model.md   — IS-1 identity, event/pathway objects
//   SPEC-cf-significance-policy.md   — ν_t + support as policy (imported)
//   SPEC-cf-002-is-reconciliation.md §0a — X3/X4/X2/X5 rulings
//
// Identity (IS-1 §3): reference continuity. An event EXTENDs a pathway when its
// provenance links to an event already in that pathway's lineage (fixture: a
// particle's `dependsOn` naming a prior obs id). Otherwise it is keyed by an
// opaque lineageKey (fixture default: lowercased domain — a documented stand-in
// for real provenance). NEVER keyed by domain as an architectural primitive (X3).
//
// Admission (X5 / FC-REQ-05): a pathway feeds formation admission iff it is
// structurally active this batch — corroborated now, or a member of a
// convergence cluster with a this-batch corroboration. Persistence alone never
// feeds admission (semantic firewall). Decay/recency govern RETENTION only.
//
// Lifecycle (X4): ACTIVE → ARCHIVED → TOMBSTONED. No hard delete.

import {
  magnitude, decayedNu, admissibleForFormation, tierOf,
  classifyDeltaS, nuRecord, PARAMS,
} from './significance.js';
import { CANONICAL_DOMAINS } from '../ontology.js';   // §17 single source (KRYL-1065)

const SIX = new Set(CANONICAL_DOMAINS.map(d => d.toUpperCase()));

let _pathways = new Map();   // pathway_id -> Pathway
let _obsIndex = new Map();   // obsId -> pathway_id  (for reference-continuity lookup)
let _clusters = [];          // Array<Set<pathway_id>>  (convergence clusters)
let _batchIndex = -1;
let _eventSeq = 0;
let _params = PARAMS;
let _corroboratedThisBatch = new Set();
let _io = { examined: 0, written: 0 };   // WS4 — MET-01 "state objects examined/written"

/** ioCounters — WS4 telemetry: state objects examined / written since resetFabric. */
export function ioCounters() { return { ..._io }; }

export function resetFabric({ lambda, archiveGap, memoryFloor } = {}) {
  _pathways = new Map();
  _obsIndex = new Map();
  _clusters = [];
  _batchIndex = -1;
  _eventSeq = 0;
  _corroboratedThisBatch = new Set();
  _io = { examined: 0, written: 0 };
  _params = {
    ...PARAMS,
    ...(typeof lambda === 'number'      ? { lambda } : {}),
    ...(typeof archiveGap === 'number'  ? { archiveGap } : {}),
    ...(typeof memoryFloor === 'number' ? { memoryFloor } : {}),
  };
}

const nextEventId = () => `e${++_eventSeq}`;
const lineageKeyOf = p => String(p.lineageKey ?? p.domain ?? '').toLowerCase();

// ── IS-1 identity decision (SPEC-cf-pathway-data-model.md §2) ─────────────
// Pure w.r.t. pathway state — reads lineage structure only, never ν_t / tier /
// support / cluster liveness (X5 §3.6).
export function identityDecision(particle) {
  // 1. reference continuity — explicit provenance link to an existing lineage
  if (particle.dependsOn && _obsIndex.has(particle.dependsOn)) {
    const target = _obsIndex.get(particle.dependsOn);
    const p = _pathways.get(target);
    if (p?.sealed) return { action: 'REVISIT', target, reason: 'sealed lineage — REVISIT' };
    return { action: 'EXTEND', target, reason: 'reference continuity (dependsOn)' };
  }
  // 2. lineage-key continuity (fixture stand-in for a monitoring stream)
  const key = lineageKeyOf(particle);
  for (const p of _pathways.values()) {
    if (p.lineageKey !== key) continue;
    if (p.sealed) return { action: 'REVISIT', target: p.pathway_id, reason: 'sealed lineage — REVISIT' };
    return { action: 'EXTEND', target: p.pathway_id, reason: 'lineage-key continuity' };
  }
  // 3. no eligible lineage
  return { action: 'NEW', reason: 'origin event' };
}

function createPathway(key, domain, subject) {
  const p = {
    pathway_id: `p${_pathways.size + 1}_${key}`,
    lineageKey: key,
    subject: subject ?? null,
    domains: new Set([domain]),          // a pathway MAY span domains (X3)
    lineage: [],
    lastCorroboratedBatch: -Infinity,
    nu: 0,
    nuHistory: [],
    sealed: false,
    terminationEvent: null,
    formedAtBatches: [],                  // batches this pathway was in an admitted formation
  };
  _pathways.set(p.pathway_id, p);
  return p;
}

// ── ingest one observation batch ────────────────────────────────────────
// particle: { domain, confidence|magnitude, polarity, ts, lineageKey?, subject?,
//             obsId?, dependsOn? }
export function ingest(particles = []) {
  _batchIndex += 1;
  _corroboratedThisBatch = new Set();
  const corroboration = new Map();       // pathway_id -> Σ magnitude this batch
  const touchedEventIds = new Map();

  for (const particle of particles) {
    const domain = String(particle.domain ?? '').toUpperCase();
    if (!SIX.has(domain)) continue;
    const decision = identityDecision(particle);

    let p;
    if (decision.action === 'NEW') {
      p = createPathway(lineageKeyOf(particle), domain, particle.subject);
    } else {
      p = _pathways.get(decision.target);
      p.domains.add(domain);
      if (decision.action === 'REVISIT') {
        p.lineage.push({
          event_id: nextEventId(), event_type: 'REVISIT', logical_time: _batchIndex,
          object_refs: [], provenance: { derives_from: [], source: particle.source ?? 'fixture' },
        });
        p.sealed = false;
      }
    }

    const prev = p.lineage[p.lineage.length - 1];
    const obsId = particle.obsId ?? `o${_eventSeq + 1}`;
    const ev = {
      event_id: nextEventId(),
      event_type: 'OBSERVATION_CREATED',
      logical_time: _batchIndex,
      obs_id: obsId,
      domain,
      polarity: particle.polarity ?? 'constructive',
      magnitude: magnitude(particle),
      object_refs: particle.subject ? [particle.subject] : [],
      provenance: {
        derives_from: particle.dependsOn ? [particle.dependsOn]
                    : prev ? [prev.event_id] : [],
        source: particle.source ?? 'fixture',
      },
      _particle: { ...particle, domain },
    };
    p.lineage.push(ev);
    _io.written += 1;
    _obsIndex.set(obsId, p.pathway_id);
    p.lastCorroboratedBatch = _batchIndex;
    _corroboratedThisBatch.add(p.pathway_id);

    corroboration.set(p.pathway_id, (corroboration.get(p.pathway_id) ?? 0) + ev.magnitude);
    if (!touchedEventIds.has(p.pathway_id)) touchedEventIds.set(p.pathway_id, []);
    touchedEventIds.get(p.pathway_id).push(ev.event_id);
  }

  // ν_t update (all pathways) + lifecycle sweep. TOMBSTONE, never delete.
  for (const [pid, p] of _pathways) {
    const prevNu = p.nu;
    p.nu = decayedNu(prevNu, corroboration.get(pid) ?? 0, _params);
    p.nuHistory.push(nuRecord(p.nu, touchedEventIds.get(pid) ?? [], _batchIndex));
    p._lastDeltaS = classifyDeltaS(prevNu, p.nu, _params);
    if (tierOf(p, _batchIndex, _params) === 'TOMBSTONED' && !p.sealed) {
      p.sealed = true;
      p.terminationEvent = {
        event_id: nextEventId(), event_type: 'EXPLORATION_TERMINATED',
        logical_time: _batchIndex,
        reason: p.nu < _params.memoryFloor ? 'MEMORY_FLOOR' : 'UNSUPPORTED',
        object_refs: [], provenance: { derives_from: [], source: 'fabric' },
      };
      p.lineage.push(p.terminationEvent);
    }
  }

  return { batch: _batchIndex, corroborated: [..._corroboratedThisBatch] };
}

// ── cluster helpers ─────────────────────────────────────────────────────
function clusterOf(pid) {
  return _clusters.find(c => c.has(pid));
}
function clusterLiveThisBatch(pid) {
  const c = clusterOf(pid);
  if (!c) return false;
  for (const member of c) if (_corroboratedThisBatch.has(member)) return true;
  return false;
}

// recordConvergence — the runner calls this after inferFormation admits a
// formation, naming the domains that participated. The pathways currently
// carrying those domains are linked into one convergence cluster (CF-005 §8 —
// recognized, identity NOT collapsed).
export function recordConvergence(participatingDomains = []) {
  const want = new Set(participatingDomains.map(d => String(d).toUpperCase()));
  const members = new Set();
  for (const p of _pathways.values()) {
    if ([...p.domains].some(d => want.has(d))) {
      if (admissibleForFormation(_corroboratedThisBatch.has(p.pathway_id),
                                 clusterLiveThisBatch(p.pathway_id))) {
        members.add(p.pathway_id);
        p.formedAtBatches.push(_batchIndex);
      }
    }
  }
  if (members.size < 2) return;
  // merge into existing overlapping clusters
  let merged = new Set(members);
  _clusters = _clusters.filter(c => {
    if ([...c].some(m => merged.has(m))) { for (const m of c) merged.add(m); return false; }
    return true;
  });
  _clusters.push(merged);
  for (const pid of merged) {
    _pathways.get(pid)?.lineage.push({
      event_id: nextEventId(), event_type: 'CONVERGENCE', logical_time: _batchIndex,
      object_refs: [...merged], provenance: { derives_from: [], source: 'fabric' },
    });
  }
}

// ── FC-REQ-05: admission input = structurally-active pathways only ──────────
export function admissibleParticles() {
  const out = [];
  for (const p of _pathways.values()) {
    _io.examined += 1;
    const live = admissibleForFormation(
      _corroboratedThisBatch.has(p.pathway_id),
      clusterLiveThisBatch(p.pathway_id),
    );
    if (!live) continue;
    for (const ev of p.lineage) {
      // compacted observations have no _particle (payload dropped, recoverable
      // from the connector log) — they are historical and never feed admission.
      if (ev.event_type === 'OBSERVATION_CREATED' && ev._particle) out.push(ev._particle);
    }
  }
  return out;
}

// ── reconstruct — FULL lineage across all tiers (CF-002 §23) ───────────────
export function reconstruct(participatingDomains = []) {
  const want = new Set(participatingDomains.map(d => String(d).toUpperCase()));
  const trace = {};
  const covered = new Set();
  for (const p of _pathways.values()) {
    if (want.size && ![...p.domains].some(d => want.has(d))) continue;
    trace[p.pathway_id] = {
      domains: [...p.domains],
      tier: tierOf(p, _batchIndex, _params),
      events: p.lineage.map(e => ({ id: e.event_id, type: e.event_type, t: e.logical_time })),
    };
    for (const d of p.domains) covered.add(d);
  }
  const complete = participatingDomains.every(d => covered.has(String(d).toUpperCase()));
  return { complete, trace };
}

// ── inspection (harness reporting only) ────────────────────────────────────
export function nuByDomain() {
  const m = {};
  for (const p of _pathways.values()) {
    for (const d of p.domains) m[d] = Math.max(m[d] ?? 0, p.nu);
  }
  return m;
}
export function admissionByPathway() {
  const m = {};
  for (const p of _pathways.values()) {
    m[p.pathway_id] = admissibleForFormation(
      _corroboratedThisBatch.has(p.pathway_id), clusterLiveThisBatch(p.pathway_id));
  }
  return m;
}
export function tierByPathway() {
  const m = {};
  for (const p of _pathways.values()) m[p.pathway_id] = tierOf(p, _batchIndex, _params);
  return m;
}
export function pathwayCount() { return _pathways.size; }
export function clusterCount() { return _clusters.length; }

// ══ WS2 — persistence + compaction ═══════════════════════════════════════════
// Storage-agnostic: serialize()/hydrate() move a plain snapshot; the caller
// (localStorage / IndexedDB / a shared server store — decision deferred) owns
// the medium. Append-only + logical_time ordering ⇒ hydrate→replay is
// deterministic (IS-1). CF §34: no CF-only database — this is the existing
// pathstore.js client pattern. KRYL-CF-004 memory boundary: the snapshot is
// lineage + provenance (history), not a reasoning substrate (X5 firewall stands).

export const SNAPSHOT_VERSION = 'cf-pathwaystore/1';
export const COMPACT_AFTER = 8;   // batches idle before an ARCHIVED/TOMBSTONED pathway is
                                  // eligible for payload compaction. Footprint knob, NOT
                                  // Founder-gated (not in FG-CORE).

export function serialize() {
  return {
    version: SNAPSHOT_VERSION,
    batchIndex: _batchIndex,
    eventSeq: _eventSeq,
    params: _params,
    pathways: [..._pathways.values()].map(p => ({ ...p, domains: [...p.domains] })),
    obsIndex: [..._obsIndex.entries()],
    clusters: _clusters.map(c => [...c]),
    // _corroboratedThisBatch is transient — deliberately NOT serialized. On
    // hydrate it starts empty, so a stale reloaded pathway cannot be
    // "corroborated this batch" until it genuinely is (X5 — see WS3).
  };
}

export function hydrate(snapshot) {
  if (!snapshot || snapshot.version !== SNAPSHOT_VERSION) {
    throw new Error(`cf-pathwaystore: cannot hydrate snapshot version ${snapshot?.version}`);
  }
  _pathways = new Map(snapshot.pathways.map(p => [p.pathway_id, { ...p, domains: new Set(p.domains) }]));
  _obsIndex = new Map(snapshot.obsIndex);
  _clusters = snapshot.clusters.map(c => new Set(c));
  _batchIndex = snapshot.batchIndex;
  _eventSeq = snapshot.eventSeq;
  _params = { ...PARAMS, ...snapshot.params };
  _corroboratedThisBatch = new Set();
}

// compact — X4: storage compaction of *reconstructible* history, NEVER pathway
// deletion. Applies only to stale (> COMPACT_AFTER idle) ARCHIVED/TOMBSTONED
// pathways. Preserves: pathway_id, lineageKey, subject, domains, origin event,
// termination event, every CONVERGENCE event, and the full derives_from edge
// list (topology). Drops: OBSERVATION_CREATED `_particle` payloads (recoverable
// from the connector log via provenance.source), interior PROCESSING_* events
// (→ a COMPACTED_SPAN marker), interior nuHistory records (keeps head + tail).
// After compaction reconstruct(domains) still returns complete for those domains.
export function compact({ compactAfter = COMPACT_AFTER } = {}) {
  let compactedCount = 0, eventsDropped = 0;
  for (const p of _pathways.values()) {
    if (p.compacted) continue;
    const idle = _batchIndex - (p.lastCorroboratedBatch ?? -Infinity);
    const tier = tierOf(p, _batchIndex, _params);
    if (idle <= compactAfter || (tier !== 'ARCHIVED' && tier !== 'TOMBSTONED')) continue;

    const kept = [];
    let spanFrom = null, spanTo = null, spanN = 0;
    const flushSpan = () => {
      if (spanN > 0) {
        kept.push({ event_type: 'COMPACTED_SPAN', count: spanN, from_t: spanFrom, to_t: spanTo });
        spanN = 0; spanFrom = spanTo = null;
      }
    };
    for (let i = 0; i < p.lineage.length; i++) {
      const ev = p.lineage[i];
      const isOrigin = i === 0;
      const structural = isOrigin
        || ev.event_type === 'CONVERGENCE'
        || ev.event_type === 'EXPLORATION_TERMINATED'
        || ev.event_type === 'REVISIT'
        || ev.event_type === 'FORMATION_CANDIDATE_CREATED';
      if (structural) {
        flushSpan();
        // strip recoverable payload from observations, keep the structural frame
        if (ev.event_type === 'OBSERVATION_CREATED' || ev._particle) {
          const { _particle, ...frame } = ev;
          kept.push(frame);
        } else {
          kept.push(ev);
        }
      } else if (ev.event_type === 'OBSERVATION_CREATED') {
        // keep the observation frame (topology-bearing: obs_id + derives_from) but drop payload
        flushSpan();
        const { _particle, ...frame } = ev;
        kept.push(frame);
        eventsDropped += _particle ? 0 : 0;   // frame retained; only payload dropped
      } else {
        // interior PROCESSING_* etc. → collapse
        if (spanN === 0) spanFrom = ev.logical_time;
        spanTo = ev.logical_time; spanN += 1; eventsDropped += 1;
      }
    }
    flushSpan();

    p.lineage = kept;
    if (p.nuHistory.length > 2) p.nuHistory = [p.nuHistory[0], p.nuHistory[p.nuHistory.length - 1]];
    p.compacted = { at: _batchIndex, droppedPayload: true, eventsCollapsed: eventsDropped };
    compactedCount += 1;
  }
  return { compacted: compactedCount, eventsDropped };
}
