// capitaleventadmission.js -- KRYL-1401. The path from an extracted capital event to admitted CAPITAL_EVENT_INVOLVES relationships:
//   extracted event (edgar8kcontent.js) -> counterparty matching (counterpartymatch.js) -> assertion -> admitAndProject (the single write path).
// Only a counterparty with a CONFIRMED matching outcome is admitted; candidate, unresolved, failed and self outcomes are reported and never admitted.
// The matching outcome is carried in the evidence exactly as returned, including the unnamed-affiliate qualification. Magnitude is INDETERMINATE.
import { admitAndProject } from './canonicalrelationshipprojection.js';
import { nodeId } from './entitytopologyregistry.js';
import { matchCounterparty, isConfirmed } from './counterpartymatch.js';
import './ratifiedrelationshiptypes.js';

const labelOf = (name, cik) => `${name} (CIK ${String(cik).replace(/\D/g, '').padStart(10, '0')})`;

/**
 * One assertion for one (event, counterparty, match), or { skip } with the reason. Pure.
 * @param {{ filer:{cik:string,name:string}, event:{accession:string,filingDate:string,form?:string,items:string[],eventClass?:string,capital:object}, counterparty:object, match:object }} p
 */
export function buildCapitalEventAssertion({ filer, event, counterparty, match }) {
  if (!isConfirmed(match)) return { skip: `counterparty "${counterparty?.name}" is ${match?.outcome ?? 'unmatched'}: not admitted` };
  const cap = event.capital ?? {};
  const instrument = cap.instruments?.[0]?.text ?? null;
  const unnamed = match.outcome === 'AFFILIATION_CONFIRMED' && match.partyIsNamed === false;
  const partyCik = match.identifier.value;
  return {
    assertion: {
      part: [nodeId(filer.cik, filer.name), nodeId(partyCik, match.canonicalName)],
      type: 'CAPITAL_EVENT_INVOLVES',
      nuId: { event: event.accession, partyQualifier: unnamed ? 'UNNAMED_AFFILIATE_OF' : 'NONE' },
      nuState: {},
      evidence: {
        ts: Date.parse(event.filingDate) || Date.now(),
        provenance: {
          source: 'SEC_8K_CAPITAL_EVENT', accession: event.accession, form: event.form ?? '8-K', filingDate: event.filingDate, items: event.items,
          eventClass: event.eventClass ?? null,
          instrument, instruments: (cap.instruments ?? []).map(i => i.text),
          amounts: (cap.amounts ?? []).slice(0, 3).map(a => ({ raw: a.raw, currency: a.currency, wording: a.wording })),   // quoted from the filing; no magnitude is derived
          passage: counterparty.passage, counterpartyName: counterparty.name, counterpartyRole: counterparty.role ?? null,
          counterpartyMatch: match,
          ladderStep: match.outcome === 'SAME_ENTITY_CONFIRMED' ? 'ESTABLISHED_RELATIONSHIP' : 'SUPPORTED_CONNECTION',
          magnitude: 'INDETERMINATE',
        },
      },
    },
    meta: {
      filerName: filer.name, filerCik: filer.cik, counterpartyName: match.canonicalName, counterpartyCik: partyCik,
      counterpartyLabel: labelOf(match.canonicalName, partyCik), source: 'SEC_8K_CAPITAL_EVENT',
    },
  };
}

/**
 * Match and admit the counterparties of the given extracted events (newest first), at most `maxNames` distinct names per call
 * (matching is spaced SEC requests; results are cached per name for the page session, so a later call continues where this one stopped).
 * @returns {{ admitted: object[], rejected: object[], matched: number, deferred: number }}
 */
export async function admitCapitalEvents({ filer, events, searchFn, sleep, gapMs, now = Date.now(), maxNames = 12, registryCache = null }) {
  const admitted = [], rejected = []; const seen = new Set(); let matched = 0, deferred = 0;
  const ordered = [...(events ?? [])].sort((a, b) => String(b.filingDate).localeCompare(String(a.filingDate)));
  for (const event of ordered) {
    const cap = event.capital;
    if (!cap?.attempted || !cap.counterparties?.length) continue;
    for (const cp of cap.counterparties) {
      const key = cp.name.toLowerCase();
      if (!seen.has(key)) {
        if (seen.size >= maxNames) { deferred++; continue; }
        seen.add(key); matched++;
      }
      const match = await matchCounterparty({ name: cp.name, registrant: filer.name, passage: cp.passage, searchFn, now, sleep, gapMs, registryCache });
      const built = buildCapitalEventAssertion({ filer, event, counterparty: cp, match });
      if (built.skip) { rejected.push({ accession: event.accession, counterparty: cp.name, outcome: match.outcome, reason: built.skip }); continue; }
      if (!built.assertion.evidence.provenance.instrument) { rejected.push({ accession: event.accession, counterparty: cp.name, outcome: match.outcome, reason: 'no instrument stated in the filing: not admitted' }); continue; }
      const res = admitAndProject(built.assertion, built.meta);
      if (res.admitted) admitted.push({ accession: event.accession, counterparty: cp.name, outcome: match.outcome, predicate: res.predicate, relationship: res.relationship });
      else rejected.push({ accession: event.accession, counterparty: cp.name, outcome: match.outcome, reason: res.reason });
    }
  }
  return { admitted, rejected, matched, deferred };
}
