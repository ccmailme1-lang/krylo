# SPEC — Cognitive Mesh: Primitive Doctrine & Formal Core (v0.4, Freeze-for-Reconciliation)
Jira: KRYL-1136 — Cognitive Mesh: Primitive Doctrine & Formal Core (v0.4)
Date: 2026-08-02
Author: drafted by agent, consolidating a multi-round mining/review chain, at Founder's
request ("where are my jira tickets for all of this"). This is exploratory architecture —
per this session's own process ("mining... find things, see what sticks"), nothing here
authorizes implementation.

Status: ARCHITECTURE CANDIDATE — FROZEN FOR RECONCILIATION. Not an implementation WO. No
runtime, no code, no RFC may proceed until `SPEC-cognitive-mesh-boundary-reconciliation.md`
(KRYL-CF-006A, not yet written) resolves the open gaps in §9.

Depends on / must stay consistent with: `SPEC-rkm-genealogy-admission-policy.md` (KRYL-1133),
`SPEC-relationship-admission-contract.md`, `SPEC-wo2049-tel-capability-reconciliation.md`
(KRYL-1134).

**Naming note, resolved during review:** earlier drafts used "Cell" as the primitive unit
name. That collides with existing KRYLO vocabulary — `cifengine.js` (WO-2053, CI-F Engine)
already uses `parentCell`/`childCell`/`allCells` for causal-expansion graph nodes, a
completely different concept. Renamed to **Cognitive Primitive (CP)** — verified this session,
no collision found anywhere in the codebase for "CP" or "Cognitive Primitive."

---

## 0. Symbols & Sets

```
O    — set of raw observations
E    — set of evidence atoms
P    — set of live Cognitive Primitives (CPs) at time t
R̂    — set of Relationship Proposals (edges-in-waiting)
D    — set of Admission Decisions (§2)
R    — set of admitted runtime edges (Live-Mesh edges)
t ∈ ℕ — global discrete time index
RKM  — Reality Knowledge Model (durable truth layer, already live — see KRYL-1133)
A    — Admission oracle (A : R̂ × ℕ → D)
id(p) — immutable identifier of primitive p
ℓ(p)  — lineage pointer of p (id of parent or ⊥)
```

## 1. Primitive Axioms (LOCKED)

```
A1  Perception     ∀p∈P,  p₁ : O → E        (raw → evidence)
A2  Proposal       ∀p∈P,  p₂ : E → R̂       (evidence → proposals)
A3  No-Self-Truth  p never maps E→Truth; only E→R̂
A4  Bounded State  |state(p)| ≤ κ            (κ fixed by governance)
```

A CP is a **transformation unit**, not a reasoner in the agent sense. This is the boundary
that keeps Cognitive Primitives from becoming mini-LLMs, autonomous agents, or hidden
decision-makers — closer to sensory specialization (local processing, distributed
contribution) than to competing autonomous actors.

## 2. Admission Semantics

```
D = { VALIDATED, REJECTED, PENDING, CHALLENGED, SUPERSEDED }
```

Given `r = ⟨src, dst, evidence, meta⟩ ∈ R̂` at time t: `d := A(r, t) ∈ D`.

Actions:
- **VALIDATED** → create runtime edge `ε = (src, dst, τ_exp) ∈ R`; provenance(ε) = d
- **REJECTED** → discard r; log d in TEL/RKM history
- **PENDING** → retain r for re-evaluation; no edge yet
- **CHALLENGED** → suspend ε (if extant); escalate to higher governance
- **SUPERSEDED** → deactivate ε; emit a lifecycle-transition event into authoritative history
  (TEL). **Lifecycle metadata may be referenced by RKM only through a validated genealogy
  admission event — not archived to RKM directly.** This is the corrected version of an
  earlier draft that said "archive to RKM" outright; that would have let the Mesh silently
  expand what counts as durable truth, exactly the failure mode KRYL-1134 (TEL reconciliation)
  exists to prevent. `SUPERSEDED` means *"valid under previous knowledge, now replaced"* — not
  `REJECTED`'s *"should never have existed."*

Invariant: `∀ε∈R : decision(ε) = VALIDATED ∧ expiry(ε) ≥ t`.

## 3. Governed Time-Varying Graph

```
G_t = (P_t, R_t)
P_t ⊆ P
R_t = { ε∈R | start(ε) ≤ t ≤ expiry(ε) }
```

- **Spawn**: if `A(spawnProposal, t) = VALIDATED` ⇒ `P_{t+1} = P_t ∪ {p*}` (id, ℓ set).
  Creation proposals originate from mesh-level observations of unexplained evidence density —
  never from a CP requesting its own replication. ("The mesh does not self-expand. The mesh
  identifies capability gaps.")
- **Decay**: policy-driven removal of p or ε, with tomb-logging into TEL/RKM history — never a
  silent deletion.

## 4. Utility & Coherence (OPEN SHAPE — not locked)

System coherence `C_t ∈ ℝ` — exact form is GAP-003, deliberately unresolved here.

```
U(ε; τ₀, τ₁) = Σ_{t=τ₀}^{τ₁} [ C_t | ε active − Ĉ_t(ε) ]
```

`Ĉ_t(ε)` = coherence estimate under an **otherwise identical topology** in which ε is absent
— not a randomly degraded mesh. That correction matters: comparing "mesh with edge" against
"mesh without that specific dependency" is a real counterfactual; comparing against a randomly
damaged mesh is not. Computing `Ĉ_t(ε)` requires replay/shadow-execution capability — this is
a direct, concrete reason KRYL-1134's TEL reconciliation matters: **TEL doesn't compute
intelligence, it enables the replay, lineage, and historical comparison this utility function
depends on.**

## 5. Runtime Edge vs. Genealogy Edge — the core distinction

```
Live Mesh edge ε ∈ R     — temporary cognition infrastructure
RKM genealogy edge g ∈ RKM — durable historical knowledge

Live Mesh Edge ≠ Truth Claim
```

A mesh edge can exist, be used, and expire without ever becoming RKM genealogy — that's
healthy, not a failure. Example: CP-A discovers CP-B, admission validates the relationship,
the mesh uses it for 15 minutes, it expires. Nothing was wrong; it simply wasn't durable
reality. This is the single most important separation in this document — it's what stops the
Mesh from competing with or duplicating RKM (per §21 Route-Don't-Aggregate's spirit, and the
same discipline that shaped the Genealogy Admission Policy).

## 6. The Four-Object Chain (do not collapse)

```
Observation → Evidence → Relationship Proposal (R̂) → Admission Decision (D) →
Runtime Edge (R) → (optional) RKM Genealogy
```

The common AI-architecture failure mode this prevents: collapsing *detected = believed =
stored = truth*. Every stage stays a distinct object. This is consistent with — not a
reinvention of — Grounded-or-Withhold, Absence-Is-Signal, and the Relationship Admission
Contract's own Discovery ≠ Admission ≠ Storage principle.

## 7. Engines vs. Primitives

Existing engines (CI-F, RBCS, LFOS, etc. — see the Platform Framework doctrine) **never call
Cognitive Primitives directly**. This preserves: Engine = capability, Primitive = perception
participant, Fabric = relationship authority. Locked.

## 8. Failure Modes (named, not yet mitigated in code)

- **Relationship Explosion** — too many weak connections. Mitigation: admission thresholds +
  topology budgets.
- **Cognitive Isolation** — CPs unable to discover useful relationships. Mitigation:
  controlled exploration mechanisms (undefined — GAP).
- **Echo Formation** — self-reinforcing pathways. Mitigation: contradiction relationships +
  independent evidence requirements.
- **Frozen Topology** — relationships that never decay. Mitigation: lifecycle management +
  supersession (§2).

## 9. Open Gaps — must be resolved by KRYL-CF-006A before any implementation

| Gap | Question | Priority |
|---|---|---|
| GAP-002 | Connector placement — is a connector a CP subtype, or an upstream adaptor that only produces evidence? | HIGH |
| GAP-003 | Coherence metric — exact form of `C_t` | MEDIUM |
| GAP-004 | Governance evolution — is the Coherence Fabric a static constitution, or does it adapt? | HIGH |
| GAP-005 | Security model — poisoned evidence, Byzantine CPs, admission spoofing, replay attack. Initial posture: hostile CPs can flood R̂ but cannot alter RKM without passing admission. Full model deferred. | MEDIUM |
| GAP-006 | Primitive identity — same-primitive-with-new-state vs. retirement+succession vs. an evolution tree. Determines whether the mesh has evolution, inheritance, and historical accountability. | HIGH |
| GAP-007 | Relationship scope — does an admitted edge only connect CP↔CP, or can it connect CP↔Evidence, CP↔Formation, CP↔RKM Object? This is an ontology question, not an implementation detail — it defines the expressive ceiling of the entire Mesh. | HIGH |

GAP-002 specifically: the working hypothesis (not decided here) is that connectors stay
upstream of Cognitive Primitives — connectors already solve ingestion/domain
translation/external discovery; CPs solve local interpretation/feature extraction/relationship
hypothesis. They're adjacent, not identical. CF-006A decides; this document does not assume.

## 10. Mandate for the Next Artifact (KRYL-CF-006A — Boundary Reconciliation, not yet written)

1. Resolve GAP-002, GAP-004, GAP-006, GAP-007 (or explicitly document deferral).
2. Deliver an updated glossary, layer contracts, and a governance sketch.
3. Explicitly reconcile Cognitive Primitives against the existing Connector Layer, CI-F's
   `Cell` lineage structures, RKM genealogy, and TEL — its purpose is to prevent this concept
   from accidentally overlapping existing KRYLO systems, not to expand the concept further.

**No implementation RFC may proceed until KRYL-CF-006A is ratified.**
