# KRYL-1222 — Completion Chips

**Title:** Prescriptive "what's missing" chips on the Analysis search
**Type:** Feature (guest experience)
**Labels:** NEEDS-SPEC, guest-experience
**Assignee:** Mr. XS
**Status:** Delivered (narrowed) — commit `b6cbfd3`. `timeline` chip live; `budget` /
`decision` / `lens` / `asset` defined-but-gated pending their controls (**KRYL-1227**).
**Baseline for equivalence:** `15a1d5a` / `baseline_targetpacket_kryl1218_20260828`
**Depends on:** KRYL-1221 (Query Context Contract) — with an interim fallback (§4).

---

## DELIVERED SCOPE (KRYL-1222, narrowed)

Audit of `analysisidlefield.jsx` found only one of the five routing-target
controls mounted in the guest Analysis view — the horizon scrubber. FloorHistogram
(defined, unrendered), the `rules` editor (defined, unrendered), and a real lens
selector (absent — `lens` is set implicitly by a TRENDING chip click) do not
exist to route to.

Shipped:

- `src/engine/completionchips.js` — full derivation for all five dimensions,
  each with static Formation-grounded mechanic copy. Only `timeline` carries
  `enabled: true`.
- `analysisidlefield.jsx` — `COMPLETE THE PICTURE` row above TRENDING; the
  `timeline` chip scrolls to + pulses the horizon scrubber; disappears once a
  horizon is set. `CHIP_INTERACTION_EVENT` telemetry with `kind: 'completion'`.
- `qa_completionchips.mjs` — 17/17.

Deferred to **KRYL-1227**: mount the capital-floor control, the `rules` editor,
and a real lens selector, then flip `enabled` for `budget` / `decision` /
`lens` / `asset`. No engine or `tensor`-shape change — the derivation module and
chip row already exist.

---

## PROBLEM

A guest types an under-specified query, submits, gets a thin payload. The
Analysis search already has everything needed to prevent this — it just isn't
discoverable:

| exists | what it does | why a guest misses it |
|---|---|---|
| TRENDING chips | surface tokens from what was typed | **reactive** — never tells the guest what's *absent* |
| capital floor (`FloorHistogram`) | sets affordability / leverage inputs | separate control, easy to skip |
| horizon scrubber | sets acute vs. strategic framing | separate control |
| structured `rules` (lens scaffold) | names the decision / constraints | separate control |
| lens preset | scaffolds geometry + domain map | separate control |

The `synthGeneral` dimension detection (`hasDecision` / `hasTimeline` /
`figureOK`, exposed as `missingInputs`) already knows what a query lacks — but it
runs **after** submission, when it's too late to help the guest.

Result: the strongest demo of KRYLO — *refined criteria → deeper payload* — is
invisible on the first try.

---

## SOLUTION

A second chip layer on the Analysis search: **Completion Chips**.

Derived from the gap between what the query establishes and the dimensions that
materially deepen a payload. Each chip:

1. **States its mechanic** — cause → effect, qualitative, static per chip. The
   effect is **what the Formation layer can then establish** (§ Formation
   alignment), not a generic UI benefit. Never the scoring, thresholds, or
   connector logic.
2. **On click, routes to the existing control** that captures that dimension.
   It does **not** auto-fill a value. The guest enters it.
3. The entered value flows through the **existing** `tensor` → `createSession` →
   `synthesizeQuery` path. No new downstream consumer.

Completion chips are a **presentation + routing layer**. They surface a gap and
open a control. They do not parse authoritatively (KRYL-1221's `queryContext`
does), do not compute payload depth, do not touch synthesis.

### The dimension set

| chip | shown when | routes to | mechanic copy (static) |
|---|---|---|---|
| `+ decision` | `queryContext.decisionCues` empty | a decision `rules` field | "names the target relationships can assemble around" |
| `+ budget` | `queryContext.numbers` empty **and** no `selectedFloor` | `FloorHistogram` (focus) | "brings the capital domain into the field" |
| `+ timeline` | no `horizon` set | horizon scrubber (open) | "makes ordering and duration readable" |
| `+ lens` | active lens is `OPEN` / `GENERAL` | lens selector | "sets which domains are expected to participate" |
| `+ [asset specific]` | `queryContext.assetClass` resolved but the class's key field is absent | a `rules` field | class-dependent (e.g. commercial RE → "use: owner-occupied / investment / redevelopment") |

**A chip disappears the moment its dimension is satisfied** (value entered, or the
guest dismisses it). Completion chips take a dedicated row **above** TRENDING;
cap at 4 visible.

### The mechanic, not the sauce

Safe to show: which lever moves the state, and its qualitative effect
("narrows domain resolution", "raises fidelity toward VALIDATED", "admits more
evidence paths"). Never shown: weights, thresholds, connector selection,
formation math, the `resolvePrimary` keyword map.

### Formation alignment (the mechanic is grounded here)

A chip's mechanic copy names the **Formation-layer capability the added dimension
unlocks** — the connection to KRYL-1223 (Story Type) and the evidence that feeds
it. Not "affordability + leverage" (a downstream metric); the structural read.

| dimension added | what the Formation layer can then establish |
|---|---|
| **decision** | a common structural **target** → `CONVERGENCE`, `CONCENTRATION` become establishable (both require ≥ 2 domains assembling on one target) |
| **budget** | the **CAPITAL** domain participates with real magnitude → capital is admissible as a Formation member instead of ambient noise |
| **timeline** | **temporal order + span** → `SEQUENCE`, `PERSISTENCE`, `COMMITMENT` become detectable (all three are gated on ordered timestamps / a persistence span) |
| **lens** | which domains are **structurally expected** → sharpens what counts as `ABSENCE` vs. simply out of scope |
| **asset specific** | a narrower **entity / target** → tighter relationship admission, fewer spurious members |

Rule: **a chip may only claim a Formation capability that its dimension genuinely
gates.** If adding the dimension does not change what the Formation layer can
establish, the chip does not exist. This keeps the "refined criteria → deeper
payload" promise honest — the depth is real Formation capability, not more UI.

The copy stays qualitative and static; it never asserts that a Story Type *will*
be found — only that it *becomes possible to establish* once the dimension is
present. (Story Type is still `Not established` unless the evidence supports it —
KRYL-1223 §13.)

---

## COMPONENTS

| file | change |
|---|---|
| `src/engine/completionchips.js` (new) | Pure. `deriveCompletionChips(input) → Chip[]` where `Chip = { id, label, mechanic, target: 'floor'|'horizon'|'rules'|'lens', priority }`. `input` is `queryContext` (KRYL-1221) or the interim shape (§4). No React, no side effects. Exported for tests. |
| `src/components/analysis/analysisidlefield.jsx` | Compute `completionChips` from the live input; render via a new `CompletionChipRow` (or a second `StaggeredChips` instance with a `kind="completion"` style). Click handlers route: `focus FloorHistogram`, `open horizon`, `addRule(...)`, `open lens`. Chips filtered against current `selectedFloor` / `horizon` / `rules` / lens state each render. |
| `src/engine/telemetry.js` (consume) | `emitChipInteraction({ kind: 'completion', chipId, action: 'shown'|'click'|'dismiss', target })` — reuse the existing event. |
| `qa_completionchips.mjs` (new) | Phase proof. |

No change to `tensor` shape, `createSession`, or `synthesizeQuery`.

---

## VALIDATION

`qa_completionchips.mjs` (against `deriveCompletionChips`, pure):

1. **Sparse NYC query** → chips `[decision, budget, timeline]` (+ `lens` if
   lens is OPEN). `asset` chip present iff `assetClass` resolved.
2. **Fully-formed query** (decision + `$2.5 million` + "within 6 months",
   lens set) → `[]`.
3. **Partial** — has a figure, no timeline → `[decision?, timeline]`, no `budget`.
4. **Mechanic copy is static and present** on every chip; no numeric / threshold
   content in it.
5. **Priority / cap** — never more than 4; decision > budget > timeline > lens >
   asset.

In-app (manual / e2e):
- Clicking `+ budget` focuses `FloorHistogram`; entering a value removes the chip
  and populates `tensor.floor` at submit exactly as the standalone control does.
- TRENDING chips unchanged (same derivation, same row, same behavior).
- A query submitted **without touching any completion chip** produces
  `synthesizeQuery` output byte-identical to `15a1d5a`.
- `vite build --mode development` clean.

---

## ROLLBACK

Single feature commit. `git revert` removes the `CompletionChipRow` and the
derivation call; the search returns to exactly its current state (TRENDING +
controls, no prescriptive layer). `completionchips.js` becomes unused; no
consumer reads it.

---

## GUIDELINES

- **Prescriptive vs. reactive.** Completion chips answer "what's missing";
  TRENDING answers "what you typed". Different rows, different intent, no overlap.
- **Mechanic visible, math hidden.** Cause → effect copy only.
- **Formation-grounded.** A chip only exists if its dimension genuinely gates a
  Formation-layer capability (§ Formation alignment). It claims what becomes
  *establishable*, never what will be found.
- **Router, never auto-filler.** A chip opens a control. The guest supplies the
  value.
- **Optional and dismissible.** Never a gate, never a forced wizard. A guest can
  ignore every chip and submit.
- **Consumes `queryContext`, doesn't re-parse.** The source of truth for "what
  the query has" is KRYL-1221.
- **Disappears when satisfied.** Re-derive against live control state each render.
- **No `tensor` / synthesis change.** The value path is the one that already
  exists.

---

## §4 — Interim source if KRYL-1221 hasn't landed

`deriveCompletionChips` takes an `input` object, not `queryContext` directly. If
KRYL-1221 is not yet available, a thin adapter in `analysisidlefield` builds that
shape from a **local lift** of the KRYL-1218 detection regexes
(`hasDecision` / `hasTimeline`) + `extractNumbers(seedQuery)` +
`parseIntent(seedQuery)`. Mark the adapter `// KRYL-1221 migration target`.
When 1221 lands, the adapter is replaced by `session.queryContext`; the
derivation module is unchanged.


---

## Cross-cutting principles

This ticket is part of the Formation Guest Model — see `specs/SPEC-CROSSCUTTING-formation-guest-model.md`.

- **Provenance Boundary** — KRYLO shows where the evidence supports the read and where it stops.
- **Trusted Read → Early Action** — the read must be groundable enough that the guest decides whether to act; KRYLO never tells them to.
- **Layered, not dumbed down** — the guest view provides the read; inspection provides the reasoning. Three seconds means compressed evidence, not less intelligence.
