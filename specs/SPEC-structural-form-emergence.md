# SPEC — Structural Form Emergence (SF-001)

**Status:** NEEDS-SPEC — separate normative artifact (Founder, 2026-09-02). Working id **SF-001**.
Not part of WS6, not part of CF-002, not an interpretation of Closed-Loop Perception.

```
CF-002 / WS6           SF-001
    ↓                    ↓
preserve + execute    compare preserved Formations → derive invariants → Structural Form
Formation substrate
```
**Governs:** abstraction across a *population* of preserved Formations.
**Does NOT govern:** how any single Formation is detected, admitted, or constructed.

## 0. Central invariant

> **Preserve instances; abstract invariants.**

Individual Formations are retained as distinct instances. A *Structural Form* is a second,
derived object — the recurring structural pattern shared across several of them. The instances are
never replaced by, collapsed into, or gated by the Form.

## 1. Placement in the hierarchy

```
CF-002  (substrate / runtime contract)
   ↓
Formation
   ├──→  Closed-Loop Perception spec   — observation / re-entry / revision of ONE formation
   │
   └──→  Formation population
              ↓
         Structural Form Emergence  (this spec)  — cross-instance abstraction
```

Closed-Loop Perception and Structural Form Emergence are **separate mechanisms**. Neither is
implemented as an interpretation of the other. CF-002 is not modified to absorb this.

## 2. Normative chain

```
Observation
   ↓
Relationship
   ↓
FORMATION                        ← distinct instances preserved (X4: no hard delete)
   ↓
CROSS-FORMATION COMPARISON       ← partial structural overlap between ≥2 distinct Formations
   ↓
PERSISTENT STRUCTURAL            ← the part of the overlap that recurs (not coincidence);
CHARACTERISTIC                     established by recurrence / reconciliation
   ↓
STRUCTURAL FORM                  ← the named, derived higher-order structural identity
   ↓
Re-encounter                     ← a later Formation matches a known Structural Form
   ↓
Form Reconciliation              ← record the match; the instance stays distinct; the Form may
                                    be revised, never used to pre-admit the instance
```

**The proposition to protect** (Founder, 2026-09-02):

> The system can preserve the individual structural instances while deriving a higher-order
> structural identity from **what persists across them**.

SF-001's contribution is the **architecture of abstraction with instance preservation**, not the
broad idea that "overlap creates abstraction."

## 3. The load-bearing rule (protects against a predefined classification system)

> **A Structural Form SHALL be derived from recurring structural invariants across multiple
> distinct Formations. A Structural Form SHALL NOT be a prerequisite for detecting, admitting, or
> constructing those Formations.**

Corollaries:
- **No Form catalogue drives admission.** `admitCrossDomainRelationship` / `inferFormation`
  thresholds are unchanged and Form-blind. A Formation forms because its relationships and
  pathways qualify — never because it "looks like" a known Form.
- **Emergence is bottom-up only.** A Structural Form cannot be authored as a template and then
  "matched against." It exists only after ≥ N distinct Formations have independently exhibited
  the same invariant (N and the invariant criteria: this spec, when written).
- **Re-encounter does not shortcut.** Matching a new Formation to a Structural Form records a
  relationship between them; it does not raise the new Formation's confidence, pre-populate its
  legs, or lower its admission bar.
- **Instances survive.** The substrate retains every contributing Formation as a distinct
  instance. A Structural Form is an index over them, not a replacement.

## 3a. Biological-parallel guardrail (Founder, 2026-09-02)

An independent parallel exists in neuroscience — index neurons abstracting into concept neurons
via partial overlap across distinct episodes, with "just enough overlap" to expose the common
element while pattern separation preserves each episode
(`reference — Kolibius, Josselyn & Hanslmayr 2025`, `Origin of Memory Neurons.pdf`). It is an
**analogy that supports the architecture, not a mechanism to import.**

> **Biological mechanisms that produce cross-context abstraction SHALL NOT be treated as
> architectural mechanisms for Structural Form Emergence.**

Specifically forbidden as a borrow: the biological `recall → increased excitability →
preferential allocation` sequence. In KRYLO, **re-encountering something must not confer
structural privilege merely because it was previously observed** — this is the same bar as
SF-001 §3 (re-encounter does not shortcut) and CF's Form-blind admission. (It is also the
"structural-participation support" idea deferred, and not authorized, in
`SPEC-cf-significance-policy.md` §3.1.)

The "~4% of concept neurons take a new association" finding is **not a parameter** — its value is
the *shape*: abstraction can be selective/conservative, not every recurring feature becoming a
Form (see the second research question below).

## 4. What this spec must define (open)

- `Cross-Formation Overlap` — the formal structural-correspondence relation between two
  Formations (domain set? relationship-type multiset? pathway topology? boundary shape?).
- **Research question (calibration):** *what degree/type of cross-Formation overlap permits an
  invariant to emerge without collapsing the Formation instances being compared?* ("just enough
  overlap" — a question, not yet a threshold.)
- `Invariant` — the recurrence test that separates a real invariant from coincidence (minimum
  distinct-Formation count, provenance-disjointness requirement, an adversarial "coincidence
  decoy" probe analogous to `persistent-strong-decoy`).
- **Research question (selectivity):** *under what conditions should a recurring structural
  characteristic remain merely recurrent rather than become an admitted Structural Form?*
- `Structural Form` object — id, contributing formation ids, the invariant description,
  provenance, revision history.
- `Form Reconciliation` — the event vocabulary (FORM_CREATED / FORM_EXTENDED / FORM_CONTRADICTED
  / FORM_REVISED / FORM_DISSOLVED), mirroring CF-006 §8 for Formations.
- Governance — whether a Structural Form is admitted (like a Formation) or is a pure derived
  index. Founder ruling required.
- Guardrail alignment — this is *detection of recurring structure*, not prediction; must satisfy
  "we don't predict, we detect" and FORMATION IS NOT A VERDICT (a Form is structure, not a
  conclusion about what the next instance will do).

## 5. Cross-references (canonical instruction set)

- `SPEC-cf-002-is-reconciliation.md` §0a — CF architectural record; add a pointer, do not fold in.
- `SPEC-cf-prodval-06-integration-gates.md` — WS6 Scope Boundary (WS6 must not implement this).
- `SPEC-closed-loop-observation-architecture.md` — the parallel per-instance mechanism.
- Memory `project_jepa_workstream.md` (linked from `MEMORY.md`) — carries the distinction across
  sessions now.
- CLAUDE.md — a one-line pointer under §21 is **deferred until this spec is ratified**; a
  NEEDS-SPEC artifact does not belong in the constitution yet.
