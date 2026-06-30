// WO-2050 — Reality Knowledge Model (RKM) Core
// Append-only store of RealityObjects — versioned, epistemically-typed knowledge primitives.
//
// Layer position:
//   identitykernel.js (CanonicalEvent identity) → rkmstore.js (knowledge claim layer) → WO-2051 (signal integration)
//
// Boundary rules:
//   NO surfacerouter, NO dispatchBatch, NO UI, NO EDGAR logic, NO deletion.
//   identitykernel.js is read-only input (identityId anchor only).
//   evidencetiers.js is read-only input (EPISTEMIC_CLASS weights).

import { EPISTEMIC_CLASS } from './evidencetiers.js';

// ── Epistemic weights for truthStability ───────────────────────────────────────
// Different from identitykernel TIER_STABILITY_WEIGHT — those govern graph topology.
// These govern groundedness: how real is this claim?
const EPISTEMIC_WEIGHT = {
  [EPISTEMIC_CLASS.STRUCTURAL]:  1.0,
  [EPISTEMIC_CLASS.OPERATIONAL]: 0.8,
  [EPISTEMIC_CLASS.FINANCIAL]:   0.7,
  [EPISTEMIC_CLASS.NARRATIVE]:   0.3,
};

const CONTRADICTION_PENALTY = 0.25;  // per unresolved contradiction

// ── Constants ─────────────────────────────────────────────────────────────────

export const OBJECT_TYPE = {
  EVENT:        'EVENT',
  COMMITMENT:   'COMMITMENT',
  RELATIONSHIP: 'RELATIONSHIP',
  ENTITY_STATE: 'ENTITY_STATE',
  CONSTRAINT:   'CONSTRAINT',
};

export const EPISTEMIC_STATE = {
  KNOWN:      'KNOWN',
  OBSERVED:   'OBSERVED',
  VERIFIED:   'VERIFIED',
  GROUNDED:   'GROUNDED',
  DISPUTED:   'DISPUTED',
  SUPERSEDED: 'SUPERSEDED',
  RETRACTED:  'RETRACTED',
  UNKNOWN:    'UNKNOWN',
};

// ── Append-only store ─────────────────────────────────────────────────────────
// Map<id, RealityObject> — never delete, never mutate in place.
const _store = new Map();

// ── truthStability computation ─────────────────────────────────────────────────
// Measures groundedness: how much of this claim is anchored in real evidence?
// Weak evidence OR contradictions crater the score — both must be addressed.
function computeTruthStability(evidence, epistemicWeights, contradictionCount) {
  if (!evidence || evidence.length === 0) return 0;

  const weights = epistemicWeights ?? [];
  const count   = evidence.length;

  const avgWeight = weights.length > 0
    ? weights.reduce((s, w) => s + w, 0) / weights.length
    : EPISTEMIC_WEIGHT[EPISTEMIC_CLASS.NARRATIVE];   // default: weakest class

  // Clamp evidence factor to [0,1] BEFORE applying contradiction so penalty is always visible.
  // count × avgWeight can exceed 1 with multiple strong evidence items — without this clamp,
  // contradictions are invisible once the numerator exceeds the denominator.
  const evidenceFactor      = Math.min(1, count * avgWeight);
  const contradictionFactor = 1 / (1 + (contradictionCount ?? 0) * CONTRADICTION_PENALTY);

  return parseFloat(Math.min(1, Math.max(0, evidenceFactor * contradictionFactor)).toFixed(3));
}

function now() {
  return new Date().toISOString();
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createObject({
  identityId    = null,
  objectType,
  title,
  summary       = '',
  observedAt    = now(),
  validFrom     = null,
  validUntil    = null,
  state         = 'UNKNOWN',
  epistemicState = EPISTEMIC_STATE.OBSERVED,
  evidence      = [],
  epistemicWeights = [],
  genealogy     = {},
  metadata      = {},
  sourceId      = null,
}) {
  const id         = `robj_${crypto.randomUUID()}`;
  const ts         = now();
  const stability  = computeTruthStability(evidence, epistemicWeights, 0);

  const obj = {
    id,
    identityId,
    objectType,
    title,
    summary,
    observedAt,
    validFrom,
    validUntil,
    state,
    epistemicState,
    epistemicHistory: [{ state: epistemicState, at: ts, sourceId, reason: 'CREATED' }],
    truthStability:   stability,
    evidence:         [...evidence],
    epistemicWeights: [...epistemicWeights],  // parallel array to evidence[]
    contradictions:   [],
    genealogy: {
      causedBy:    genealogy.causedBy    ?? [],
      causes:      genealogy.causes      ?? [],
      dependsOn:   genealogy.dependsOn   ?? [],
      enables:     genealogy.enables     ?? [],
      derivedFrom: genealogy.derivedFrom ?? [],
    },
    metadata,
    ingestedAt:    ts,
    lastUpdatedAt: ts,
  };

  _store.set(id, obj);
  return obj;
}

// ── Retrieve ──────────────────────────────────────────────────────────────────

export function getById(id) {
  return _store.get(id) ?? null;
}

export function listByIdentity(identityId) {
  const results = [];
  for (const obj of _store.values()) {
    if (obj.identityId === identityId) results.push(obj);
  }
  return results;
}

export function listAll() {
  return Array.from(_store.values());
}

// ── Supersede ─────────────────────────────────────────────────────────────────
// Marks old object SUPERSEDED (validUntil = now), creates successor inheriting identityId.

export function supersedeObject(oldId, replacement, sourceId = null) {
  const old = _store.get(oldId);
  if (!old) throw new Error(`rkmstore.supersedeObject: id not found — ${oldId}`);

  const ts = now();

  // Seal the old object — immutable write to store (new value, same key)
  const sealed = {
    ...old,
    validUntil:    ts,
    epistemicState: EPISTEMIC_STATE.SUPERSEDED,
    epistemicHistory: [
      ...old.epistemicHistory,
      { state: EPISTEMIC_STATE.SUPERSEDED, at: ts, sourceId, reason: 'SUPERSEDED' },
    ],
    lastUpdatedAt: ts,
  };
  _store.set(oldId, sealed);

  // Successor inherits identityId + genealogy
  return createObject({
    ...replacement,
    identityId: replacement.identityId ?? old.identityId,
    genealogy: {
      ...replacement.genealogy,
      derivedFrom: [...(replacement.genealogy?.derivedFrom ?? []), oldId],
    },
    sourceId,
  });
}

// ── Merge ─────────────────────────────────────────────────────────────────────
// Both sources → SUPERSEDED. New merged object created with unioned evidence.

export function mergeObjects(idA, idB, overrides = {}, sourceId = null) {
  const a = _store.get(idA);
  const b = _store.get(idB);
  if (!a) throw new Error(`rkmstore.mergeObjects: idA not found — ${idA}`);
  if (!b) throw new Error(`rkmstore.mergeObjects: idB not found — ${idB}`);

  const ts = now();

  // Supersede both sources
  const sealedA = {
    ...a,
    validUntil:    ts,
    epistemicState: EPISTEMIC_STATE.SUPERSEDED,
    epistemicHistory: [...a.epistemicHistory, { state: EPISTEMIC_STATE.SUPERSEDED, at: ts, sourceId, reason: 'MERGED' }],
    lastUpdatedAt: ts,
  };
  const sealedB = {
    ...b,
    validUntil:    ts,
    epistemicState: EPISTEMIC_STATE.SUPERSEDED,
    epistemicHistory: [...b.epistemicHistory, { state: EPISTEMIC_STATE.SUPERSEDED, at: ts, sourceId, reason: 'MERGED' }],
    lastUpdatedAt: ts,
  };
  _store.set(idA, sealedA);
  _store.set(idB, sealedB);

  // Union evidence arrays (preserve parallel epistemicWeights)
  const evidenceMap = new Map();
  a.evidence.forEach((e, i) => evidenceMap.set(e, a.epistemicWeights[i] ?? EPISTEMIC_WEIGHT[EPISTEMIC_CLASS.NARRATIVE]));
  b.evidence.forEach((e, i) => {
    if (!evidenceMap.has(e)) evidenceMap.set(e, b.epistemicWeights[i] ?? EPISTEMIC_WEIGHT[EPISTEMIC_CLASS.NARRATIVE]);
  });

  const mergedEvidence        = Array.from(evidenceMap.keys());
  const mergedEpistemicWeights = Array.from(evidenceMap.values());

  return createObject({
    identityId:       overrides.identityId ?? a.identityId,
    objectType:       overrides.objectType ?? a.objectType,
    title:            overrides.title      ?? a.title,
    summary:          overrides.summary    ?? `${a.summary} [merged]`,
    observedAt:       overrides.observedAt ?? (a.observedAt <= b.observedAt ? a.observedAt : b.observedAt),
    validFrom:        overrides.validFrom  ?? a.validFrom,
    validUntil:       overrides.validUntil ?? null,
    state:            overrides.state      ?? a.state,
    epistemicState:   overrides.epistemicState ?? a.epistemicState,
    evidence:         mergedEvidence,
    epistemicWeights: mergedEpistemicWeights,
    genealogy: {
      causedBy:    [...new Set([...a.genealogy.causedBy,    ...(b.genealogy.causedBy    ?? [])])],
      causes:      [...new Set([...a.genealogy.causes,      ...(b.genealogy.causes      ?? [])])],
      dependsOn:   [...new Set([...a.genealogy.dependsOn,   ...(b.genealogy.dependsOn   ?? [])])],
      enables:     [...new Set([...a.genealogy.enables,     ...(b.genealogy.enables     ?? [])])],
      derivedFrom: [idA, idB, ...new Set([...(overrides.genealogy?.derivedFrom ?? [])])],
    },
    metadata: { ...a.metadata, ...b.metadata, ...(overrides.metadata ?? {}) },
    sourceId,
  });
}

// ── Contradiction ─────────────────────────────────────────────────────────────
// Both objects become DISPUTED; truthStability recomputed with penalty.

export function flagContradiction(idA, idB, sourceId = null, reason = 'CONFLICT') {
  const a = _store.get(idA);
  const b = _store.get(idB);
  if (!a) throw new Error(`rkmstore.flagContradiction: idA not found — ${idA}`);
  if (!b) throw new Error(`rkmstore.flagContradiction: idB not found — ${idB}`);

  const ts = now();

  const updateDisputed = (obj, otherId) => {
    const contradictions = [...new Set([...obj.contradictions, otherId])];
    const stability      = computeTruthStability(obj.evidence, obj.epistemicWeights, contradictions.length);
    return {
      ...obj,
      epistemicState: EPISTEMIC_STATE.DISPUTED,
      epistemicHistory: [...obj.epistemicHistory, { state: EPISTEMIC_STATE.DISPUTED, at: ts, sourceId, reason }],
      contradictions,
      truthStability: stability,
      lastUpdatedAt:  ts,
    };
  };

  _store.set(idA, updateDisputed(a, idB));
  _store.set(idB, updateDisputed(b, idA));

  return { idA, idB, reason };
}

// ── Retract ───────────────────────────────────────────────────────────────────
// Explicit retraction — object remains in store, state = RETRACTED.

export function retractObject(id, sourceId = null, reason = 'RETRACTED') {
  const obj = _store.get(id);
  if (!obj) throw new Error(`rkmstore.retractObject: id not found — ${id}`);

  const ts = now();
  const retracted = {
    ...obj,
    epistemicState: EPISTEMIC_STATE.RETRACTED,
    epistemicHistory: [...obj.epistemicHistory, { state: EPISTEMIC_STATE.RETRACTED, at: ts, sourceId, reason }],
    validUntil:    ts,
    lastUpdatedAt: ts,
  };
  _store.set(id, retracted);
  return retracted;
}

// ── Epistemic weight helper ───────────────────────────────────────────────────
// Converts EPISTEMIC_CLASS string to weight. Used by connectors to populate epistemicWeights[].

export function weightForClass(epistemicClass) {
  return EPISTEMIC_WEIGHT[epistemicClass] ?? EPISTEMIC_WEIGHT[EPISTEMIC_CLASS.NARRATIVE];
}
