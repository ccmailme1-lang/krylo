// KRYL-1203 — Evidence Admission Gate (EAG)
// specs/SPEC-evidence-admission-gate.md (RATIFIED) + specs/SPEC-closed-loop-observation-architecture.md §7.
//
// Scope, ratified NARROW: gates only the KRYL-1204 targeted-observation path. Does NOT retrofit
// the ~30 existing connectors already flowing through surfaceRouter.dispatchBatch() directly —
// those are untouched, per KRYL-1203's own ratified scope.
//
// Structural-enforcement contract (SPEC-closed-loop-observation-architecture.md §7): this module
// is the ONLY place KRYL-1204 code may reach surfaceRouter.dispatchBatch(). No other file in the
// KRYL-1204 targeted-invocation path may import surfaceRouter directly — admitAndDispatch() is
// the sole export that touches it.
//
// v1 KRYLCF Compatibility: admitted evidence enters the existing evidence/provenance substrate
// directly via dispatchBatch() — no KRYLCF/Structural Integrity step, per the ratified v1 rule on
// KRYL-1202.

import { surfaceRouter } from './surfacerouter.js';
import { ProvenanceDAG } from './causalos/provenance.js';
import { listByIdentity, EPISTEMIC_STATE } from './rkmstore.js';

// EAC4 — explicit rejection, never silent drop. Append-only, mirrors rkmstore.js's own
// append-only pattern. Not a new store class — a plain ledger, per the spec's "reuse existing
// storage patterns" instruction (rkmstore itself is the pattern being reused, not extended).
const _rejections = new Map();

function rejectionId() {
  return `eag_rej_${crypto.randomUUID()}`;
}

function hashPayload(candidate) {
  // Cheap, deterministic, no crypto dependency needed for an audit hash — not a security
  // boundary, just a stable identifier for the rejection record (EAC4).
  const s = JSON.stringify(candidate, Object.keys(candidate).sort());
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return `sha_${(h >>> 0).toString(16)}`;
}

function reject(candidate, failingCheck, reason) {
  const record = {
    id: rejectionId(),
    payload_hash: hashPayload(candidate),
    failing_check: failingCheck,
    reason,
    timestamp: new Date().toISOString(),
  };
  _rejections.set(record.id, record);
  return { admitted: false, rejection: record };
}

// EAC1 — source identity. Reuses the CLAUDE.md §12 tagging contract exactly — no new scheme.
function checkEAC1(candidate) {
  const required = ['source', 'domain', 'signal', 'confidence', 'ts'];
  const missing = required.filter(k => candidate[k] === undefined || candidate[k] === null);
  if (missing.length > 0) {
    return { ok: false, reason: `EAC1: missing required field(s): ${missing.join(', ')}` };
  }
  if (typeof candidate.source !== 'string' || candidate.source.trim() === '') {
    return { ok: false, reason: 'EAC1: source must be a non-empty string' };
  }
  return { ok: true };
}

// EAC2 — provenance chain. Reuses ProvenanceDAG (causalos/provenance.js) — does not invent a
// second lineage mechanism. The candidate must carry a real DAG with at least one node the
// admitted artifact can be traced from.
function checkEAC2(candidate) {
  const prov = candidate.provenance;
  if (!(prov instanceof ProvenanceDAG)) {
    return { ok: false, reason: 'EAC2: candidate.provenance is not a ProvenanceDAG instance' };
  }
  if (typeof prov.size === 'function' && prov.size() === 0) {
    return { ok: false, reason: 'EAC2: provenance DAG is empty — no reconstructible lineage' };
  }
  return { ok: true };
}

// EAC3 — structural admissibility. Reuses rkmstore.js's existing identity/epistemic-state
// machinery for the contradiction check — no second contradiction metric defined here. A
// candidate with no identityId has nothing to check against and passes vacuously (honest
// absence, not a fabricated pass) — most KRYL-1204 v1 candidates will carry one, since targeted
// observations are entity-scoped by definition (SPEC §2 TargetSpec.target_entities).
function checkEAC3(candidate) {
  if (!candidate.identityId) {
    return { ok: true, note: 'EAC3: no identityId on candidate — vacuous pass, not checked' };
  }
  const existing = listByIdentity(candidate.identityId);
  const disputed = existing.filter(o => o.epistemicState === EPISTEMIC_STATE.DISPUTED);
  if (disputed.length > 0 && !(Array.isArray(candidate.evidence) && candidate.evidence.length > 0)) {
    return {
      ok: false,
      reason: `EAC3: identity ${candidate.identityId} has ${disputed.length} disputed prior object(s) and this candidate adds no new evidence`,
    };
  }
  return { ok: true };
}

// EAC5 — no confidence elevation. Admission is binary; this function must never compute or
// attach a confidence/strength score distinct from candidate.confidence as received.
function admitCandidate(candidate) {
  const eac1 = checkEAC1(candidate);
  if (!eac1.ok) return reject(candidate, 'EAC1', eac1.reason);

  const eac2 = checkEAC2(candidate);
  if (!eac2.ok) return reject(candidate, 'EAC2', eac2.reason);

  const eac3 = checkEAC3(candidate);
  if (!eac3.ok) return reject(candidate, 'EAC3', eac3.reason);

  // Admitted artifact: the full candidate, verbatim — INCLUDING provenance. Fixed
  // 2026-08-26 (final Bottle Test gap #8): provenance was previously stripped here, so
  // the specific observation's ProvenanceDAG was validated by EAC2 and then destroyed —
  // "validated then dropped" is not preservation. The artifact returned to the caller
  // (and from there, into Path Memory) now retains the real DAG. Hard loss-boundary
  // requirement (specs/SPEC-closed-loop-observation-architecture.md §6): no field the
  // caller attached — entity/CIK, accession, filing date, search window, provenance,
  // anything else — may be silently dropped here. EAC5 (no confidence elevation) means
  // no NEW computed field is added on top of what the candidate already carried, not
  // that extra real fields get stripped.
  const artifact = { ...candidate, identityId: candidate.identityId ?? null };
  return { admitted: true, artifact };
}

// The sole export that may reach dispatchBatch() for KRYL-1204-originated evidence.
// Per §7's structural-enforcement contract: no other file in the targeted-invocation path
// may import surfaceRouter directly.
//
// The returned `result.artifact` (and therefore Path Memory, which reads from it) keeps
// the full ProvenanceDAG. What actually reaches dispatchBatch()/domaingravity's pool is a
// separate, provenance-free projection — that shared signal pool stores only
// {confidence, polarity, ts} per entry (domaingravity.js) and was never meant to carry a
// DAG class instance through its topology/amplification pipeline. Dropping provenance
// there is a real, deliberate boundary (a different concern from Path Memory's audit
// trail), not the same loss the Bottle Test flagged.
export function admitAndDispatch(candidate) {
  const result = admitCandidate(candidate);
  if (!result.admitted) return result;
  const { provenance, ...dispatchable } = result.artifact;
  surfaceRouter.dispatchBatch([dispatchable]);
  return result;
}

// Audit access — read-only, for the surface/Path Memory, never mutated after write (EAC4).
export function listRejections() {
  return Array.from(_rejections.values());
}

export function getRejection(id) {
  return _rejections.get(id) ?? null;
}
