// canonicalrelationshipprojection.js — KRYL-1340: typed-edge registry as a projection of
// canonical ρ, replacing the independent-sibling construction pattern (Adapt §B.5/§C.2).
//
// Each ratified type gets an explicit projection config here -- never an assumed 1:1 field copy.
// The SEC case specifically requires a direction transform: canonical ρ stores
// part=[subject,filer] (ratified direction), but the existing typed-edge/findPath() consumer
// contract (registerOwnershipEdge's historical convention, still relied on by worldgraph.js via
// findPath()'s FORWARD/REVERSE hop tagging) is from=filer,to=subject. This file is the one place
// that translation happens -- canonical ρ's ratified direction is never changed to match it.
//
// Persistence note, stated plainly rather than silently assumed: no ticket in the Stage 1 set
// gives these two producers' canonical ρ instances real cross-run persistence (KRYL-1341's
// persistence is scoped to the KRYL-1334/structuralentitysynthesis.js path specifically, a
// different evidence source). The in-memory store below resets on process restart -- every run
// after a restart re-observes prior real filings as NEW, not PERSISTENT, until a real
// persistence ticket exists for this path. Not hidden; this is the honest current state.

import { admitRelationship, registeredTypeNames, sameRelationship } from './canonicalrelationship.js';
import { registerTypedEdge, RELATION_TYPES, nodeId, NODE_LABELS } from './entitytopologyregistry.js';
// Side-effect import: registers every ratified type before admitAndProject() can possibly be
// called by anyone. Without this, admitAndProject() silently depends on whichever caller
// happens to import ratifiedrelationshiptypes.js first -- a fragile ordering bug (found by
// direct test, not theoretical): a caller that imports only this file, without also importing
// ratifiedrelationshiptypes.js first, would see every real admission rejected as "not ratified."
import './ratifiedrelationshiptypes.js';

// In-memory only -- see persistence note above. Keyed by canonical type, value = array of
// admitted ρ for that type (what admitRelationship's same-ness search is run against).
const _admittedByType = new Map();
// Latest admission evidence per relationship id -- see admitAndProject()'s note. Same lifetime
// (in-memory, per runtime) as _admittedByType.
const _latestEvidenceById = new Map();

function existingFor(type) {
  if (!_admittedByType.has(type)) _admittedByType.set(type, []);
  return _admittedByType.get(type);
}

// KRYL-1398 frozen view. While an analytical snapshot is frozen, the READERS below (findAdmittedRelationshipsFor,
// findAdmittedRelationshipsBetween, latestEvidenceFor) read a copy taken at freeze time, so a late-arriving admission cannot
// change what is displayed. Writes (admitAndProject) always go to the live store. One frozen view at a time; freezeRho()
// replaces the previous one in a single synchronous step.
let _frozenRho = null; // { id, byType: Map(type -> rho[]), evidence: Map(id -> evidence) }
export function freezeRho(id) {
  const byType = new Map();
  for (const [t, arr] of _admittedByType) byType.set(t, [...arr]);
  _frozenRho = { id, byType, evidence: new Map(_latestEvidenceById) };
}
export function unfreezeRho() { _frozenRho = null; }
const admittedFor = (type) => (_frozenRho ? (_frozenRho.byType.get(type) ?? []) : existingFor(type));

// Per-type projection config: how a canonical ρ (once admitted) becomes a registerTypedEdge()
// call. `typedEdgeType` may introduce a new RELATION_TYPES entry (informational-only vocabulary,
// confirmed non-gating) or reuse an existing one when the real-world label already matches.
const PROJECTIONS = {
  HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE: {
    typedEdgeType: RELATION_TYPES.BENEFICIAL_OWNER_OF,
    // Direction transform: ratified part=[subject,filer] -> existing registry convention
    // from=filer,to=subject (registerOwnershipEdge's historical direction, preserved for
    // findPath()'s existing FORWARD/REVERSE consumers).
    toEdgeArgs: (relationship, meta) => ({
      from: meta.filerName, to: meta.subjectName,
      fromCik: meta.filerCik, toCik: meta.subjectCik,
      fromLabel: meta.filerName, toLabel: meta.subjectName,
      source: meta.source ?? 'SEC_13D_13G',
    }),
  },
  ACQUIRED: {
    typedEdgeType: RELATION_TYPES.ACQUIRED,
    // No transform needed: canonical part=[acquirer,target] already matches the existing
    // rsievidencemigration.js convention (from=acquirer,to=target).
    toEdgeArgs: (relationship, meta) => ({
      from: meta.acquirerName, to: meta.targetName,
      fromCik: meta.acquirerCik ?? null, toCik: meta.targetCik ?? null,
      fromLabel: meta.acquirerName, toLabel: meta.targetName,
      source: meta.source,
    }),
  },
  CAPITAL_EVENT_INVOLVES: {
    // KRYL-1401: part = [filer, counterparty], ordered; the typed edge reads filer -> counterparty. Vocabulary entry added in entitytopologyregistry.js.
    typedEdgeType: RELATION_TYPES.CAPITAL_EVENT_INVOLVES,
    toEdgeArgs: (relationship, meta) => ({
      from: meta.filerName, to: meta.counterpartyName,
      fromCik: meta.filerCik ?? null, toCik: meta.counterpartyCik ?? null,
      fromLabel: meta.filerName, toLabel: meta.counterpartyLabel ?? meta.counterpartyName,
      source: meta.source ?? 'SEC_8K_CAPITAL_EVENT',
    }),
  },
  HAS_OFFICER_OR_DIRECTOR_DISCLOSURE: {
    // KRYL-1411: part = [issuer, person], ordered; the typed edge reads person -> issuer.
    typedEdgeType: RELATION_TYPES.OFFICER_OR_DIRECTOR_OF,
    toEdgeArgs: (relationship, meta) => ({
      from: meta.personName, to: meta.issuerName,
      fromCik: meta.personCik ?? null, toCik: meta.issuerCik ?? null,
      fromLabel: meta.personName, toLabel: meta.issuerName,
      source: meta.source ?? 'SEC_FORM_3_4_5',
    }),
  },
  ASSIGNEE_OF_GRANTED_PATENT: {
    typedEdgeType: RELATION_TYPES.PATENT_ASSIGNEE_OF,
    toEdgeArgs: (relationship, meta) => ({
      from: meta.companyName, to: meta.patentLabel, fromCik: meta.companyCik ?? null, toCik: null,
      fromLabel: meta.companyName, toLabel: meta.patentLabel, source: meta.source ?? 'USPTO_PATENTSVIEW_BULK',
    }),
  },
  LEAD_SPONSOR_OF_CLINICAL_TRIAL: {
    typedEdgeType: RELATION_TYPES.LEAD_SPONSOR_OF_TRIAL,
    toEdgeArgs: (relationship, meta) => ({
      from: meta.sponsorName, to: meta.trialLabel, fromCik: meta.sponsorCik ?? null, toCik: null,
      fromLabel: meta.sponsorName, toLabel: meta.trialLabel, source: meta.source ?? 'CLINICALTRIALS_GOV',
    }),
  },
  HAS_FORM_D_OFFICER_OR_DIRECTOR_DISCLOSURE: {
    typedEdgeType: RELATION_TYPES.FORM_D_OFFICER_OR_DIRECTOR_OF,
    toEdgeArgs: (relationship, meta) => ({
      from: meta.personName, to: meta.issuerName, fromCik: null, toCik: meta.issuerCik ?? null,
      fromLabel: meta.personName, toLabel: meta.issuerName, source: meta.source ?? 'SEC_FORM_D',
    }),
  },
  SHARED_PATENT_ASSIGNMENT: {
    // New vocabulary entry -- RELATION_TYPES is confirmed informational/non-gating (its own
    // comment: "does NOT gate registerTypedEdge"), so adding one is additive, same precedent as
    // ACQUIRED's own addition for KRYL-1336.
    typedEdgeType: RELATION_TYPES.SHARED_PATENT_ASSIGNMENT,
    // part is unordered (no real direction evidence, Statistical class) -- sort so the same real
    // org pair always projects the same from/to regardless of which order a given run observed
    // them in. This is a deterministic *projection* choice (for a directed-edge store), not a
    // claim that the underlying relationship has direction -- canonical ρ's part stays unordered.
    toEdgeArgs: (relationship, meta) => {
      const [a, b] = [...relationship.part].sort();
      const nameOf = (id) => (id === meta.orgA ? meta.orgAName : meta.orgBName) ?? id;
      return {
        from: nameOf(a), to: nameOf(b),
        fromCik: null, toCik: null,
        fromLabel: nameOf(a), toLabel: nameOf(b),
        source: meta.source,
      };
    },
  },
};

// ── Durable store hooks (decision record 2026-10-11, step 4) ────────────────────
// admitAndProject is the single write path. After a successful in-memory admission it hands the admission to the registered sink (the client of
// the durable Canonical Relationship Store), which persists it as an immutable version. restoreAdmitted() is the reverse: it loads stored
// relationships into this in-memory store with their STABLE ids, so a later admission of the same relationship is recognised as the same one
// (PERSISTENT) instead of a new one. The in-memory store is a cache of the durable store, never a second source of truth.
let _admissionSink = null;
// Tests only: drop the in-memory store (a new page session) so restoreAdmitted() can be exercised.
export function _clearAdmittedForTests() { _admittedByType.clear(); _latestEvidenceById.clear(); _restored.clear(); }
export const setAdmissionSink = (fn) => { _admissionSink = typeof fn === 'function' ? fn : null; };
const _restored = new Set();

/** @param {{ relationship_id:string, type:string, phi_class:string, part:string[], nu_id:object, versions:object[] }[]} records */
export function restoreAdmitted(records) {
  let n = 0;
  for (const rec of records ?? []) {
    if (!rec?.relationship_id || !rec.versions?.length) continue;
    const last = rec.versions[rec.versions.length - 1];
    const rho = Object.freeze({ id: rec.relationship_id, part: rec.part, type: rec.type, phiClass: rec.phi_class, nuId: Object.freeze({ ...(rec.nu_id ?? {}) }), nuState: Object.freeze({ ...(last.nu_state ?? {}) }) });
    const arr = existingFor(rec.type);
    const idx = arr.findIndex(x => sameRelationship(x, rho));
    if (idx >= 0) { if (arr[idx].id !== rho.id) arr[idx] = rho; }         // the stored id is the stable one
    else arr.push(rho);
    // latest evidence = the most recently observed (largest ts), as admitAndProject keeps it
    const withTs = rec.versions.map(v => ({ ...v.evidence, predicate: v.predicate, nuState: v.nu_state, ts: v.evidence?.ts ?? (v.event_ts ? Date.parse(v.event_ts) : 0) }));
    const latest = withTs.reduce((a, b) => ((b.ts ?? 0) > (a.ts ?? 0) ? b : a), withTs[0]);
    const held = _latestEvidenceById.get(rho.id);
    if (!held || (latest.ts ?? 0) > (held.ts ?? 0)) _latestEvidenceById.set(rho.id, latest);
    for (const [id, label] of Object.entries(last.labels ?? {})) if (label && !NODE_LABELS[id]) NODE_LABELS[id] = label;
    if (!_restored.has(rho.id)) {
      _restored.add(rho.id);
      const projection = PROJECTIONS[rec.type];
      if (projection && last.meta) { try { registerTypedEdge({ ...projection.toEdgeArgs(rho, last.meta), type: projection.typedEdgeType }); } catch { /* a restored edge is a cache, never fatal */ } }
    }
    n++;
  }
  return n;
}

/**
 * admitAndProject — admits a real assertion against its ratified type, and if admitted,
 * projects it into the typed-edge registry (TYPED_EDGES + entityTopologyRegistry, both updated
 * by registerTypedEdge() internally -- confirmed by direct read, no separate adjacency call
 * needed here).
 * @param {object} assertion - canonicalrelationship.js's admitRelationship() input shape
 * @param {object} meta - real per-type metadata needed for the typed-edge projection (see
 *   PROJECTIONS above for the exact fields each type expects)
 * @returns {object} the admitRelationship() result, unchanged -- callers get the same
 *   admitted/predicate/relationship/reason shape whether or not a projection happened
 */
export function admitAndProject(assertion, meta) {
  const existing = existingFor(assertion.type);
  const result = admitRelationship(assertion, existing);
  if (!result.admitted) return result;

  if (result.predicate === 'NEW') existing.push(result.relationship);
  else {
    const idx = existing.findIndex(r => r.id === result.relationship.id);
    if (idx >= 0) existing[idx] = result.relationship;
  }

  // admitRelationship() returns a historyEntry (the evidence provenance) and a predicate for
  // every admission; both were previously discarded here, so nothing downstream could say WHEN a
  // relationship was observed, from WHICH filing, or what structural state that observation was.
  // Kept as the latest entry per relationship id, inside this same module as ρ itself -- not a
  // second store of relationships, just the evidence the spec's historyEntry already defines.
  // "Latest" means the most recently OBSERVED evidence (largest entry ts), not the last one
  // processed -- a source can return filings in any order (EDGAR returns newest first). Equal ts
  // keeps the entry already held, so re-observing the same filing never rewrites its state.
  if (result.historyEntry) {
    const held = _latestEvidenceById.get(result.relationship.id);
    if (!held || (result.historyEntry.ts ?? 0) > (held.ts ?? 0)) {
      _latestEvidenceById.set(result.relationship.id, { ...result.historyEntry, predicate: result.predicate });
    }
  }

  const projection = PROJECTIONS[assertion.type];
  if (!projection) {
    throw new Error(`admitAndProject: no projection config for ratified type "${assertion.type}" -- add one to PROJECTIONS, never guess a mapping`);
  }

  // Project only on NEW or a real state change (RECONFIGURED/DISSOLVED) -- PERSISTENT means
  // the same canonical relationship, more evidence, same typed edge (formalization §11: the
  // projection represents the canonical SET, it doesn't accumulate one entry per evidence
  // event). registerTypedEdge() is append-only (no upsert), so writing on every PERSISTENT
  // would create duplicate edges for one relationship -- confirmed as a real bug, fixed here.
  if (result.predicate === 'NEW' || result.predicate === 'RECONFIGURED' || result.predicate === 'DISSOLVED') {
    registerTypedEdge({ ...projection.toEdgeArgs(result.relationship, meta ?? {}), type: projection.typedEdgeType });
  }

  if (_admissionSink) {
    try {
      const rho = result.relationship;
      const labels = {}; for (const id of rho.part) if (NODE_LABELS[id]) labels[id] = NODE_LABELS[id];
      _admissionSink({ rho, predicate: result.predicate, historyEntry: result.historyEntry, labels, meta: meta ?? null });
    } catch { /* persistence is best effort and never blocks or alters an admission */ }
  }

  return result;
}

// Latest admission evidence for one admitted relationship id: { provenance, nuState, ts,
// predicate } as produced by that relationship's most recent admission, or null when none was
// recorded -- a stated absence, never a default.
export function latestEvidenceFor(relationshipId) {
  return (_frozenRho ? _frozenRho.evidence : _latestEvidenceById).get(relationshipId) ?? null;
}

// Exposed for tests / inspection only -- not a public persistence API.
export function _admittedRelationshipsFor(type) {
  return existingFor(type);
}

// KRYL-1341 — cross-type lookup: is there ANY admitted canonical relationship (of any ratified
// type) whose part includes both idA and idB? Callers (structuralentitysynthesis.js) resolve a
// raw query entity to a real identity first (entityresolution.js's toTopologyNodeId()) -- this
// function never does text/fuzzy matching itself, only exact part membership.
export function findAdmittedRelationshipsBetween(idA, idB) {
  const found = [];
  for (const type of registeredTypeNames()) {
    for (const rho of admittedFor(type)) {
      if (rho.part.includes(idA) && rho.part.includes(idB)) found.push(rho);
    }
  }
  return found;
}

// KRYL-1398: the LIVE store, for writers (formation snapshot capture) that must see an admission made after a freeze.
// Display code never uses these: it reads the frozen view through the functions above.
export function findAdmittedRelationshipsForLive(id) {
  const found = [];
  for (const type of registeredTypeNames()) for (const rho of existingFor(type)) if (rho.part.includes(id)) found.push(rho);
  return found;
}
export const latestEvidenceForLive = (relationshipId) => _latestEvidenceById.get(relationshipId) ?? null;

// Any admitted relationship (any ratified type) touching this one real identity, on either side.
export function findAdmittedRelationshipsFor(id) {
  const found = [];
  for (const type of registeredTypeNames()) {
    for (const rho of admittedFor(type)) {
      if (rho.part.includes(id)) found.push(rho);
    }
  }
  return found;
}
