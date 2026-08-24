# SPEC — Salience Adjudication Contract

**Status:** DIRECTIVE RATIFIED (Founder, 2026-08-23) — **Option C** chosen for §2's open decision:
authorize a normalization discovery to determine whether unlike numeric candidate evidence can be
legitimately compared, then implement the complete adjudication path end-to-end once that
discovery closes. **Option A (relabel `stateHash` and ship) and Option B (show multiple candidates
as a workaround) are explicitly rejected** — A knowingly preserves the defective selector, B
changes product behavior instead of solving adjudication. No partial/narrow implementation is
authorized under any circumstance — see §6 Exit Criterion. Implementation itself remains gated on
the normalization discovery (§5.1) closing first.
**Depends on:** KRYL-1205, KRYL-1206 (implemented), the salience adjudication inquiry, the
adjudication eligibility inquiry, `specs/SPEC-candidate-vocabulary-compatibility-inquiry.md`
(𝒪 ratified, 2026-08-23).

## Purpose

Answer the question the whole discovery chain was built to reach: **given a candidate set and a
complete κ classification over every pair, what does the Observe perceptual surface do?**

This is not the same question as "how do we rank candidates by salience." That question is only
*part* of adjudication, and — stated plainly, not deferred again — **it remains unsolved.** This
contract is honest about which half of the problem today's discovery actually closes.

## 1. What's resolved: Conflict handling

For any candidate set 𝒞, compute κ(cᵢ,cⱼ) for every pair using the ratified 𝒪 (6 entries,
`SPEC-candidate-vocabulary-compatibility-inquiry.md` §8.3).

**If any pair classifies as Conflict:** the surface must not silently select one side. Per the
precedent already established in this codebase (`admissionengine.js`'s ESCALATE, KRYL-1202's
UNRESOLVED/UNRESOLVABLE), the correct behavior is an explicit unresolved-conflict state — name
both readings, assert neither over the other, don't hide the disagreement. This part of the
contract is complete: the classification is ratified (𝒪), the behavioral precedent already exists
in the codebase, and there's nothing left to discover here. **This is implementable as specified.**

**Open, narrow implementation question (not a discovery gap, a normal spec decision):** if more
than one Conflict pair exists simultaneously among more than 2 candidates, does the surface show
one conflict, or enumerate all of them? Not decided here — small enough to resolve at
implementation time, not a blocker to writing this contract.

## 2. Decision made: Option C — normalization discovery authorized

When no Conflict exists among eligible candidates, the surface still has to show *something* — and
this is exactly where KRYL-1205 started: the current mechanism (`stateHash(domains) %
candidates.length`) is proven decoupled from significance. **Comparable** (per κ) does not mean
*ranked* — it means "not in conflict." The salience adjudication inquiry (discovery-complete)
established candidate margins are in incommensurable units across types (volatility ~0–1, velocity
spread ~0–30, magnitude gap ~0–8) — ranking requires a normalization scheme that has never existed.

**RATIFIED, Founder, 2026-08-23: Option C.** Authorize a normalization discovery to determine
whether unlike numeric candidate evidence can be legitimately compared. Options A (relabel
`stateHash`, ship as-is) and B (show multiple candidates as a workaround) are **explicitly
rejected** — A knowingly ships the defective selector under a new label, B changes product behavior
instead of solving adjudication. No partial/narrow build is authorized regardless of which piece
looks implementable sooner — see §6.

## 3. Full behavioral definition

```
Given candidate set 𝒞:
  1. Compute κ(cᵢ,cⱼ) for every pair, using ratified 𝒪.
  2. If any pair is Conflict → surface explicit conflict state (both readings named, neither picked).
  3. Else → per §5.1's closed finding, no legitimate ranking exists across the candidate types that
     actually co-occur → surface an explicit unresolved/Insufficient state, same discipline as
     step 2, never an arbitrary selection (never `stateHash` or any other silent pick).
```

Both branches now resolve to the same discipline: name what's true, never silently choose. No step
here is optional or implementable in isolation — see §6. This is one path, built once, end-to-end,
not a sequence of shippable partial slices.

## 4. Non-goals

Does not itself perform the normalization discovery (§5.1, separate document). Does not authorize
implementation of any part of this contract — including the Conflict-handling half — until the
normalization discovery closes and the full path (§3) can be built as one piece. Does not revisit
𝒪 (ratified) or the vocabulary discovery (complete).

## 5. Sequencing

### 5.1 Normalization discovery — CLOSED (2026-08-23)

`SPEC-normalization-discovery.md`, complete. Finding: `OPPOSITE_DIRECTION` and
`EMERGING_CLOSING_GAP` are mechanically convertible (both derive from magnitude via the existing
`×0.3` velocity transform) but structurally never co-occur, so it doesn't matter.
`VOLATILITY_STANDOUT` — the type that actually co-occurs with both, in real tested cases — has no
grounded conversion to either; volatility and magnitude are independent fields with zero
documented relationship anywhere in the codebase. **Negative result, not a gap: normalization is
not legitimately derivable for the case that matters.** §3 step 4 governs — Comparable-but-unranked
resolves to an explicit unresolved state, permanently, not a placeholder pending a future fix.

### 5.2 Implementation — COMPLETE (2026-08-23)

`src/components/surface/observestoryview.jsx`. Full §3 path built as one piece: κ classification
(6-entry 𝒪, all ratified rules), Conflict → explicit unresolved narrative, no-conflict-but-
no-legitimate-ranking → explicit unresolved narrative (same discipline, different reason).
`stateHash` fully removed (function deleted, zero remaining call sites). No synthetic evidence, no
invented weights, no composite score (grep-confirmed). Deterministic — pure functions over the
candidate list, no hash, no randomness.

**Validated:**
- Syntax clean (`esbuild`).
- Single-candidate path unchanged (byte-identical to pre-KRYL-1207 behavior).
- `CONVERGING`×`OPPOSITE_DIRECTION` → `CONFLICT`, correct rule invoked.
- `STABLE_GROUP` conflicts (×`DIVERGING`, ×`OPPOSITE_DIRECTION`) → `CONFLICT`, correct rule invoked
  in each case, confirmed against real controlled data.
- Genuinely zero-conflict multi-candidate case (`STABLE_SOLO`+`VOLATILITY_STANDOUT`+
  `OPPOSITE_DIRECTION`) → `UNRESOLVED_NO_RANKING`, not a silent pick.
- Full pairwise Data Tap output inspected directly — every pair correctly classified
  Conflict/Insufficient, reasons and rule references accurate.

All items on §6's Data Tap checklist are present in the actual `adjudicate()` return object,
verified field-by-field against the table.

## 6. Exit Criterion — Data Taps (binding, not follow-up work)

**The implementation is not complete unless every primitive/evidence value computed anywhere in
this path is explicitly inventoried and surfaced as a Data Tap.** This is an exit criterion, not a
future enhancement — if a primitive exists in the computation but is not surfaced as a Data Tap,
the feature is not finished, full stop.

Minimum required inventory:
- candidate type
- candidate value/state
- `sourceInputs`
- measured value
- threshold
- margin
- evidence payload (`E`)
- compatibility classification (κ result: Comparable / Conflict / Insufficient)
- conflict status and the specific opposing claim(s)
- the specific 𝒪 rule invoked, where applicable
- normalization inputs and results, if §5.1 establishes normalization is legitimate
- adjudication outcome and its evidentiary basis
- any unresolved/insufficient condition and why
- the underlying structural/topological primitives exposed by the resulting formation/adjudication
  path

No sub-piece of this contract — Conflict handling, normalization, selection — ships as "done" while
any of the above remains computed-but-hidden. "The build works but we still need to expose what it
knows" is the same partial-build failure already caught and reverted once this session, in a
different shape. It does not recur here.
