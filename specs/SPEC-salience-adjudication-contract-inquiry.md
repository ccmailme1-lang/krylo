# SPEC — Salience Adjudication Contract (Inquiry)

**Status:** DISCOVERY COMPLETE (2026-08-23) — test matrix run against real implemented code, see §5
**Depends on:** KRYL-1205 (discovery, complete) + KRYL-1206 (evidence preservation, implemented)
**Implementation status:** No implementation authorized by this specification.

## Purpose

KRYL-1205 established that the Observe candidate selector is decoupled from candidate significance
(classified C). KRYL-1206 defines what evidence must survive to make adjudication possible at all.
This document is the inquiry in between: given preserved candidate evidence, what constitutes a
*valid* adjudication decision? It does not propose a scoring formula. It defines the questions a
formula (or non-formula) would eventually have to answer, and investigates which of those questions
the existing evidence shape can already support.

## 1. Decision object

What is being adjudicated is candidate vs. candidate — the objects `buildCandidates()` produces
(post-KRYL-1206: type, sourceInputs, derivedMetric, measuredValue, threshold, margin), not raw
domain vs. domain. A "more salient" verdict is a relation between two candidate objects, not a
property computed from the underlying domains directly.

## 2. Admissible evidence

Only fields KRYL-1206 actually preserves may influence ordering: `sourceInputs`, `derivedMetric`,
`measuredValue`, `threshold`, `margin`. No dimension enters this contract because it sounds useful
(cf. KRYL-1205 §5.2's discipline — dimensions must be derived from the actual implementation, not
assumed). Notably **not** admissible, per KRYL-1206's own boundary: anything resembling deeper
evidence provenance (`evidenceRef`) — that data doesn't exist at this layer.

## 3. Ordering semantics — the open question

**A real, load-bearing complication, findable without KRYL-1206 being built yet:** the margins
KRYL-1206 would preserve are not in the same units across candidate types. A volatility-standout
margin lives on roughly a 0–1 scale (`volatility - avgVolatility`). An opposite-direction margin
lives on roughly a 0–30 scale (`|velocity_i - velocity_j|`, where velocity is itself
`(magnitude-50)*0.3`). A closing-gap margin lives on roughly a 0–8 scale (a magnitude-point
distance). **A naive "whichever margin is numerically larger wins" reading of direct ordering
would be comparing incommensurable units** — that's not adjudication, it's an accident of scale,
the same class of problem KRYL-1205 found in the current hash-based selector, just relocated.

This means the three possible outcomes need real scrutiny, not an assumed answer:

| Outcome | What it would mean here |
|---|---|
| **A — Direct ordering** | Would require establishing that raw margins are already commensurable across all candidate types — not demonstrated, and the unit analysis above argues against it as-is. |
| **B — Partial ordering** | Candidates of the *same* type (if the system ever produces more than one simultaneously — currently it produces at most one per type per pass, so this case doesn't arise yet in practice) could be validly ordered on raw margin. Candidates of *different* types cannot be validly ordered without a normalization step — and defining that normalization is itself the premature-weighting decision this inquiry is explicitly not authorized to make. |
| **C — Insufficient evidence** | Cross-type ordering is not currently supportable from admissible evidence alone. The system would need to say so explicitly (a real "cannot adjudicate, showing X arbitrarily" state) rather than manufacture an ordering — same discipline as KRYL-1202's UNRESOLVED/UNRESOLVABLE three-state pattern and `admissionengine.js`'s ESCALATE state, both already precedented in this codebase. |

**Working hypothesis only — not a decision, not to be treated as an assumed outcome.** Untested:
that the evidence shape as KRYL-1206 defines it supports B for same-type comparison and C for
cross-type comparison, absent a normalization step this inquiry does not authorize. This chain
exists to discover the contract from the actual system, not to design the answer first and look
for evidence to support it — this hypothesis must be tested against real KRYL-1206 output, not
carried forward as settled. See §5.

**The stronger, load-bearing finding underneath the hypothesis:** the preserved margins cannot
themselves be treated as a common salience metric — they're in different units by construction
(§3's scale analysis), not merely "not yet normalized." Whatever the eventual A/B/C answer turns
out to be, an adjudication mechanism cannot treat `measuredValue`/`margin` as directly comparable
across candidate types without an explicit, separately-justified normalization step.

## 4. Determinism / fallback

Whatever adjudication mechanism eventually gets designed must satisfy: same evidence → same
ordering (no hash/parity/rotation masquerading as salience — that's precisely KRYL-1205's finding
about the current selector). Explicit, named behavior is required for the case where evidence
cannot establish a meaningful ordering — not a silent fallback to an arbitrary pick.

## 4a. Required test matrix (to run once KRYL-1206 produces real candidate objects)

Controlled comparisons, mirroring KRYL-1205 §5.5's discipline (real code run, not reasoned about):

| Test case | What it isolates |
|---|---|
| Same candidate class (e.g. volatility-standout vs. a second, hypothetical volatility-standout) | Whether same-unit comparison behaves as expected — currently moot in practice since the generator produces at most one candidate per class per pass, but the contract should still define the answer |
| Different candidate classes (e.g. volatility-standout vs. opposite-direction) | Whether the unit-heterogeneity finding (§3) actually blocks a meaningful comparison, or whether some cases are resolvable without normalization |
| Clearly separated cases | Whether an unambiguous "more salient" case is even representable by the current evidence shape |
| Near-ties | What "meaningfully different" means operationally, and where the contract must declare a tie rather than force an ordering |
| Conflicting evidence | Two candidates whose evidence doesn't support a consistent ordering — what the contract does when it can't reconcile them |
| Insufficient evidence | Cases that should resolve to outcome C, not a manufactured pick |

**The governing question for the whole matrix:** can KRYLO establish an ordering from the evidence
without converting unlike structural quantities into an arbitrary common scalar? That's the actual
architectural question — not "what weights produce good-looking output."

## 5. Test matrix results — RUN (2026-08-23), against real implemented KRYL-1206 code

KRYL-1206 is implemented. The matrix was run against the actual `buildCandidates()` function, not
reasoned about. Two of six categories didn't behave as expected — reported as-is, not discarded.

- **Same-type:** structurally impossible, not merely untested. Every generator (`mostVolatile`,
  `bestPair`, `leader`, `closest`) already performs an internal argmax/argmin before a candidate
  object exists — a hidden, unexposed local salience decision happens *inside* each type, never
  crosses type boundaries, and the outer candidate list never contains two of the same type.
- **Cross-type, clearly separated / near-tie:** both construction attempts failed to produce two
  simultaneous *numeric* candidates — inputs either failed to clear both thresholds at once, or one
  candidate came back categorical (`margin: null`). The far more common real case is one numeric
  candidate alongside categorical ones. A number cannot be ranked against `null` — a type mismatch,
  more basic than the unit-heterogeneity hypothesis anticipated.
- **Conflicting evidence — reproduced:** same domain pair, simultaneously `RELATIONSHIP_STATE =
  CONVERGING` and `OPPOSITE_DIRECTION` (margin 18). Two independent computations —
  `deriveState()` in `formationrelationship.js` (built on the crude `cohesion: stateId/4` proxy,
  KRYL-1205 §6a) and raw velocity-sign comparison — with zero reconciliation. Normalizing units
  would not resolve this; the underlying claims themselves conflict.
- **Insufficient evidence:** confirmed, with a caveat — near-identical, low-volatility domains
  still produced 2 categorical candidates, not zero. True "nothing survives" is rarer than assumed;
  categorical `STABLE` candidates fire whenever ≥1 domain is STABLE, regardless of signal strength.

**Revised finding, replacing the pre-registered hypothesis (§3's "B same-type / C cross-type" is
superseded by this, not confirmed by it):**
- Same-type: N/A — already resolved internally, never reaches the candidate list.
- Any comparison involving a categorical candidate (the majority of real cases): **C**, by type
  mismatch (number vs. `null`), not a units problem.
- Numeric-vs-numeric across types (the rare case): **C**, for two independent reasons — incommensurable
  units (as hypothesized), *and* no guarantee the underlying claims don't semantically conflict,
  since they're produced by unreconciled independent computations.

This inquiry closes empirically, the same way KRYL-1205 did — real code run, not reasoned about.

## 6. Non-goals

Does not authorize: a scoring formula, a weighting scheme, a normalization function across
candidate types, a scalar salience value, implementation of any kind. Does not decide A vs. B vs.
C — offers a working hypothesis pending real data. Explicitly considers, per the Founder's own
framing, that salience may not need to collapse to a scalar at all — an ordering/precedence
relation over heterogeneous evidence may be more faithful to KRYLO's detection doctrine than a
single arbitrary number, but this is a direction to investigate empirically once data exists, not
a decision made here.

## 7. Required next step

Discovery is complete — see §5. This inquiry does not authorize a normalization scheme, a semantic
reconciliation mechanism between `formationrelationship.js` and raw velocity comparison, or a
null-margin handling rule. Those are downstream design questions the discovery has now precisely
named, not answered — deciding them is separate, later work, same discipline as KRYL-1205 →
KRYL-1206.
