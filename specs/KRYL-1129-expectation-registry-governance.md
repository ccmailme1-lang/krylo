# WO-XXXX — Expectation Registry Governance

**Status:** SPEC HARDENED — READY, v1 scope only
**Number:** unassigned — per Jira-exclusive numbering doctrine, this file is not a WO until a
KRYL-#### ticket is opened. Do not build against "WO-XXXX." This is a distinct placeholder from
the companion `WO-XXXX — Structural Delta Encoding` spec — the two are not the same number.
**Depended on by:** `WO-XXXX — Structural Delta Encoding` (that primitive's `expected` input is
supplied by this registry — see its §7/§8)
**Origin:** backlog discussion 2026-07-31, continuation of the Structural Delta Encoding spec.

---

## Core Invariant

**The registry governs comparison frames. It does not define reality.**

```
Expectation is a reference frame.
Expectation is not truth.
Expectation is not evidence.
Expectation is not completeness.
```

Everything below exists to protect that line.

---

## 1. Single Responsibility

**Job:** Store, version, and control the introduction of `ExpectedStructure` records — the
comparison frames that `WO-XXXX — Structural Delta Encoding` compares observed evidence against.

**Output:** A versioned, provenance-stamped `ExpectedStructure`, retrievable by
`(formation_type, version)`, with a defined activation status.

---

## 2. Boundary Declaration

**Input contract:** A human authority (Founder or a named DomainOwner) submits an
`ExpectedStructure` — a named element list for a formation type, plus source and effective date.

**Output contract:** The same record, stored, versioned, and queryable — plus a `status`
(`Draft | Active | Superseded | Retired`) and full provenance (who, when, from where).

**Explicit exclusions:**
- Does NOT calculate completeness scores
- Does NOT rank or weight missing elements
- Does NOT infer importance
- Does NOT generate candidate models from peer/statistical observation (see §7 — explicitly
  deferred, not built here)
- Does NOT auto-promote anything to `Active`
- Does NOT merge competing models into one canonical model
- Does NOT convert an absence into an opportunity classification
- Does NOT assign a confidence or probability score to the `ExpectedStructure` model itself —
  a model is either `ACTIVE` (in force) or it isn't; there is no "80% confident this is the
  right frame" field. That would smuggle scoring in at the model-definition level instead of
  the comparison level, which is the same violation one level up.
- Does NOT decide which of several `Active` models for the same formation type is "correct" —
  that choice belongs to the caller of Structural Delta Encoding, not the registry

If you find yourself writing code that ranks, scores, or auto-approves inside this module —
stop. That is a different, unbuilt system (§7).

---

## 3. Zero Drift Confirmation

- [x] Detection layer touched → inference does NOT redefine signal schema. **Confirmed not
      violated**: this module stores declarations, it does not detect anything.
- [x] Scoring layer touched → output is NOT a recommendation. **Confirmed not violated**: no
      scalar, no rank, ever produced by this module.
- [ ] Inference layer touched — N/A in v1 (see §7 — this is precisely what's excluded).
- [ ] UI layer touched — N/A, engine/data-layer only in this WO.

**Drift notes:** The named risk (per the discussion that produced this spec) is the registry
quietly becoming a place where "canonical" models accumulate without real authority discipline —
at that point KRYLO starts encoding an implicit ontology of "what a complete X should look like"
under the cover of a data store. The lifecycle rules in §6 and the immutability rule in §6.2 are
the structural defenses against that, not just documentation of intent.

---

## 4. Strategic Leverage Statement

This WO makes it possible to introduce a comparison frame for Structural Delta Encoding without
that frame being either (a) invented ad hoc per call site, uncontrolled and unauditable, or
(b) silently inferred by the system itself. It draws the line KRYLO's doctrine already requires:
detection systems (Structural Delta Encoding) stay pure comparison operators; deciding what
"should" exist stays a human, provenance-stamped act.

---

## 5. Output Gravity

**"The single thing this WO produces that matters most is a versioned, authority-stamped
`ExpectedStructure` that Structural Delta Encoding can cite by exact version, permanently."**

Everything else — lifecycle states, authority types, retrieval — exists in service of that one
guarantee: a formation evaluated against a given model version stays comparable under that
version forever, even after newer versions exist.

---

## 6. Formula / Contract

### 6.1 Minimal v1 object

```
ExpectedStructure {
  id:               unique identifier
  version:          string, monotonic per formation_type
  formation_type:   string (the category this model applies to)
  elements:         [ StructuralElementId ]   — flat list, no weights, no order significance
  source:           ExpectationSource
  authority:         ExpectationAuthority
  effective_date:   timestamp
  status:           RegistryStatus
}

enum ExpectationSource {
  MANUAL_DEFINITION,
  EXTERNAL_REFERENCE,   // e.g. a cited regulatory text or published standard — the reference
                         // may inform the content, but never substitutes for §6's authority act
}

enum ExpectationAuthority {
  FOUNDER,
  DOMAIN_OWNER,
}

enum RegistryStatus {
  DRAFT,       // human-authored, not yet active — may still be edited freely
  ACTIVE,      // in force — immutable from this point (§6.2)
  SUPERSEDED,  // a newer version for the same formation_type is now ACTIVE
  RETIRED,     // no longer applicable; retained for historical comparisons
}
```

Note: `Authority` (who is permitted to activate) and `Source` (where the content came from) are
kept as two separate fields, not one. A cited regulatory framework is a `Source`; it is never
itself the `Authority`. The named human remains responsible for the act of treating that
reference as a comparison frame.

### 6.2 Immutability rule

```
Once a record reaches ACTIVE status, its elements, formation_type, source, authority, and
effective_date are frozen — permanently, including through SUPERSEDED and RETIRED.
Only `status` may still change, and only along the §6.3 lifecycle path.
Any other change requires a new version identity: new version + new effective_date +
new provenance record, not an edit to the existing one.
```

This is the mechanism that makes `Compared Against: Model vX, Effective 2026-07-31, Authority:
DomainOwner` a permanent, citable fact on any downstream Structural Delta record — not something
that can drift retroactively.

### 6.3 Lifecycle

```
DRAFT ──(authority activates)──▶ ACTIVE ──(new version activated)──▶ SUPERSEDED ──▶ RETIRED
```

No `CANDIDATE` state exists in v1. `DRAFT` is human-authored only — it must not be read as a
reintroduction of system-generated candidates under a different name (see §7).

### 6.4 Comparison binding (contract with Structural Delta Encoding)

Structural Delta Encoding receives `(formation, ExpectedStructure id, ExpectedStructure
version)` — never a bare formation_type lookup that could silently resolve to "whichever is
active now." The version is explicit at every call, so historical comparisons stay pinned.

### 6.5 Competing models

Multiple `ACTIVE` records may exist for the same `formation_type` (e.g., an investor-diligence
frame and an operational-maturity frame for the same category — different comparison contexts,
not contradictions, matching the existing 13-lens precedent in `decisionengine.js`, WO-2059).
The registry does not resolve which one applies. The caller of Structural Delta Encoding chooses
the version explicitly (§6.4), or runs the comparison against several and surfaces the deltas
side by side. "Which model is correct" is never a registry decision. The registry never
designates a "primary," "default," or "canonical" `ExpectedStructure` for a formation type — no
such field or flag may exist on the record, even an unused one, since its mere presence invites
a future implementer to start populating it.

---

## 7. What this WO does NOT resolve — explicitly deferred, not partially built

**Candidate / discovered expectations are entirely out of scope for v1.** No code in this WO may:
- generate a proposed `ExpectedStructure` from observed peer formations
- compute "N% of formations in category X contain element Y" as an input to anything stored here
- expose any UI or API surface suggesting a model for approval

This is not a smaller version of that feature living dormant in this module — it is a fully
separate, unbuilt system ("Expectation Discovery") that would need its own bias analysis, sample
governance, cohort definition, and drift monitoring before it could be proposed as a WO. Folding
even a "candidate, requires approval" version of it into this registry was considered and
rejected: a human approval gate answers who may activate a model, not whether the derivation
method that produced it was valid. Those are separate gates, and only the first one is built here.

---

## 8. Bottle Test

| Question | Answer |
|---|---|
| Does this reduce ambiguity in the system? | YES — gives Structural Delta Encoding a defined, citable source for `expected` |
| Does this have a single dominant output? | YES — a versioned `ExpectedStructure` record |
| Are all boundaries explicitly defined? | YES — v1 scope is human-authored only, no inference path |
| Can this be built without touching an undefined dependency? | YES |
| Does this avoid increasing expressive flexibility in the core? | YES — it constrains what may be stored (§2 exclusions), does not add a scoring surface |

**Verdict: PASS — v1 scope only.** Any future Expectation Discovery capability is a new WO,
starting from a fresh Bottle Test, not an amendment to this one.

---

## 9. Definition of Done

- `ExpectedStructure` record type exists exactly as §6.1, with `Authority` and `Source` as
  separate fields
- Immutability enforced: attempting to modify an `ACTIVE`/`SUPERSEDED`/`RETIRED` record in place
  fails; only new-version creation succeeds
- `formation_type` may have multiple simultaneous `ACTIVE` records (§6.5); retrieval always
  requires an explicit version, never "latest" as an implicit default
- Zero code path exists that derives, suggests, or scores an `ExpectedStructure` from observed
  data (grep confirms no peer-comparison, no frequency/percentage computation, anywhere in this
  module)
- Structural Delta Encoding (companion WO) can retrieve a record by exact `(formation_type,
  version)` and receives full provenance alongside it

---

## NOTES

Sequence: Structural Delta Encoding's own spec is otherwise complete and only needs a live
`ExpectedStructure` to test against — this registry is that dependency, and the primitive should
not be built before this exists. Deliberately unflashy by design: the trajectory that produced
this spec (Latent Capacity → Absence Encoding → Expected Structure → controlled introduction of
comparison frames) kept reducing surface area at each step. That is the intended shape, not an
underdeveloped one.
