// WO-1700 — V1 Projector
// Pure function: EnvelopeV1 → UISnapshot
// INVARIANT: no LEV-02, no external state, no network, no time dependency.
// schemaVersion selects this decoder — never reinterpretation logic.

export function replayV1(envelope) {
  const { commitEvent, recommendationPayloadSnapshot, context } = envelope;
  const survivors = recommendationPayloadSnapshot.survivors;

  return Object.freeze({
    __type:           'UISnapshot',
    schemaVersion:    envelope.schemaVersion,
    replayedAt:       new Date().toISOString(),
    requestId:        envelope.eventId,

    happyPath:        survivors[0] ?? null,
    alternatives:     Object.freeze(survivors.slice(1)),
    scoreVector:      recommendationPayloadSnapshot.scoreVector,
    featureVectorHash: recommendationPayloadSnapshot.featureVectorHash,

    commit: Object.freeze({
      candidateId: commitEvent.candidateId,
      score:       commitEvent.score,
      nextBest:    commitEvent.nextBest,
      timestamp:   commitEvent.timestamp,
    }),

    context: Object.freeze({
      query:   context.query,
      lens:    context.lens,
      domain:  context.domain,
      horizon: context.horizon,
      floor:   context.floor,
    }),
  });
}
