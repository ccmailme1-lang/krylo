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
// The pool already emits { domain, confidence, polarity, ts } — pass-through, no reshape needed beyond a copy.
function toParticle(s) {
  return { domain: s.domain, confidence: s.confidence, polarity: s.polarity, ts: s.ts };
}

/**
 * buildPerceptionField — the perceived signal field feeding the inference core.
 * @param {{ windowMs?: number, now?: number, source?: (windowMs?:number)=>Array }} opts
 *   source — injectable signal provider (defaults to the live pool). Must return uncollapsed particles.
 * @returns frozen perception field { particles, observedAt, windowMs, source, count }
 */
export function buildPerceptionField(opts = {}) {
  const provider = opts.source ?? getAllSignals;
  const signals  = provider(opts.windowMs) ?? [];
  const particles = signals.map(toParticle);          // uncollapsed pass-through (§21)
  return Object.freeze({
    particles: Object.freeze(particles),
    count: particles.length,
    observedAt: opts.now ?? Date.now(),
    windowMs: opts.windowMs ?? null,
    source: 'signal-pool',
  });
}
