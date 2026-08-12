# SPEC — CICE Phase 2: Behavioral Presentation Layer (sparse-query chips)

Status: **NEEDS SPEC / NOT BUILDABLE YET.** No code exists. Blocked on a data-collection
prerequisite that does not exist (see §PREREQUISITE). This is Phase 2 of CICE, tracked
separately from and not blocking Phase 1 (paraphrase expansion — shipped, see
`specs/SPEC-cice-contextual-investigative-concept-expansion.md`).
Date: 2026-08-11
Target file(s): none yet — event capture doesn't exist for chip interactions on this surface.

---

## PROBLEM

CICE Phase 1 (the surface-form rewrite table, `src/engine/conceptrewrite.js`) can only match
queries that contain a topic — "purchase a house," "mortgage rates." It cannot help the more
common real-world case: a query with little or no topical content at all (e.g. "45 year old
male"). That's not a gap in Phase 1's vocabulary; it's structural — a rewrite table needs
*something* in the query to rewrite. A demographic-only query has nothing to match against.

The instinct to fix this by inferring from demographic attributes directly (age, gender →
assumed financial concerns) was evaluated and explicitly dropped in Phase 1's spec — every
version of it collapses into a demographic-attribute lookup table, which contradicts this
feature's founding instruction and its own Demographic/Profile Guardrail. That path stays closed
unless deliberately reopened; this spec does not reopen it.

---

## SOLUTION

**Presenting, not shaping.** The only doctrinally sound way to help a sparse query is to reflect
*observed aggregate behavior* back to the user — never to infer or recommend. Concretely: "N
people whose query looked like this went on to look at X" is a factual, backward-looking
statement about what happened. "You should look at X" is a forward-looking directive the system
has no basis to make. This spec only builds the former.

```
Chip interactions (real, logged) → aggregated over time → minimum-sample gate →
  candidate ranked by observed frequency → presented, distinguishably labeled as observed
  history, never blended with a deterministic match
```

**Guardrails (mandatory):**
- **No engagement optimization, ever.** The signal describes what happened; it is never tuned
  to increase clicks. This is the "No Demand Creation" guardrail applied specifically here.
- **Mirror, not nudge.** No recommendation language ("you should," "consider," "we suggest").
  Only observational framing ("commonly investigated after similar queries").
- **Provenance stays visible.** A chip sourced from behavioral frequency must be visually or
  textually distinguishable from a chip sourced from a deterministic paraphrase match (Phase 1)
  — the user always knows whether they're seeing "this is what you said" or "this is what others
  also looked at." Never blend the two into one undifferentiated chip.
- **Minimum-sample gate before trusting anything.** Below a floor N, the honest output is still
  nothing — same discipline this codebase already applies elsewhere (the Feedback/Learning
  engine's `MIN_N=3`, `ATTRIBUTION_FLOOR=0.60` precedent) — reused as a principle, not as shared
  code; this is a different subsystem with its own data.
- **No demographic input.** The aggregation key is the query's topical/domain shape, never age,
  gender, or any profile attribute — same boundary Phase 1 already enforces structurally.

---

## PREREQUISITE (blocking)

None of this can be built before an event-capture pipeline exists for chip interactions on this
surface. Required, in order:
1. **Event capture** — log `(query, domain, chips shown, chip clicked/dismissed, timestamp)`
   every time TRENDING chips render in `analysisidlefield.jsx`. Does not exist today.
2. **Aggregation** — turn logged events into frequency tables over comparable sparse-query
   shapes. Needs real volume before it means anything — cannot be simulated or seeded.
3. **Sample-size floor** — define and enforce the `MIN_N` below which the system returns nothing
   rather than a low-confidence guess.

Nothing past step 1 can be designed concretely until step 1 exists and has been running long
enough to produce real data. This spec stops at defining the shape and guardrails; it does not
propose an implementation timeline, because the timeline is gated by data volume, not engineering
effort.

---

## COMPONENTS

| Component | Status |
|---|---|
| Chip interaction event log | Does not exist — new |
| Aggregation / frequency store | Does not exist — new, depends on event log |
| Minimum-sample gate | Not defined — needs an explicit `MIN_N`, Founder-set, same discipline as existing floors elsewhere in this codebase |
| Distinguishable presentation (behavioral vs. deterministic chip) | Not designed — new UI treatment, Founder-owned |
| Phase 1 rewrite table (`conceptrewrite.js`) | Exists, shipped — untouched by this spec, runs alongside |

---

## VALIDATION

Not applicable — no build authorized yet. When this is eventually scoped for implementation,
Definition of Done must include, at minimum:
- No chip is presented from this pathway below the minimum-sample floor.
- Every behaviorally-sourced chip is visually/textually distinguishable from a deterministic
  Phase 1 match.
- No code path uses demographic/profile attributes as an aggregation key.
- No ranking or selection logic optimizes for click-through or engagement.

---

## ROLLBACK

Nothing built — design record only.

---

## GUIDELINES

- Do not build any piece of this before the event-capture prerequisite exists and has
  accumulated real data — there is nothing to learn from otherwise, and simulating or seeding
  data to make the feature demoable would be fabrication.
- Do not reopen demographic-attribute inference as a shortcut to avoid waiting for real data —
  that path is closed, not merely slow.
- Do not merge this into Phase 1's rewrite table or its file — this is a separate mechanism with
  a separate data source and separate guardrails; keep them architecturally distinct so the
  "deterministic match" vs. "observed history" distinction stays enforceable, not just documented.
