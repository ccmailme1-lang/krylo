# SPEC — Relationship Admission Contract
Jira: KRYL-XXXX (pending — no ticket filed yet, per project_jira_exclusive_numbering)
Date: 2026-08-02
Author: drafted by agent, synthesized from `SPEC-rkm-genealogy-admission-policy.md` (KRYL-1133)
plus a full round of review corrections. No prior draft of this file existed in this session —
this is a first-pass construction from the policy + the accepted edits below, not an edit of
existing content. Flag anything that doesn't match what you had in mind elsewhere.

Status: CONTRACT DRAFT. Defines the exact data shapes and semantic rules the Admission Policy
governs. Produces no code, no JSON Schema, no runtime. Implementation is a separate,
later WO — see §7 (Explicitly Out of Scope).

---

## 0. Precedence

This contract implements `SPEC-rkm-genealogy-admission-policy.md` (KRYL-1133). The Policy
defines governing principles and constraints. **Where ambiguity exists, the Policy has
precedence over this Contract.** This document exists to make the Policy's data contracts
exact, not to introduce new authority.

---

## 1. Enums

**1.1 `decision`** (admission lifecycle state — matches Policy §1's `admissionState` exactly;
this contract does not introduce a second vocabulary)

```
decision ∈ {
  PROPOSED,
  VALIDATED,
  REJECTED,
  CHALLENGED,
  SUPERSEDED
}
```

Semantic constraints:
- `PROPOSED` is not an accepted genealogy state — it represents unresolved admission, nothing
  more.
- `VALIDATED` is the only state a relationship may be in to participate in active genealogy.
- `CHALLENGED` and `SUPERSEDED` apply only to a relationship that was previously `VALIDATED` —
  neither is reachable directly from `PROPOSED` (see §5, Supersession Semantics).

**1.2 `relationshipOrigin`**

```
relationshipOrigin ∈ {
  OBSERVED,
  INFERRED,
  DECLARED
}
```

Named `relationshipOrigin`, not the shorter `origin` — this contract will eventually sit
alongside other origin concepts (evidence origin, proposal origin, decision origin), and an
unqualified `origin` field would become ambiguous the moment a second one is added. Gate-0's
`relationshipTypePolicy` (Policy §4) keys its `allowedOrigins` list against this exact enum:

```yaml
relationshipTypePolicy:
  derivedFrom:
    allowedOrigins: [OBSERVED]
  dependsOn:
    allowedOrigins: [OBSERVED, INFERRED]
```

---

## 2. RelationshipProposal (immutable document)

```
relationshipId       (ULID)
subjectId             (A)
objectId              (B)
relationshipType       (enum: derivedFrom | dependsOn | causes | causedBy | enables)
relationshipOrigin      (§1.2)
evidenceReferences[]   (§3 — EvidenceReference)
provenance             : { producerId, producedAt, reasoningTraceRef? }
```

No `confidence` field. No `tier` field. Both were deliberately excluded in the Policy (§2.1)
and that exclusion carries forward unchanged here — see the Policy document for the full
rationale (a bare confidence number begs an unanswerable "according to whom," and evidence
tier already has a home in `evidencetiers.js`).

---

## 3. EvidenceReference

```
evidenceReference:
  evidenceId
  uri / hash
  accessedAt
```

`accessedAt` records **when KRYLO accessed this evidence reference** — not when the
underlying fact became true, not when the evidence was published. Those are different
timestamps and this contract only claims the first one. No tier. No score. No confidence.

---

## 4. AdmissionDecision (append-only event)

```
relationshipId
decision            (§1.1)
rationale[]         : { ruleId, outcome (PASS|FAIL|ESCALATE), message }
decidedBy           (automatonId | reviewerId)
decidedAt           (timestamp)
supersedes?         (priorRelationshipId)
rulesetVersion      (sem-ver)
```

Unchanged from Policy §2.2. Storage mechanism remains the open dependency described in §7 of
this document and §2.4 of the Policy — not resolved here.

---

## 5. Supersession Semantics

Supersession is a **new relationship record referencing the old one** — never a mutation of
the old record. This is what keeps an append-only system append-only in practice, not just in
name:

```
R1: relationshipId = A          (previously VALIDATED)
R2: relationshipId = B          (new proposal, later admitted)

AdmissionDecision for R2:
  decision   = SUPERSEDED
  supersedes = A
```

- R2 remains an independent record.
- R1 remains in history, unmodified, still queryable.
- The **active graph** (what CI-F, LFOS, or any future reasoning engine would traverse)
  contains R2 only. R1 is excluded from active traversal the moment R2's `SUPERSEDED`
  decision is recorded, but it is never deleted or rewritten.

---

## 6. Invariants

Carries forward I1–I6 from the Policy unchanged (self-validation ban, trust-perimeter parity,
sole write path via VALIDATED decisions, append-only history, statelessness of the admission
logic itself, type-specific rule semantics — see Policy §5 for full text). This contract adds
one:

**I7. Idempotency.** Identical `RelationshipProposal`s MUST be idempotent — an admission
implementation MUST detect semantically equivalent submissions and MUST NOT create duplicate
relationship claims. "Identical" is a normalized comparison, not raw equality: it compares the
tuple `(subjectId, objectId, relationshipType, relationshipOrigin, evidenceReference set)`,
where the evidence reference set is compared as a set, not a sequence — `[e1, e2]` and
`[e2, e1]` are the same proposal. Comparing raw submission order would treat semantically
identical proposals as distinct, defeating the point of the invariant.

---

## 7. Explicitly Out of Scope (post-ratification, not contract semantics)

These belong to implementation planning or a future WO's acceptance criteria — deliberately
not part of this contract's body:

- **JSON Schema generation** — this contract is human-readable first; a machine schema is a
  derived artifact of implementation, not a prerequisite for ratifying the contract itself.
- **RelationshipTypePolicy registration mechanics** — *what* the Gate-0 table says is contract
  (§1.2); *how* it gets configured/deployed/changed is configuration governance, not contract
  semantics.
- **Compliance test suite** — strongly recommended before implementation, but belongs to the
  implementation WO. At minimum it should prove:
  - a proposal cannot bypass admission and reach RKM directly
  - a rejected edge never enters RKM
  - a validated edge enters RKM
  - a superseded edge is excluded from the active graph but remains in history
  - duplicate proposals (per I7's normalized comparison) do not create duplicate relationships

**Ledger dependency, unresolved here:** this contract's `AdmissionDecision` (§4) needs an
append-only event store, and none exists in KRYLO today (see Policy §2.4). This contract does
not make WO-2049 (Truth Event Ledger, NEEDS SPEC) a prerequisite — but the implementation WO
that eventually builds `AdmissionDecision` persistence is the point where the two designs must
be reconciled into one system, so KRYLO doesn't end up with a genealogy-specific event history
running alongside a general one.

---

## Summary — architectural locks this contract makes explicit

1. No direct genealogy writes (only via `VALIDATED` `AdmissionDecision`)
2. No self-validation (producer ≠ admitter, per Policy I1)
3. No confidence-score standing in for evidence (§2, §3)
4. No duplicate relationship histories (I7)
5. No mutation of historical truth (§5 — supersession is additive, never a rewrite)
6. No relationship type treated as universally equivalent (Policy I6, carried forward)

```
KRYL-1133 Policy
        |
        v
Relationship Admission Contract (this document)
        |
        v
Future implementation WO (where the WO-2049 reconciliation happens)
```
