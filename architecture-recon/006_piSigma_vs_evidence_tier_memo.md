# πΣ vs Evidence-Tier — Normative Separation Memo

Status: Architecture Recon / NOT a build spec. Normative annex for future Spec D (πΣ
Traceability Extension). No code changed to produce this document.

## The rule

**πΣ answers exactly one question: can this structural element be traced to at least one
supporting Event or Relationship? Yes or no.**

It does not answer, and must never be extended to answer: *how trustworthy is that evidence,
how independent is it, how likely is it to be fabricated.* Those are Evidence-Tier questions —
a different axis, computed by different code, for a different purpose.

```
πΣ           = traceability / lineage        (binary: does a link exist)
EvidenceTier = evidentiary quality            (continuous: how much should this be trusted)
SCI vector   = structural integrity assessment (derived from EvidenceTier + graph shape)
ℒ            = observation status              (⊤/⊥/? — separate from both of the above)
```

## Why this is not a new rule — it's already KRYLO doctrine

CLAUDE.md §23 (Orthogonal Axis Integrity Principle, locked 2026-07-03): "All metric axes used in
scoring systems must be orthogonal unless explicitly declared dependent. Violation exists if Axis
A can be expressed as a function of Axis B... FAILURE MODE: non-orthogonal axes produce artificial
confidence inflation, duplicated signal weighting, and false convergence stability."

πΣ (a boolean/relational fact: does a trace exist) and evidence weight (a continuous score: how
much should this be trusted) are exactly the two axes §23 warns against merging. If πΣ absorbed
tier weighting, a well-traced-but-low-quality piece of evidence and a well-traced-and-high-quality
piece of evidence would look identical at the πΣ layer, and the weighting would have to be
re-derived or duplicated downstream — the "duplicated signal weighting" failure mode named
explicitly in §23.

## Grounding in what's already built (cited to audits 001/002)

The separation this memo states as normative for the *new* πΣ work already exists, independently,
in the *current* codebase — this memo is making explicit a boundary KRYLO has already drawn twice:

- `evidencetiers.js` (WO-2005A) header, quoted directly: **"CONTAINS NO SCORING LOGIC. No numeric
  values except booleans... Calibrated properties (anchorStrength, independencePrior) live in
  structuralconfirmation.js."** [002] The descriptor layer (what *kind* of evidence this is) is
  already kept separate, by explicit constitutional comment, from the weighting layer (how
  strong that evidence is).
- `evidencetiers.js`'s own stated invariant: **"Admission Invariant: descriptors SHALL NOT
  influence ingestion, routing, or cone pressure. Interpretation Invariant: descriptors MAY
  influence identity + corroboration after admission. Parity governs admission. Epistemics
  governs interpretation."** [002] — a second, independently-stated boundary between "does this
  count as evidence at all" and "how should this evidence be weighted once admitted."
- `structuralconfirmation.js` (WO-2005B) owns the actual numbers (`CALIBRATION_PRIORS`:
  `anchorStrength`, `independencePrior` per evidence type) in a file explicitly separate from the
  descriptor file, with its own header comment: **"WO-2005B owns these numbers — not
  evidencetiers.js."** [002]
- `ProvenanceDAG` (WO-1336) — read earlier this session, not re-verified line-by-line in this
  pass — is a pure lineage structure: `{envelope, parent_ids}`, immutable, cycle-checked. It
  carries **no score field at all**. It is a relation (this event descends from that event), not
  a weighted judgment.

**Conclusion: KRYLO's existing architecture already treats "is this evidence" (admission),
"what kind of evidence is this" (descriptor), "how strong is this evidence" (calibration/weight),
and "what does this evidence descend from" (lineage) as four separate concerns, each in its own
file, none scoring the others.** πΣ, when built, is a fifth concern — "can a specific structural
element be traced to a specific evidence instance" — and it should join this list as a fifth
orthogonal axis, not be folded into any of the existing four.

## What this means for Spec D specifically

- πΣ's data shape should be a **relation** (`(E∪R) × (V_Σ∪E_Σ∪props_Σ)`, per rc3 §8), not a
  scored/weighted table. A row either exists or it doesn't.
- The correct substrate to **extend** is `ProvenanceDAG` — add element-level link records
  (`evidence_id ↔ {vertex|edge|property}_id`) without adding a score/weight column to the DAG
  itself. Extend, don't replace, per the same principle already applied in audit 001's
  conclusion about WO-2004.
- Evidence-Tier weighting (`evidencetiers.js` classes, `structuralconfirmation.js` calibration
  numbers) continues to feed the Integrity layer (`structuralintegrity.js`'s β_c vector, or
  WO-2005B's own SCI-CONFIRMATION score) — **downstream of and separate from** whether a πΣ link
  exists at all. A structural element can be well-traced (πΣ = yes) and still be judged
  low-integrity (weak evidence tier) — those are two different, simultaneously-true facts about
  the same element, and the architecture must be able to express both without one silently
  overwriting the other.

## What this memo does not decide

- The exact schema of the new πΣ link records (field names, whether it lives inside
  `ProvenanceDAG`'s existing structure or as a sibling table/module) — that's Spec D's job.
- Whether `ProvenanceDAG`'s current per-CanonicalEvent scoping needs to change to support
  cross-event Σ traceability — flagged as an open question for Spec D, not resolved here.

## Status

This memo is normative for future Spec D drafting. It does not authorize any code change. The
separation it states (πΣ binary, weighting downstream) is not new — it is the same boundary
`evidencetiers.js`/`structuralconfirmation.js` already draw between descriptor and calibration,
extended one layer further to cover the not-yet-built πΣ relation.
