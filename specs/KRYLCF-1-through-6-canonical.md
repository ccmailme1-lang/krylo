# KRYLCF-1 through KRYLCF-6 — Canonical Cognitive Fabric Specification

**Source:** Jira project `KRYLCF`, creator Mr. XS, filed 2026-07-29. Retrieved in full
(description + comments) on 2026-08-08 for architectural reconciliation against KRYLO-CEPH-001.
**Status per ticket, as of retrieval:** all six sit in Jira workflow state "To Do" — no ticket in
this project has ever been moved to a completed/deployed state. An implementation was built
against this spec (commit `6e1c067` and four follow-on commits, 2026-07-29) but was later
determined to be unreviewed agent work and removed in full (commit `e62c184`, 2026-08-04) —
confirmed: work on this architecture was deliberately deferred pending a scheduled meeting; that
meeting has since passed. **These six tickets are the sole surviving authoritative artifact.**
Nothing else — no code, no other doc — currently represents this architecture in the repository.

---

## KRYLCF-1 — KRYL-CF-001: Cognitive Fabric Architecture (constitutional)

Foundational architecture artifact for the Cognitive Fabric — a distributed, heterogeneous-node
cognition substrate, net-new and separate from the KRYL (Krylo) product. Defines: what the
Cognitive Fabric is, what a node is, the boundary against the Structural Integrity Layer (SIL,
frozen v0.2 — observes only finished artifacts, never participates in coherence
measurement/participation selection/state sync), communication channels, candidate domains,
overall philosophy.

**Authority model (locked across all CF artifacts):**
- Structural Integrity Layer: truth/provenance authority. Validates artifacts only.
- Cognitive Fabric Nodes: local reasoning authority. Interpret domain state only.
- Edge Arbitration Protocol (KRYL-CF-002): constraint negotiation authority. Resolves conflicts only.
- No layer absorbs another's responsibility.

**Doctrine:** Evidence → Structural Integrity → Cognitive Fabric → Action. Never: Inference →
Structural Integrity → "fact".

**Children:** KRYL-CF-002 (Edge Arbitration Protocol), KRYL-CF-003 (Cognitive Fabric Contract,
not yet filed), KRYL-CF-004 (Cognitive Coherence Protocol), KRYL-CF-005 (Memory Model, not yet
filed), KRYL-CF-006 (Governance Model, not yet filed).

**Explicit anti-pattern to avoid in all children:** no "Brain Router" — no central dispatcher
that decides who thinks. Routing/participation must remain emergent from intent requirements,
domain capability declarations, coherence thresholds, and constraints.

---

## KRYLCF-2 — KRYL-CF-002: Edge Arbitration Protocol (EAP)

**Status (in-ticket): APPROVED.**

Role: constraint negotiation authority. Resolves conflicts between cognitive nodes that hold
different local interpretations of the same situation.

**Invariants:**
- EAP may transform intent.
- EAP may negotiate constraints.
- EAP may select among valid alternatives.
- EAP may NOT alter reality claims.
- EAP may NOT create evidence.
- EAP may NOT strengthen confidence.
- EAP may NOT generate policy.

**New primitive: Constraint Propagation.** Traditional agent systems exchange
message/request/response; EAP exchanges intent/constraint/reformulation/resolution. A rejecting
node never simply returns NO — it returns "NO under constraint X. Available state space is Y.
Recompile within boundary Z."

**Contract summary:**
- Classification: Cognitive Fabric Control Plane Component
- Authority: Constraint negotiation only
- Dependencies: Cognitive Fabric Contract (CF-003), Agent Provenance Model, Replay Specification, Arbitration Ledger
- Forbidden: Evidence creation, provenance mutation, integrity elevation, autonomous policy formation
- Produces: Resolved intents, alternate execution paths, arbitration records
- Does not produce: Facts, validated artifacts, structural truth

**Relationship to CF-004 (Coherence Protocol):** CCP is upstream of EAP. CCP selects which nodes
participate and whether their state models are compatible; EAP resolves conflicts among nodes
already selected to participate.

**Flow:** CCP (select participants, check coherence) → Domain Nodes (detect conflict) → EAP
(resolve constraint collision) → Final intent.

---

## KRYLCF-3 — KRYL-CF-004: Cognitive Coherence Protocol (CCP)

**Status (in-ticket): APPROVED AS COGNITIVE FABRIC COMPONENT.**

Boundary: Outside Structural Integrity Layer (frozen v0.2). SIL continues to observe only
finished artifacts — it does not participate in coherence measurement, participation selection,
or state synchronization.

Purpose: define how distributed cognitive nodes maintain shared understanding without requiring
identical reasoning, and select the minimum coherent cluster of nodes needed to act on a signal
(not broadcast to all nodes).

**Rejected models (explicitly, do not revisit without new justification):**
- Striped parity (RAID-like) — assumes nodes hold equivalent information; nodes are intentionally heterogeneous.
- Round robin — assumes tasks are fungible; domain nodes do not have interchangeable reasoning capability.
- Minmiss/minimum-missing routing — useful for task completion, insufficient for system-level coherence.
- Fixed brain assignment (Brain 1-9) — creates static bottlenecks, prevents emergent coordination.

**Core primitive — Cognitive Coherence Score (CCS):** NOT confidence, NOT truth. A measure of
whether participating nodes share a sufficiently aligned state model. CCS = f(state_overlap,
temporal_alignment, constraint_compatibility, provenance_alignment). Two nodes can disagree and
still be coherent (different valid projections of reality, e.g. "cause" vs "experience" of the
same event) — that is high coherence. Two nodes asserting contradictory facts about the same
object (e.g. one says room available, one says room unavailable) is low coherence and triggers
EAP arbitration.

**Routing model:** "need-to-align" routing. Signal → Domain Recognition → Relevant Cognitive
Cluster (minimum coherent set) → Coherence Negotiation → Resolution. Nodes outside the minimum
coherent cluster remain fully dormant — no background "awareness" traffic.

**Memory boundary (locked):**
- Shared Memory may contain ONLY: validated artifacts already passed by SIL, arbitration/coherence
  event records, provenance references. Must never become a second reasoning substrate.
- Local Memory: domain patterns, specialized representations, temporary reasoning state — not
  shared, not duplicated across nodes.

**Required refinements (parallel to EAP locks):**
1. CCS is a structural compatibility metric only — cannot be used to elevate interpretive
   strength or override domain constraints.
2. No policy generation from coherence history — store only deterministic
   participation/alignment records for replay/audit; do not generalize into learned routing
   rules or standing "always activate X with Y" policies.
3. Shared Memory boundary as above.
4. Dormancy is mandatory for non-participating nodes.

**Key invariant:** The Fabric requires compatible state models, not agreement.

**Dependencies:** KRYL-CF-001, KRYL-CF-003 (future). **Relationship:** upstream of EAP
(KRYL-CF-002), downstream of intent.

### Full CF-003-labeled implementation specification (found under this same ticket)

**Classification:** Cognitive Fabric Component. **Boundary:** MUST NOT extend Structural
Integrity Layer v0.2. **Authority:** Cognitive Coordination Only. **Dependency:** KRYL-CF-001.
**Integration:** KRYL-CF-002.

**1. Objective:** Implement a coherence management layer that enables heterogeneous Cognitive
Fabric nodes to operate as a distributed intelligence system. CCP answers: *which* cognitive
nodes need to participate, and are their internal state representations sufficiently compatible
to coordinate? CCP does NOT answer: what is true? what evidence is valid? what action should
execute? which interpretation is correct?

**Flow:** Structural Integrity Layer (validated artifacts) → Cognitive Coherence Protocol
(selects compatible cognition) → Domain Cognitive Nodes (generate interpretations) → Edge
Arbitration Protocol (resolves conflicts) → Execution.

**2. Core design principle — Coherence != Agreement.** Nodes do not need identical
interpretations, they need compatible state models. Valid (high coherence): Operations Node says
"Room delay caused by maintenance"; Service Node says "Guest frustration increasing" — different
dimensions of the same state. Invalid (contradiction, requires arbitration): Operations Node says
"Room unavailable"; Inventory Node says "Room available."

**3. CCP architecture:** Intent Request → Cognitive Coherence Protocol, containing in order:
Capability Registry → Participation Selector → Coherence Evaluation Engine → Synchronization
Controller → Active Cognitive Cluster.

**4. Node Capability Registry.** Purpose: maintain declared cognitive capabilities. CCP cannot
guess node expertise. Each node must declare: domain, inputs accepted, interpretations produced,
constraints owned, dependencies.

```json
{
  "node_id": "SERVICE_NODE",
  "domain": "guest_service",
  "capabilities": ["friction_analysis", "recovery_options", "interaction_context"],
  "required_inputs": ["guest_state", "service_events"],
  "constraint_dependencies": ["operations_state"],
  "authority_type": "PROCESS_CONSTRAINT"
}
```

**5. Participation Selection Engine.** Objective: select the minimum cognitive cluster required
for an intent. The system MUST NOT activate all nodes.

```json
{ "intent": "resolve_guest_friction", "available_domains": ["guest_context","service","operations","security","analytics"] }
```

Selection priority order: (1) direct capability match, (2) required constraint dependencies, (3)
known coherence relationships, (4) escalation requirements. Example: intent "resolve guest room
delay" selects Guest Context → Service → Operations; does NOT select Analytics, Simulation,
Security, Knowledge.

**6. Coherence State Model.** Each active node publishes a state envelope:

```json
{
  "node_id": "OPERATIONS_NODE",
  "state_id": "OPS-22341",
  "domain_state": { "room_status": "delayed", "cause": "maintenance" },
  "timestamp": "2026-07-29T10:00:00Z",
  "sil_references": ["artifact_9981"]
}
```

**7. Cognitive Coherence Score (CCS).** Not confidence, truth, reliability, or evidence quality.

`CCS = (State Alignment + Temporal Alignment + Constraint Compatibility + Context Overlap) / 4`

- State Alignment (0-1): do node interpretations describe compatible conditions?
- Temporal Alignment: are nodes describing the same time window?
- Constraint Compatibility: can both states exist simultaneously?
- Context Overlap: do nodes share relevant context (guest ID, reservation, location)?

**8. Coherence thresholds:** SUFFICIENT: CCS ≥ 0.75 → proceed. DEGRADED: 0.50 ≤ CCS < 0.75 →
request synchronization. INCOMPATIBLE: CCS < 0.50 → trigger EAP evaluation.

**9. Synchronization protocol.** Purpose: allow nodes to exchange state alignment information —
NOT raw telemetry, NOT unrestricted memory.

```json
// Request
{ "message_type": "COHERENCE_SYNC_REQUEST", "source": "SERVICE_NODE", "target": "OPERATIONS_NODE", "requested_alignment": { "resource_state": true, "timeline": true } }
// Response
{ "message_type": "COHERENCE_SYNC_RESPONSE", "alignment_state": "COMPATIBLE", "constraints": ["inventory_unavailable"] }
```

**10. Dormancy protocol.** Requirement: non-required nodes remain inactive. No background
cognition, no passive monitoring. Node states cycle: DORMANT → ACTIVATING → ACTIVE → SYNCING →
RESOLVED → DORMANT.

**11. Failure handling.** Node unavailable: CCP recalculates cluster; if alternate node exists,
continue; if capability missing, escalate. Coherence collapse: CCP detects incompatible state,
invokes EAP. Novel condition (no registered capability exists): ESCALATE_TO_CORE.

**12. Replay contract.** CCP must generate deterministic events:

```json
{ "coherence_event_id": "CCP-00031", "intent": "resolve_guest_friction", "participating_nodes": ["SERVICE_NODE","OPERATIONS_NODE"], "ccs": 0.82, "decision": "cluster_sufficient", "timestamp": "..." }
```

Stored for: replay, debugging, governance. NOT used for: learning policies, automatic routing
rules, behavioral reinforcement.

**13. Forbidden behaviors.** CCP MUST NOT: create evidence; modify SIL artifacts; increase g_e;
override provenance; generate permanent policies; become a global router; replace EAP.

**14. Integration with KRYL-CF-002.** Execution order: Intent Created → CCP ("what cognition is
needed?") → Domain Nodes ("what does each domain observe?") → EAP ("can conflicting
interpretations resolve?") → Execution.

**15. Acceptance criteria:**
- Dynamic participation: activates minimum required nodes.
- Dormancy enforcement: unused nodes remain inactive.
- Coherence calculation: produces deterministic CCS.
- No truth authority: cannot create validated artifacts.
- No policy creation: replay does not modify future routing.
- EAP integration: conflicts route correctly.
- Replay support: identical inputs reproduce same coherence event.

**Final classification (in-ticket):** KRYL-CF-004 Cognitive Coherence Protocol. Status:
Implementation Ready. Role: Distributed cognition coordination layer. Authority: Compatible-state
evaluation only. Produces: Active cognitive cluster + coherence state. Does not produce:
Evidence, truth, policy, provenance. "This is the build artifact — no new architecture
decomposition required (per Founder, 2026-07-29)."

**Comment on this ticket, from Mr. XS:** "Implemented and committed: 6e1c067 – feat(cognitivefabric):
implement CCP and EAP distributed cognition protocols. Doctrine note: coherence scoring is a
gated model (hard_constraint_violation → INCOMPATIBLE; else aggregate CCS components), not a
pure average — same categorical-violation-overrides-blended-score principle as [reference cut
off in source]. 6 validation scenarios pass: sufficient, escalation, degraded, hard contradiction
(no alternative), contradiction with valid alternative, contradiction with conflicting-only
fallback." **This code (commit `6e1c067` and 4 follow-on commits) no longer exists in the
repository — removed 2026-08-04 (commit `e62c184`) as unreviewed agent work. Deferred pending a
Founder review meeting that has since passed. This ticket's prose remains the real spec; the
code does not currently exist.**

---

## KRYLCF-4 — KRYL-CF-003: Cognitive Fabric Contract (backlog, not yet specified)

Status: Draft / Implementation Specification. Classification: Cognitive Fabric Component.
Boundary: MUST NOT extend Structural Integrity Layer v0.2. Authority: Cognitive Coordination
Only. Dependency: KRYL-CF-001. Integration: KRYL-CF-002.

*(Note: the full CF-003 implementation content that would normally live here appears to have
been filed under the KRYLCF-3/CF-004 ticket instead — see the "Full CF-003-labeled
implementation specification" subsection above. This ticket's own description is boundary-only,
no further detail beyond what's captured there.)*

---

## KRYLCF-5 — KRYL-CF-005: Cognitive Fabric Memory Model (backlog, not yet specified)

Split out as its own artifact because memory is its own risk boundary — combining it into
CF-001/CF-004 would blur authority over what's allowed to persist where. To define: shared memory
contents/limits, local memory contents/limits, arbitration records, coherence records, retention
rules, replay requirements.

**Preliminary boundary already locked in CF-004:** Shared Memory may contain only validated
artifacts already passed by SIL, arbitration/coherence event records, and provenance references
— never a second reasoning substrate.

---

## KRYLCF-6 — KRYL-CF-006: Cognitive Fabric Governance Model (backlog, not yet specified)

To define: human oversight, escalation paths, intervention points, approval boundaries for the
Cognitive Fabric. Depends on CF-002 (EAP) and CF-004 (CCP) being specified first, since
governance needs to know what arbitration/coherence decisions actually look like before defining
human escalation points around them.

---

## What is genuinely unspecified across all six tickets

Confirmed absent from every ticket above — not a summary judgment, a direct read of the full
text:

1. **No mechanism for how raw external data becomes a validated SIL artifact.** SIL is defined
   only as "validates artifacts" (an authority/function) — the actual admission process,
   interface, or queue is never specified anywhere in KRYLCF-1 through 6.
2. **No transport/queue/topic specification** anywhere.
3. **No concept of a "connector"** — KRYLCF's nodes are domain-interpretation agents that already
   assume validated evidence exists; nothing in this spec addresses the layer below them.
4. **The term "SIL Validation Queue"** used in tonight's earlier `CEPH-001-KRYLCF-Integration.md`
   addendum is not a real KRYLCF concept — it was an inferred placeholder, not a specified
   mechanism. Flagged here for correction, not carried forward as if it were canonical.

This is the actual gap CEPH-001 sits in front of. It doesn't need to fit into an existing
mechanism KRYLCF defines, because KRYLCF doesn't define one at this layer yet.
