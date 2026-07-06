// KRYL-969 Phase 1 — Companies House Connector
// UK-registered-entity equivalent of the EDGAR source. Two capture modes:
//   (1) companyProfile's sic_codes — structured, already-categorical declared-identity
//       signal, no NLP needed.
//   (2) filing-history entries linking to accounts/strategic-report documents, which
//       for medium/large companies and PLCs contain narrative business-description text.
// Spec: specs/KRYL-969-identity-evolution-engine.md §6 (COMPANIES_HOUSE)
//
// Boundary rules:
//   NO surfacerouter, NO rkmstore, NO identitykernel — pure capture into narrativesnapshotstore.js.
//   NO NLP — SIC codes are already structured; this module only serializes them.
//   entityId is caller-supplied (entityregistry.json has no Companies House number field
//   yet) — this connector does not attempt entity->companyNumber resolution itself.

import { recordNarrativeSnapshot, SOURCE } from '../narrativesnapshotstore.js';

const PROFILE_BASE = '/api/companies-house-profile';
const HISTORY_BASE = '/api/companies-house-filing-history';

// Filing categories whose docs plausibly carry a narrative business description —
// small-company "micro-entity"/"dormant" accounts rarely do, but this is a coarse,
// deterministic filter, not inference: it just narrows which filings get flagged for
// a future narrative-extraction pass (Phase 2), never invents text that isn't there.
const NARRATIVE_CANDIDATE_TYPES = new Set(['accounts', 'annual-return', 'confirmation-statement']);

async function fetchProfile(companyNumber) {
  const res = await fetch(`${PROFILE_BASE}?companyNumber=${encodeURIComponent(companyNumber)}`);
  if (!res.ok) throw new Error(`Companies House profile fetch HTTP ${res.status}`);
  return res.json();
}

async function fetchFilingHistory(companyNumber) {
  const res = await fetch(`${HISTORY_BASE}?companyNumber=${encodeURIComponent(companyNumber)}`);
  if (!res.ok) throw new Error(`Companies House filing-history fetch HTTP ${res.status}`);
  const json = await res.json();
  return json.items ?? [];
}

// Serializes SIC codes as a stable, human-readable string — not free text, not NLP output.
function serializeSicCodes(sicCodes) {
  return (sicCodes ?? []).join(', ');
}

// Main entry point. entityId must be supplied by the caller (no auto-resolution).
export async function runCompaniesHouseCapture({ entityId, companyNumber }) {
  if (!entityId)      throw new Error('runCompaniesHouseCapture: entityId is required');
  if (!companyNumber) throw new Error('runCompaniesHouseCapture: companyNumber is required (no entity->companyNumber resolution exists)');

  const recorded = [];
  const errors   = [];

  // (1) SIC code snapshot — one snapshot per capture run, dated to the profile's own last-updated field.
  try {
    const profile = await fetchProfile(companyNumber);
    const sicCodes = profile.sic_codes ?? [];
    if (sicCodes.length > 0) {
      const contentDate = profile.last_full_members_list_date
        ?? profile.date_of_creation
        ?? new Date().toISOString().slice(0, 10);
      const entry = recordNarrativeSnapshot({
        entityId,
        source:      SOURCE.COMPANIES_HOUSE,
        sourceUrl:   `https://find-and-update.company-information.service.gov.uk/company/${companyNumber}`,
        contentDate,
        rawText:     serializeSicCodes(sicCodes),
        sourceRef:   { companyNumber, filingId: null, sicCodes },
      });
      recorded.push(entry);
    }
  } catch (err) {
    errors.push({ phase: 'PROFILE', error: err.message });
  }

  // (2) Filing-history entries flagged as narrative candidates. NOT persisted as
  // NarrativeSnapshot records — a snapshot with no raw_text isn't a captured piece of
  // evidence, it's an empty placeholder, which is the fabrication-by-omission failure
  // mode §22 warns against. Fetching + extracting the actual accounts document text
  // needs its own document-text proxy (mirroring handleEdgarDocumentProxy) — not built
  // in this pass. Returned as plain metadata so a future extension knows what to fetch.
  let narrativeCandidates = [];
  try {
    const filings = await fetchFilingHistory(companyNumber);
    narrativeCandidates = filings
      .filter(f => NARRATIVE_CANDIDATE_TYPES.has(f.category))
      .map(f => ({ companyNumber, filingId: f.transaction_id, category: f.category, date: f.date, documentMetadataUrl: f.links?.document_metadata ?? null }));
  } catch (err) {
    errors.push({ phase: 'FILING_HISTORY', error: err.message });
  }

  return { recorded, narrativeCandidates, errors };
}
