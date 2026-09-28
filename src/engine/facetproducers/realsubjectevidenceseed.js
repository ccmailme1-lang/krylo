// realsubjectevidenceseed.js — KRYL-1332 Track 1, real-evidence seed.
//
// This is NOT a live external-search connector. It is one hand-entered, real, dated,
// sourced observation, registered through the EXISTING WO-1B/C/D evidence-facet extension
// point (domainsignalresolution.js's EVIDENCE_FACET_SOURCES / registerEvidenceFacetSource) —
// the same contract fecfacets.js/censusfacets.js/patentsviewfacets.js already use. It is
// bound to exactly ONE static registry entity (entityregistry.json's "alphabet") by
// canonicalId (subjectbinding.js's identifier-containment rule — no fuzzy name matching).
//
// Every other subject and every other domain gets the identical honest absence they got
// before this file existed — this adds one real fact, it does not simulate a general
// capability. "Evidence is not a measure" (KRYL-1231): this never populates a Class-E
// measure, never gets rescaled into a magnitude score.
//
// Source: CNBC, 2026-06-01 (https://www.cnbc.com/2026/06/01/alphabet-to-raise-80-billion-from-stock-sales-to-fund-ai-buildout.html)
//         + Alphabet SEC 8-K (https://www.sec.gov/Archives/edgar/data/0001652044/000119312526257724/d83560dex991.htm)
// Pulled via live web search 2026-09-28. Real, verifiable, dated — not generated.

import { makeSignalFacet } from '../signalfacet.js';
import { registerEvidenceFacetSource } from '../domainsignalresolution.js';

const PRODUCER_VERSION = 'real-evidence-seed-1.0.0';

const SEED_FACETS = {
  alphabet: {
    CAPITAL: [
      makeSignalFacet({
        facet_id:        'seed-evidence:alphabet:CAPITAL:capital-raise-2026-06',
        domain_id:       'CAPITAL',
        ontology:        'DOMAIN_EVIDENCE',
        producer_id:     'real-evidence-seed',
        source_set_hash: 'seed:alphabet:capital-raise-2026-06',
        provenance: {
          source:    'CNBC, 2026-06-01 — corroborated by Alphabet 8-K (SEC EDGAR)',
          semantics: 'Alphabet announced $80B in equity offerings ($30B public offering — $15B mandatory ' +
                     'convertible preferred + $15B common stock; $40B at-the-market program; $10B private ' +
                     'placement to Berkshire Hathaway) to fund AI infrastructure buildout. FY2026 capex ' +
                     'guidance raised to $180-190B.',
          eventDate: '2026-06-01',
          subject:   { canonicalId: 'alphabet' },
        },
        // Real reported dollar figure, not a normalized/invented 0-100 index — evidence is
        // not a measure (KRYL-1231), so this is never rescaled into a magnitude score.
        signal_unit: { kind: 'evidence', scale: 'reported', unit: 'USD', value: 80_000_000_000 },
        repro: {
          config: { derivation: 'hand-entered, single-subject seed — not a live connector' },
          source_refs: [
            'https://www.cnbc.com/2026/06/01/alphabet-to-raise-80-billion-from-stock-sales-to-fund-ai-buildout.html',
            'https://www.sec.gov/Archives/edgar/data/0001652044/000119312526257724/d83560dex991.htm',
          ],
          producer_version: PRODUCER_VERSION,
        },
      }),
    ],
  },
};

export const realEvidenceSeedSource = {
  id: 'real-evidence-seed',
  produce({ domain, subject }) {
    if (!subject || subject.kind !== 'ENTITY') return [];
    const bySubject = SEED_FACETS[subject.canonicalId];
    if (!bySubject) return [];
    return bySubject[String(domain).toUpperCase()] ?? [];
  },
};

registerEvidenceFacetSource(realEvidenceSeedSource);
