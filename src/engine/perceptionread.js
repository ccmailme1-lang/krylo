// src/engine/perceptionread.js
// KRYL-1117 — Perception Producer (UPSTREAM of the inference core).
// Dependency chain:  Signal Pool → [Perception Producer] → Formation Inference Core → Prospectus Assembly.
//
// Responsibility (single): surface the UNCOLLAPSED perceived signal field from the pool and hand it to the
// inference core as its particle input. §21 route-don't-aggregate — particles pass through individually;
// NOTHING is averaged, voted, or collapsed here. This is the producer/consumer boundary: whatever this
// emits is exactly what inferFormation() consumes.
//
// PURE + injectable: `source` defaults to domaingravity.getAllSignals (the live pool accessor shipped in
// §13a), but a fixture source can be injected for contract tests — the output shape is identical either way.
//
// NOT in scope here (would need its own spec): perceived-vs-observed field divergence / perception-dimension
// modelling. This producer surfaces the perceived field; it does not yet score divergence. No invention.

import { getAllSignals } from './domaingravity.js';

// The particle contract the inference core consumes (formationinference.normalize):
//   { domain, confidence(0..100) | magnitude(0..1), polarity('constructive'|'fracture'), ts }
// normalize() reads only named fields and ignores unknown ones (verified, formationinference.js:62-77),
// so an additive canonicalId here is safe and requires no change to inferFormation() or its contract.
// The pool already emits { domain, confidence, polarity, ts, canonicalId } — pass-through, no reshape
// needed beyond a copy.
function toParticle(s) {
  return { domain: s.domain, confidence: s.confidence, polarity: s.polarity, ts: s.ts, canonicalId: s.canonicalId ?? null };
}

// KRYL-1220 — fail-closed subject match: a particle with no canonicalId (the connector never
// attributed it) NEVER matches a subject-scoped call. No fuzzy fallback, same discipline as
// subjectbinding.js's facetBelongsToSubject (identifier containment only, no name matching).
function belongsToSubject(particle, subject) {
  return typeof particle.canonicalId === 'string' && particle.canonicalId === subject;
}

/**
 * buildPerceptionField — the perceived signal field feeding the inference core.
 * @param {{ windowMs?: number, now?: number, source?: (windowMs?:number)=>Array, subject?: string }} opts
 *   source — injectable signal provider (defaults to the live pool). Must return uncollapsed particles.
 *   subject — KRYL-1220, optional. A resolved entity canonicalId (subjectScope()'s output). When
 *     omitted, behavior is byte-identical to before this field existed — every existing caller
 *     that doesn't pass it keeps seeing the full ambient field. When supplied, particles are
 *     filtered to only those carrying that exact canonicalId — never invented, never widened.
 * @returns frozen perception field { particles, observedAt, windowMs, source, count }
 */
export function buildPerceptionField(opts = {}) {
  const provider = opts.source ?? getAllSignals;
  const signals  = provider(opts.windowMs) ?? [];
  let particles = signals.map(toParticle);             // uncollapsed pass-through (§21)
  if (opts.subject) {
    particles = particles.filter(p => belongsToSubject(p, opts.subject));
  }
  return Object.freeze({
    particles: Object.freeze(particles),
    count: particles.length,
    observedAt: opts.now ?? Date.now(),
    windowMs: opts.windowMs ?? null,
    source: 'signal-pool',
  });
}
