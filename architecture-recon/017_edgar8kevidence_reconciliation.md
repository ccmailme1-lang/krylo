# edgar8kevidence.js — WO-2004/RKM Junction Reconciliation

Status: Bin-1 reconciliation. No code changed. Full read of `edgar8kevidence.js` (169
lines, complete) plus consumer trace. This is the file audit 001/015 flagged as touching
both `identitykernel.js` (WO-2004) and `rkmstore.js` in the same live path.

## What it actually does (KRYL-1091, its own header)

Reads `getProcessedEvents()` from `edgar8kconnector.js` (RKM's session-scoped event log),
pulls the full `RealityObject` via `rkmstore.js`'s `getById()`, converts each filing into a
WO-2004 `EvidenceNode` (`createEvidenceNode`), groups filings by `(entity, eventClass)`, and
builds one WO-2004 `CanonicalEvent` per group (`createCanonicalEvent`) — all wired directly
into `app.jsx`'s live EDGAR sync chain (`runEdgar8KSync().then(() => { ... 
runEdgar8KEvidenceSync(); ... })`, confirmed in audit 015).

## Finding 1 — `identityId` here is deterministic, not a random UUID

Audit 001 established that WO-2004's `identityId` **defaults** to `crypto.randomUUID()`
when the caller doesn't supply one. This file supplies one explicitly:
```
identityId: key,   // key = `${entityKey}::${eventClass}` — e.g. "ENTITY::lockheed-martin::EARNINGS_ANNOUNCEMENT"
```
"...so lineage is stable across runs rather than a fresh UUID" (file's own comment, line
100). **This refines, not contradicts, audit 001**: WO-2004's factory default is a random
UUID, but its one confirmed live caller overrides that with a real, content-derived,
stable key. Re-running the sync does not create duplicate `CanonicalEvent`s for the same
(entity, eventClass) pair — `_events` is keyed by `key`, so a rebuild replaces in place.

## Finding 2 — `entityKey` correctly anchors to O, confirming audit 001/012 again

```
function entityKeyFor(logEntry) {
  if (logEntry.canonicalId) return `ENTITY::${logEntry.canonicalId}`;   // entityresolution.js O
  const cik = getById(logEntry.realityObjectId)?.metadata?.cik;
  return cik ? `CIK::${cik}` : null;
}
```
Third confirmation (after `edgar8kconnector.js` and `rkmstore.js`'s `identityId` field) that
the real live O-attribution path is `entityresolution.js`'s `canonicalId`, with a raw CIK as
fallback when resolution fails. No drift between the three files on this point.

## Finding 3 — `resolveIdentity()` is deliberately NOT used, and the file states exactly why

```
// Why resolveIdentity() is NOT used here (identitykernel.js:322):
//   shouldMerge gates on computeStructuralSimilarity (identitykernel.js:203), which compares
//   evidenceType sets only — it has no entity awareness. Every 8-K is SEC_FILING, so any two
//   filings score similarity 1.0 whoever filed them, leaving temporal overlap as the sole
//   barrier. Feeding per-filing events to the resolver would merge unrelated companies.
```
This confirms audit 001's finding (`shouldMerge`/`shouldSplit`/`resolveIdentity`/
`mergeEvents` have zero external callers) with a concrete, documented reason: **the
kernel's merge logic doesn't work correctly for single-evidence-type sources yet**, so this
adapter manually groups by `(entity, eventClass)` instead of delegating to the kernel's own
resolution engine. This is a real, live-tested limitation, not a theoretical one — worth
carrying forward as a fact about WO-2004's actual capability ceiling, not just its call
graph.

## Finding 4 — `edges: []`, always

"no causal edges asserted between filings — none are observed" (line 138). Fourth
confirmation of the same fact audit 002 established from WO-2005B's side (it never reads
`.edges` anyway) — no live path anywhere in this codebase currently populates WO-2004
`EvidenceGraph` edges with real data.

## Finding 5 — `getCanonicalEvents()` feeds a real, live, user-facing surface

Not flagged in audit 001 (which only checked static imports of `identitykernel.js`
directly, not this adapter's own read API). Grep for this session:
```
src/components/analysis/intelligencebrief.jsx:212  resolveWhyTrace(entity, getCanonicalEvents())
src/components/analysis/whytracepanel.jsx:29        resolveWhyTrace(entity, getCanonicalEvents())
src/engine/crediff.js:116                           getCanonicalEvents().filter(...)
src/engine/querysynthesis.js:18                     resolveWhyTrace(entity, getCanonicalEvents())
```
`whytracepanel.jsx`/`intelligencebrief.jsx` are rendered from `targetpacket.jsx` — a core,
established live surface (memory: KRYL-980, "Why-Trace... Phase 0 audit found existing
legibility, small join built instead of new subsystem" — **this file is that join**).
**WO-2004's `CanonicalEvent`, via this adapter, is real, live, consumed production
infrastructure feeding a shipped user-facing feature.** This is materially different from
WO-2004's status as characterized in audit 001 alone (which only established the kernel
functions were *callable*, not that their output reaches a UI).

## The re-framed question: is this E, or is it a proto-Σ?

Audit 001 characterized WO-2004 as "an E kernel, not an O kernel." Reading this live
caller more closely refines that further. A `CanonicalEvent` here wraps an `evidenceGraph`
containing **multiple** `EvidenceNode`s (every filing in the (entity, eventClass) group) —
structurally, that's closer to a small `⟨G_Σ-shaped nodes, props (stabilityScore etc.),
some evidence⟩` aggregation than to one atomic occurrence. The genuinely atomic
per-occurrence E in this live system is arguably the **individual filing** (an
`EvidenceNode`, or equivalently RKM's per-filing `RealityObject`) — not the grouped
`CanonicalEvent`. **WO-2004's `EvidenceNode` and RKM's `RealityObject` are two atomic
E-representations of the same filing (a real, confirmed duplication at the atomic grain).
WO-2004's `CanonicalEvent` is a grouped aggregation one level up — structurally
proto-Σ-shaped, feeding WO-2005B's SCI-CONFIRMATION (audit 002) directly via its
`evidenceGraph`.**

This means there are, right now, in live production, for the same underlying 8-K filings:
- **RKM `RealityObject`** — atomic, per-filing, feeds signal dispatch (`edgar8ksignal.js`)
  and CI-F's anchor matching (audit 016).
- **WO-2004 `EvidenceNode`** — atomic, per-filing, duplicate of the above at the same
  grain, feeds WO-2004's own `CanonicalEvent` construction.
- **WO-2004 `CanonicalEvent`** — grouped, per-(entity, eventClass), feeds WhyTrace/query
  synthesis (real UI) and WO-2005B's SCI-CONFIRMATION.
- **This session's `sigmaengine.js` Σ** — grouped, per-sync-batch, feeds nothing live yet
  (only test scripts, per audits 013/014).

## Verdict

**Genuine atomic-grain duplication exists** (RKM RealityObject vs. WO-2004 EvidenceNode,
same filing, two representations) — but it is not obviously harmful *in its current form*,
because each feeds a different, non-overlapping downstream consumer (RKM → signals + CI-F;
WO-2004 → WhyTrace + SCI-CONFIRMATION) and neither claims authority over the other's
consumer. This is the same shape of finding as `structuralintegrity.js` vs.
`structuralconfirmation.js`'s SCI-CONTRADICTION/SCI-CONFIRMATION split (audits 001/002/005):
two systems, same underlying material, different named purposes, not silently colliding
because nothing currently asks both the same question.

**What this changes for the adoption map:** this session's `sigmaengine.js` Σ should NOT be
introduced as a fourth independent aggregation. If/when Σ construction is wired into a live
path, the natural, non-duplicating design is for it to **consume WO-2004's existing
`CanonicalEvent`/`evidenceGraph` as its E∪R input** (the aggregation WO-2004 already builds
and already feeds to WO-2005B) rather than re-deriving its own grouping from raw RKM
objects. That is a Bin-3 design direction, not decided or built here — flagged because this
reconciliation is what surfaces it.

## Status

Gate: **GREEN — edgar8kevidence.js's live role established.** WO-2004's real production
role is: atomic evidence capture (duplicating RKM at that grain, low-risk today) + grouped
`CanonicalEvent` construction that is genuinely load-bearing for a shipped feature
(WhyTrace) and for WO-2005B's scoring. Not a dead system — the most consumed WO-2004 path
found in any audit this session.

Remaining Bin-1 items before the adoption map update, per direction: `patentsview-
connector.js` + `supplychainconnector.js` reconciliation against the Lean substrate.
