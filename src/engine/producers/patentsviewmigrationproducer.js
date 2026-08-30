// src/engine/producers/patentsviewmigrationproducer.js
// M7 — RelationCore Producer Contract (PatentsView Inventor Migration).
// Spec: specs/SPEC-m7-relationcore-producer-contract.md
//
// PURE evidence-to-relation mapping. No network calls. Does NOT import patentsviewconnector.js,
// surfaceRouter, or anything live — takes patent-record fixtures as input, same shape as the real
// PatentsView API response (patent_id, inventor_id, assignee_organization), and returns
// RelationCore[] candidates. Discovery only — never admits (Discovery ≠ Admission ≠ Storage).
//
// Detection rule transcribed from patentsviewconnector.js's buildMigrationSignals(), unchanged:
// group by inventor_id, count patents per assignee_organization, require >=2 distinct orgs,
// destOrg = highest count, sourceOrg = second-highest. No inference, no randomness.
//
// KNOWN NON-CONFORMANCE, flagged per spec §3.2: provenanceHash below uses a deterministic FNV-1a
// placeholder, NOT the ratified BLAKE3(evidence bundle ⊕ observation ids ⊕ path) algorithm — no
// BLAKE3 implementation exists in this repository. Proves the shape of provenance construction,
// not the specified algorithm. Do not present as conformant.

import { makeRelationCore, RelationType } from '../relationontology.js';

function normalizeOrgKey(org) {
  return org.toUpperCase().replace(/[\s-]/g, '_');
}

// Placeholder for BLAKE3 (spec §3.2) — deterministic, evidence-derived, reproducible; NOT the
// ratified algorithm.
function fnv1aHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * extractMigrationCandidates — pure detection over patent-record fixtures.
 * @param {Array<{patent_id, assignees:[{assignee_organization}], inventors:[{inventor_id}]}>} patents
 * @param {number} now - evidence window end timestamp (ms epoch)
 * @returns {RelationCore[]} — schema-valid candidates, never admitted, never fabricated when
 *   evidence is absent or single-organization.
 */
export function extractMigrationCandidates(patents, now) {
  const inventorAssignees = {}; // inventor_id -> { org -> { count, patentIds:[] } }

  for (const patent of patents ?? []) {
    const org = patent?.assignees?.[0]?.assignee_organization;
    const patentId = patent?.patent_id;
    if (!org || !patentId) continue; // §4 — malformed evidence skipped, never defaulted

    for (const inv of patent.inventors ?? []) {
      const id = inv?.inventor_id;
      if (!id) continue;
      if (!inventorAssignees[id]) inventorAssignees[id] = {};
      if (!inventorAssignees[id][org]) inventorAssignees[id][org] = { count: 0, patentIds: [] };
      inventorAssignees[id][org].count += 1;
      inventorAssignees[id][org].patentIds.push(patentId);
    }
  }

  const candidates = [];

  for (const [inventorId, assigneeCounts] of Object.entries(inventorAssignees)) {
    const orgs = Object.entries(assigneeCounts).sort((a, b) => b[1].count - a[1].count);
    if (orgs.length < 2) continue; // §4 — single-organization inventor: no relationship, by design

    const [destOrg, destData]   = orgs[0];
    const [sourceOrg, srcData]  = orgs[1];
    const totalPatents = orgs.reduce((s, [, d]) => s + d.count, 0);

    const evidencePatentIds = [...srcData.patentIds, ...destData.patentIds].sort();
    const provenanceHash = fnv1aHash(`${inventorId}|${sourceOrg}|${destOrg}|${evidencePatentIds.join(',')}`);

    const eta   = Math.min(1, Math.max(0.01, totalPatents / 10));
    const phi0  = Math.min(1, Math.max(0, destData.count / totalPatents));

    candidates.push(makeRelationCore({
      id: `rc_pv_migration_${normalizeOrgKey(sourceOrg)}_${normalizeOrgKey(destOrg)}_${now}`,
      sourceId: normalizeOrgKey(sourceOrg),
      targetId: normalizeOrgKey(destOrg),
      relationType: RelationType.COUPLED_WITH, // §3.1 — reasoned choice, not Founder-ratified
      eta,
      phi0,
      structuralSupport: 0.5, // §3 — placeholder pending real calibration
      provenanceHash,
      createdAt: now,
    }));
  }

  return candidates;
}
