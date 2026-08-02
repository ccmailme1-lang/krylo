# SPEC — WO-2049 Truth Event Ledger: Capability Reconciliation & Gap Analysis
Jira: KRYL-1134 — WO-2049 Truth Event Ledger: Capability Reconciliation & Gap Analysis
Date: 2026-08-02
Author: drafted by agent, from a full-session review chain, at Founder's request. Depends on
and is required by `SPEC-relationship-admission-contract.md` and
`SPEC-rkm-genealogy-admission-policy.md` (KRYL-1133).

**Status:** ANALYSIS ONLY, filed as **KRYL-1134**. No ledger engine selection, no schema
finalization, and no implementation.

This document exists to answer one gating architectural question before any engineering work
touches authoritative event history:

**Does KRYLO require a single shared authoritative event substrate for high-trust state
transitions, or may domains maintain independent authoritative histories?**

The answer to that question governs the implementation direction for Relationship Admission
as defined in **KRYL-1133** (`SPEC-rkm-genealogy-admission-policy.md` and
`SPEC-relationship-admission-contract.md`). Until that decision is made, no domain-specific
authoritative history mechanism should be introduced.

"WO-2049" in the title refers to the pre-existing, named-but-unspecified backlog item already
in CLAUDE.md's open list ("WO-2049 Truth Event Ledger — NEEDS SPEC"). This document does not
mint a new local WO number — per this session's own retired-prefix rule, the artifact identity
is the Jira key above, once filed.

Related docs:
- `SPEC-rkm-genealogy-admission-policy.md` (KRYL-1133)
- `SPEC-relationship-admission-contract.md`
- No verified ADR exists for an "Execution Ledger" — that reference was checked directly
  against the codebase this session and removed; it does not exist.

---

## 0. Problem Statement

The Relationship Admission subsystem (KRYL-1133 + its Contract) mandates an append-only,
replayable history of `RelationshipProposal` events, `AdmissionDecision` events, and
subsequent lifecycle transitions (`CHALLENGED`, `SUPERSEDED`, ...). No such platform service
exists today. A Truth Event Ledger (TEL) was named in the backlog (WO-2049, "NEEDS SPEC") but
never specified. Building a domain-specific "Genealogy Ledger" now would spawn parallel,
incompatible histories — exactly the failure mode this whole investigation exists to prevent.

**Goal of this document:** decide whether TEL will be the canonical substrate for Admission
events (and comparable high-trust transitions across domains), and surface the functional and
organizational gaps standing in the way.

---

## 1. Method & Scope

- Inventory Relationship-Admission-driven requirements (§2)
- Survey anything in the live codebase that resembles a ledger (§3) — verified directly
  against source, not assumed from documentation
- Formulate architectural options (§4)
- Evaluate options without selecting one (§5)
- List open questions / decision checklist (§6)

Out of scope: persistence engine choice, queues, deployment, sizing, cost.

---

## 2. Capability Requirements Introduced by Relationship Admission

(Criticality: MUST | SHOULD | NICE)

1. Append-only persistence — MUST
2. Immutable historical events (no updates/deletes) — MUST
3. Global ordering / deterministic replay — MUST
4. Cross-domain event typing & schema versioning — SHOULD
5. Provenance fields (producerId, decidedBy, etc.) — MUST
6. Rule-set version linkage — MUST
7. Built-in lifecycle modeling or correlation — MUST
8. Idempotent write guarantees — MUST
9. Query interface for auditors & replay engines — SHOULD
10. Access-control segregation (read vs. write) — SHOULD
11. Time-boxed retention & export hooks — NICE
12. **Authority provenance** (which boundary possessed decision rights) — MUST

Item 12 is the load-bearing addition: it elevates TEL from plain event storage to *authorized
historical reconstruction*. "Something happened" is a weaker claim than "something happened,
under ruleset X, by authority boundary Y, with evidence path Z" — and the latter is what
Relationship Admission actually needs.

---

## 3. Existing Assets & Gaps

Every claim below was checked directly against the live codebase this session — not recalled
from CLAUDE.md's history or assumed from a component's name.

**3.1 `convictionstore.js`** — browser-local (`sessionStorage`), mutable ⇒ NOT APPLICABLE.

**3.2 `identitylineage.js`** — in-memory pub/sub event bus for identity-kernel stability
transitions. Provides: identity lifecycle event dispatch (`dispatch()`), subscriber
notification (`subscribe()`), temporary runtime history access (`getHistory()`,
`clearHistory()`). Does NOT provide: durable persistence, append-only guarantees, authoritative
historical reconstruction, or deterministic replay across a process restart. **Conclusion:** a
useful domain telemetry mechanism, but a different class of capability entirely from a Truth
Event Ledger — not a weak ledger, not a ledger at all.

**3.3 Misc. service tables / "execution logs"** — no verified system meets append-only +
global-order + immutability, checked directly. No confirmed TEL-grade implementation exists.

**Conclusion:** existing artifacts provide partial, fragmentary event-like behavior in
isolated domains, but no verified system currently satisfies the complete TEL capability
envelope (§2, items 1–12). That phrasing is deliberate — some individual capabilities may
exist in fragments; the integrated capability does not, and nothing here should be read as
implying otherwise.

This reinforces the three-axis separation established earlier in this investigation:

```
identityLineage   = identity transition signaling (live, real, narrow)
evidenceTiers     = evidence classification (live, real, narrow)
TEL               = authoritative historical event reconstruction (does not exist)
```

No overlap. No duplicate ownership. No accidental collapse of three different concerns into
one generic "provenance" layer.

---

## 4. Architectural Options

**Option A — Single Universal TEL.** One shared append-only log for every high-trust
transition across KRYLO.

**Option B — Domain-Scoped Ledgers.** Each domain (Genealogy, Identity, Compliance, ...) owns
its own authoritative ledger.

**Option C — Hybrid.** Core TEL for domains requiring authoritative replayable history
(Admission, Identity, Policy, etc.) — not scoped by "security-critical," which would narrow it
incorrectly. The actual boundary is trust/authority/replay requirement, not a security
classification. Other domains may run local ledgers that checkpoint into TEL.

---

## 5. Evaluation Matrix (no selection made)

Scoring: 1 = poor, 5 = excellent. Presented as trade-offs only — this document does not choose
an option; that's DQ-1 in §6.

| Criterion | A | B | C |
|---|---|---|---|
| Single source of truth | 5 | 2 | 4 |
| Blast-radius containment | 3 | 5 | 4 |
| Ops complexity | 2 | 4 | 3 |
| Cross-domain replay simplicity | 5 | 2 | 4 |
| Team autonomy / velocity | 3 | 5 | 4 |
| Governance overhead | 4 | 2 | 3 |
| Security boundary clarity | 5 | 4 | 4 |

---

## 6. Decision Checklist (Open Questions)

- **DQ-1.** Does KRYLO require a shared authoritative event history substrate for high-trust
  state transitions across domains, or may domains maintain independent authoritative
  histories? **This is the gating decision** for every implementation WO downstream of it.
- **DQ-2.** Who owns funding, roadmap, and SLA for the chosen substrate?
- **DQ-3.** Initial throughput & retention targets?
- **DQ-4.** Are `AdmissionDecision` events subject to extra privacy/compliance constraints
  (e.g., evidence URI redaction)?
- **DQ-5.** How will ruleset versions be registered and resolved at replay time?
- **DQ-6.** Migration path for existing domain logs (e.g., `identitylineage.js`'s runtime
  history) into the chosen solution, if any?

---

## 7. Recommendations & Next Steps

1. Schedule a governance session to resolve DQ-1.
2. Update this document with the decision and promote to Accepted.
3. Draft the TEL Specification proper, covering: event schema conventions, partitioning &
   ordering guarantees, API surface (write/read/replay), security/provenance/authority model.
4. After spec approval: TEL implementation WO(s), then a Genealogy Admission implementation
   WO targeting the TEL API — never before the reconciliation above happens.

---

## 8. Invariants

**TEL-INV-001.** While TEL scope is undecided, no domain-specific authoritative history
mechanism may be created if it overlaps with prospective TEL responsibilities. This is the
single most load-bearing line in this document — it's what prevents `GenealogyHistoryStore`,
`IdentityHistoryStore`, and `DecisionHistoryStore` from independently emerging as three
incompatible parallel systems. The system either gets a coherent historical substrate or
consciously chooses domain separation — never accidental fragmentation.

**TEL-INV-002.** A TEL event represents an accepted transition or recorded decision — not raw
observations or unprocessed signals. Discovery data remains owned by its originating domain.
Without this, TEL risks becoming an "everything stream" that destroys the distinction the
Admission work specifically depends on keeping separate: evidence ≠ proposals ≠ decisions ≠
state transitions.

---

## 9. Non-Goals (restated)

- No ledger engine selection or sizing
- No event schema finalization
- No changes to the Relationship Admission Contract or the RKM schema

---

## Appendix A — Glossary

**Truth Event Ledger (TEL)** — proposed append-only, verifiable event capability intended to
provide authoritative historical reconstruction for *approved* high-trust state transitions.
Exact scope and ownership are undecided (DQ-1).

---

## Final Chain

```
KRYL-1133 Genealogy Admission Policy
        |
        v
Relationship Admission Contract
        |
        v
WO-2049 TEL Capability Reconciliation (this document)
        |
        v
TEL Policy / Specification
        |
        v
Implementation WOs
        |
        v
Genealogy Admission activation
        |
        v
Re-evaluate CI-F / LFOS activation
```

The investigation that began with "why are nine engines disconnected" surfaced the actual
prerequisite layer: KRYLO needs governed memory before it can safely activate higher-order
reasoning. This is the correct stopping point for the analysis phase.
