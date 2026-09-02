# SPEC — CF Artifact Taxonomy (September stack extraction)

**Status:** CANDIDATE — executes ruling #2 of `SPEC-cf-002-is-reconciliation.md`. Final KRYL-CF
Jira numbering DEFERRED (Founder / Jira is the numbering authority). This map is the interim
authority for *which document owns what*, so cross-references stop being ambiguous.
**Date:** 2026-09-02

## Constitutional layer (unchanged, governing)

`KRYL-CF-001` architecture · `KRYL-CF-002` Edge Arbitration Protocol (APPROVED) ·
`KRYL-CF-003` Cognitive Fabric Contract (backlog) · `KRYL-CF-004` Cognitive Coherence Protocol
(APPROVED) · `KRYL-CF-005` Memory Model (backlog) · `KRYL-CF-006` Governance Model (backlog).
Source: `KRYLCF-1-through-6-canonical.md`.

## Naming rule (permanent)

- Constitutional artifacts: **`KRYL-CF-00x`** always.
- Everything below: **`SPEC-cf-<slug>.md`**, never a bare `CF-00x`.
- A bare `CF-00x §y` in any older document = the **September stack**, and is non-authoritative
  until reconciled through this map.

## CF-001-level architectural principles (adopted, Founder 2026-09-02)

Distilled from the `specs/CF-001 through CF-010` candidate file (itself provenance/untracked).
These state distinctions the existing specs *imply* but did not state strongly enough. Adopted as
record-level architectural principles — **no runtime change, no gate movement.**

### P-A — Three-layer topology separation (PRIMARY)

> The Cognitive Fabric has **three distinct structural layers**, and **no layer is reducible to
> another**:
> 1. **Processor topology** — Remote / Core capability classes / instances / capabilities.
> 2. **Runtime / event structure** — signal / routing / processing / exploration / events.
> 3. **Analytical topology** — observation → relationship → pathway → formation candidate → formation.
>
> The layers are **correlated only through events** (layer 2). An implementation SHALL NOT let the
> processor graph *become* the analytical graph.

*Why locked before ticketing:* without it, an implementation team can accidentally collapse the
processor topology into the analytical genealogy. (Stronger than CF-009 §6's "two genealogies.")

### P-E — Persistence / reconstruction consequence of P-A

> **Event history is not analytical topology.** It is the persistent record that preserves enough
> genealogy to reconstruct *both* the processor topology and the analytical genealogy —
> **without** the original runtime topology remaining active (cf. CF-010 §9 Replay, X4) — and
> **without** that history being mistaken for either topology.

Three histories: Runtime history · Processing history · Analytical genealogy.

### P-C — The precise scalability statement

> **ΔN ⇏ Δ|K_core|** — increasing Remote observational reach does not require an increase in the
> number of Core capability classes.

The formal form of AI-4. It is materially stronger than "9 + N" and **does not** make the
false claim that Remote activity can never affect routing: a Remote can discover a signal that
changes `req(s)` and therefore routing (CHARACTERIZE → req(s) → route). What is invariant is the
**Core capability *class* set**, not the routing *result*.

### Not adopted here (architecture-review inputs)

- **Three quantities `|K_core|=9` / `|P_core(t)|` / `|R(t)|`** — the elastic-Core-*instances* term
  conflicts with `SPEC-cf-is5-capability-taxonomy.md` §0 (one homogeneous node type; nine
  capabilities = registry entries). Needs the architecture review to reconcile whether a "Core
  processor instance" is a node carrying that capability (IS-5) or a distinct machine type (this
  file's diagram).
- **Proposed `CF-001-INV-001…007`** — NOT imported as a new invariant namespace. `CF-001-INV-006`
  "Governance Separation" **collides with the locked `CF-004-INV-006` Guest-Path Non-Interference**;
  and it is a third invariant set alongside CF-I1…I7 and AI-1…AI-9. Only its INV-004 (topology
  separation) and INV-007 (genealogical reconstruction) are new — captured as P-A / P-E above.

## Extraction map — September CF-002…CF-010 → subordinate candidate specs

| September source | New home | Disposition |
|---|---|---|
| CF-002 §1–5, §25–29 (capability/reach separation, "9 Core classes", central router `ρ(s)`, scalability claims) | **folded as a note under `KRYL-CF-004`** + `SPEC-cf-002-is-reconciliation.md` §0a (X1, X6) | mostly **rejected/subordinated**: central router → conflict; "9 classes" → taxonomy-only (X6); capability *matching* → compatible, already in KRYL-CF-004 |
| CF-002 §6 (ProcessingEnvelope / ProcessingResult), §8–10, §16–17, §20 (Remote contract, local autonomy, capability discovery) | **`SPEC-cf-ingress-substrate.md`** (new) | **candidate — fills a real KRYLCF gap** (KRYLCF has no connector / transport / raw-data→artifact concept); reconcile against KRYL-CF-004 Node Capability Registry |
| CF-002 §11–15, §21–22 (routing, multi-processor, re-entry, resource isolation, backpressure) | **`SPEC-cf-ingress-substrate.md`** §routing + `KRYL-CF-004` reconciliation | candidate; re-entry (§15) compatible; routing subordinate to CCP need-to-align model |
| CF-002 §23–24 (provenance boundary, output classes) | already constitutional (mirrors existing KRYLO separation) — **no new artifact** | compatible |
| CF-003 §3–5 (Signal, Observation, Observation Semantics) | **`SPEC-cf-ingress-substrate.md`** | candidate substrate data contract |
| CF-003 §6–9 (Relationship, direction, ProcessingEvent, RoutingEvent) | **`SPEC-cf-pathway-data-model.md`** (new) | candidate; Relationship admission defers to `admitCrossDomainRelationship` |
| CF-003 §10–14 (Pathway, events, topology, depth, structural_significance) | **`SPEC-cf-pathway-data-model.md`** — **this is where IS-1 lands** | candidate; X3 rulings apply |
| CF-003 §15–17 (FormationCandidate, Formation, boundary) | **`SPEC-cf-pathway-data-model.md`** §formation-interface (IS-6) | candidate; admission defers to `inferFormation` / Formation-B rules |
| CF-003 §18–22 (provenance, uncertainty, temporal, immutability, derived state) | **`SPEC-cf-pathway-data-model.md`** §invariants | candidate; X4 immutability + reconstruct-from-history |
| CF-003 §25–26 (five semantic layers, unit of analysis) | **`SPEC-cf-pathway-data-model.md`** §invariants | **load-bearing** — the Phase-3 firewall; X3/X5 |
| CF-004 §3–4 (Signal ingress, characterization → `req(s)`) | **`SPEC-cf-ingress-substrate.md`** | candidate |
| CF-004 §10 (runtime state machine) | **`SPEC-cf-pathway-data-model.md`** §lifecycle (IS-2) | candidate; X4 tiered lifecycle |
| CF-004 §11 INV-001…005 + **INV-006 Guest-Path Non-Interference** + **MET-01** | **`SPEC-cf-pathway-data-model.md`** §invariants | INV-006 + MET-01 **LOCKED** (X2/X5 ratification) |
| CF-005 §2.1/§2.2/§5 (νₜ observable, provenance DEF-05-04, observation vs classification) + §3–10 | **`SPEC-cf-significance-policy.md`** (new) | **candidate policy spec** — νₜ algorithm = versioned policy component (X2) |
| CF-005 §8 (convergence), §9 (revisit) | **`SPEC-cf-pathway-data-model.md`** §identity + §lifecycle | candidate; IS-3 convergence, X4 revisit |
| CF-006 (Formation Synthesis & Admission) + **FC-REQ-05** | **`SPEC-cf-pathway-data-model.md`** §formation-interface (IS-6) | FC-REQ-05 **LOCKED** (X5); pipeline defers to KRYLO Formation governance |
| CF-007 (scalability/concurrency/backpressure) | **`SPEC-cf-ingress-substrate.md`** §resource + CF-008 telemetry | candidate; M/M/m = optional model only |
| CF-008 (validation & falsification) | **`SPEC-cf-kill-experiment.md`** (exists) + `SPEC — Cognitive Fabric & Formation Frontier.md` §29–35 | the falsification claims map to the kill experiment |
| CF-009 (KRYLO integration & governance) | **`KRYL-CF-006`** (Governance Model, backlog) — Founder | subordinate to constitutional governance |
| CF-010 (reference implementation requirements) | **`SPEC-cf-kill-experiment.md`** + IS-4 implementation | the minimum-runtime + reference-scenario requirements |
| νₜ / Formation Frontier / IS-1…IS-12 | **`SPEC — Cognitive Fabric & Formation Frontier.md`** (exists) — the research/frontier spec | IS-1…IS-6 authored into the substrate specs above; IS-7…IS-12 stay research |

## The three new subordinate candidate specs

1. **`SPEC-cf-ingress-substrate.md`** — how raw external observation becomes an admitted CF
   signal/observation (the KRYLCF gap): ingress, characterization, the Remote/connector layer,
   re-entry, resource isolation. Reconciles against KRYL-CF-004 Node Capability Registry.
2. **`SPEC-cf-pathway-data-model.md`** — Pathway, lineage, ordered typed events, identity (IS-1),
   lifecycle ACTIVE/ARCHIVED/TOMBSTONED (IS-2/IS-4), convergence (IS-3), the νₜ *field* + its
   provenance envelope, FormationCandidate interface (IS-6), and the locked invariants
   (five semantic layers, unit-of-analysis, immutability, INV-006, FC-REQ-05).
3. **`SPEC-cf-significance-policy.md`** — the νₜ *algorithm* as a versioned policy component:
   memory decay, current-support determination, ΔS classification (DECAY/PERSISTENCE/
   AMPLIFICATION), and the parameter surface (λ, support window, memory floor).

`SPEC — Cognitive Fabric & Formation Frontier.md` stays the research/frontier spec and the home
of IS-7…IS-12.

## What this does NOT do

- Does not mint `KRYL-CF-007+` Jira numbers — deferred to Founder / Jira.
- Does not ratify any September content — everything moved here is **candidate**, disposition
  noted, pending reconciliation in the target spec.
- Does not touch the constitutional KRYL-CF-001…006 artifacts.
