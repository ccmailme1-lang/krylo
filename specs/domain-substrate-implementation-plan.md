# Domain Substrate — Implementation-Fidelity Plan

**Status:** FROZEN — Founder plan (2026-08-29), amended 2026-08-30 (§0 below).
Recorded, not originated. The **governing posture from here**: *we are no longer
designing the ontology; we are testing whether the system can faithfully
instantiate it.*
**Precondition met:** Track #3 ontology consistency **CLOSED** (`6c3498b`) +
**all 12 WO-1 Class-E measures AUTHORED** (2026-08-30, `a0f4167`) rendering live
as honest STRUCTURAL absence (KRYL-1229, `f193e5c`).
**Gate:** nothing here is build-authorized. Sequencing + exit criteria only.

---

## 0. Governing acceptance criterion (Founder, 2026-08-30)

**WO-1 is no longer a backend-only workstream.** The 12 measures are authored and
the guest can already perceive their *absence honestly* — the first complete
vertical slice: **authored truth → runtime definition → guest-facing SIGNAL
state**. Every remaining implementation WO extends that slice toward structural
perception, and each carries one acceptance question:

> **What does the guest see now that they could not see before?**

An implementation WO that does not change what the guest can perceive is not done,
regardless of backend correctness.

**The critical sequence (each stage is guest-perceptible, not just wired):**

1. **WO-1 source wiring** — per measure: `source → facet → provenance →
   normalized signal → A(d, Subject)`. Acceptance: *can KRYLO obtain the measure
   for a real subject without collapsing source identity, scope, or attribution?*
   The three shared-source cases (PatentsView → TECH/OWN/CAP; Census → LAB/OWN;
   FEC → CAP) are the hard cases. KRYL-1228 (confidence normalization) is
   independent and runs alongside.

2. **WO-5B subject binding** — the transition from **domain intelligence** to
   **perceptual intelligence**. Today the panel proves *"MEDIA has an authored
   narrative-coherence measure, but its source isn't wired."* WO-5B makes it
   possible to say *"for this subject, MEDIA observes this."* `I_d` stays
   reusable; `A(d, Subject)` supplies the binding; **no new domain primitive is
   invented here.**

3. **Relationships (UI)** — the six tabs stop behaving like six separate reports.
   The guest must not have to mentally perform *"CAPITAL says X, TECHNOLOGY says
   Y … therefore related."* The closed 15-type vocabulary gives the system
   permission to expose the relationship explicitly. This is §20 becoming UI:
   **don't make the analyst assemble the relationship.**

4. **Formation** — only after observations *and* relationships are honestly
   subject-scoped. The guest encounters a formation as something **emerging from
   the observed structure**, never as an interpretation pasted over six panels.
   Preserves the chain **Subject → Observable Substrate → Relationships →
   Formation**.

**WO-6 is redefined** — the Anduril fixture is the **guest-experience acceptance
test for the architecture**, not just an engineering integration test. A passing
run demonstrates: Anduril → six-domain substrate → subject-scoped observations →
distinct facets → admitted relationships → formation → Target Packet perception →
unresolved elements preserved — with **no invented relationship, no fabricated
measure, and no requirement for the analyst to reconstruct the structure
manually.** That is the first genuinely meaningful definition of "done."

---

## Governing invariant (both directions)

> **The ontology defines what may be observed and related; implementation cannot
> broaden it implicitly.**

- A connector cannot manufacture a second domain observation by relabeling the
  same number. (integration-contract AC — Shared-source distinct facet)
- `F` cannot manufacture a relationship type because the evidence makes a
  compelling story. (integration-contract AC — Closed relationship admission set)

The previously-floated implementation WOs (WO-B / WO-C) are **not created** —
their architectural work is done by `6c3498b`.

---

## Canonical state

```
TRACK #3 — Domain ontology consistency ......... CLOSED
  six I_d boundaries ......................... CLOSED
  concentration orthogonality ............... CLOSED
  dimension / edge rule .................... CLOSED  (general, authoring-spec §2.1)
  relationship vocabulary ................. CLOSED  (15 types)
  cross-domain attribution .............. CLOSED

IMPLEMENTATION FIDELITY
  signal authorship ..................... CLOSED  (12/12 Class-E authored 2026-08-30)
  guest-facing absence state ........... CLOSED  (KRYL-1229 — honest STRUCTURAL absence live)
  signal measurement / source wiring .. OPEN    (WO-1 — §0.1)
  shared-source facets ............... OPEN    (WO-2 — the 3 hard cases)
  relationship admission ........... CLOSED  (WO-3, runtime guard `441cfa6`)
  subject binding A(d,Subject) .... OPEN    (WO-5B — §0.2)
  relationship exposure (UI) .... OPEN    (§0.3)
  integration ................. GATED   (WO-5 needs WO-1 source + WO-2 + WO-5B)
```

Every OPEN row above carries the §0 acceptance question.

---

## WO-1 — Signal Authorship & Measurement

- **Authorship half (Founder-side): DONE 2026-08-30.** All 12 Class-E measures
  authored (`domain-substrate-wo1-signal-classification.md`; `domain-intelligence/
  <D>.md` §3.1–§3.3; `domainintelligence.js` `signalDefs`). 4 normalization
  decisions LOCKED. Guest-facing absence state DONE (KRYL-1229).
- **Measurement / source-wiring half (engineering): OPEN.** Per measure:
  `source → facet → provenance → normalized signal (§12 ingestion contract) →
  A(d, Subject)`. Acceptance (§0.1): *the measure is obtainable for a real
  subject without collapsing source identity, scope, or attribution.*

**Exit:** every authored measure either produces a subject-scoped 0–100 signal
with provenance + single-axis attribution, or renders honest STRUCTURAL absence —
and the guest can tell which, and why. No fabricated value, no volume proxy.

## WO-2 — Shared-Source Facet Integrity

Implement + test the distinct-facet dispatch:

| connector | domains | distinct facet per domain |
|---|---|---|
| `patentsviewconnector.js` | TECH / OWN / CAP | capability-cluster velocity · assignee concentration · R&D-intensity proxy |
| `censusconnector.js` | LAB / OWN | workforce/establishment counts · establishment ownership |
| `fecconnector.js` | CAP / MEDIA | actual capital flow · ad-spend-as-attention-pressure |

**Exit:** each domain receives a genuinely distinct facet; an identical-payload
relabel **fails acceptance**.

## WO-3 — Closed Relationship Admission

Bind `F` to the ratified **15-type** cross-domain relationship vocabulary
(`CROSS-DOMAIN-CONSISTENCY.md` §4a).

**Exit:** admitted types work; an unadmitted relationship cannot enter Formation.

## WO-4 — Commercial Entry / Subject Funnel

Translate the frozen commercial model
(`PROBLEM-STATEMENT-and-commercial-funnel.md`) into the entry path:
`buyer problem → buyer question → subject → investigation`, replacing
`choose a domain → inspect visualization`.

**Integration disposition, not an architectural redesign.** Retires the
`CHOOSE A DOMAIN` control.

## WO-5 — Target Packet Micro-Lens

Verify the packet implements the ratified model — `I_d → A(d, Subject) →`
[OBSERVES · SIGNAL · RELATIONSHIP · RELEVANCE · UNRESOLVED · SHARPEN] scroll per
domain tab, then `F`.

**Exit:** no second analysis engine; no generic packet template
(STAKE/MOVE/WINDOW/LEVERAGE FIELD) replacing lens intelligence; panel↔field 1:1
(integration-contract AC); `I_d` identical at Field and Subject scope (Q8).

## WO-6 — End-to-End Closure Gate (= guest-experience acceptance test, §0)

One real investigation (**Anduril fixture**,
`SPEC-domain-substrate-integration-contract.md`) demonstrates the full chain with
frozen contracts enforced throughout:

```
Buyer Question → Subject → six-domain substrate → A(d, Subject) subject-scoped
observations → distinct facets → admitted relationships → F → Formation
→ Target Packet perception → unresolved elements preserved
```

**Exit:** the chain renders for the guest with **no invented relationship, no
fabricated measure, and no requirement for the analyst to reconstruct the
structure manually.** The passing artefact answers §0: *what does the guest see,
for Anduril, that they could not see before?* This is the first genuinely
meaningful definition of "done."

---

## Sequencing

```
DONE:  WO-1 authorship · KRYL-1229 absence state · WO-2 (partial, `ea50655`) · WO-3 (`441cfa6`) · WO-5A (`4a79a8a`)

WO-1 source-wiring ──┐
WO-2 (3 hard cases) ─┼─→ WO-5B (subject binding) ─→ Relationships UI ─→ Formation ─→ WO-6
KRYL-1228 ───────────┘
WO-4 (entry funnel) ───────────────────────────────────────────────────→ (feeds WO-6)
```

- WO-1 source-wiring, WO-2's three shared-source cases, and KRYL-1228 run in
  parallel; each is guest-perceptible per §0.
- WO-5B needs WO-1 source-wiring + WO-2 for at least one domain to show real data;
  it renders honest absence for the rest.
- Relationship exposure (§0.3) follows WO-5B — needs subject-scoped observations
  on both ends of an edge.
- Formation (§0.4) follows relationships.
- WO-4 (entry funnel) is independent until WO-6.
- WO-6 is the gate; it requires the whole chain.

Jira numbering is the sole authority — these are the plan, not tickets. File in
KRYL when work is authorized.
