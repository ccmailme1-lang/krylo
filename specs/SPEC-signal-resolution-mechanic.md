# SPEC (DRAFT, pre-ticket) — Signal Resolution Mechanic

**Status:** DISCUSSION CAPTURED — Founder review. Not a ticket yet.
**Parent epic (expected):** KRYL-1226 Formation Guest Model
**Depends on:** KRYL-1221 (QueryContext), KRYL-1222 (Completion Chips + `#1`
tensor.horizonSet plumbing, commit `925e2a0`).
**Working name:** "What would sharpen this signal" — the packet-side companion to
the idle-search completion chips.

---

## 1. The problem (agreed)

For an under-specified query that still produces real signal, the engine does its
job and the render throws the work away.

Worked example — query *"should we open a second facility"*:

```
ENGINE OUTPUT                                GUEST RECEIVES
171 observations                              "No verified record found for this yet."
  → 6 domains                                 "Refine your query."
  → measurable structural divergence
     (Ownership / Media / Knowledge  = fracture polarity
      Technology / Capital / Labor   = constructive)
  → honest low confidence
```

That is an information loss, and it is already a **codified** failure mode, not a
new one:

- **§1 Absence-Is-Signal** — flattening a classified read to null "produces false
  neutrality."
- **§16 Direction Honesty** — "Not showing it is showing reality. Suppressing a
  fracture signal is fabrication by omission."

"No verified record found / Refine your query" over a measured divergence violates
both.

---

## 2. The fix (agreed shape)

A **Completion / Resolution mechanic driven by existing synthesis state** — NOT a
smarter recommendation engine.

> Observed split → identify the unresolved dimension → expose the input that would
> reduce the ambiguity.
>
> "We found something. Here's what's missing to resolve it further."

This is detection-of-a-gap, not recommendation — it stays inside positioning
("We detect. We don't predict."). It never says "open the facility"; it says
"you haven't told us *when* — that's what's blocking a sharper read."

Illustrative packet block (replaces the "No verified record / Refine" copy for the
has-signal-but-under-specified case):

```
STRUCTURAL DIVERGENCE
Ownership · Media · Knowledge   ↔   Technology · Capital · Labor

WHAT WOULD SHARPEN THIS SIGNAL
  + Add timeline
  + Add capital constraint
```

---

## 3. The honesty constraint — DECIDED

**Ship the honest generic version first.**

`synthesis.missingInputs` returns the *same three dimensions* (decision / figure /
horizon) for every under-specified query. It does **not** know which missing input
would resolve *this* divergence pattern. Rendering those three as if they were
selected for this signal is "a generic nudge wearing a targeted costume."

- **Now:** "We found a structural divergence — here's the split. These inputs
  sharpen a read of this kind." No claim of per-query targeting.
- **Later (separate, calibrated work):** a real divergence-pattern → resolving-
  dimension map. Same bar as the KRYL-1223/1224/1225 thresholds:
  *defined → measurable → calibrated → eligible for guest semantics.* Until then,
  no targeting claim.

Even fully generic, this is a decisive improvement: showing the split **at all**
plus "here's what's missing" beats "no verified record" by a wide margin.

---

## 4. Naming — DECIDED

"Refine your query" → **"What would sharpen this signal."**

"Refine your query" reads as *you failed and we got nothing*. "What would sharpen
this signal" reads as *we have something; here's how to resolve it further.* This
is the **Trusted Read → Early Action** cross-cutting principle and it costs
nothing.

---

## 5. Boundary — DECIDED

| shown (the read) | never shown (the machinery) |
|---|---|
| the classified domain split + polarity | the pressure computation |
| "these inputs would sharpen it" | the polarity classifier |
| observation count, domain count | thresholds, weights, `resolvePrimary` map |

State this line explicitly in the eventual ticket so no one blurs it during build.

---

## 6. What already exists (synergy — don't build from zero)

- **`synthesis.missingInputs`** — the 3 generic dimensions, already computed in
  `synthGeneral` (`querysynthesis.js` ~line 1013). Currently rendered nowhere.
- **Structural divergence data** — domain pressures + polarity, already on the
  packet (`targetpacket.jsx` `05 PROVENANCE` / `getAllDomainPressures`,
  `STRUCTURAL DIVERGENCE` block).
- **In-place re-analysis** — `setTensorFields` (KRYL-1175, `useanalysisstore.js`)
  already merges new tensor fields **and clears the stale `synthesis` cache** so
  the packet re-synthesizes. The re-run path is partly built.
- **`#1` plumbing (commit `925e2a0`)** — `tensor.horizonSet` now reaches
  `synthGeneral`, so a horizon added via a chip actually moves the PRIMARY
  SIGNAL. **This is the precondition** — without it the mechanic is dead on
  arrival.
- **`completionchips.js`** — `deriveCompletionChips` / `activeCompletionChips`,
  the 5-dimension model with static Formation-grounded mechanic copy. The packet
  block reuses this; it does not invent a second chip model.

---

## 7. Open items for the ticket

1. Does the resolution block render on the packet only, in `04 ATTENTION`, or as a
   replacement for the `needsRefine` branch in `targetpacket.jsx` (~line 413)?
2. Which controls do the packet-side chips route to? (Same problem as KRYL-1227 —
   only the horizon scrubber is mounted. `+ timeline` works today; the rest wait
   on KRYL-1227.)
3. Re-run trigger: automatic on control change, or an explicit "re-analyze"
   action after the guest sets inputs?
4. The AMBIGUOUS case: *"should we open a second facility"* in a bare harness
   routes to `queryDomain: AMBIGUOUS, resolutionEligible: false` — it only reaches
   `synthGeneral` in the live app with real lens/observation context. The
   resolution block must handle both the `synthGeneral` low-confidence path AND
   the `resolutionEligible: false` path, since the guest sees the same "nothing
   here" screen from both.
5. Generic-copy wording for "these inputs sharpen a read of this kind" — needs to
   be true without implying targeting (§3).

---

## 8. Sequence

- **#1 — DONE** (`925e2a0`): `tensor.horizonSet` → `synthGeneral`. Pending live
  verification on the dev server before #2 begins.
- **#2 — this spec** → ticket after Founder review. Generic version first.
- **Targeting map** — later, calibrated, its own ticket. Not #2.
