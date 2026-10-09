# SPEC (DRAFT v0.1) — Analytical snapshot: implementation specification

Date: 2026-10-09 · Status: DRAFT implementation specification against the **decided contract**. **No code, deployment or contract change is authorized by this document.**
Decided contract (rubric item 5, `specs/rubric-alphabet-10of10-20261009.md`): one immutable analytical snapshot per completed query; every surface renders from it; timestamp shown; refresh is an explicit action that replaces the displayed result on all surfaces atomically; the prior run stays identifiable; freeze point = when the subject lookups settle (success, failure or the 45-second timeout); a failed or timed-out lookup is "unavailable", never absence.

## PROBLEM

The left brief, the Target Packet, the MAP brief, the header state and the MAP rings each read the live signal pool on their own schedule (the packet memoizes at query time; the MAP re-reads on a debounce timer; the ownership lookup lands seconds later). The same query therefore shows different counts, polarities and states at different moments (observed: 171 against 201 signals; a domain constructive on one surface and fracture on the other; header and rings disagreeing).

## SOLUTION

One function builds one frozen snapshot object once the lookup phase settles. Every surface renders from that object. Nothing reads the live pool for display after the freeze. Until the freeze the page shows a single "Checking…" state, not partial numbers.

### Snapshot contents (all computed once, never recomputed by a surface)

`id`, `generatedAt` (instant, time zone shown), `query`, `subjectScope` (contract, kind, attribution), `lookups` (per subject lookup: name, terminal state `OK | FAILED | TIMEOUT`, error text, finished-at), `windowMs`; field level: `domainPressures` (per domain: signalCount, magnitude, polarity), `domainSignalCounts`, `ambientFormation`; subject level: `subjectFormation`, `boundByDomain`, `subjectObservations` (with source, event date); `entityRelationships` (canonical, with evidence) and `counterparties`; `mapExtras` (state, polarity glyph, bound per domain from the measured classifier); `brief` (the `computeBriefSummary` output and header state label); `evidenceByDomain`; `pairSupport` (per DEF-1387); `sourceDates` (event dates and retrieval times kept distinct from `generatedAt`).

### Settlement (the freeze point)

- **Subject lookups** for a resolved ENTITY: (1) the targeted ownership observation (`runTargetedOwnershipObservation`, already emits `krylo-rho-updated`), (2) the targeted EDGAR 8-K sync (`runTargetedEdgar8KSignalSync`), (3) the capital-realization sync (`runCapitalRealizationSync`). Lookups (2) and (3) currently emit no completion event; each must emit one terminal event (`OK` or `FAILED`) carrying the canonical ID, same pattern as `krylo-rho-updated`.
- The snapshot is built when **all** dispatched subject lookups are terminal, or at **45 seconds** after submit, whichever is first; lookups still running at 45 seconds are recorded `TIMEOUT` (unavailable, never absence).
- **No subject lookups** (UNRESOLVED subject, market theme, no entity): nothing to wait for; the snapshot is built at submit.
- A late-arriving result after the freeze does not change the snapshot; it is available to the next explicit refresh.

### Refresh and history

- A visible control states the snapshot time ("Analysis snapshot: date, time, time zone") and offers **Refresh analysis**. Refresh runs the lookups again and builds a **new** snapshot with a new id; the displayed result replaces the old one on every surface in one render.
- The previous snapshots of the session are kept (id, generatedAt, key counts) so a guest can see that a difference is a new run, not silent drift. Retention: the session's lifetime; persistence beyond the session is out of scope.

### Surfaces and what changes for each

| Surface | Today | After |
|---|---|---|
| Left brief and Target Packet | recompute from the live pool (memoized at query time) | read `snapshot.brief`, `snapshot.pairSupport`, `snapshot.domainPressures` |
| MAP brief and rings (iframe) | re-read live pool on a debounce; receive `postMessage` | receive the snapshot-derived payload once per snapshot; the field refresh timer (`fieldTick`) stops driving content |
| Header state label | derived at render from the pool | `snapshot.brief.stateLabel` |
| Ownership lookup state (DEF-1384) | hook, shows "Checking…" then result | becomes the pre-freeze state; its terminal result is stored in `lookups` |
| Formation history scrubber | server snapshot rows | unchanged (a separate record: persisted Formation snapshots, KRYL-1334) |

The Formation snapshots of KRYL-1334 and this analytical snapshot are different objects and are not merged.

## COMPONENTS (for the implementation plan, none authorized)

New pure builder module; store field on the analysis session (`snapshots[]`, `activeSnapshotId`); terminal events from lookups (2) and (3); changes in `targetpacket.jsx`, `structuralbrief.jsx`, `structurepanel.jsx` to read the snapshot; a header control for time and refresh. `computeBriefSummary`, `selectPairSupport` and the measured classifier are reused unchanged as pure functions.

## VALIDATION

1. **Stability:** after a snapshot is built, changing the pool (new signals) changes none of: signal counts, polarity, pair counts, states, relationships, header label, rings, on any surface.
2. **Agreement:** a harness renders the left-brief inputs and the MAP payload from one snapshot and asserts equal text, rows and counts (extends `qa_brief_reconcile.mjs`).
3. **Settlement:** all lookups `OK` freezes once; one `FAILED` freezes with that lookup unavailable and its text shown, others unaffected; a hanging lookup freezes at 45 s as `TIMEOUT`; a result arriving after the freeze changes nothing until refresh.
4. **Refresh:** produces a new id and replaces all surfaces together; the old run stays in history; a failed refresh keeps the current snapshot displayed and states the failure.
5. **No-lookup queries:** unresolved or thematic queries freeze at submit.
6. **Pre-freeze:** only "Checking…" is shown; no partial counts appear.
7. **Reachability gate (Full Gate):** trace one real Alphabet query from submit through the lookups, the freeze and each surface, then mutate the live pool and confirm nothing on screen changes.

## ROLLBACK

Additive: revert the builder and the surface edits to restore live recomputation (git); the lookup events are additive.

## GUIDELINES

- Settled by the Founder: the contract above (frozen, timestamp, explicit atomic refresh, settlement freeze point).
- Defaults chosen here (no further question): the three subject lookups listed; the 45-second limit from the decided contract; history kept for the session only.
- Out of scope: persistence of snapshots across sessions; the temporal-change comparison (KRYL-1386) which will read snapshots only if a later spec says so; any change to KRYL-1334.
