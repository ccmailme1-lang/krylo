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
import { registerOwnershipEdge, nodeId } from '../entitytopologyregistry.js';
import { realiseSnapshot } from '../gwrealiser.js';
import { buildStructure } from '../sigmaengine.js';
import { makeRelationCore, RelationType } from '../relationontology.js';
import { admitCandidate } from '../admissionengine.js';
import { Vocabulary } from '../truthevent.js';
import { resolveByIdentifier, createEntity } from '../entityresolution.js';
import { admitAndDispatch } from '../evidenceadmissiongate.js';
import { ProvenanceDAG } from '../causalos/provenance.js';

const SEARCH_BASE = '/api/edgar';
const MAX_HITS    = 100;

// KRYL-1201 — Tier 2 entity admission. SEC/EDGAR CIK is the sole admission authority;
// this connector doesn't assert identity, it only supplies what the filing schema
// already established (same "structurally guaranteed pair" fact this file's own header
// already relies on). CIK-first lookup before creation makes admission idempotent — a
// CIK seen again in a later sync resolves to the existing runtime entity, never a
// duplicate. domainTags stays [] always (no SIC->domain inference, out of scope per
// SPEC-KRYL-1201). admissionEvidence reuses this sync's own accession number, the same
// identifier already used as provenanceHash below — not a new provenance primitive.
// This function creates identity substrate only; it never registers an edge, signal,
// or relationship itself.
function admitIfUnknown(cik, name, accession) {
  if (!cik || !name) return;
  if (resolveByIdentifier('edgar', cik)) return; // already known — static or runtime
  createEntity({
    canonicalName: name,
    identifiers: { edgar: cik },
    domainTags: [],
    admissionSource: 'SEC/EDGAR',
    admissionEvidence: accession ?? null,
  });
}

// KRYL-1204 — `entityName` is an optional real narrowing attempt (SEC's own EDGAR full-text
// search API accepts this param), passed through only when a targeted call supplies one.
// Existing 2-arg untargeted callers (runSecOwnershipSync below) are byte-identical to before —
// no `entityName` key is added to the query when omitted. Correctness of a targeted call never
// depends on the backend proxy (/api/edgar -> localhost:4000, outside this repo) honoring this
// param — runTargetedOwnershipObservation below always re-filters client-side regardless.
async function searchOwnershipFilings(startdt, enddt, entityName) {
  const params = new URLSearchParams({
    forms:     'SC 13D,SC 13G',
    dateRange: 'custom',
    startdt,
    enddt,
    hits:      String(MAX_HITS),
  });
  if (entityName) params.set('entityName', entityName);
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
  let firstSeedId = null; // KRYL-Lean-Ontology: nodeId of the first successfully-registered
                           // pair's subject — used below to seed a real Σ from this sync's
                           // own live edges, not a fixture.

  for (const hit of hits) {
    const pair = extractOwnershipPair(hit);
    if (!pair) { errors.push({ hit: hit._id, error: 'malformed ciks/display_names pair' }); continue; }

    try {
      admitIfUnknown(pair.subjectCik, pair.subjectName, pair.accession);
      admitIfUnknown(pair.filerCik,   pair.filerName,   pair.accession);

      registerOwnershipEdge({
        subjectCik: pair.subjectCik, subjectName: pair.subjectName,
        filerCik:   pair.filerCik,   filerName:   pair.filerName,
      });
      if (!firstSeedId) firstSeedId = nodeId(pair.subjectCik, pair.subjectName);
      registered++;

      // RelationCore + admission — real evidence, real provenance (SEC accession number, a
      // unique, verifiable filing identifier — stronger than any hash placeholder). structurally
      // guaranteed pair per this file's own header comment. DEPENDS_ON reflects Schedule 13D/13G's
      // actual claim: the filer has taken/discloses a beneficial ownership position dependent on
      // the subject company's shares existing — closer to the real relation than a symmetric type.
      try {
        const rc = makeRelationCore({
          id: `rc_sec13d_${nodeId(pair.subjectCik, pair.subjectName)}_${nodeId(pair.filerCik, pair.filerName)}_${pair.accession ?? Date.now()}`,
          sourceId: nodeId(pair.filerCik, pair.filerName),
          targetId: nodeId(pair.subjectCik, pair.subjectName),
          relationType: RelationType.DEPENDS_ON,
          eta: 0.9, // structurally guaranteed field per SEC filing schema, not inferred
          phi0: 0.5, // placeholder pending real calibration — no doctrine establishes this value
          structuralSupport: 0.9,
          provenanceHash: pair.accession ?? `no_accession_${Date.now()}`,
          createdAt: pair.filingDate ? Date.parse(pair.filingDate) : Date.now(),
        });
        const { decision, event } = admitCandidate(
          { ...rc, vocabulary: Vocabulary.SRE_RELATIONCORE, relationType: RelationType.DEPENDS_ON, origin: 'OBSERVED' },
          { decidedBy: 'sec_ownership_producer', rulesetVersion: '1.0.0', now: Date.now(),
            sreRelationTypes: new Set(Object.values(RelationType)) }
        );
        if (decision !== 'VALIDATED') {
          console.info(`[SEC13D->M7] ${rc.id}: ${decision} (${event.rationale.map(r => r.ruleId + ':' + r.outcome).join(', ')})`);
        }
      } catch (rcErr) {
        console.warn('[SEC13D->M7] RelationCore/admission failed:', rcErr.message);
      }
    } catch (err) {
      errors.push({ hit: hit._id, error: err.message });
    }
  }

  // KRYL-Lean-Ontology live integration — additive, changes nothing above. Runs the real
  // edges this sync just registered through the actual Gᵂ → σ → Σ → πΣ path (gwrealiser.js
  // / sigmaengine.js) instead of leaving that machinery wired-but-uncalled, which is the
  // exact failure mode already documented against WO-2004's attachDomainPressures/attachSCI
  // and WO-2005B's computeStructuralSuite (audits 001/002). No evidenceGraph is available
  // here (this connector produces R edges directly, not WO-2004 EvidenceNodes) — props_Σ
  // is therefore expected to stay empty on this specific path, which is the correct §22
  // withhold behavior, not a defect.
  let sigmaProof = null;
  if (firstSeedId) {
    // end: Date.now(), not Date.parse(enddt) — edges register with a Date.now() timestamp,
    // and enddt parses to midnight UTC on the query's end date. A sync running any time
    // after midnight on its own end date would otherwise exclude the edges it just wrote.
    const window = { start: Date.parse(startdt), end: Date.now() };
    const snapshot = realiseSnapshot({ window });
    sigmaProof = buildStructure({ sigmaId: `SEC_13D_13G_SYNC_${Date.now()}`, snapshot, seedId: firstSeedId });
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

  return {
    registered, total: hits.length, errors,
    // KRYL-Lean-Ontology — additive field, existing callers reading registered/total/errors
    // are unaffected. sigma: null when nothing was registered (no seed to build from).
    sigma: sigmaProof
      ? { sigmaId: sigmaProof.sigmaId, vertexCount: sigmaProof.vertices.length, edgeCount: sigmaProof.edges.length, traceable: sigmaProof.traceable }
      : null,
  };
}

// KRYL-1204 — targeted observation, entity/CIK-scoped. Additive only: does not alter
// runSecOwnershipSync's existing untargeted behavior above, and does not touch its
// dispatchBatch call. Returns entity-specific filing evidence (not the aggregate signal
// only) and routes each admitted filing through KRYL-1203's admitAndDispatch() — this
// function does not import surfaceRouter and cannot reach dispatchBatch() directly, per
// the spec's structural no-bypass requirement.
//
// Real capability, not simulated: reuses the same EDGAR FTS call runSecOwnershipSync
// already makes. Entity scoping is a real client-side filter over the date-windowed
// results — correctness never depends on the backend (outside this repo) honoring the
// optional server-side entityName param. No KRYLCF/Structural Integrity step anywhere
// in this function, per the ratified v1 compatibility rule.
export async function runTargetedOwnershipObservation({ entityCik, from, to } = {}) {
  if (!entityCik) {
    return { admitted: [], rejected: [], matched: 0, total: 0, error: 'entityCik is required for a targeted observation' };
  }

  const startdt = from ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const enddt   = to   ?? new Date().toISOString().slice(0, 10);

  let hits;
  try {
    hits = await searchOwnershipFilings(startdt, enddt, entityCik);
  } catch (err) {
    return { admitted: [], rejected: [], matched: 0, total: 0, error: err.message };
  }

  // Real client-side entity scoping. No-match is an explicit, real empty result — never
  // a fabricated hit and never silently collapsed into an aggregate count.
  const matches = [];
  for (const hit of hits) {
    const pair = extractOwnershipPair(hit);
    if (!pair) continue;
    if (pair.subjectCik === entityCik || pair.filerCik === entityCik) matches.push(pair);
  }

  const admitted = [];
  const rejected = [];
  for (const pair of matches) {
    const dag = new ProvenanceDAG();
    dag.add({
      event_id: `edgar_13d13g_${pair.accession ?? Date.now()}_${pair.subjectCik}_${pair.filerCik}`,
      kind: 'sec_ownership_filing',
    });

    // Hard loss-boundary requirement (specs/SPEC-closed-loop-observation-architecture.md
    // §6): entity/CIK, filing identity, accession/reference, source, temporal scope, and
    // provenance must all survive past this connector boundary — no reduction to a bare
    // filing count. EAG's admitAndDispatch() now preserves every field on this candidate
    // (fixed 2026-08-25 — it previously allow-listed only the base tagging fields).
    // Evidence class, fixed 2026-08-26 (final Bottle Test gap: evidence magnitude semantics).
    // A single Schedule 13D/13G filing hit only exposes ciks/names/date/accession from the
    // EDGAR full-text search metadata — no share count, percentage, or dollar amount is
    // extracted. There is no real per-filing magnitude available here to compute. Rather
    // than pass an unlabeled numeric `signal` implying a measured strength that doesn't
    // exist, this observation type is explicit: CATEGORICAL (a qualifying filing exists or
    // it doesn't), not magnitude-bearing. Confirmed unused downstream in this pipeline
    // regardless — domaingravity.js's pool only stores {confidence, polarity, ts} per
    // entry, and buildPerceptionField()'s toParticle() only reads
    // {domain, confidence, polarity, ts} — `signal` reaches neither. `signal: 100` is kept
    // only because dispatchBatch()'s event shape elsewhere in the app expects the field to
    // be present; evidence_class makes its true (non-)meaning explicit and auditable rather
    // than silent.
    const result = admitAndDispatch({
      source:       'SEC_13D_13G_TARGETED',
      domain:       'OWNERSHIP',
      signal:       100,
      evidence_class: 'CATEGORICAL_PRESENCE', // not a computed magnitude — see comment above
      confidence:  0.9,       // runSecOwnershipSync's coarse whole-batch aggregate
      // ts = dispatch time, matching runSecOwnershipSync's own convention above — NOT the
      // historical filing date. domaingravity.js's pool prunes anything older than its
      // 10-min retention window immediately on push (real, existing, bounded-memory
      // behavior) — a real filing date would be evicted before getAllSignals() ever sees
      // it. filingDate is preserved separately below, unmodified, as the actual evidence.
      ts:          Date.now(),
      polarity:    POLARITY.POSITIVE,
      decay:       DECAY.DAILY,
      provenance:  dag,
      identityId:  entityCik,
      evidence:    [pair.accession ?? `no_accession_${Date.now()}`],
      subjectCik:  pair.subjectCik,  subjectName: pair.subjectName,
      filerCik:    pair.filerCik,    filerName:   pair.filerName,
      accession:   pair.accession,   filingDate:  pair.filingDate,
      searchWindow: { startdt, enddt },
    });

    if (result.admitted) admitted.push(result.artifact);
    else rejected.push(result.rejection);
  }

  return { admitted, rejected, matched: matches.length, total: hits.length };
}
