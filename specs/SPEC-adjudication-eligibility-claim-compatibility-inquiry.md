# SPEC — Adjudication Eligibility / Claim Compatibility (Inquiry)

**Status:** DISCOVERY COMPLETE (2026-08-23) — H1/H2/H3 tested against real `buildCandidates()`
output, see §3. No Jira filed, no implementation authorized.
**Depends on:** KRYL-1205 (discovery, complete), KRYL-1206 (evidence preservation, implemented),
`specs/SPEC-salience-adjudication-contract-inquiry.md` (discovery, complete — this document
supersedes that inquiry's original "rank by margin" framing with a prior question)
**Implementation status:** No implementation authorized by this specification.

## Purpose

The salience adjudication inquiry ran its test matrix against real KRYL-1206 output and found
three separate barriers, not one:

1. **Same-type never reaches adjudication** — each generator already resolves its own local
   competition internally (`argmax`/`argmin`) before a candidate object exists.
2. **Categorical vs. numeric is a type-system problem** — `margin: null` candidates coexist with
   numeric ones; there's no legitimate arithmetic comparison to perform, not a normalization gap.
3. **Numeric vs. numeric can be semantically contradictory** — reproduced: same domain pair,
   simultaneously `RELATIONSHIP_STATE = CONVERGING` and `OPPOSITE_DIRECTION` (margin 18), from two
   independent, unreconciled computations (`formationrelationship.js`'s `deriveState()` vs. raw
   velocity-sign comparison).

That means "how do we rank candidate margins" was the wrong first question. Before KRYLO can
adjudicate salience *across* candidate types, it needs a contract for a prior question:

> **When are two candidate claims actually admissible for comparison at all?**

This inquiry investigates that question. It does not design a ranking mechanism, a normalization
scheme, or a conflict-resolution algorithm — those remain downstream, gated on this inquiry's
findings, same discipline as KRYL-1205 → KRYL-1206.

## 1. Compatibility classification

Three possible outcomes for any pair of simultaneously-eligible candidates:

| Outcome | Meaning |
|---|---|
| **Comparable** | The pair's evidence legitimately supports asking "which is more salient." |
| **Conflict** | The pair makes claims that cannot both be straightforwardly true about the same
  substrate — ordering one above the other doesn't resolve this, it hides it. |
| **Insufficient** | The pair's evidence doesn't support a meaningful comparison in either
  direction — not a conflict, just genuinely incommensurable (e.g. categorical vs. numeric,
  or numeric candidates about entirely unrelated substrate). |

**Key principle, explicit per Founder direction: "conflict" does not automatically mean "pick
one."** The evidence may legitimately require the system to represent an unresolved state rather
than force an ordering. This mirrors precedent already in the codebase — `admissionengine.js`'s
ESCALATE state, KRYL-1202's UNRESOLVED/UNRESOLVABLE three-state pattern. Collapsing a genuine
conflict into a single winner would be fabrication by a different name.

## 2. Substrate overlap vs. claim overlap

Two candidates can reference the same domains without making claims about the same property.
`VOLATILITY_STANDOUT` about Capital and `RELATIONSHIP_STATE=CONVERGING` about Capital/Labor share
substrate (Capital) but say nothing that contradicts each other — one is about volatility, the
other about relationship direction. **Substrate overlap does not imply claim overlap, and claim
overlap is the actual precondition for conflict being a meaningful category at all.** Investigation
order:

```
Same substrate?
      ↓
Compatible claim types/properties?
      ↓
Can their evidence establish opposition?
      ↓
      ├── YES → Conflict
      ├── NO, but comparable → Comparable
      └── insufficient evidence → Insufficient
```

## 2.1 Mathematical formulation (post-discovery — grounded in §3's actual results)

A candidate: `c = (τ, S, v, m, E)` — τ = claim type, S = sourceInputs, v = observed state/value,
m = numeric margin or ⊥, E = preserved evidence payload. Let 𝒞 be the set of simultaneously
eligible candidates.

**Substrate overlap** (necessary, confirmed H1): `overlap(cᵢ,cⱼ) ⇔ Sᵢ ∩ Sⱼ ≠ ∅`

**Claim-type compatibility** (refined from H2 — not "do the types admit comparison" but
specifically whether they measure the same or a mutually-exclusive property):
`claim-compat(cᵢ,cⱼ) ⇔` the property measured by τᵢ is the same as, or mutually exclusive with,
the property measured by τⱼ. `VOLATILITY_STANDOUT` (instability) and `RELATIONSHIP_STATE`
(directional trajectory) fail this predicate even while sharing substrate — exactly H2's result.

**Opposition as a finite authored relation, not a structural predicate** (H3's core result):
```
𝒪 ⊆ { (τₐ, vₐ, τᵦ, vᵦ) }   — "these two concrete values are mutually incompatible on shared substrate"
```
From the tests actually run (this inquiry §3 + `SPEC-candidate-vocabulary-compatibility-inquiry.md`
§3):
```
(RELATIONSHIP_STATE, CONVERGING, OPPOSITE_DIRECTION,    true) ∈ 𝒪
(RELATIONSHIP_STATE, DIVERGING,  OPPOSITE_DIRECTION,    true) ∉ 𝒪
(RELATIONSHIP_STATE, WEAKENING,  OPPOSITE_DIRECTION,    true) ∉ 𝒪
(RELATIONSHIP_STATE, DIVERGING,  EMERGING_CLOSING_GAP,  true) ∈ 𝒪
(RELATIONSHIP_STATE, CONVERGING, EMERGING_CLOSING_GAP,  true) ∉ 𝒪
```
Note the inverted polarity between the two tested pairs — `CONVERGING` opposes one, `DIVERGING`
opposes the other. This is direct evidence 𝒪 cannot be a single shared rule across type-pairs.

`oppose(cᵢ,cⱼ) ⇔ (τᵢ,vᵢ,τⱼ,vⱼ) ∈ 𝒪 ∨ (τⱼ,vⱼ,τᵢ,vᵢ) ∈ 𝒪`

**Classification — the unique function matching every controlled case run so far:**
```
κ(cᵢ,cⱼ) = Conflict      if overlap ∧ claim-compat ∧ oppose
           Comparable    if overlap ∧ claim-compat ∧ ¬oppose
           Insufficient  otherwise
```

No structural rule over types alone can replace 𝒪 — confirmed twice, by independent pairs. The
contents of 𝒪 for any pair beyond the two tested are not specified by this inquiry (implementation).

## 3. Hypotheses — tested against real `buildCandidates()` output (2026-08-23)

**H1 — Overlap necessity:** `oppose(cᵢ,cⱼ) ⟹ overlap(cᵢ,cⱼ)` — no true semantic conflict with
disjoint `sourceInputs`. **CONFIRMED**, and sharper than expected: constructed a 4-domain case
where `RELATIONSHIP_STATE` (`sourceInputs: [Capital,Labor]`) and `OPPOSITE_DIRECTION`
(`sourceInputs: [Media,Ownership]`) co-occur with completely disjoint substrate. No conflict — they
concern unrelated domain pairs. Proves a rule that ignores `sourceInputs` overlap and fires purely
on "these two types co-occurring" would misfire on unrelated candidates.

**H2 — Overlap sufficiency:** does `overlap ∧ type-compat` alone establish comparability or
conflict? **CONFIRMED FALSE as a sufficient condition.** `VOLATILITY_STANDOUT` about Capital and
`RELATIONSHIP_STATE=CONVERGING` about Capital/Labor share substrate (Capital) but concern different
properties (volatility vs. relationship direction) — not contradictory, coexist without issue.
Substrate overlap alone does not imply conflict; claim-type overlap is the real gate (§2).

**H3 — Opposition detectability:** can `oppose` be established solely from fields the candidate
objects already carry? Tested `OPPOSITE_DIRECTION` (fixed) against all three `RELATIONSHIP_STATE`
values (`CONVERGING`/`DIVERGING`/`WEAKENING`) on identical domain data:
- `CONVERGING` + `OPPOSITE_DIRECTION` → genuinely contradictory ("pulling into alignment" vs.
  "moving in opposite directions").
- `DIVERGING` + `OPPOSITE_DIRECTION` → **not a conflict — corroboration.** "Have broken from each
  other" and "moving in opposite directions" describe the same phenomenon via two independent
  computational paths (`formationrelationship.js`'s cohesion-proxy-based `deriveState()` vs. raw
  velocity-sign comparison).
- `WEAKENING` + `OPPOSITE_DIRECTION` → also broadly consistent, not contradictory.

**Finding: a generic structural rule ("these two types co-occurring on overlapping substrate =
conflict") would misfire on 2 of 3 real cases**, flagging corroboration as contradiction.
`oppose` *is* detectable from existing fields — the `measuredValue` string is right there — but
only via an explicit, authored semantic table keyed to specific value pairs (`CONVERGING` opposes
`OPPOSITE_DIRECTION`; `DIVERGING`/`WEAKENING` don't), not a structural predicate derivable from
type/overlap alone. **That table does not exist anywhere in the codebase.** This is the actual gap:
not a missing computation, a missing piece of authored domain knowledge.

**Insufficient vs. conflict boundary:** categorical-vs-numeric remains Insufficient (§1 of the
salience inquiry, unchanged by this test set) — no case tested here produced a categorical/numeric
pair that should instead read as Conflict.

## 4. Non-goals

Does not authorize: a conflict-resolution mechanism, a normalization scheme, a ranking algorithm, a
reconciliation layer between `formationrelationship.js` and raw velocity comparison, an explicit
unresolved-state UI treatment, implementation of any kind. Does not decide whether `sourceInputs`
overlap is the correct or complete compatibility signal — that's what §3 investigates.

## 5. Deliverables — closed

1. Controlled test cases (overlapping-conflict, overlapping-non-conflict, disjoint-substrate,
   value-specific opposition) — **complete, §3.**
2. `sourceInputs` overlap determined **necessary but not sufficient** for compatibility
   classification (H1 confirmed, H2 confirmed false as sufficiency) — **complete.**
3. What "Conflict" requires beyond overlap: an authored semantic table over specific value pairs,
   not a structural rule — **complete, §3.** The table itself is not written here (implementation).
4. What remains undecidable from current evidence: whether the `CONVERGING`/`DIVERGING`/
   `WEAKENING`-vs-`OPPOSITE_DIRECTION` pattern generalizes to opposition rules for *other*
   candidate-type pairs, or whether each pair needs its own authored rule — only one type-pair
   (`RELATIONSHIP_STATE` × `OPPOSITE_DIRECTION`) has been tested. Categorical-vs-numeric coverage
   beyond that pair is untested. Named honestly as open, not forced to an answer.
