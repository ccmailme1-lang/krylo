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
  // KRYL-1335 (2026-09-29) — real, dated, sourced restaurant-supply-chain fact: Sysco (the
  // largest US food distributor) acquiring Restaurant Depot. Directly in RSI's domain (food
  // distributor / supplier consolidation), registered under both new entityregistry.json
  // entries so KRYL-1335's structural-entity evidence check can actually find it.
  sysco: {
    OWNERSHIP: [
      makeSignalFacet({
        facet_id:        'seed-evidence:sysco:OWNERSHIP:restaurant-depot-acquisition-2026-03',
        domain_id:       'OWNERSHIP',
        ontology:        'DOMAIN_EVIDENCE',
        producer_id:     'real-evidence-seed',
        source_set_hash: 'seed:sysco:restaurant-depot-acquisition-2026-03',
        provenance: {
          source:    'Sysco investor relations + SEC Form 425, 2026-03-30/31 — corroborated by Las Vegas Sun',
          semantics: 'Sysco, the largest US food distributor and a major restaurant-industry supplier, ' +
                     'announced acquisition of Restaurant Depot (Jetro Holdings) for $29.1B — $21.6B cash ' +
                     'plus 91.5M Sysco shares (~16% combined-company stake for Restaurant Depot ' +
                     'shareholders). Consolidates Sysco\'s scheduled-delivery distributor network with ' +
                     'Restaurant Depot\'s cash-and-carry distribution model; combined company ~$100B ' +
                     'revenue (2025). Subject to federal regulatory review, targeted close Q3 FY2027.',
          eventDate: '2026-03-30',
          subject:   { canonicalId: 'sysco' },
        },
        signal_unit: { kind: 'evidence', scale: 'reported', unit: 'USD', value: 29_100_000_000 },
        repro: {
          config: { derivation: 'hand-entered, single-subject seed — not a live connector' },
          source_refs: [
            'https://investors.sysco.com/annual-reports-and-sec-filings/news-releases/2026/03-30-2026-113036743',
            'https://www.sec.gov/Archives/edgar/data/96021/000095014226000924/eh260758848_425-transcript.htm',
            'https://lasvegassun.com/news/2026/mar/31/food-distributor-giant-sysco-plans-to-gobble-up-an/',
          ],
          producer_version: PRODUCER_VERSION,
        },
      }),
    ],
  },
};

export const realEvidenceSeedSource = {
  id: 'real-evidence-seed',
  // Field-scope fix: domainsignalresolution.js's own documented contract for
  // getDomainEvidenceFacets is "subject: omit/null -> field-scoped (all domain evidence
  // facets)" -- this source was unconditionally returning [] for that case, so no
  // field-scoped caller (KRYL-1335's structuralentitysynthesis.js included) could ever see
  // ANY seeded fact, entity-scoped queries were the only path that worked. Field scope now
  // returns every seeded facet for the domain, across all subjects -- entity scope is
  // unchanged (still identifier-bound, still only that one subject's facets).
  produce({ domain, subject }) {
    const D = String(domain).toUpperCase();
    if (subject && subject.kind === 'ENTITY') {
      const bySubject = SEED_FACETS[subject.canonicalId];
      return bySubject?.[D] ?? [];
    }
    if (subject) return []; // non-ENTITY scope: nothing binds (unchanged behavior)
    const out = [];
    for (const bySubject of Object.values(SEED_FACETS)) out.push(...(bySubject[D] ?? []));
    return out;
  },
};

registerEvidenceFacetSource(realEvidenceSeedSource);
