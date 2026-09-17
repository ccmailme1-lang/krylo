// src/engine/cf/runner.js — CF canonical kill-experiment runner (IS-4).
//
// Same two-path design as cfrunner.js, rebuilt on the canonical substrate
// (pathwaystore.js + significance.js) instead of the frozen cfpathwaystore.js
// fixture. B is byte-identical to cfrunner's baseline (it never touched the
// store). CF differs only in: lineage-keyed pathways (IS-1), tiered lifecycle
// (X4), FC-REQ-05 admission input (X5), ν_t as policy (X2).
//
// CF reuses B's admission machinery verbatim — inferFormation,
// admitCrossDomainRelationship (CF-I7).

import { inferFormation } from '../formationinference.js';
import { admitCrossDomainRelationship } from '../domainintelligence.js';
import {
  resetFabric, ingest, admissibleParticles, recordConvergence, reconstruct,
  nuByDomain, tierByPathway, admissionByPathway, pathwayCount, clusterCount,
} from './pathwaystore.js';

const RELEASE_COST = 5;   // compute units per stub-remote release. PROPOSED.
const set = arr => [...new Set(arr)].sort();

function domainNet(formation) {
  const net = {};
  for (const p of formation?.particles ?? []) {
    net[p.domain] = (net[p.domain] ?? 0) + (p.sign ?? 1) * (p.mag ?? 0);
  }
  return net;
}

function isFrontierLeg(leg, participating) {
  const L = String(leg).toUpperCase();
  if (participating.includes(L)) return false;
  return participating.some(d => admitCrossDomainRelationship(L, d).admitted);
}

// ── Baseline (synchronous, window-only — today's path) ─────────────────────
export function runBaseline(workload) {
  const { batches, windowBatches = 1 } = workload;
  const perBatch = [];
  let compute = 0;
  for (let i = 0; i < batches.length; i++) {
    const window = batches.slice(Math.max(0, i - windowBatches + 1), i + 1).flat();
    const f = inferFormation(window);
    compute += 1 + window.length;
    perBatch.push({
      batch: i,
      participating: f ? set(f.participatingDomains) : [],
      formation: !!f,
      domainNet: f ? domainNet(f) : {},
      reconstructable: !!f,
      releasedLegs: [],
    });
  }
  return { path: 'B', perBatch, releases: [], compute };
}

// ── Cognitive Fabric candidate (canonical substrate) ──────────────────────
export function runCF(workload, opts = {}) {
  const { batches, heldBack = [], budget = {} } = workload;
  let releasesLeft = budget.releases ?? 0;
  const perBatch = [];
  const releases = [];
  let compute = 0;

  resetFabric({
    lambda: opts.lambda, archiveGap: opts.archiveGap, memoryFloor: opts.memoryFloor,
  });

  for (let i = 0; i < batches.length; i++) {
    ingest(batches[i]);
    compute += batches[i].length;
    let particles = admissibleParticles();         // FC-REQ-05 (X5)
    let f = inferFormation(particles);
    compute += 1 + particles.length;
    const releasedLegs = [];
    if (f) recordConvergence(f.participatingDomains);

    if (f && releasesLeft > 0) {
      const participating = set(f.participatingDomains);
      for (const hb of heldBack) {
        if (releasesLeft <= 0) break;
        if (hb.reachable !== true) continue;
        if (!isFrontierLeg(hb.leg, participating)) continue;
        ingest([hb.particle]);
        releasesLeft -= 1;
        compute += RELEASE_COST + 1;
        releasedLegs.push(String(hb.leg).toUpperCase());
        releases.push({ leg: String(hb.leg).toUpperCase(), batch: i });
        particles = admissibleParticles();
        f = inferFormation(particles);
        compute += 1 + particles.length;
        if (f) recordConvergence(f.participatingDomains);
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

  return {
    path: 'CF', perBatch, releases, compute,
    nu: nuByDomain(), tiers: tierByPathway(), admission: admissionByPathway(),
    pathways: pathwayCount(), clusters: clusterCount(),
  };
}

export function runWorkload(workload, opts = {}) {
  return { name: workload.name, B: runBaseline(workload), CF: runCF(workload, opts) };
}
