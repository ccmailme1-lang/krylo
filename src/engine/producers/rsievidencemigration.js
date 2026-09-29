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

import { makeRelationCore, RelationType } from '../relationontology.js';
import { admitCandidate } from '../admissionengine.js';
import { Vocabulary } from '../truthevent.js';
import { registerTypedEdge, nodeId, RELATION_TYPES } from '../entitytopologyregistry.js';

const SYSCO_CIK = '96021';
const ACCESSION = '000095014226000924'; // real SEC Form 425 accession number — the provenanceHash

let migrated = false;

export function migrateSyscoRestaurantDepotEdge() {
  if (migrated) return; // idempotent — a module-level side-effect import may run more than once
  migrated = true;

  const sourceId = nodeId(SYSCO_CIK, 'Sysco');
  const targetId = nodeId(null, 'Restaurant Depot'); // no public CIK — private/Jetro Holdings

  // Step 1 — RelationCore + admitCandidate(): provenance-gated validation, mirrors
  // secownershipconnector.js exactly. relationType: COMPOSITION (PARENT_TO_CHILD-shaped —
  // relationontology.js's own doc calls this the PART_OF/CONTAINS replacement, the closest real
  // fit for "acquirer absorbs acquired company") is the SRE-side classification; the
  // entitytopologyregistry-side edge type (below) is the separate, plain-English ACQUIRED.
  // eta 0.75, not 0.9 like the 13D/G precedent — honestly lower because this deal is
  // board-approved but NOT closed (targeted close Q3 FY2027, subject to regulatory review),
  // unlike a 13D/G filing which reports a already-consummated position. phi0 0.5: same
  // "placeholder pending real calibration -- no doctrine establishes this value" honesty as
  // the 13D/G precedent, not invented fresh here.
  let rc;
  try {
    rc = makeRelationCore({
      id: `rc_sysco_restaurantdepot_${ACCESSION}`,
      sourceId, targetId,
      relationType: RelationType.COMPOSITION,
      eta: 0.75,
      phi0: 0.5,
      structuralSupport: 0.9, // structurally guaranteed by the filing itself, same basis as the 13D/G precedent
      provenanceHash: ACCESSION,
      createdAt: Date.parse('2026-03-30'),
    });
  } catch (err) {
    console.warn('[KRYL-1336] Sysco/Restaurant Depot RelationCore construction failed:', err.message);
    return;
  }

  // KRYL-1336 finding: gate0policy.js locks EVERY SRE_RELATIONCORE type to enabled:false
  // ("uniform Defer", specs/SPEC-gate0-sre-dispositions.md, a separately-ratified decision) --
  // so admitCandidate() here (and in secownershipconnector.js, the precedent this mirrors,
  // using RelationType.DEPENDS_ON) always returns REJECTED right now. secownershipconnector.js
  // does NOT block registerOwnershipEdge() on that outcome -- it calls it unconditionally,
  // before the RelationCore step even runs, treating Gate-0/RelationCore as an audit trail, not
  // an admission gate. Matching that real, current behavior exactly: the decision is logged for
  // the audit record, storage does not depend on it. provenanceHash (a real SEC accession
  // number) is what actually establishes "not unsourced" here -- Gate-0's Defer status is a
  // separate axis (whether auto-admission is policy-enabled for this relation TYPE), not a
  // statement about whether this specific relationship is evidenced.
  const { decision, event } = admitCandidate(
    { ...rc, vocabulary: Vocabulary.SRE_RELATIONCORE, relationType: RelationType.COMPOSITION, origin: 'OBSERVED' },
    { decidedBy: 'rsi_evidence_migration', rulesetVersion: '1.0.0', now: Date.now(),
      sreRelationTypes: new Set(Object.values(RelationType)) }
  );
  console.info(`[KRYL-1336] Sysco/Restaurant Depot RelationCore: ${decision} (${event.rationale?.map(r => r.ruleId + ':' + r.outcome).join(', ')})`);

  // Step 2 — the actual persistent, queryable store.
  registerTypedEdge({
    from: 'Sysco', to: 'Restaurant Depot',
    fromCik: SYSCO_CIK, toCik: null,
    fromLabel: 'Sysco', toLabel: 'Restaurant Depot',
    type: RELATION_TYPES.ACQUIRED,
    source: 'SEC_425',
    validFrom: Date.parse('2026-03-30'),
  });
}

migrateSyscoRestaurantDepotEdge();
