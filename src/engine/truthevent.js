// src/engine/truthevent.js
// WO-2049 — Truth Event Ledger: event schema + factory (technical core, option-agnostic).
// Spec: specs/SPEC-wo2049-tel-technical-specification-draft.md §4.
// Additive only. NOT wired into any live surface. NOT the ledger itself — no storage, no
// persistence, no write/read implementation. This is the frozen shape of one event, mirroring
// relationontology.js's schema+factory pattern (frozen contract, validated construction).
//
// Deliberately does not decide ledger topology (DQ-1, KRYL-1134, still open). This schema is
// valid whether events end up in one universal store, per-domain stores, or a hybrid — that
// decision changes WHERE these events live, not WHAT one event is.

export const EventType = Object.freeze({
  RELATIONSHIP_PROPOSED:    'RELATIONSHIP_PROPOSED',
  RELATIONSHIP_ADMITTED:    'RELATIONSHIP_ADMITTED',
  RELATIONSHIP_REJECTED:    'RELATIONSHIP_REJECTED',
  RELATIONSHIP_CHALLENGED:  'RELATIONSHIP_CHALLENGED',
  RELATIONSHIP_SUPERSEDED:  'RELATIONSHIP_SUPERSEDED',
});
const EVENT_TYPES = Object.freeze(new Set(Object.values(EventType)));
export const isEventType = t => EVENT_TYPES.has(t);

// Mirrors KRYL-1133's admissionState machine (specs/SPEC-rkm-genealogy-admission-policy.md §1) —
// not a new vocabulary, a storage-layer restatement of the same five states.
export const Vocabulary = Object.freeze({
  RKM_GENEALOGY:     'RKM_GENEALOGY',
  SRE_RELATIONCORE:  'SRE_RELATIONCORE',
});
const VOCABULARIES = Object.freeze(new Set(Object.values(Vocabulary)));
export const isVocabulary = v => VOCABULARIES.has(v);

// The two vocabularies' own closed enums — used to validate `relationType` against whichever
// `vocabulary` the event declares. Never a free string. RKM_GENEALOGY_TYPES mirrors KRYL-1133 §1;
// SRE_RELATIONCORE_TYPES mirrors relationontology.js's RelationType (imported, not duplicated).
export const RKM_GENEALOGY_TYPES = Object.freeze(
  new Set(['causedBy', 'causes', 'dependsOn', 'enables', 'derivedFrom'])
);

const OUTCOME = Object.freeze(new Set(['PASS', 'FAIL', 'ESCALATE']));

function isNonEmptyString(x) { return typeof x === 'string' && x.length > 0; }
function isSemVer(x) { return typeof x === 'string' && /^\d+\.\d+\.\d+$/.test(x); }

/**
 * makeTruthEvent — validates and freezes one TruthEvent. Never guesses a value; every field is
 * required unless explicitly optional below. No update/delete/upsert exists anywhere in this
 * module by design — append-only is enforced by this file simply never exposing a mutation path.
 *
 * @param {object} sreRelationTypes - the live SRE RelationType enum's value set, passed in by the
 *   caller (from relationontology.js's RelationType) rather than imported directly, so this schema
 *   module has zero import-time coupling to SRE and can be unit-tested in isolation.
 */
export function makeTruthEvent({
  eventId, eventType, vocabulary, relationType, relationshipId,
  subjectId, objectId, decision = null, rationale = [], decidedBy,
  rulesetVersion, evidenceRefs = [], supersedes = null,
  producedAt, recordedAt,
}, sreRelationTypes = new Set()) {
  if (!isNonEmptyString(eventId))          throw new Error('TruthEvent: eventId required');
  if (!isEventType(eventType))             throw new Error(`TruthEvent: bad eventType ${eventType}`);
  if (!isVocabulary(vocabulary))           throw new Error(`TruthEvent: bad vocabulary ${vocabulary}`);

  const validTypes = vocabulary === Vocabulary.RKM_GENEALOGY ? RKM_GENEALOGY_TYPES : sreRelationTypes;
  if (!validTypes.has(relationType))
    throw new Error(`TruthEvent: relationType "${relationType}" not valid for vocabulary ${vocabulary}`);

  if (!isNonEmptyString(relationshipId))   throw new Error('TruthEvent: relationshipId required');
  if (!isNonEmptyString(subjectId))        throw new Error('TruthEvent: subjectId required');
  if (!isNonEmptyString(objectId))         throw new Error('TruthEvent: objectId required');
  if (!isNonEmptyString(decidedBy))        throw new Error('TruthEvent: decidedBy required (no self-validation — KRYL-1133 I1)');
  if (!isSemVer(rulesetVersion))           throw new Error('TruthEvent: rulesetVersion must be sem-ver');
  if (!Array.isArray(rationale))           throw new Error('TruthEvent: rationale must be an array');
  for (const r of rationale) {
    if (!r || !isNonEmptyString(r.ruleId) || !OUTCOME.has(r.outcome))
      throw new Error('TruthEvent: each rationale entry needs { ruleId, outcome: PASS|FAIL|ESCALATE, message? }');
  }
  if (!Array.isArray(evidenceRefs))        throw new Error('TruthEvent: evidenceRefs must be an array');
  if (supersedes !== null && !isNonEmptyString(supersedes))
    throw new Error('TruthEvent: supersedes must be a string id or null');
  if (typeof producedAt !== 'number')      throw new Error('TruthEvent: producedAt (number, ms epoch) required');
  if (typeof recordedAt !== 'number')      throw new Error('TruthEvent: recordedAt (number, ms epoch) required');

  return Object.freeze({
    eventId, eventType, vocabulary, relationType, relationshipId,
    subjectId, objectId, decision,
    rationale: Object.freeze(rationale.map(r => Object.freeze({ ...r }))),
    decidedBy, rulesetVersion,
    evidenceRefs: Object.freeze([...evidenceRefs]),
    supersedes, producedAt, recordedAt,
  });
}

// Idempotency key (spec §4.2) — deliberately NOT session_id (the key the existing, incompatible
// src/egress/supabase-client.js `event_envelope` table uses). A session is not a relationship;
// keying on it would let two different relationships' events silently collide.
export function idempotencyKey(event) {
  return `${event.relationshipId}|${event.eventType}|${event.rulesetVersion}`;
}
