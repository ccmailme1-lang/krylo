# G_W / M₁ Realiser — Architecture Decision Note

Status: Architecture Recon / NOT a build spec. Feeds future Spec B. No code changed to produce
this document. Ends in a recommendation, not an implementation.

## The discipline this note holds to

**G_W being called a "snapshot graph" in rc3's notation does not mean it must be a materialized,
persisted object.** rc3 §7 (already noted in audit 002) explicitly hedges this: signals consume
"some connected sub-graph C ⊆ G_W... chosen by the signal definition" — not the whole graph. That
sentence alone means G_W never has to exist as one durable object; it only has to be *producible*
on demand, scoped to whatever a given σ needs. This note evaluates three real options rather than
assuming the notation dictates the implementation.

## The three options

**A — Materialized.** Build G_W once per window, persist it (in-memory store, cache, or
database), and have every σ/Σ computation read from that persisted object.

**B — Virtual.** Never persist anything called G_W. Every σ/Σ computation queries the underlying
O/E/R stores directly, on demand, applying its own window + ℒ=⊤ filter at query time.

**C — Hybrid.** Compute on demand (like B), but cache the result transiently — scoped to a
single request/session, invalidated the moment new evidence arrives — without treating the cache
as a durable, independently-versioned object.

## Evaluation

| Criterion | A — Materialized | B — Virtual | C — Hybrid |
|---|---|---|---|
| **Window semantics** | Clean if rebuilt per window, but requires deciding *when* a window closes and triggers a rebuild — an explicit lifecycle KRYLO doesn't currently have anywhere audited | Naturally correct — window is just a query parameter, always current | Same as B; cache key includes the window, so staleness is bounded, not structural |
| **ℒ filtering** | Must be applied once at materialization time — any evidence that arrives with ℒ=⊤ *after* the snapshot was built is invisible until the next rebuild | Applied fresh on every query — always reflects current ℒ state | Applied fresh, same as B, until cache invalidation |
| **O/E/R participation** | Requires copying/denormalizing O/E/R data into the snapshot's own vertex/edge representation — a second copy of the same facts | Reads O/E/R stores directly — no second copy, no drift possible | Reads directly like B; the cache holds a query *result*, not a second source of truth |
| **Provenance preservation** | Two representations of the same fact (source O/E/R, and the copy inside G_W) means π_Σ has to decide which one it points at — a duplication risk directly analogous to the §23 axis-duplication failure mode already invoked in memo 006 | π_Σ points at the one real source (O/E/R) unambiguously — no duplication | Same as B for correctness; the cache is disposable and never becomes a provenance target |
| **σ purity / Route-Don't-Aggregate (§21)** | A materialized G_W built before signals run is close to precisely the thing §21 forbids: "collapsing heterogeneous signals into precomputed aggregates before routing decisions are made" | Directly compliant — nothing is aggregated until a specific σ asks for it | Compliant — the cache is a memoization of a query already scoped to one σ's need, not a pre-built aggregate offered to all future queries |
| **Recomputation cost** | Lowest *per query* once built, but pays a real cost to build/rebuild, and that cost is paid even for windows nothing ever queries | Highest *per query* if the same subgraph is requested repeatedly by different signals in a short span — no reuse | Reasonable middle ground — pays the query cost once, reuses it for the (likely common) case of multiple signals wanting overlapping subgraphs in the same request |
| **Temporal consistency** | Strong within one materialized snapshot (everyone reading it sees the same frozen state) but that snapshot can silently go stale relative to the live O/E/R stores | Always consistent with the live stores by construction (there's nothing else to go stale) | Consistent within the cache's lifetime; requires a real invalidation trigger, which is new machinery |
| **Mutation/persistence implications** | New persistence layer, new invalidation logic, new failure mode (stale-snapshot bugs) — none of this exists anywhere audited today | None — no new persistence, no new failure mode | Minimal — an in-memory, short-lived cache is a much smaller surface than a persisted store |
| **Compatibility with existing KRYLO** | Would introduce a new pattern KRYLO doesn't currently have anywhere in the audited surface | Matches WO-2004's own discipline directly: every mutation in `identitykernel.js` is a pure function returning a new object, nothing is mutated in place or cached as a standing object [001]. Also matches §21 as already-locked doctrine | Compatible, provided the cache is implemented as ephemeral memoization, not as a new standing store |

## A relevant existing counter-example, not hypothetical

`entitytopologyregistry.js` (audit 004) already **is**, in effect, an accidentally-materialized,
unwindowed, ever-growing global graph — `TYPED_EDGES` is a module-level array that only grows,
with no window scoping and no pruning. Audit 004 documented a real, live bug that traces directly
to this: the v1 (name-keyed) and v2 (CIK-keyed) portions of the graph don't bridge, so a real
relationship can exist and still be unfindable via `findPath()` depending on which identity scheme
each side happens to use. This is a live, observed cost of the "materialize once, keep growing"
pattern — cited here because it's real evidence available in this codebase, not a hypothetical
risk imported from general software-architecture concerns.

## Recommendation

**Option B (Virtual), with the explicit allowance that an individual Spec-B implementation may add
Option-C-style ephemeral caching as a performance optimization — never as a persisted store.**

Reasoning, in order of weight:

1. rc3 itself does not require materialization — §7's "some connected sub-graph C ⊆ G_W" language
   is satisfiable by a query function alone.
2. §21 (Route-Don't-Aggregate) is existing, locked KRYLO doctrine, and Option A is close to the
   exact pattern it names as forbidden.
3. WO-2004's own discipline — pure functions, immutable returns, nothing cached as a standing
   object [001] — is the same shape as Option B. Choosing B extends an existing, already-proven
   KRYLO pattern rather than introducing a new one.
4. The one place in this codebase that already resembles a materialized global graph
   (`entitytopologyregistry.js`) has a documented, live bug traceable to exactly the staleness/
   drift risk Option A would reintroduce at the G_W layer.
5. π_Σ (memo 006) is simplest when it points at one unambiguous source of truth. Option B keeps
   O/E/R as that single source; Option A creates a second copy π_Σ would have to choose between.

## What this note does not decide

- The exact query interface/function signature that would realize "give me C ⊆ G_W for this
  window and this ℒ filter" — that's Spec B's job.
- Whether Option C's caching is worth adding at all, or should be deferred until a real
  performance problem is observed — Spec B should treat this as an optional, isolated addition,
  not a required part of the initial design.
- Nothing about Σ/π_Σ construction itself (M₃) — that remains audit 002's confirmed gap, addressed
  separately.

## Status

Recommendation for Spec B: **G_W realized as a virtual/on-demand query over existing O/E/R
stores (Option B), not a persisted snapshot object.** This is a recommendation, not an
authorization — Spec B still needs to be drafted, and this note's reasoning is available for that
draft to accept, refine, or override with new evidence.
