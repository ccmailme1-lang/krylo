// Six Degrees v2 — Edge Type #2: Beneficial Ownership (SEC Schedule 13D/13G)
// Structurally guaranteed entity pair — the [subject company, filer] CIK pair is a
// required field on these filings, not extracted from prose. Same reliability tier
// as WO-1856's inventor-migration edge (patentsviewconnector.js), different source.
// Reuses the existing EDGAR full-text search proxy (/api/edgar, KRYL-969) — no new
// backend route needed.
//
// Domain: OWNERSHIP (matches existing convention — censusconnector.js, maerskconnector.js)

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';
import { registerOwnershipEdge } from '../entitytopologyregistry.js';

const SEARCH_BASE = '/api/edgar';
const MAX_HITS    = 100;

async function searchOwnershipFilings(startdt, enddt) {
  const params = new URLSearchParams({
    forms:     'SC 13D,SC 13G',
    dateRange: 'custom',
    startdt,
    enddt,
    hits:      String(MAX_HITS),
  });
  const res = await fetch(`${SEARCH_BASE}?${params}`);
  if (!res.ok) throw new Error(`EDGAR ownership search HTTP ${res.status}`);
  const json = await res.json();
  return json.hits?.hits ?? [];
}

// Each hit's ciks/display_names arrays are parallel — index 0 is the subject
// company (whose shares are held), index 1+ are filer(s)/beneficial owner(s).
// Confirmed structurally consistent across 100/100 sampled real filings.
function extractOwnershipPair(hit) {
  const src   = hit._source ?? {};
  const ciks  = src.ciks ?? [];
  const names = src.display_names ?? [];
  if (ciks.length < 2 || names.length < 2) return null;
  return {
    subjectCik:  ciks[0],
    subjectName: names[0],
    filerCik:    ciks[1],
    filerName:   names[1],
    filingDate:  src.file_date ?? null,
    accession:   src.adsh ?? null,
  };
}

export async function runSecOwnershipSync({ from, to } = {}) {
  const startdt = from ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const enddt   = to   ?? new Date().toISOString().slice(0, 10);

  let hits;
  try {
    hits = await searchOwnershipFilings(startdt, enddt);
  } catch (err) {
    surfaceRouter.dispatchBatch([{
      source: 'SEC_13D_13G', domain: 'OWNERSHIP', signal: 0, confidence: 0, ts: Date.now(),
    }]);
    return { registered: 0, total: 0, error: err.message };
  }

  let registered = 0;
  const errors   = [];

  for (const hit of hits) {
    const pair = extractOwnershipPair(hit);
    if (!pair) { errors.push({ hit: hit._id, error: 'malformed ciks/display_names pair' }); continue; }

    try {
      registerOwnershipEdge({
        subjectCik: pair.subjectCik, subjectName: pair.subjectName,
        filerCik:   pair.filerCik,   filerName:   pair.filerName,
      });
      registered++;
    } catch (err) {
      errors.push({ hit: hit._id, error: err.message });
    }
  }

  // Normalized 0-100 signal per §16 shared pool contract — filing volume in window
  // as a coarse ownership-activity signal, not a scored/weighted metric.
  const signal = Math.min(100, Math.round((hits.length / MAX_HITS) * 100));
  surfaceRouter.dispatchBatch([{
    source:    'SEC_13D_13G',
    domain:    'OWNERSHIP',
    signal,
    confidence: hits.length > 0 ? 0.9 : 0,
    ts:        Date.now(),
    polarity:  POLARITY.POSITIVE,
    decay:     DECAY.DAILY,
  }]);

  return { registered, total: hits.length, errors };
}
