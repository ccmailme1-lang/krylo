// src/engine/formationinference.js
// KRYL-1117 — Formation Inference Layer (engine core).
// Decides whether a cross-domain FORMATION exists and, if so, returns a frozen structural graph.
// One output: Formation | null. Detect, not predict. Grounded, or withhold. Additive-only.
//
// PURE over a particle array — no runtime coupling. The producer (next unit) wires the live pool via
// domaingravity.getAllSignals(); this file stays unit-testable and §21-clean (route, don't aggregate:
// it consumes UNCOLLAPSED particles, never a pre-averaged domain pressure).
//
// Spec: specs/formation-inference-layer-spec.md. Every reported value is re-derivable by an outside
// inspector from the particle set (see qa_formationinference.mjs golden set).
//
// ── THREE CALIBRATION CONSTANTS — read the flags ────────────────────────────────────────────────────
//  FORMATION_EXISTENCE_FLOOR = 0.30   LOCKED (Founder 2026-07-25).
//  CO_PRESENCE_FLOOR         = 0.40   PROPOSED — needs Founder ruling. Domain-liveness threshold for an
//                                     edge. Chosen to mirror FRACTURE_POLARITY_THRESHOLD (0.40). This is
//                                     a calibration knob, not a locked value.
//  GROUNDEDNESS_OBSERVED     = 1.0    PASS-THROUGH — the pool carries no per-particle groundedness. Every
//                                     live pool particle is an OBSERVED signal, so groundedness = 1.0 is
//                                     honest at this layer (not fabricated). The Ḡ leg differentiates only
//                                     when a per-particle groundedness source exists (deferred: Signal
//                                     Integrity State). Until then Ḡ ≡ 1 and E = C · Q.
//
// KNOWN FINDING (reported, not a bug): with only ONE grounded connection property today (co-presence),
// the cohesion graph is COMPLETE among strong domains, so C ≡ 1.0 for every asserted formation. E is
// therefore driven by Q (and Ḡ=1) today: E ≈ Q. C begins to differentiate as more of the 10 connection
// properties come online (the absence-first lattice, §6.5). This is the model behaving correctly.

import { CANONICAL_DOMAINS } from './ontology.js';
import { admitCrossDomainRelationship } from './domainintelligence.js';

// ── Constants ────────────────────────────────────────────────────────────────────────────────────────
export const FORMATION_EXISTENCE_FLOOR = 0.30; // LOCKED
export const CO_PRESENCE_FLOOR         = 0.40; // PROPOSED (flag)
export const GROUNDEDNESS_OBSERVED     = 1.0;  // PASS-THROUGH (flag)
export const MIN_DOMAINS               = 2;

const SIX = new Set(CANONICAL_DOMAINS.map(d => d.toUpperCase()));

export const EXCLUSION = Object.freeze({
  UNGROUNDED:       'E_UNGROUNDED',
  UNKNOWN_DOMAIN:   'E_UNKNOWN_DOMAIN',
  NO_EDGE:          'E_NO_EDGE',
  MISSING_POLARITY: 'E_MISSING_POLARITY',
  DUPLICATE:        'E_DUPLICATE',
});

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);

// magnitude: accept normalized `magnitude` (0..1) or raw pool `confidence` (0..100).
function magOf(p) {
  if (typeof p.magnitude === 'number') return clamp01(p.magnitude);
  if (typeof p.confidence === 'number') return clamp01(p.confidence / 100);
  return 0;
}
function signOf(p) { return p.polarity === 'fracture' ? -1 : 1; }
function groundednessOf(p) {
  return typeof p.groundedness === 'number' ? clamp01(p.groundedness) : GROUNDEDNESS_OBSERVED;
}

// ── Stage 1: normalize + include/exclude (deterministic, §6.6) ─────────────────────────────────────────
function normalize(rawParticles) {
  const included = [];
  const excluded = [];
  const seen = new Set();

  for (const p of rawParticles ?? []) {
    const domain = (p.domain ?? '').toUpperCase();
    if (!SIX.has(domain))                       { excluded.push({ particle: p, code: EXCLUSION.UNKNOWN_DOMAIN });   continue; }
    if (p.polarity !== 'constructive' && p.polarity !== 'fracture')
                                                { excluded.push({ particle: p, code: EXCLUSION.MISSING_POLARITY }); continue; }
    const g = groundednessOf(p);
    if (g <= 0)                                 { excluded.push({ particle: p, code: EXCLUSION.UNGROUNDED });       continue; }
    const key = `${domain}|${p.ts ?? ''}|${p.confidence ?? p.magnitude ?? ''}|${p.label ?? ''}|${p.evidenceRef ?? ''}`;
    if (seen.has(key))                          { excluded.push({ particle: p, code: EXCLUSION.DUPLICATE });        continue; }
    seen.add(key);
    included.push({ domain, mag: magOf(p), sign: signOf(p), groundedness: g, ts: p.ts, evidenceRef: p.evidenceRef ?? null });
  }
  return { included, excluded };
}

// per-domain aggregates over included particles (used for co-presence edges + Q)
function byDomain(included) {
  const m = new Map(); // domain -> { count, meanMag, net (Σ sign·mag) }
  for (const p of included) {
    const d = m.get(p.domain) ?? { count: 0, sumMag: 0, net: 0 };
    d.count += 1; d.sumMag += p.mag; d.net += p.sign * p.mag;
    m.set(p.domain, d);
  }
  for (const d of m.values()) d.meanMag = d.count ? d.sumMag / d.count : 0;
  return m;
}

// ── Stage 2: graph (§6) — vertices = live domains, edges = co-presence pairs (both ≥ CO_PRESENCE_FLOOR) ──
function buildGraph(domainAgg, coFloor) {
  const live = [...domainAgg.keys()].filter(d => domainAgg.get(d).meanMag > 0).sort();
  const strong = live.filter(d => domainAgg.get(d).meanMag >= coFloor);
  const edges = [];
  for (let i = 0; i < strong.length; i++)
    for (let j = i + 1; j < strong.length; j++) {
      // WO-3 — closed relationship admission. A cross-domain edge is admitted ONLY
      // between two canonical domains, and its type comes from the ratified closed
      // set (domainintelligence.CROSS_DOMAIN_RELATIONSHIPS). No invent / coerce /
      // fallback: a non-admissible pair is dropped, not relabeled.
      const adm = admitCrossDomainRelationship(strong[i], strong[j]);
      if (!adm.admitted) continue;
      edges.push({ a: strong[i], b: strong[j], property: 'co_presence', admittedType: adm.type });
    }
  // participating vertices = domains carrying ≥1 edge
  const withEdge = new Set();
  for (const e of edges) { withEdge.add(e.a); withEdge.add(e.b); }
  const participating = [...withEdge].sort();
  return { participating, edges, live };
}

// ── Derived scalars (all ∈ [0,1], inspector-recomputable) ──────────────────────────────────────────────
export function cohesion(participating, edges) {
  const D = participating.length;
  const possible = (D * (D - 1)) / 2;
  return possible > 0 ? edges.length / possible : 0;      // C
}

export function pressureCoherence(included, participating) {
  const set = new Set(participating);
  const netByDomain = new Map();
  for (const p of included) {
    if (!set.has(p.domain)) continue;
    netByDomain.set(p.domain, (netByDomain.get(p.domain) ?? 0) + p.sign * p.mag);
  }
  let gross = 0, net = 0;
  for (const v of netByDomain.values()) { gross += Math.abs(v); net += v; }
  return gross > 0 ? Math.abs(net) / gross : 0;           // Q
}

export function avgGroundedness(included, participating) {
  const set = new Set(participating);
  const parts = included.filter(p => set.has(p.domain));
  if (!parts.length) return 0;
  return parts.reduce((s, p) => s + p.groundedness, 0) / parts.length; // Ḡ
}

// ── Identity (FORMATION-ID-001) — depends on TOPOLOGY only, never on E/C/Q/groundedness ────────────────
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
export function formationId(participating, edges) {
  const v = [...participating].sort().join(',');
  const e = edges.map(x => [x.a, x.b].sort().join('-')).sort().join(';');
  return `FRM-${fnv1a(`${v}|${e}`)}`;
}

// ── Public: existence predicate (decision) — independently testable, before any object is built ────────
export function formationExists(rawParticles, opts = {}) {
  const coFloor  = opts.coPresenceFloor ?? CO_PRESENCE_FLOOR;
  const floor    = opts.floor ?? FORMATION_EXISTENCE_FLOOR;
  const { included } = normalize(rawParticles);
  const { participating, edges } = buildGraph(byDomain(included), coFloor);
  if (participating.length < MIN_DOMAINS) return false;
  if (edges.length < 1)                   return false;
  const E = cohesion(participating, edges) * pressureCoherence(included, participating)
          * avgGroundedness(included, participating);
  return E >= floor;
}

// ── Public: inference (decision → construction) — Formation | null ─────────────────────────────────────
export function inferFormation(rawParticles, opts = {}) {
  const coFloor = opts.coPresenceFloor ?? CO_PRESENCE_FLOOR;
  const floor   = opts.floor ?? FORMATION_EXISTENCE_FLOOR;
  const now     = opts.now ?? Date.now();

  const { included, excluded } = normalize(rawParticles);
  const domainAgg = byDomain(included);
  const { participating, edges, live } = buildGraph(domainAgg, coFloor);

  // vertices dropped for having no edge → E_NO_EDGE (deterministic exclusion, §6.6)
  const partSet = new Set(participating);
  const excludedAll = excluded.slice();
  for (const p of included) if (!partSet.has(p.domain)) excludedAll.push({ particle: p, code: EXCLUSION.NO_EDGE });

  if (participating.length < MIN_DOMAINS || edges.length < 1) return null;

  const C = cohesion(participating, edges);
  const Q = pressureCoherence(included, participating);
  const G = avgGroundedness(included, participating);
  const E = C * Q * G;
  if (E < floor) return null;

  const inside = included.filter(p => partSet.has(p.domain));

  return Object.freeze({
    id: formationId(participating, edges),                  // topology-only (FORMATION-ID-001)
    participatingDomains: Object.freeze([...participating]),
    graph: Object.freeze({
      vertices: Object.freeze(participating.map(d => Object.freeze({ domain: d, meanMagnitude: domainAgg.get(d).meanMag }))),
      edges:    Object.freeze(edges.map(e => Object.freeze({ ...e }))),
    }),
    particles: Object.freeze(inside.map(p => Object.freeze({ ...p }))),
    cohesion: C,                 // full precision (§12 — never rounded)
    pressureCoherence: Q,
    avgGroundedness: G,
    existence: E,
    boundary: Object.freeze({
      inside:   Object.freeze(inside.map(p => Object.freeze({ ...p }))),
      excluded: Object.freeze(excludedAll.map(x => Object.freeze({ code: x.code }))),
    }),
    temporal: Object.freeze({ maturity: null, direction: null, trajectory: null, velocity: null }), // §22 TEMPORAL absence
    generatedAt: now,
    generatedBy: 'formation-inference-engine',
  });
}
