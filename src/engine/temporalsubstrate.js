// temporalsubstrate.js -- Step 4b of the decision record (2026-10-11): temporal interpretation on the canonical relationship substrate.
// The 13D/13G observations the comparison needs (holder, class, percent, event date, rights, release number...) are admitted as VERSIONS of the
// canonical HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE relationships (issuer, holder) through the single write path, so they are durable, versioned and
// shared with every other consumer; the comparison then reads its history back FROM the store. A retrieval record per issuer says through which
// date SEC has been searched completely, so a later analysis retrieves only what is newer.
import { admitAndProject } from './canonicalrelationshipprojection.js';
import { nodeId } from './entitytopologyregistry.js';
import { fetchRelationships, kv, flushStore } from './canonicalstoreclient.js';
import { addMonths } from './relationshipchange.js';
import './ratifiedrelationshiptypes.js';

const pad10 = (c) => String(c ?? '').replace(/\D/g, '').padStart(10, '0');
export const retrievalKey = (issuerCik) => `temporal:ownership:${pad10(issuerCik)}`;
export const OVERLAP_DAYS = 3;                       // an incremental search starts a few days before the stored boundary (late-indexed filings)

const addDays = (iso, n) => { const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/); return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n)).toISOString().slice(0, 10); };

/** One observation as an admission assertion: the observation's parsed fields ride in the evidence provenance (nothing is inferred). */
export function observationAssertion(obs, { issuerCik, issuerName }) {
  const holderCik = pad10(obs.holderCik);
  return {
    assertion: {
      part: [nodeId(issuerCik, issuerName), nodeId(holderCik, obs.holderName)],
      type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', nuId: {}, nuState: {},
      evidence: { ts: Date.parse(obs.eventDate ?? obs.filingDate) || Date.now(), provenance: { accession: obs.accession, source: 'SEC_13D_13G_HISTORY', filingDate: obs.filingDate, form: obs.form, observation: { ...obs } } },
    },
    meta: { subjectCik: pad10(issuerCik), subjectName: issuerName, filerCik: holderCik, filerName: obs.holderName, source: 'SEC_13D_13G_HISTORY' },
  };
}

/** Admit retrieved observations through the single write path. Returns the number admitted (NEW or PERSISTENT). */
export async function persistObservations(observations, issuer) {
  let n = 0;
  for (const obs of observations ?? []) {
    if (!obs?.accession || !obs.holderCik) continue;
    const { assertion, meta } = observationAssertion(obs, issuer);
    const r = admitAndProject(assertion, meta);
    if (r.admitted) n++;
  }
  await flushStore();
  return n;
}

/** Observations back out of stored records: every version that carries a parsed observation, one per filing (accession + class). */
export function observationsFromRecords(records, issuerCik) {
  const want = pad10(issuerCik); const seen = new Map();
  for (const rec of records ?? []) {
    if (rec.type !== 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE') continue;
    for (const v of rec.versions ?? []) {
      const o = v.evidence?.provenance?.observation;
      if (!o || pad10(o.issuerCik) !== want) continue;
      seen.set(`${o.accession}|${o.cusip ?? '?'}`, o);
    }
  }
  return [...seen.values()];
}

/** Stored history for an issuer: observations, the retrieval record, and whether the store answered. */
export async function loadStoredHistory(issuerCik, issuerName) {
  const { records, error } = await fetchRelationships([nodeId(issuerCik, issuerName)]);
  const rec = await kv.get(retrievalKey(issuerCik));
  return { observations: error ? [] : observationsFromRecords(records, issuerCik), record: rec?.value ?? null, storeError: error };
}

/** The window to retrieve: everything for a first retrieval, otherwise only what is newer than the last COMPLETE retrieval. */
export function incrementalWindow({ record, storedCount, from, to }) {
  if (record?.complete === true && record.through && storedCount > 0 && record.through <= to) {
    const start = addDays(record.through, -OVERLAP_DAYS);
    return { from: start > from ? start : from, to, incremental: true, previousThrough: record.through };
  }
  return { from, to, incremental: false, previousThrough: record?.through ?? null };
}

export async function saveRetrievalRecord(issuerCik, rec) { return kv.put(retrievalKey(issuerCik), rec); }
export { addMonths };
