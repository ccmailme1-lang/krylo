// lenssurface.js — Lens Surface Contract (LSC-001, Founder directive 2026-07-18).
// The Oracle is the workstation; a Lens is how it visualizes the evidence. LSC-001 makes that a
// hard invariant: every analytical lens preserves an IDENTICAL workspace — only the Primary
// Rendering Surface (region C) and the Context Panel CONTENTS (region D) may vary. Header, Nav,
// Timeline, Status, and interaction patterns are invariant across all lenses.
//
// This module is the CONTRACT AS DATA (not a renderer): the invariant region spec + the lens
// registry (one question, one metaphor, one operational subtitle per lens). The PrimarySurface
// router reads `producer` to decide render-vs-withhold — a lens with no producer WITHHOLDS
// (Grounded-or-Withhold at the instrument surface), it never fakes its metaphor.

// LSC-001 — the invariant workspace regions. A lens may only own PRIMARY and CONTEXT.
export const LSC_REGIONS = Object.freeze({
  HEADER:   { id: 'A', invariant: true,  owns: false },
  NAV:      { id: 'B', invariant: true,  owns: false },
  PRIMARY:  { id: 'C', invariant: false, owns: true  }, // the ONLY surface a lens replaces
  CONTEXT:  { id: 'D', invariant: true,  owns: 'contents' }, // fixed layout, lens-varied contents
  TIMELINE: { id: 'E', invariant: true,  owns: false },
  STATUS:   { id: 'F', invariant: true,  owns: false },
});

// Producer status governs Grounded-or-Withhold at region C.
//   'GROUNDED'  — a real producer backs this lens; render its surface.
//   'WITHHELD'  — no producer yet (tracked); region C shows AWAITING, never a fabricated metaphor.
export const PRODUCER = Object.freeze({ GROUNDED: 'GROUNDED', WITHHELD: 'WITHHELD' });

// The lens registry — the Founder treatment (2026-07-18). One question, one dominant metaphor, one
// operational subtitle each. `surface` names the Primary renderer; `producer` gates render vs withhold.
export const LENS_REGISTRY = Object.freeze([
  {
    id: 'SIGNAL', glyph: '↯', subtitle: 'Situational Awareness',
    question: 'What exists right now?', metaphor: 'CONSTELLATION',
    surface: 'signalmap',            // reuse the existing Signal Map (spinemap) in overlay — Founder call
    producer: PRODUCER.GROUNDED,
  },
  {
    id: 'FLOW', glyph: '⇢', subtitle: 'Movement Analysis',
    question: 'Where is information moving?', metaphor: 'PARTICLE_STREAMS',
    surface: 'flowstreams',
    producer: PRODUCER.WITHHELD,     // KRYL-1053 — no producer yet
  },
  {
    id: 'PRESSURE', glyph: '⧖', subtitle: 'Constraint Analysis',
    question: 'Where is stress accumulating?', metaphor: 'STRESS_FIELD',
    surface: 'stressfield',
    producer: PRODUCER.GROUNDED,
  },
  {
    id: 'CONVERGENCE', glyph: '⬡', subtitle: 'Evidence Corroboration',
    question: 'What independent evidence is beginning to agree?', metaphor: 'GRAVITATIONAL_WELLS',
    surface: 'convergencewells',
    producer: PRODUCER.GROUNDED,
  },
  {
    id: 'DRIFT', glyph: '↝', subtitle: 'Temporal Evolution',
    question: 'What is changing over time?', metaphor: 'TRAJECTORY_TRAILS',
    surface: 'drifttrails',
    producer: PRODUCER.GROUNDED,     // useDriftDivergence
  },
  {
    id: 'OPPORTUNITY', glyph: '⟡', subtitle: 'Structural Leverage',
    question: 'Where can leverage be created?', metaphor: 'OPPORTUNITY_SURFACE',
    surface: 'opportunitysurface',
    producer: PRODUCER.WITHHELD,     // KRYL-1053 — no producer yet
  },
]);

const _byId = new Map(LENS_REGISTRY.map(l => [l.id, l]));

export function getLens(id)        { return _byId.get(id) ?? null; }
export function isGrounded(id)     { return _byId.get(id)?.producer === PRODUCER.GROUNDED; }
export function lensSubtitle(id)   { return _byId.get(id)?.subtitle ?? null; }
export function lensQuestion(id)   { return _byId.get(id)?.question ?? null; }

// The Primary Surface decision for region C: which renderer, and whether it may render at all.
//   { surface, render:boolean, reason } — render:false → region C shows AWAITING (§22), no fake metaphor.
export function primarySurfaceFor(lensId) {
  const lens = _byId.get(lensId);
  if (!lens) return { surface: null, render: false, reason: 'UNKNOWN_LENS' };
  if (lens.producer !== PRODUCER.GROUNDED) return { surface: lens.surface, render: false, reason: 'NO_PRODUCER' };
  return { surface: lens.surface, render: true, reason: null };
}
