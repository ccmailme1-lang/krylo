# CF Production-Readiness Validation — WS1: Real Connector Provenance

**Status:** VALIDATION FINDING — not an authorization to build or merge.
**Gate:** WS1 of 6 (`SPEC-cf-002-is-reconciliation.md` §0a "Next gate").
**Question:** can real connector data feed IS-1 reference continuity without weakening a locked
invariant?
**Date:** 2026-09-02 · branch `cf-canonical-substrate-experiment`.

## 1. What real connector events actually carry

Per `SPEC-connector-event-contract.md` + a read of `edgar8kconnector.js`,
`patentsviewconnector.js`, and the 34-connector survey:

| field | present on | usable for IS-1? |
|---|---|---|
| `source` (connector id) | all | metadata only (IS-1 §4 — never identity) |
| `domain`, `signal`, `confidence`, `ts` | all | the observation itself; `ts` = logical time |
| `canonicalId` / `identityId` / `cik` / `ticker` (ERK-resolved entity) | EDGAR, SEC-ownership, financial-market | **subject reference** — Tier B (below) |
| `assignee_organization`, `inventor_id`, `patent_id` | PatentsView | subject reference — Tier B |
| `accessionNumber` + `cik` (idempotency key) | EDGAR | unique per filing; not linked to prior filings *in the emission* |
| `topology[]` (source-cluster tags) | PatentsView relation events, a few others; mostly `[]` | weak cluster hint |
| `fanout` / `fanoutIndex` (one source event → N domains) | contract; KRYL-1093 guard | **Tier A** (below) |
| `facet` (which `I_d` signal it grounds) | forward — not yet emitted | Tier A' when emitted |
| structured citations (EDGAR filing→prior, patent→cited_patent) | **in the source data, NOT queried/emitted by any connector** | **Tier A' — requires a connector pass** |

**No connector currently emits an explicit event-to-event `dependsOn` chain.**

## 2. Reference-continuity tiers (production)

| tier | source | IS-1 disposition | strength |
|---|---|---|---|
| **A** | `fanoutIndex > 0` siblings — the *same* source event emitted into multiple domains | **EXTEND** — genuine reference continuity | strong, but same-batch (limited *staggered* value) |
| **A'** | structured citations a connector *could* emit (EDGAR references, patent `cited_patents`, 8-K exhibit chains) | **EXTEND** — genuine, once emitted as `dependsOn` | strong; **additive connector work**, not an architecture change |
| **B** | shared ERK `canonicalId` / `cik` / `assignee` — different real-world events about the same subject | **NOT EXTEND** (X3 §3.5 — subject-sharing alone can't establish pathway identity). Drives **C3 RELATIONSHIP_CANDIDACY** + **C6 CONVERGENCE_RECOGNITION** only | weak for identity; normal for relationships |
| **C** | semantic / textual (an 8-K narrative mentions an acquisition) | **forbidden for identity** (X3 §3.5); may inform C3 hypothesis only | n/a |

## 3. Critical finding — the kill-experiment advantage is Tier-A scoped

The `multi-event` RETAIN result was demonstrated with the fixture modelling the three legs as
**Tier A** (an explicit `dependsOn` chain → one pathway). In production, the common staggered
cross-domain formation is **Tier B**: one company files an 8-K, gets press coverage, makes an FEC
contribution — linked by `canonicalId`, **not** a citation chain.

Under the ratified v0.2 admission rule (`corroborated this batch OR cluster-live this batch`),
**Tier-B staggered legs get no formation-recovery advantage over the synchronous baseline** —
separate pathways sharing only an entity never co-form in a single batch and so never become
cluster-live. Re-derived here; consistent with the v0.1→v0.2 finding.

**So CF's *validated* multi-event advantage covers:**
- Tier A (fanout siblings) — real but mostly same-batch.
- Tier A' (structured citations) — real, requires a per-connector extraction pass (EDGAR
  references, PatentsView `cited_patents`). Bounded, additive, no architecture change.

**It does NOT currently cover** the broad Tier-B case. Closing that needs one of:
- **(a) Accept the narrower claim** — CF's staggered-formation advantage applies where connectors
  emit structured reference chains. Honest, smaller.
- **(b) Authorize a Tier-B admission-rule extension** — e.g. entity-sharing makes two pathways
  eligible for C3 relationship candidacy; if **C4 admits a relationship** between a stale
  entity-linked pathway and a fresh one, the stale pathway becomes cluster-eligible. This
  bootstraps a cluster without a prior co-formation. **It re-opens decoy risk** (a decoy sharing
  an entity with a genuine formation) and MUST get its own adversarial probe before ratification.
  This is a **new architectural decision**, i.e. outside this validation phase's scope — flag to
  Founder, do not build.

## 4. Invariant check — does WS1 weaken anything locked?

| invariant | effect of real connector provenance |
|---|---|
| Guest-path non-interference (INV-006) | none — CF still reads the pool asynchronously |
| Provenance reconstructable (CF-002 §23) | **strengthened** — real events carry `sourceURL`, `accessionNumber`, `canonicalId`, groundedness |
| Admission = currently-supported (FC-REQ-05 / X5) | unchanged — the tier question is about what *feeds* the rule, not the rule |
| IS-1 identity (X3 §3.5) | **respected** — Tier B/C are explicitly barred from EXTEND |
| No hard delete (X4), ν_t observable + policy (X2) | unchanged |

**WS1 verdict:** real connector provenance can feed IS-1 **without weakening any locked
invariant**. The cost is scope: CF's staggered-formation advantage is Tier-A/A' only under the
ratified rules. Tier A' is a bounded additive connector pass. Tier B is a separate architectural
decision for the Founder — not this phase.

## 5. Minimal work this finding implies (NOT authorized here)

- A per-connector `dependsOn` extraction pass for EDGAR (filing references) and PatentsView
  (`cited_patents`) — additive, ~1 connector at a time.
- A `provenance` block on the CF ingest particle carrying `{ source, canonicalId, sourceRef,
  dependsOn? }` from the connector event — additive to `pathwaystore.ingest`.
- DEFECT-WO1-CONF (`confidence` scale, KRYL-1228) is upstream of this and unrelated to identity —
  does not block WS1.
