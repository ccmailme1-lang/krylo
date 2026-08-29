# KRYLO Structural Signal Surface Architecture
## Domain Substrate, Viewport Replacement & Domain Intelligence Primitive

**Status:** FROZEN — architecture baseline
**Version:** 0.2.2
**Scope:** Surface → Target Packet → Formation
**Primary Principle:** Capture once → scope repeatedly → synthesize afterward
**Supersedes:** the three-track capture note; `specs/redesign raw spec` (raw discussion this distills)
**Related:** `SPEC-domain-intelligence-primitive-authoring.md` (the successor, UI-free),
`SPEC-signal-resolution-mechanic.md` (absorbed into Track #3), KRYL-1221, KRYL-1222, KRYL-1225
**Build authorization:** NONE. #1 needs its audit; #2 needs its decision; #3 needs authoring
before any UI is designed against it.

> **Freeze note.** v0.2.2 is the architecture baseline. Further work proceeds in the
> successor spec, not by expanding this one. Changes here require an explicit
> version bump and a stated reason.

---

## 1. Purpose

This specification defines the architectural transition from multiple, independently
generated analytical vocabularies toward a single structural-signal architecture
shared across KRYLO surfaces.

The change establishes:

1. Six structural domains as the primary user-facing analytical substrate
   (**coordinate axes, not lenses**).
2. A reusable domain intelligence primitive authored once per domain.
3. Subject-scoped reuse of that primitive in Target Packets.
4. Formation as a downstream, **total** synthesis operator over the six
   subject-scoped observation sets — **never a scope of the application function**.
5. Replacement of the existing perceptual viewport-lens controls with
   structural-domain controls, subject to a truth-first behavioral audit.
6. Independent governance of the existing role-lens abstraction, including its
   explicit relationship to Role-Play Protocol §13, **under the constraint that
   role never becomes a parameter of domain intelligence or application**.
7. Inspection of every internal primitive exposed through the Data Substrate
   before feature completion.

This specification does not assume that all required domain intelligence currently
exists in code. Where intelligence does not yet exist, the system must expose only
what is supported by current data and retain existing generic mechanisms as
explicit provisional placeholders.

---

## 2. Architectural Principle

> **Capture once → scope repeatedly → synthesize afterward.**

Let `𝒟` be the finite, LOCKED set of structural domains:

```
𝒟 = { CAPITAL, OWNERSHIP, TECHNOLOGY, KNOWLEDGE, LABOR, MEDIA }
```

These are **coordinate axes of the substrate, not lenses.** Coordinate-axis
integrity requires **distinct structural attribution**, not statistical independence:

```
d_i ≠ d_j  ⇒  distinct structural attribution
```

This does NOT imply `d_i ⊥ d_j` in the statistical sense unless that independence
is separately demonstrated. Observed signals across domains may (and frequently
will) be correlated; cross-domain correlation is a **necessary input** to structure
detection and to Formation. (See §9, §18.)

A domain's analytical intelligence is a fixed authored object `I_d` for each `d ∈ 𝒟`.

### 2.1 Scope

Application scopes are restricted to:

```
S_A = { Field, Subject }        strict order:  Field ≺ Subject
```

**Formation is NOT an element of `S_A`.** It is a separate total operator `F` (§15).
This is load-bearing: it structurally prevents Formation from being implemented as
"just another scope," which is the path by which it would come to manufacture
observations.

Scope is multi-dimensional. The spatial component is drawn from `S_A`. A **known
orthogonal temporal axis** already exists in the codebase — the SIGNAL SCOPE
control (`LIVE / HISTORICAL / FORECAST WINDOW`, `signalScope` state in
`analysisidlefield.jsx`). A full scope tuple is:

```
s = (spatial, temporal)
spatial  ∈ S_A
temporal ∈ { Live, Historical, Forecast }
```

`FORECAST` overlaps `SPEC-KRYL-1225` (Formation Forecast Boundary) — its
observed/extrapolated split governs any `temporal = Forecast` application. The
temporal dimension is a **known axis of `s`** to be fully resolved in a subsequent
revision; `s` is not treated as silently scalar.

### 2.2 Application function

```
A : 𝒟 × S_A × Subject  →  ObservationSet          (partial)
```

**Role is never a parameter of `A` or of `I_d`:**

```
role ∉ A       role ∉ I_d
```

Role may shape the subject/query that enters `A`, or the narrative that exits
Formation. It may not modify the observation contract.

Changing spatial or temporal scope changes observed values; it never changes the
vocabulary or the analytical contract of `I_d`.

### 2.3 Scope model

| Surface       | Spatial | Function                                                    |
|---------------|---------|------------------------------------------------------------|
| Surface       | Field   | Observe structural activity across `𝒟`                     |
| Target Packet | Subject | Apply the same `I_d` to a concrete subject/question         |
| Formation     | —       | Total synthesis `F` over the six subject-scoped observation sets |

---

## 3. Three Existing "Lens" Concepts — Strict Separation

The three families are **pairwise disjoint**:

```
L_V ∩ L_R = ∅        L_V ∩ L_D = ∅        L_R ∩ L_D = ∅
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

plus the §19 behavioural matrix. No element of `L_V` may be silently discarded.

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

**Constrained decision space (makes Tracks 1–3 genuinely parallel):**

- Role must never become a parameter of `A` or of any `I_d`.
- Role may shape inbound subject/query context or outbound narrative presentation.
- Role may not modify what a domain observes.

If `ρ` yields removal or material alteration, **Role-Play Protocol §13 must receive
an explicit CLAUDE.md amendment before any code change is merged.** Parallelism of
Tracks 1–3 holds only under this constraint.

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

The **successor spec** (`SPEC-domain-intelligence-primitive-authoring.md`) extends
each `I_d` with:

- **evidence attribution** and a **structural-variable boundary statement** for the
  domain (required for axis integrity, §18), and
- a **maturity mark per field** ∈ `{ AUTHORED, PARTIAL, UNAUTHORED }` so the Data
  Substrate knows what it may surface versus what remains a provisional placeholder.

Content is Founder-authored / ratified, never model-generated. This spec defines
only the architectural role of the fields.

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
  signalIntensity, observationCount, polarity,
  observations, relationships, tensions,
  unresolvedDimensions, sharpeningInputs
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

**Tab projection invariant (full input frozen):**

```
∀ d₁, d₂ ∈ 𝒟 :
   ( subject, scope, queryContext )  identical across π_{d₁} and π_{d₂};
   only the domain projection selector differs.
```

The tab is a pure projection selector; nothing upstream of `π_d` moves when the
tab changes. **Role is outside this tuple and outside `A`** (§3.2).

Initial exposure may be limited to supported fields (§6). Unsupported dimensions
remain explicitly absent (§17) — never faked.

---

## 9. Coordinate-Axis Framing

The six domains are the **coordinate axes of the observable structural substrate**,
not six "lenses." `I_d` defines what can legitimately be observed along axis `d`.

Axis integrity = **distinct structural attribution**, NOT statistical independence:

- Observed signals across domains **may be correlated**, and such correlation is a
  necessary input to structure detection and to Formation. It is not a defect.
- Evidence **may be shared across domains** where it is legitimately relevant to
  more than one axis.
- **Forbidden:** counting the same *structural variable* (or the same observation
  contribution) as **independent** support for multiple axes. That would inflate
  `F`'s coherence detection — two axes moving together that are one latent variable
  under different names.

Orthogonality is therefore defined over **attributed structural variables**, not
over raw sources and not over signal correlation. Track #3's per-domain
structural-variable boundary statement (§18) is what enforces this.

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
UNAUTHORED  no content; the field renders as classified absence (§17), never faked
```

The Data Substrate reads maturity to decide what it may render.

---

## 14. Analytical Sequence

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

Formation is reached only after the six subject-scoped observation sets exist.

---

## 15. Formation Boundary

```
F : ∏_{d∈𝒟} A(d, (Subject, t), Subject)  →  CoherenceSet          (TOTAL)
```

- `F` is **total.** It always returns a `CoherenceSet` element.
- `CoherenceSet` contains an explicit **`NO_COHERENCE_ESTABLISHED`** element,
  distinct from `⊥` ("not computed"). Formation never returns `⊥`; it returns
  established coherence or established absence of coherence. (§16 Direction
  Honesty, KRYL-1225 §13.)
- `F` consumes structural evidence generated upstream and may never manufacture
  observations, entities, or relationships.

---

## 16. Surface ↔ Target Packet Relationship

Surface and Target Packet are the **same component at two spatial scopes**:

```
<StructuralSignalSubstrate scope={ (Field,   t) } />      // Macro Signal Report
<StructuralSignalSubstrate scope={ (Subject, t) } />      // Target Packet 01
```

For **equivalent temporal scope**, they differ by **spatial scope only**. Temporal
scope is an **independent axis** and must NOT be implicitly changed by navigation
between surfaces. If they are separate components that merely look alike, they
drift apart within two tickets — one component, `scope` prop, forces the reuse.

---

## 17. Inspectability & Absence-Is-Signal

Provenance is **total only over emitted metrics**:

```
prov : M_emitted → P
prov(m) = ( domain, source data, calculation, observation count, subject scope )
```

An **absent** metric is not free: §1 Absence-Is-Signal requires it to carry a class

```
absenceClass ∈ { structural, temporal, anomalous, filtered }
```

Emitted metrics receive provenance; absent metrics receive classified absence;
anything that is neither is fabrication and is prohibited.

Every internal primitive the Data Substrate computes must be an inspectable Data
Tap before the feature is "done."

---

## 18. Axis Integrity (Track #3 authoring requirement)

Because the six domains are coordinate axes, the authoring of each `I_d` must include:

- an **evidence-attribution statement** (which sources contribute to this axis), and
- a **structural-variable boundary**: which structural variables belong **uniquely**
  to this domain versus which **legitimately overlap** another domain, and
- a check that the same latent structural variable / observation contribution is
  **not counted as independent support for multiple axes**.

Orthogonality is defined over attributed structural variables, not raw sources.
Shared evidence is permitted where legitimately relevant to more than one axis;
double-counting the same structural variable as independent evidence is forbidden
— it would inflate `F`'s coherence detection.

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

Plus: does a six-domain selection imply a viewport treatment (the 3D field
re-renders emphasising the selected domain's cones)? If so, each `d ∈ 𝒟` needs a
defined viewport treatment — Founder design work.

---

## 20. Tracks (dependency-ordered)

- **Track #1** — Truth-first audit of `L_V`. Produces `δ` + §19 matrix. Covers each
  member's rendering/gating effect, the §8 HUD contract, the ConeMap `<Html>` portal
  boundary, and the `OPPORTUNITY`/`OWNERSHIP` defect.
- **Track #2** — Role-lens disposition `ρ` under the §3.2 constraint (role ∉ params
  of `A` / `I_d`) + any §13 amendment.
- **Track #3** — Authoring of each `I_d` (§4 fields + §18 evidence attribution,
  structural-variable boundaries, maturity marks) in the successor UI-free spec.

---

## 21. Implementation Dependency Order

Authoring may run in parallel:

```
T1  ∥  T2  ∥  T3          (parallelism holds only while §3.2's role constraint is observed)
```

Integration is strictly sequential after the authoring set:

```
{ T1, T2, T3 }
   ≺ existing substrate (§6) mapped to I_d
   ≺ Target Packet Data Substrate
   ≺ six-domain navigation / tabs
   ≺ structural relationship layer
   ≺ Formation synthesis (F)
```

---

## 22. Non-Goals

- Not a prediction, recommendation, or scoring change.
- Not a redesign of the Inspection surface.
- Does not author `I_d` content (that is the successor spec).
- Does not remove `L_R` (that is Track #2).
- Does not alter the locked six-domain ontology.
- Does not collapse the three lens families.

---

## 23. Acceptance Criteria

- **AC-1** `L_V`, `L_R`, `L_D` remain pairwise disjoint in code; no state substitution across families.
- **AC-2** `A` has signature `𝒟 × S_A × Subject → ObservationSet`; **no `role` parameter**, no `I_d` role parameter.
- **AC-3** `S_A = {Field, Subject}`; Formation is the total operator `F`, not `A` at a third scope.
- **AC-4** `01 ANALYSIS` contains no `STAKE / MOVE / WINDOW / LEVERAGE FIELD`.
- **AC-5** Surface and Target Packet render the same `<StructuralSignalSubstrate>` component, differing only by spatial scope; temporal scope never changes implicitly on navigation.
- **AC-6** Tab change moves only `π_d`; `(subject, scope, queryContext)` provably unchanged.
- **AC-7** Every emitted metric has `prov(m)`; every absent metric has an `absenceClass`; nothing is faked.
- **AC-8** `F` is total; `NO_COHERENCE_ESTABLISHED` is a distinct returnable value from `⊥`.
- **AC-9** Each `I_d` field carries a maturity mark; the Substrate surfaces only `AUTHORED` / ratified-`PARTIAL` content.
- **AC-10** Track #1's `δ` is total over `L_V`; no member silently discarded. `OPPORTUNITY`/`OWNERSHIP` defect resolved, not inherited.
- **AC-11** If Track #2 alters `L_R`, a CLAUDE.md §13 amendment is merged in the same change.
- **AC-12** Each `I_d` carries an evidence-attribution statement and a structural-variable boundary; domain observations satisfy **distinct structural attribution** (not statistical independence). Cross-domain signal correlation is permitted.

---

## 24. Governing Invariant

```
∀ d ∈ 𝒟, ∀ s ∈ S_A :
   the analytical contract of I_d is independent of s and of role.
```

Changing scope changes observed values; it never changes what constitutes an
observation. The Surface observes the field; the Target Packet observes the
searched subject; Formation determines (or establishes the absence of) coherence.
The six domains are the unique user-facing substrate and are treated as coordinate
axes with **distinct structural attribution**. Intelligence is authored once and
reused.

> **Capture once → scope repeatedly → synthesize afterward.**

---

## Core chain (locked)

```
                 SIX DOMAINS
             coordinate substrate
                     │
                     ▼
              Domain Intelligence
                    I_d
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
       FIELD                 SUBJECT
       scope                  scope
          │                     │
          ▼                     ▼
   Macro Signal          Target Packet
                          Data Substrate
                                  │
                                  ▼
                         Six subject-scoped
                          observation sets
                                  │
                                  ▼
                            STRUCTURE
                          relationships
                                  │
                                  ▼
                            FORMATION
                               F(·)
```

## Lens boundaries (locked)

- `L_V` — legacy/current viewport state machinery being audited and potentially replaced (Track #1).
- `L_R` — role/context machinery governed separately (Track #2); never a parameter of `A` or `I_d`.
- `L_D` — internal domain intelligence definitions (Track #3).

The user sees none of those as "lenses." The user sees:
**CAPITAL · OWNERSHIP · TECHNOLOGY · KNOWLEDGE · LABOR · MEDIA** and the data those
domains expose.
