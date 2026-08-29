# KRYLO Structural Signal Surface Architecture
## Domain Substrate, Viewport Replacement & Domain Intelligence Primitive

**Status:** DRAFT — Founder review
**Version:** 0.2.1 (mathematical corrections applied)
**Scope:** Surface → Target Packet → Formation
**Primary Principle:** Capture once → scope repeatedly → synthesize afterward
**Supersedes:** the earlier three-track capture note; `specs/redesign raw spec` (raw discussion this distills)
**Related:** `SPEC-signal-resolution-mechanic.md` (absorbed into Track #3), KRYL-1221, KRYL-1222, KRYL-1225
**Build authorization:** NONE. #1 needs its audit; #2 needs its decision; #3 needs authoring before any UI is designed against it.

---

## 1. Purpose

This specification defines the architectural transition from multiple, independently
generated analytical vocabularies toward a single structural-signal architecture
shared across KRYLO surfaces.

The change establishes:

1. Six structural domains as the primary user-facing analytical substrate.
2. A reusable domain intelligence primitive authored once per domain.
3. Subject-scoped reuse of that primitive in Target Packets.
4. Formation as downstream synthesis of observations and admitted relationships
   across all six domains.
5. Replacement of the existing perceptual viewport-lens controls with
   structural-domain controls, subject to a truth-first behavioral audit.
6. Independent governance of the existing role-lens abstraction, including its
   explicit relationship to Role-Play Protocol §13.
7. Inspection of every internal primitive exposed through the Data Substrate before
   feature completion.

This specification does not assume that all required domain intelligence currently
exists in code. Where intelligence does not yet exist, the system must expose only
what is supported by current data and retain existing generic mechanisms as
explicit provisional placeholders.

---

## 2. Architectural Principle

KRYLO shall implement:

> **Capture once → scope repeatedly → synthesize afterward.**

Let `𝒟` be the finite, LOCKED set of structural domains:

```
𝒟 = { CAPITAL, OWNERSHIP, TECHNOLOGY, KNOWLEDGE, LABOR, MEDIA }
```

A domain's analytical intelligence is a fixed authored object `I_d` for each `d ∈ 𝒟`.

### 2.1 Scope is two-dimensional

Scope is a pair `s = (spatial, temporal)`:

```
spatial  ∈  { Field, Subject }          strict order:  Field ≺ Subject
temporal ∈  { Live, Historical, Forecast }   (the existing SIGNAL SCOPE control)
```

`𝒮_A = { Field, Subject } × { Live, Historical, Forecast }`

**Cross-domain is NOT a scope of `A`.** Formation is a separate operator (§14),
not `A` at a third scope. This is load-bearing: it structurally prevents Formation
from being implemented as "just another scope," which is the path by which it
would come to manufacture observations.

`Forecast` overlaps `SPEC-KRYL-1225` (Formation Forecast Boundary) — the
observed/extrapolated split defined there governs any `temporal = Forecast`
application. `A(d, (·, Forecast), ·)` never renders an extrapolated region unless
KRYL-1225's trajectory conditions hold.

### 2.2 Application function

```
A : 𝒟 × 𝒮_A × Subject  →  ObservationSet          (partial)
```

Changing `s` changes the observed values. It never changes the vocabulary or the
analytical contract of `I_d`.

### 2.3 Scope model

| Surface       | spatial | Function `A(d, s, ·)`                                         |
|---------------|---------|--------------------------------------------------------------|
| Surface       | Field   | Observe structural activity across `𝒟`                       |
| Target Packet | Subject | Apply the same `I_d` to a concrete subject/question           |
| Formation     | —       | Separate operator `F` over the six Subject-scoped results (§14) |

---

## 3. Three Existing "Lens" Concepts — Strict Separation

The implementation currently contains three distinct concepts. They are three
pairwise-disjoint families:

```
L_V ∩ L_R ∩ L_D = ∅      (pairwise)
```

- `L_V` = perceptual viewport lenses
- `L_R` = role lenses
- `L_D` = domain intelligence primitives (the new construct)

No mapping, renaming, or state substitution may move an object between families
without an explicit architectural decision recorded here or in a successor spec.

### 3.1 Perceptual Viewport Lens (`L_V`) — Track #1

```
L_V = { NAV_SURFACE, OBSERVE, SIGNAL, FLOW, PRESSURE, CONVERGENCE, DRIFT, OPPORTUNITY }
```

- **State:** `activeLens` in `src/context/PrismContext.jsx` (default `NAV_SURFACE`).
- **Sole writer:** `src/components/surface/floatingtoolbar.jsx`, `dispatch({type:'SET_LENS'})`.
- **Readers (≈9):** `app.jsx`, `conemap.jsx`, `analysisfield.jsx`, `analysisidlefield.jsx`,
  `ingestionbuilder.jsx`, `searchprofile.jsx`, `oracleview.jsx`, `campaignfunnel.jsx`,
  `TenKView.jsx`.
- **§8 HUD-gating contract** keys on exact members of `L_V` (`NAV_SURFACE` / `OBSERVE`).

**Disposition:** `L_V` is NOT the domain intelligence primitive. Its user-facing
toolbar controls are candidates for replacement by the six members of `𝒟`. Before
any replacement, Track #1's truth-first audit must produce a total function

```
δ : L_V → { preserve, replace, retire, relocate }
```

plus the complete behavioural matrix (§19). No element of `L_V` may be silently
discarded.

**Known inconsistency (document, do not treat as progress):** `floatingtoolbar.jsx`
displays `OPPORTUNITY` as `OWNERSHIP` (`LABELS` override) while every `viewportLens`
check still says `OPPORTUNITY`. This is an implementation defect, NOT a member of
any legal conversion function `L_V → 𝒟`. Also on record: "the other 6 buttons stay
visible but are inert [on Structure] today."

### 3.2 Role-Lens Abstraction (`L_R`) — Track #2

Distinct from both `L_V` and `L_D`. Current elements: `session.lens`, `LENS_PRESETS`,
`routeLens`, the four role briefs in the Target Packet, Role-Play Protocol §13 in
CLAUDE.md, and associated scaffold/geometry behaviour. Representative roles: CFO,
CEO, Investor, Realtor.

**Status:** No automatic removal is authorized. Track #2 must produce a total function

```
ρ : L_R → { remain, demote-to-session/query, internal-only, remove }
```

If `ρ` yields removal or material alteration, **Role-Play Protocol §13 must receive
an explicit CLAUDE.md amendment before any code change is merged.**

**Hard constraint (makes #2 ∥ #3 genuine):** whatever `ρ` decides, **role must
never become a parameter of `A` or `I_d`.** Role may shape the subject/query going
in, or the narrative coming out — it may not modify the observation contract. If
role were allowed to modify what a domain observes, `A(d,s,subject)` would become
`A(d,s,subject,role)` and Track #2 would block Track #3. It does not.

Semantic distinction (non-negotiable):

- Role answers: *Who is asking / what contextual perspective is relevant?*
- Domain answers: *What structural substrate is being observed?*

### 3.3 Domain Intelligence Primitive (`L_D`) — Track #3

The core net-new work. NOT currently equivalent to domain pressure, polarity,
`DOMAIN_PRECURSORS`, `LENS_PRESETS`, or any member of `L_V`.

---

## 4. Domain Definition (`I_d`, authored once)

For each `d ∈ 𝒟` there is a unique authored object:

```
I_d = (
  domain,
  observes,
  signals,
  structuralDimensions,
  relationships,
  relevanceConditions,
  tensionPatterns,
  missingDimensions,
  sharpeningInputs
)
```

The analytical *content* of these fields is authored and ratified separately — the
**Domain Intelligence Primitive — Authoring & Ratification Specification** (§23).
That document is UI-free. This spec defines only the architectural role of the
fields. Content is Founder-authored, never model-generated.

---

## 5. Domain Application (`A`, observed result)

Definition and application are strictly separated:

```
I_d                          authored intelligence
A(d, s, subject)             observed result
```

A subject-scoped application:

```
A(d, (Subject, t), subject) = (
  d, subject, scope,
  signalIntensity,
  observationCount,
  polarity,
  observations,
  relationships,
  tensions,
  unresolvedDimensions,
  sharpeningInputs
)
```

The UI is forbidden from inventing either `I_d` or any `A(·)` field.

---

## 6. Existing Data Substrate (what is supported today)

The currently supported subject-scoped substrate is the triple:

```
( signalIntensity, observationCount, polarity )
```

Sources today: domain pressure + polarity (`src/engine/domaingravity.js`),
`getAllDomainPressures`, the Macro Structural Signal Report. Valid as the **first
layer** of the Target Packet Data Substrate.

The intervening packet-specific vocabulary — `{ STAKE, MOVE, WINDOW, LEVERAGE FIELD }`
— is NOT a member of the canonical substrate and must be retired from `01 ANALYSIS`.
It forces interpretation before the structural substrate is established.

---

## 7. Subject Binding

```
Subject = the searched item / question
```

Then `∀ d ∈ 𝒟`, `A(d, (Subject, t), Subject)` is evaluated.

---

## 8. Six-Domain Tab Model

The six domains constitute ONE shared Data Substrate, not six independent products.
Selecting a domain changes only the projection:

```
π_d : A(·, (Subject, t), Subject) → DomainView
```

never the subject, and never any other application input.

**Tab invariance (full input frozen):**

```
∀ d₁, d₂ ∈ 𝒟 :
   ( subject, scope, queryContext, [role if it survives §3.2] )
   is identical across π_{d₁} and π_{d₂};  only d differs.
```

The tab is a pure projection selector. Nothing upstream of `π_d` moves when the
tab changes.

Initial exposure may be limited to supported fields (§6). Unsupported dimensions
remain explicitly absent (§18) — never faked.

---

## 9. Coordinate-Axis Framing & §18 Orthogonality

The six domains are the **coordinate axes of the observable structural substrate**,
not six "lenses." `I_d` defines what can legitimately be observed along axis `d`.

This invokes **§18 Orthogonal Axis Integrity.** If the domains are the substrate's
axes, their observations must span without overlapping: two domains' signal must
not be driven by the same underlying evidence double-counted, or Formation's
coherence detection inflates (two axes moving together that are one latent
variable under different names).

**Requirement on Track #3:** each `I_d` carries an explicit **evidence-partition
statement** — which sources feed this axis — and the authoring spec includes a
pairwise orthogonality audit (`Independent / Partially / Fully Dependent — Risk —
Action`, §18 format). This is what makes `F` trustworthy rather than
self-confirming.

---

## 10. User-Facing Model

```
                    SUBJECT
                       │
             ┌─────────┴─────────┐
             │                   │
       DATA SUBSTRATE       QUERY CONTEXT
             │                (KRYL-1221)
   ┌────┬────┼────┬────┬────┐
  CAP  OWN  TECH KNOW LAB MEDIA
   └────┴────┴────┴────┴────┘
                  │
                  ▼
            RELATIONSHIPS
                  │
                  ▼
              FORMATION
```

"Lens" is buried beneath this architecture. This is a change to the conceptual
model, not a rename of a UI noun.

---

## 11. Provisional Mechanisms

Generic mechanisms remain provisional placeholders until they consume
`I_d.missingDimensions` and `I_d.sharpeningInputs` at subject scope:

- `queryContext.unresolved` (KRYL-1221) — generic, not per-domain.
- KRYL-1222 completion chips — generic, not per-domain.

`SPEC-signal-resolution-mechanic.md` is **absorbed into the domain intelligence
contract**. No parallel system is introduced. When Track #3 is authored, the
generic mechanisms are replaced by per-domain intelligence — they are the honest
stand-in until then, not throwaway.

---

## 12. Signal Boundary (invariant)

**Supported observables** ⊆ { activity, magnitude, count, depth, polarity,
evidence-backed relationships, domain-specific structural observations once
authored }.

**Withheld** unless separately established: why, predicted direction, future
change, outcome, recommendation, unsupported causal claims.

"Insights" means observations derived from data — never conclusions or
recommendations. Consistent with the Macro Report's own `WITHHELD: meaning,
direction, future structural change, outcome`, CLAUDE.md §1 and §14.

`signalIntensity = 0.78` in CAPITAL means *observable structural activity relevant
to this subject is elevated in Capital* — never *this is financially attractive*.

---

## 13. Field Maturity

Each field of each `I_d` carries a maturity mark:

```
AUTHORED    ratified content exists; the Data Substrate may surface it
PARTIAL     some content exists; surface only the ratified portion, mark the rest absent
UNAUTHORED  no content; the field renders as classified absence (§18), never faked
```

The Data Substrate reads maturity to decide what it may render.

---

## 14. Analytical Sequence & Formation

Mandatory sequence (strict partial order):

```
SEARCH SUBJECT
   ↓
SIX-DOMAIN DATA SUBSTRATE
   ↓
SUBJECT-SCOPED SIGNALS
   ↓
OBSERVATIONS
   ↓
STRUCTURAL RELATIONSHIPS
   ↓
CROSS-DOMAIN SYNTHESIS
   ↓
FORMATION
```

Formation is the terminal synthesis operator:

```
F : ∏_{d∈𝒟} A(d, (Subject, t), Subject)  →  CoherenceSet          (TOTAL)
```

- `F` is **total.** It always returns a `CoherenceSet` element.
- `CoherenceSet` contains an explicit **`NO_COHERENCE_ESTABLISHED`** element,
  distinct from `⊥` ("not computed"). Formation never returns `⊥`; it returns
  established-absence or established-coherence. (§16 Direction Honesty, KRYL-1225 §13.)
- `F` may never manufacture observations, entities, or relationships absent from
  its inputs.

---

## 15. Surface ↔ Target Packet Relationship

Surface and Target Packet are the **same component at two scopes**:

```
<StructuralSignalSubstrate scope={ (Field,   t) } />      // Macro Signal Report
<StructuralSignalSubstrate scope={ (Subject, t) } />      // Target Packet 01
```

They differ ONLY by `A(d, (Field, t), ·)` vs `A(d, (Subject, t), Subject)`. If
they are separate components that merely look alike, they drift apart within two
tickets. One component, `scope` prop, forces the reuse.

---

## 16. Inspectability (Data Taps)

Every **emitted** metric `m` admits a total provenance function:

```
prov : M_emitted → P
prov(m) = ( domain, source data, calculation, observation count, subject scope )
```

An **absent** metric does not carry `prov` (it is not a fabricated metric) — but it
is not free either: it carries a classified-absence value (§18). Neither emitted
nor classified-absent = fabrication, prohibited.

Every internal primitive the Data Substrate computes must be an inspectable Data
Tap before the feature is "done."

---

## 17. Absence-Is-Signal

If `observationCount = 0` or evidence is insufficient, the interface emits a
**classified absence**, never a null/zero/undefined default:

```
absenceClass ∈ { structural, temporal, anomalous, filtered }
```

(CLAUDE.md §1.) Fabrication of a value or a false-neutral zero is prohibited.

---

## 18. Tracks (dependency-ordered)

- **Track #1** — Truth-first audit of `L_V`. Produces `δ : L_V → {preserve, replace,
  retire, relocate}` and the §19 behavioural matrix. Covers: each current member's
  rendering/gating effect, the §8 HUD contract, ConeMap `<Html>` portal boundary,
  and the `OPPORTUNITY`/`OWNERSHIP` defect.
- **Track #2** — Role-lens decision. Produces `ρ : L_R → {remain, demote, internal-only,
  remove}` + any §13 amendment. Bound by §3.2's hard constraint (role ∉ params of `A`/`I_d`).
- **Track #3** — Authoring of each `I_d` (§4 fields) in the separate UI-free spec
  (§23), including the §9 evidence-partition statement and pairwise orthogonality
  audit, and §13 maturity marks.

---

## 19. Track #1 Behavioural Matrix (required output)

For each `v ∈ L_V \ {NAV_SURFACE}`:

| viewport value | current 3D/render effect | current gating effect (§8) | δ(v) | if replace/relocate: where the behaviour goes |
|---|---|---|---|---|
| OBSERVE | … | … | … | … |
| SIGNAL | … | … | … | … |
| FLOW | … | … | … | … |
| PRESSURE | … | … | … | … |
| CONVERGENCE | … | … | … | … |
| DRIFT | … | … | … | … |
| OPPORTUNITY | … | … | … | … |

Plus: does a six-domain selection imply a viewport treatment (option **c** from
discussion — the field re-renders emphasising the selected domain's cones)? If so,
each `d ∈ 𝒟` needs a defined viewport treatment — Founder design work.

---

## 20. Implementation Dependency Order (formal)

Investigation/authoring may run in parallel:

```
T1  ∥  T2  ∥  T3
```

Implementation is a strict linear extension:

```
{ T1, T2, T3 }
   ≺ integration
   ≺ existing substrate (§6) mapped to I_d
   ≺ Target Packet Data Substrate
   ≺ six-domain navigation / tabs
   ≺ structural relationship layer
   ≺ Formation synthesis (F)
```

---

## 21. Non-Goals

- Not a prediction, recommendation, or scoring change.
- Not a redesign of the Inspection surface.
- Does not author `I_d` content (that is §23).
- Does not remove `L_R` (that is Track #2).
- Does not alter the locked six-domain ontology.
- Does not collapse the three lens families.

---

## 22. Acceptance Criteria

- **AC-1** `L_V`, `L_R`, `L_D` remain pairwise disjoint in code; no state substitution across families.
- **AC-2** `A` has signature `𝒟 × 𝒮_A × Subject → ObservationSet`; no `role` parameter.
- **AC-3** `S_A` is `{Field, Subject} × {Live, Historical, Forecast}`; Formation is `F`, not `A` at a third scope.
- **AC-4** `01 ANALYSIS` contains no `STAKE / MOVE / WINDOW / LEVERAGE FIELD`.
- **AC-5** Surface and Target Packet render the same `<StructuralSignalSubstrate>` component, differing only by `scope`.
- **AC-6** Tab change moves only `π_d`; `(subject, scope, queryContext, [role])` provably unchanged.
- **AC-7** Every emitted metric has `prov(m)`; every absent metric has an `absenceClass`; nothing is faked.
- **AC-8** `F` is total; `NO_COHERENCE_ESTABLISHED` is a distinct returnable value from `⊥`.
- **AC-9** Each `I_d` field carries a maturity mark; the Substrate surfaces only `AUTHORED` / ratified-`PARTIAL` content.
- **AC-10** Track #1's `δ` is total over `L_V`; no member silently discarded. `OPPORTUNITY`/`OWNERSHIP` defect resolved, not inherited.
- **AC-11** If Track #2 alters `L_R`, a CLAUDE.md §13 amendment is merged in the same change.
- **AC-12** Each `I_d` carries an evidence-partition statement; the §23 spec contains the pairwise orthogonality audit.

---

## 23. Successor Spec

**KRYLO Domain Intelligence Primitive — Authoring & Ratification Specification** —
a separate, UI-free artifact. For each `d ∈ 𝒟` it answers:

> What does this domain observe, measure, relate, distinguish, and mark unresolved?

Per domain it defines: the nine `I_d` fields (§4), **evidence sources per
observation**, a **maturity mark per field** (§13), and participates in the
**pairwise orthogonality audit** (§9 / §18). It does not discuss UI.

---

## 24. Governing Invariant

```
∀ d ∈ 𝒟, ∀ s, s' ∈ 𝒮_A :
   the analytical contract of I_d is independent of s.
```

Changing scope changes observed values; it never changes what constitutes an
observation. The Surface observes the field; the Target Packet observes the
searched subject; Formation determines coherence. The six domains are the unique
user-facing substrate. Intelligence is authored once and reused.

> **Capture once → scope repeatedly → synthesize afterward.**
