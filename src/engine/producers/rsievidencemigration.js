// rsievidencemigration.js — KRYL-1336, RSI Structural Evidence Substrate.
//
// Migrates the Sysco/Restaurant Depot fact (originally hand-seeded as a one-entity text facet
// in realsubjectevidenceseed.js, KRYL-1335) into the real two-step pattern this spec's
// investigation found secownershipconnector.js already uses:
//   1. Build a RelationCore, run it through admitCandidate() for provenance-gated validation
//      (relationontology.js / admissionengine.js — schema + validator, does NOT persist).
//   2. Register the validated relationship as a typed edge (entitytopologyregistry.js's
//      registerTypedEdge/TYPED_EDGES) — the actual persistent, queryable store.
// Real, hand-entered, dated, sourced — not a live connector, same honesty class as
// realsubjectevidenceseed.js. The original text facet is left in place (spec §10: "do not
// remove the current working path until equivalent or superior behavior is verified").
//
// Source: Sysco investor relations + SEC Form 425, 2026-03-30/31 — corroborated by Las Vegas Sun.
// https://investors.sysco.com/annual-reports-and-sec-filings/news-releases/2026/03-30-2026-113036743
// https://www.sec.gov/Archives/edgar/data/96021/000095014226000924/eh260758848_425-transcript.htm

import { nodeId } from '../entitytopologyregistry.js';
import { admitAndProject } from '../canonicalrelationshipprojection.js';

const SYSCO_CIK = '96021';
const ACCESSION = '000095014226000924'; // real SEC Form 425 accession number — the provenanceHash

let migrated = false;

export function migrateSyscoRestaurantDepotEdge() {
  if (migrated) return; // idempotent — a module-level side-effect import may run more than once
  migrated = true;

  const acquirerId = nodeId(SYSCO_CIK, 'Sysco');
  const targetId   = nodeId(null, 'Restaurant Depot'); // no public CIK — private/Jetro Holdings

  // KRYL-1340 — canonical ρ admission replaces the old makeRelationCore()+admitCandidate()
  // (COMPOSITION, confirmed wrong type -- structural containment, not an acquisition, per
  // relationontology.js §IV -- forced from a closed 14-value enum) + registerTypedEdge()
  // (ACQUIRED, purpose-built, the better existing label) pair. ACQUIRED is now the ratified
  // canonical type directly -- not a second, separate typed-edge label layered on top of a
  // mismatched SRE type. dealStatus: PENDING is the real, current, evidenced state (board-
  // approved, targeted close Q3 FY2027, subject to regulatory review -- not yet closed).
  const admission = admitAndProject(
    {
      part: [acquirerId, targetId],
      type: 'ACQUIRED',
      nuId: {}, // no transactionId available for this evidence -- optional, empty is valid
      nuState: { dealStatus: 'PENDING' },
      evidence: {
        provenance: { accession: ACCESSION, filingRef: 'SEC Form 425' },
        ts: Date.parse('2026-03-30'),
      },
    },
    { acquirerName: 'Sysco', acquirerCik: SYSCO_CIK, targetName: 'Restaurant Depot', targetCik: null, source: 'SEC_425' }
  );
  if (!admission.admitted) {
    console.warn('[KRYL-1336] Sysco/Restaurant Depot ACQUIRED admission failed:', admission.reason);
  }
}

migrateSyscoRestaurantDepotEdge();
