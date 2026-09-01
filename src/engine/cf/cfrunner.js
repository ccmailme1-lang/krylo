// src/engine/cf/cfrunner.js — KRYL-1248 (CF Kill Experiment).
//
// Runs one workload through the two paths under equated budgets:
//
//   B  (synchronous baseline) — per invocation, inferFormation() over the live
//      observation window only (windowBatches). No state carried between
//      invocations, no held-back observation ever retrieved. This is today's path.
//
//   CF (persistent pathway)   — per invocation, ingest the batch into the
//      Attributed Pathway store, infer over the accumulated pathway particles,
//      then run one Frontier step: if the admitted formation has an adjacent
//      unobserved leg and a reachable held-back observation exists for it (and
//      budget remains), release exactly that observation, re-ingest, re-infer.
//
// CF reuses B's admission machinery verbatim (inferFormation, admitCrossDomain-
// Relationship) — CF-I7. The only additions are pathway persistence, the ν_t
// update, the Frontier step, and the stub Remote Capability (the release).
//
// Frontier detection here is a minimal stub: the general RESOLVE-conflict producer
// in observationaffordanceengine.js (deriveAffordancesFromResolve) covers
// RESOLVE_CONFLICT only, not FORMATION_BOUNDARY_UNCERTAINTY, so it cannot drive
// this case as written. The stub is honest about what it is (spec §3, §6 note).

import { inferFormation } from '../formationinference.js';
import { admitCrossDomainRelationship } from '../domainintelligence.js';
import { resetFabric, ingest, pathwayParticles, nuByDomain, reconstruct } from './cfpathwaystore.js';

const RELEASE_COST = 5;   // compute units charged per stub-remote release. PROPOSED (spec §6).
const set = arr => [...new Set(arr)].sort();

// net (Σ sign·mag) per domain over a formation's inside particles
function domainNet(formation) {
  const net = {};
  for (const p of formation?.particles ?? []) {
    net[p.domain] = (net[p.domain] ?? 0) + (p.sign ?? 1) * (p.mag ?? 0);
  }
  return net;
}

// a held-back leg is a frontier condition iff: not already participating, and
// admissible-adjacent to at least one participating domain
function isFrontierLeg(leg, participating) {
  const L = String(leg).toUpperCase();
  if (participating.includes(L)) return false;
  return participating.some(d => admitCrossDomainRelationship(L, d).admitted);
}

// ── Baseline ────────────────────────────────────────────────────────────────
export function runBaseline(workload) {
  const { batches, windowBatches = 1 } = workload;
  const perBatch = [];
  let compute = 0;

  for (let i = 0; i < batches.length; i++) {
    const window = batches.slice(Math.max(0, i - windowBatches + 1), i + 1).flat();
    const f = inferFormation(window);
    compute += 1 + window.length;                       // 1 inferFormation + scans
    perBatch.push({
      batch: i,
      participating: f ? set(f.participatingDomains) : [],
      formation: !!f,
      domainNet: f ? domainNet(f) : {},
      reconstructable: !!f,                              // window particles are in hand by definition
      releasedLegs: [],
    });
  }
  return { path: 'B', perBatch, releases: [], compute };
}

// ── Cognitive Fabric candidate ─────────────────────────────────────────────
export function runCF(workload, opts = {}) {
  const { batches, heldBack = [], budget = {} } = workload;
  let releasesLeft = budget.releases ?? 0;
  const perBatch = [];
  const releases = [];
  let compute = 0;

  resetFabric({ lambda: opts.lambda });

  for (let i = 0; i < batches.length; i++) {
    ingest(batches[i]);
    compute += batches[i].length;                       // ingest cost
    let particles = pathwayParticles();
    let f = inferFormation(particles);
    compute += 1 + particles.length;                    // infer + scans
    const releasedLegs = [];

    // Frontier step — one pass, budget-limited
    if (f && releasesLeft > 0) {
      const participating = set(f.participatingDomains);
      for (const hb of heldBack) {
        if (releasesLeft <= 0) break;
        if (hb.reachable !== true) continue;
        if (!isFrontierLeg(hb.leg, participating)) continue;
        // stub Remote Capability: release exactly this observation
        ingest([hb.particle]);
        releasesLeft -= 1;
        compute += RELEASE_COST + 1;
        releasedLegs.push(String(hb.leg).toUpperCase());
        releases.push({ leg: String(hb.leg).toUpperCase(), batch: i });
        particles = pathwayParticles();
        f = inferFormation(particles);
        compute += 1 + particles.length;
      }
    }

    const participating = f ? set(f.participatingDomains) : [];
    const recon = f ? reconstruct(participating) : { complete: false };
    perBatch.push({
      batch: i,
      participating,
      formation: !!f,
      domainNet: f ? domainNet(f) : {},
      reconstructable: recon.complete,
      releasedLegs,
    });
  }

  return { path: 'CF', perBatch, releases, compute, nu: nuByDomain() };
}

export function runWorkload(workload, opts = {}) {
  return { name: workload.name, B: runBaseline(workload), CF: runCF(workload, opts) };
}
