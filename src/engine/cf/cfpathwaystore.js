// src/engine/cf/cfpathwaystore.js — KRYL-1248 (CF Kill Experiment).
//
// The smallest substrate for the CF architectural proposition: a persistent
// Attributed Pathway store (γ) + Pathway Measure (ν_t), carried ACROSS invocations
// rather than rebuilt per invocation.
//
// Scope (deliberately minimal — this is an experiment, not the Fabric):
//   - one pathway per canonical domain that has ever been observed in this run;
//   - each pathway holds its full observation lineage (for PathReconstruction);
//   - ν_t per pathway: ν_{t+1} = max(0, ν_t·(1−λ) + Σ corroboration_this_batch)
//     corroboration = Σ particle magnitude for that domain in the batch;
//   - a pathway whose ν_t falls below NU_DORMANT stops contributing particles
//     (models decay: lineage is retained, but a stale pathway no longer props up
//      a formation on its own).
//
// NOT in scope: cross-domain pathway objects, remote capability, DB/localStorage
// persistence (CF §34), the ν_t measure-theory formalism. In-memory module
// singleton, reset per experiment run.
//
// CF spec refs: §6 (Attributed Pathway), §7 (Pathway Measure), §17 route-don't-
// aggregate (ν_t is per-pathway over uncollapsed particles, never a pre-route
// composite).

import { CANONICAL_DOMAINS } from '../ontology.js';

// ── Constants (declared, with basis — CLAUDE.md §1) ──────────────────────────
export const NU_LAMBDA   = 0.15; // per-batch decay. PROPOSED — needs Founder ruling (spec §7).
export const NU_DORMANT  = 0.20; // below this a pathway stops contributing. PROPOSED.
const CONFIDENCE_SCALE   = 100;  // pool particles carry confidence 0..100; magnitude = /100.

const SIX = new Set(CANONICAL_DOMAINS.map(d => d.toUpperCase()));

// ── State (module singleton — reset per run) ─────────────────────────────────
/** @type {Map<string, { domain:string, nu:number, lineage:Array<{batch:number, particle:object}> }>} */
let _pathways = new Map();
let _batchIndex = -1;
let _lambda = NU_LAMBDA;   // active decay rate; set per-run via resetFabric({ lambda })

// resetFabric — clears state for a deterministic run. `lambda` overrides the
// decay rate for the ν_t-decay sensitivity sweep (spec §7 ruling #3); omitted →
// the PROPOSED default.
export function resetFabric({ lambda } = {}) {
  _pathways = new Map();
  _batchIndex = -1;
  _lambda = (typeof lambda === 'number') ? lambda : NU_LAMBDA;
}

function magOf(p) {
  if (typeof p.magnitude === 'number') return Math.max(0, Math.min(1, p.magnitude));
  if (typeof p.confidence === 'number') return Math.max(0, Math.min(1, p.confidence / CONFIDENCE_SCALE));
  return 0;
}

/**
 * ingest — one observation batch enters the Fabric. Updates every pathway's ν_t
 * (decay applied to all; corroboration added for domains present in this batch),
 * appends lineage for the batch's particles.
 * @param {Array<object>} particles — [{ domain, confidence|magnitude, polarity, ts }]
 * @returns {{ batch:number, updated:string[] }}
 */
export function ingest(particles = []) {
  _batchIndex += 1;
  const corroboration = new Map(); // domain -> Σ magnitude this batch

  for (const p of particles) {
    const d = String(p.domain ?? '').toUpperCase();
    if (!SIX.has(d)) continue;
    corroboration.set(d, (corroboration.get(d) ?? 0) + magOf(p));
    if (!_pathways.has(d)) _pathways.set(d, { domain: d, nu: 0, lineage: [] });
    _pathways.get(d).lineage.push({ batch: _batchIndex, particle: { ...p, domain: d } });
  }

  // ν_t update for ALL pathways (decay always; corroboration where present)
  for (const pw of _pathways.values()) {
    pw.nu = Math.max(0, pw.nu * (1 - _lambda) + (corroboration.get(pw.domain) ?? 0));
  }

  return { batch: _batchIndex, updated: [...corroboration.keys()] };
}

/**
 * pathwayParticles — the particle set the inference core should consume this
 * invocation. Every particle from every NON-dormant pathway's full lineage.
 * This is the CF difference vs. the synchronous baseline: particles that have
 * aged out of the live pool window are still here, as long as their pathway's
 * ν_t is above NU_DORMANT.
 * @returns {Array<object>} uncollapsed particles (§17)
 */
export function pathwayParticles() {
  const out = [];
  for (const pw of _pathways.values()) {
    if (pw.nu < NU_DORMANT) continue;
    for (const { particle } of pw.lineage) out.push(particle);
  }
  return out;
}

/** nuByDomain — inspection accessor (harness reporting only). */
export function nuByDomain() {
  const m = {};
  for (const pw of _pathways.values()) m[pw.domain] = pw.nu;
  return m;
}

/**
 * reconstruct — lineage for a set of participating domains. Returns, per domain,
 * the ordered (batch, particle) list that fed it. Non-empty for every
 * participating domain ⇒ PathReconstruction = 1.
 * @param {string[]} participatingDomains
 */
export function reconstruct(participatingDomains = []) {
  const trace = {};
  for (const d of participatingDomains) {
    const pw = _pathways.get(String(d).toUpperCase());
    trace[d] = pw ? pw.lineage.map(l => ({ batch: l.batch, ts: l.particle.ts ?? null })) : [];
  }
  const complete = participatingDomains.every(d => (trace[d]?.length ?? 0) > 0);
  return { trace, complete };
}
