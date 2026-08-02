# SPEC — RKM Genealogy Admission Policy (v0.9)
Jira: KRYL-1133 — RKM Genealogy Admission Policy
Date: 2026-08-02
Author: drafted by agent, consolidating a full-session review chain, at Founder's request
("tie all this together"). Depends on and extends `SPEC-rkm-genealogy-capability-gap-analysis.md`.

Status: POLICY DRAFT, filed as KRYL-1133. Not an implementation WO. Defines authority, contracts, and invariants
for how a relationship claim may become part of KRYLO's trusted memory (RKM genealogy).
Produces no code. The next artifact after this is ratified is the **Relationship Admission
Contract** — only after that does implementation begin.

---

## Why this document exists (the chain that led here)

1. Nine Platform Framework engines (CI-F, CI-R, RBCS, LFOS, IB, Decision, Execution, Feedback,
   Calibration) were found built but orphaned — zero live import path, verified directly
   against the codebase this session.
2. Tracing *why* CI-F/LFOS specifically couldn't function even if wired in led to `rkmstore.js`:
   its `genealogy` contract (`causedBy`, `causes`, `dependsOn`, `enables`, `derivedFrom`)
   already exists, and is already live — `edgar8kconnector.js` (imported directly by
   `app.jsx`) writes real RKM objects in production today. Every one gets `genealogy: {}`.
3. So the gap was never "build genealogy." It was: **nothing defines who is allowed to put a
   relationship claim into that field, or under what evidence standard.**
4. This document is that definition. It does not populate genealogy. It defines the boundary
   that must exist before anything is allowed to.

The irreducible principle carried through the whole investigation:

```
Discovery ≠ Admission ≠ Storage
```

- **Discovery** components (connectors, reasoning engines) MAY propose a relationship.
- **Admission** authority MUST decide on the proposal, from a higher trust boundary than
  whoever proposed it.
- **RKM storage** MUST contain only relationships admitted through a VALIDATED decision.
  Later lifecycle states (CHALLENGED, SUPERSEDED, REJECTED) are ledger history and governance
  record — not active genealogy edges a reasoning engine should traverse.

No component may collapse two of these roles. Nothing may create a relationship and then
reason over its own claim as if it were independently confirmed.

---

## 1. Canonical Vocabulary

Two axes, kept strictly orthogonal — collapsing them was identified as the main way this kind
of model quietly breaks:

```
admissionState (epistemic status):
  PROPOSED     — claim exists, undecided
  VALIDATED    — admitted; eligible to participate in active genealogy
  REJECTED     — ruled invalid; no further consideration unless new evidence arrives
  CHALLENGED   — was VALIDATED, now in dispute (new evidence contests it)
  SUPERSEDED   — replaced by a newer VALIDATED fact

operationalStatus (workflow status — NOT a truth state):
  AWAITING_EVIDENCE
  AWAITING_REVIEW
  AWAITING_RULESET
```

"Pending" is deliberately not an `admissionState` — it's a queue condition, not a claim about
truth. Mixing the two was flagged explicitly as a failure mode to avoid.

Only a relationship whose latest `admissionState` is `VALIDATED` may populate the active
genealogy that CI-F, LFOS, or any future reasoning engine would traverse. `CHALLENGED` and
`SUPERSEDED` remain real, queryable history — they are not deleted, and they are not treated
as equivalent to a currently-active edge.

---

## 2. Contracts

These are the first deliverable *after* this policy is ratified — defined here so the policy
has something concrete to govern, not yet implemented.

**2.1 RelationshipProposal** (immutable document)
```
relationshipId    (ULID)
subjectId         (A)
objectId          (B)
type              (enum: derivedFrom | dependsOn | causes | causedBy | enables)
evidenceRefs[]    : [ { evidenceId, uri/hash } ]   — NO tier field here (see rationale below)
provenance        : { producerId, producedAt, reasoningTraceRef? }
```

*Why no `confidence` field, and no `tier` field on evidence:* a bare `confidence: 0.83` on a
proposal immediately begs an unanswerable question — 83% according to what, a model, a rule,
a human? KRYLO already has several distinct numeric concepts (confidence, validity,
convergence, groundedness) and this model exists specifically to prevent a relationship claim
from becoming another ambiguous score. If a named, specific measure is needed later
(`causalSupportScore`, `evidenceCoverage`, `ruleSatisfactionScore`), it gets introduced
explicitly and separately — never a generic confidence number. Evidence *tier* already has a
home — `evidencetiers.js`'s `EPISTEMIC_CLASS` taxonomy (live, WO-2005A). A proposal references
an `evidenceId`; admission rules resolve tier from the existing evidence record. Copying tier
onto the proposal creates duplicated state that will drift from the source of truth.

**2.2 AdmissionDecision** (append-only event)
```
relationshipId
decision          (admissionState)
rationale[]       : { ruleId, outcome (PASS|FAIL|ESCALATE), message }
decidedBy         (automatonId | reviewerId)
decidedAt         (timestamp)
supersedes?       (priorRelationshipId)
rulesetVersion    (sem-ver)
```

These events need an append-only store. See §2.4 — no such store exists in KRYLO today.

**2.3 Lifecycle Constraints**
- `RelationshipProposal` is immutable once created.
- An `AdmissionDecision` may only `REJECT` a proposal currently in `PROPOSED` or `CHALLENGED`.
- A `SUPERSEDED` decision must reference exactly one prior `VALIDATED` relationship id.
- All decision events are append-only; no deletions, ever (pending §2.4).

**2.4 Dependency: Truth Event Ledger Capability**

Admission requires an append-only event-history capability recording: `RelationshipProposal`
creation, `AdmissionDecision` outcomes, the ruleset version used, lifecycle transitions, and
decision provenance. No such capability exists in KRYLO today — verified this session,
including checking `convictionstore.js` (real, but browser `sessionStorage`, not a backend
ledger). CLAUDE.md's open list already names this exact gap: `WO-2049 Truth Event Ledger —
NEEDS SPEC (write from scratch)`.

The relationship is not "Genealogy Admission depends on the existing Execution Ledger" — no
such system is implemented; treating it as an existing anchor would itself be inventing
infrastructure, the same failure mode this whole policy exists to prevent. The more accurate
framing:

```
KRYL-XXXX Genealogy Admission Policy
        |
        v
Defines required audit/event capabilities
        |
        +----------------+
        |                |
        v                v
  WO-2049 Truth Event   Other future
  Ledger capability     event consumers
        |
        v
  Admission Decisions
```

Genealogy Admission may be the **first concrete consumer that defines requirements** for
WO-2049, rather than a system that waits on WO-2049 to exist first. Either way: **this policy
does not authorize building a second, parallel ledger.** Before `AdmissionDecision` can be
implemented, WO-2049 needs a spec — informed by the requirements above — and the two must be
reconciled into one system, never two. Flagging this as a blocking open question, not
resolving it here.

---

## 3. Rule-Evaluation Semantics

Rules are pure predicates. No numeric aggregation, no weighted scoring:

```
Each rule → PASS | FAIL | ESCALATE

Policy:
  any FAIL                    → decision = REJECTED
  all PASS                    → decision = VALIDATED
  any ESCALATE, no FAIL       → remains PROPOSED, operationalStatus = AWAITING_REVIEW
```

Example:
```
R1 Existence    PASS
R2 Evidence     PASS
R3 Type         PASS
R4 Temporal     FAIL
                → REJECTED
```

Not:
```
0.8 + 0.9 + 0.7 - 0.3 = 2.1 → "truth"
```

This was identified as the single biggest architectural risk in earlier drafts: a weighted
aggregator folding rule outcomes into a score is exactly the `Evidence → Weighted Scoring →
Truth` collapse this whole codebase's doctrine (§21 Route-Don't-Aggregate) already exists to
prevent. Relationships are admitted through constraints, not confidence accumulation.

The rule set is versioned; the version is stamped into every `AdmissionDecision`
(`rulesetVersion`), so a later audit can reconstruct exactly which rules were in force when a
given relationship was validated.

**Transition detail:** a first-time `ESCALATE` on a fresh `PROPOSED` claim does not become
`CHALLENGED` — nothing has been validated yet, so there's nothing to dispute. It stays
`PROPOSED` with `operationalStatus = AWAITING_REVIEW`. `CHALLENGED` is reserved specifically
for an already-`VALIDATED` relationship that new evidence later disputes.

---

## 4. Relationship Type Admission Policy (Gate-0)

Not every one of the five genealogy fields should necessarily be enabled at once. `causes` is
a causal claim about reality — a materially heavier assertion than `derivedFrom` (usually
lineage/transformation). The system should earn causal memory, not default into it.

Policy is keyed by **type and origin together** — a `dependsOn` edge asserted from direct
observation is a different trust case than one inferred by a reasoning engine, even though
it's the same relationship type:

```
relationshipTypePolicy:
  derivedFrom:
    enabled: true
    allowedOrigins: [OBSERVED]
  dependsOn:
    enabled: true
    allowedOrigins: [OBSERVED, INFERRED]
  causes:
    enabled: false
  causedBy:
    enabled: false
  enables:
    enabled: false
```

Changes to this table require separate governance approval — it is not something a producer
or the admission engine can alter unilaterally.

---

## 5. Invariants

**I1.** A component may EITHER originate `RelationshipProposal`s OR issue `AdmissionDecision`s
on them — never both. An independent admission boundary must stand between producer and
decision; no self-validation.

**I2.** Admission authority code runs inside the same trust perimeter that protects RKM writes
generally — it is not a lighter-weight or bypassable path.

**I3.** All mutations to RKM `genealogy` fields originate solely from `VALIDATED`
`AdmissionDecision`s. No other write path may touch genealogy, ever.

**I4.** History is append-only. Reversions happen via `CHALLENGED` or `SUPERSEDED` events —
never by overwriting a prior record.

**I5.** Admission authority is stateless with respect to verdict persistence; whatever the
system of record turns out to be (see §2.4's open dependency), that store — not the admission
logic itself — is authoritative.

**I6.** Relationship semantics are type-specific. Every admission rule MUST be parameterized
by relationship type. No generic `validateRelationship(edge)` path may assume equivalent
semantics across `causedBy`, `causes`, `dependsOn`, `enables`, and `derivedFrom` — each type
gets its own rule evaluation, not a shared default.

---

## 6. Roadmap (policy → contract → implementation)

```
A. Ratify this policy (KRYL-XXXX)
B. Finalize schemas for RelationshipProposal & AdmissionDecision
C. Resolve the ledger dependency (§2.4) — feed requirements into WO-2049's spec, reconcile
   into one system, never build a second parallel ledger
D. Deploy a "null" admission endpoint that logs PROPOSED and REJECTs by default,
   to validate producer integration before any rule enables real admission
E. Incrementally add rule modules; enable relationship types per §4's policy table
F. Only after D-E stabilize: revisit CI-F / LFOS activation against real populated genealogy
```

No step authorizes the next until the prior one is reviewed. This document authorizes A only.

---

## 7. Closing Summary

- Discovery may suggest.
- Admission — higher-trust, rule-based (not score-based), append-only — may decide.
- RKM stores only `VALIDATED` relationships. Everything else is retained history, not active
  graph truth.
- The dependency chain this policy establishes:

```
KRYL-XXXX Genealogy Admission Policy (this document)
        ↓
Relationship Admission Contract
        ↓
Implementation WO (blocked on §2.2's ledger question)
        ↓
Controlled genealogy population
        ↓
Re-evaluate CI-F / LFOS activation against real, governed data
```

Not the shortcut this investigation started by rejecting:

```
CI-F exists → make genealogy exist → wire it in
```

Six months from now, if the question is "why aren't CI-F/LFOS wired in yet," the answer stays:
*the engines were never blocked by missing code — they were blocked by missing governed
relationship memory, and that memory doesn't get populated by default just because a field
exists.*
