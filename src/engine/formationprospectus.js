// src/engine/formationprospectus.js
// KRYL-1117 — Prospectus Assembly (downstream of the inference core).
// Chain: Signal Pool → Perception Producer → Formation Inference Core → [Prospectus Assembly] → Surface.
//
// Composes the 12-section Structural Intelligence Prospectus from a frozen Formation, reusing the five
// reporting-lens producers READ-ONLY (scoutingreport.js). Grounded, or withhold (§22) — sections with no
// live input WITHHOLD (they never fabricate). §2 Executive Assessment is derived HERE (Perception is
// upstream, not a section producer — §6.10 reconciled). PURE over a Formation | null.
//
// PRESENTATION bands (E → label) are display-only and do NOT gate anything — the sole decision threshold
// is FORMATION_EXISTENCE_FLOOR (0.30) in the engine. Flagged so no one mistakes them for logic.

import { signalRead, pressureRead, convergenceRead, flowRead, driftRead } from './scoutingreport.js';

// 12 sections in spec order.
const SECTION_ORDER = [
  'STRUCTURAL_IDENTITY', 'EXECUTIVE_STRUCTURAL_ASSESSMENT', 'FORMATION_ANATOMY', 'STRUCTURAL_FIELD',
  'FORMATION_PROPERTIES', 'STRUCTURAL_RELATIONSHIPS', 'FORMATION_RESONANCE', 'STRUCTURAL_DRIFT',
  'PRESSURE_MAP', 'FORMATION_TRAJECTORY', 'EVIDENCE_FOUNDATION', 'STRUCTURAL_INTELLIGENCE_CONCLUSION',
];

const round2 = x => Math.round(x * 100) / 100;                 // presentation only
const eBand = E => (E >= 0.75 ? 'HIGH CONVERGENCE' : E >= 0.45 ? 'BUILDING CONVERGENCE' : 'EMERGING'); // display-only

const sec  = (id, body) => Object.freeze({ id, ...body });
const held = (id, reason, absence = 'STRUCTURAL') => sec(id, { state: 'WITHHELD', absence, reason });
// wrap a reused scoutingreport read (which exposes `withheld:boolean`) into a section with a consistent
// `state`. The raw read is kept under `read` for the drill; extra fields ride alongside.
const fromRead = (id, read, extra = {}) =>
  Object.freeze({
    id,
    state: read.withheld ? 'WITHHELD' : 'GROUNDED',
    ...(read.withheld ? { absence: read.absence, reason: read.reason } : {}), // uniform: every withheld section carries both
    read: Object.freeze(read),
    ...extra,
  });

function directionOf(inside) {
  const net = inside.reduce((s, p) => s + (p.sign ?? 0) * (p.mag ?? 0), 0);
  return net === 0 ? 'MIXED' : (net > 0 ? 'constructive' : 'fracture');
}

// §2 Executive Assessment — assembler-derived structural fingerprint (orient, not explain; no prediction).
function executiveAssessment(f) {
  const domains = [...f.participatingDomains];
  const inside  = f.particles ?? [];
  const direction = directionOf(inside);
  return sec('EXECUTIVE_STRUCTURAL_ASSESSMENT', {
    state: 'GROUNDED',
    statement:
      `A measurable structural alignment spans ${domains.length} domains — ${domains.join(', ')} — ` +
      `under ${direction} pressure. Existence E=${round2(f.existence)} across ${inside.length} ` +
      `observed signal${inside.length === 1 ? '' : 's'}.`,
    fingerprint: Object.freeze({ domains: Object.freeze(domains), direction, existence: f.existence,
      cohesion: f.cohesion, pressureCoherence: f.pressureCoherence, avgGroundedness: f.avgGroundedness,
      evidenceCount: inside.length }),
    unresolved: Object.freeze([
      'Trajectory, velocity, maturity — TEMPORAL absence (no time-series substrate).',
      '9 of 10 connection properties ungrounded (structural co-presence only).',
    ]),
    citation: 'formation-inference-engine',
    drill: Object.freeze({ formationId: f.id }),
  });
}

/**
 * buildFormationProspectus — the immutable 12-section prospectus for a formation.
 * @param {object|null} formation — inferFormation() output
 * @param {{ now?: number, drift?: object|null, windowMs?: number|null }} opts
 *   drift — optional computeDivergence('DRIFT', …) result for §8 (else the section withholds honestly).
 * @returns frozen prospectus
 */
export function buildFormationProspectus(formation, opts = {}) {
  const now = opts.now ?? Date.now();

  // ── no subject → withhold the whole prospectus (§22 silence, never an invented "no opportunity") ──
  if (!formation) {
    const sections = SECTION_ORDER.map(id =>
      id === 'FORMATION_TRAJECTORY' ? held(id, 'NO_TIME_SERIES', 'TEMPORAL') : held(id, 'NO_FORMATION'));
    return Object.freeze({
      title: 'Structural Intelligence Prospectus',
      layer: 'SELL',
      live: false,
      header: Object.freeze({ state: 'INSUFFICIENT SIGNAL', existence: null, coverage: 0, evidenceCount: 0 }),
      sections: Object.freeze(sections),
      generatedAt: now, generatedBy: 'formation-prospectus-assembler',
    });
  }

  const inside  = formation.particles ?? [];
  const domains = [...formation.participatingDomains];
  const meanMag = inside.length ? inside.reduce((s, p) => s + (p.mag ?? 0), 0) / inside.length : 0;
  const netMag  = Math.abs(inside.reduce((s, p) => s + (p.sign ?? 0) * (p.mag ?? 0), 0));
  const netPerDomain = domains.length ? Math.min(1, netMag / domains.length) : 0; // 0..1 (no lossy clamp)
  const G       = formation.avgGroundedness;

  // reused reporting-lens reads (grounded from formation scalars; withhold where we have no input)
  const anatomy  = fromRead('FORMATION_ANATOMY',
    convergenceRead({ convergence: formation.pressureCoherence, stateLabel: eBand(formation.existence), groundedness: G }));
  const field    = fromRead('STRUCTURAL_FIELD', flowRead({ magnitude: undefined }));                 // no directed/temporal flow → WITHHELD
  const drift    = fromRead('STRUCTURAL_DRIFT',  driftRead(opts.drift ?? null, { groundedness: G })); // no divergence → WITHHELD
  const pressure = fromRead('PRESSURE_MAP',      pressureRead({ gauge: netPerDomain, groundedness: G }));
  const evidence = fromRead('EVIDENCE_FOUNDATION',
    signalRead({ pressure: meanMag, groundedness: G }),
    { basis: Object.freeze({ evidenceCount: inside.length, edges: formation.graph?.edges?.length ?? 0, domains: Object.freeze(domains) }) });

  const byId = {
    STRUCTURAL_IDENTITY: sec('STRUCTURAL_IDENTITY', {
      state: 'GROUNDED',
      formationId: formation.id,
      participatingDomains: Object.freeze(domains),
      status: eBand(formation.existence),
      observedWindowMs: opts.windowMs ?? null,
    }),
    EXECUTIVE_STRUCTURAL_ASSESSMENT: executiveAssessment(formation),
    FORMATION_ANATOMY: anatomy,
    STRUCTURAL_FIELD: field,
    FORMATION_PROPERTIES: sec('FORMATION_PROPERTIES', {
      state: 'GROUNDED',
      cohesion: formation.cohesion, pressureCoherence: formation.pressureCoherence,
      avgGroundedness: formation.avgGroundedness, existence: formation.existence,
      boundary: formation.boundary,
    }),
    STRUCTURAL_RELATIONSHIPS: sec('STRUCTURAL_RELATIONSHIPS', {
      state: 'GROUNDED',
      edges: formation.graph?.edges ?? Object.freeze([]),
      note: 'Co-presence edges only; 9 of 10 connection properties ungrounded (§22).',
    }),
    FORMATION_RESONANCE: held('FORMATION_RESONANCE', 'NO_SECOND_FORMATION_OR_N'),   // §6.9/§19 — withhold without N + attribution
    STRUCTURAL_DRIFT: drift,
    PRESSURE_MAP: pressure,
    FORMATION_TRAJECTORY: held('FORMATION_TRAJECTORY', 'NO_TIME_SERIES', 'TEMPORAL'), // §6.8
    EVIDENCE_FOUNDATION: evidence,
    STRUCTURAL_INTELLIGENCE_CONCLUSION: sec('STRUCTURAL_INTELLIGENCE_CONCLUSION', {
      state: 'GROUNDED',
      statement:
        `Evidence indicates a ${directionOf(inside)} structural alignment across ${domains.join(', ')}. ` +
        `The structure exists at E=${round2(formation.existence)}; trajectory is not yet observable.`,
    }),
  };

  return Object.freeze({
    title: 'Structural Intelligence Prospectus',
    layer: 'SELL',
    live: true,
    header: Object.freeze({
      state: eBand(formation.existence),
      existence: formation.existence,           // full precision
      coverage: round2(domains.length / 6),     // fraction of the six touched
      evidenceCount: inside.length,
    }),
    sections: Object.freeze(SECTION_ORDER.map(id => byId[id])),
    generatedAt: now, generatedBy: 'formation-prospectus-assembler',
  });
}
