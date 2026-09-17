# CF Production-Readiness Validation — Summary (WS1–WS6)

**Status:** VALIDATION FINDINGS — feeds the acceptance hierarchy
*Validate → review → Founder production-integration ruling → merge/deploy.*
**NOT an authorization to merge `cf-canonical-substrate-experiment` or deploy CF into live KRYLO.**
**Date:** 2026-09-02.

Governing question: *can the validated substrate survive production conditions without weakening
any locked invariant?* IS-7…IS-12 remain deferred; nothing below is architectural expansion.

## The one fact that shapes WS2–WS6

**KRYLO has no server-side persistence for engine state.** Every store is browser `localStorage`
(`pathstore.js`, `rkmstore.js`, `convictionstore.js`, `scpstore.js` …). No backend DB; the Render
API is connector I/O only. CF must persist client-side, per-browser, per-device.

---

## WS1 — Real connector provenance  → see `SPEC-cf-prodval-01-connector-provenance.md`

**Verdict: feeds IS-1 without weakening any invariant; advantage is Tier-A/A' scoped.**
- Tier A (`fanoutIndex` siblings): genuine EXTEND, mostly same-batch.
- Tier A' (EDGAR filing references, PatentsView `cited_patents`): genuine EXTEND once a connector
  extraction pass emits them as `dependsOn` — additive, bounded, no architecture change.
- Tier B (shared ERK `canonicalId`): drives C3/C6 only, **not** IS-1 EXTEND (X3 §3.5). Under the
  ratified v0.2 rule, Tier-B staggered legs get **no** formation-recovery advantage. Closing that
  is a separate architectural decision for the Founder — not this phase.

---

## WS2 — Production persistence / storage

**Verdict: possible within KRYLO's existing pattern, no new DB, subject to a compaction policy.**

- **No new DB solely for CF** (CF §34 non-goal) — respected: the store is the `localStorage`/
  IndexedDB client pattern already used by `pathstore.js` et al. If a shared server store is ever
  added it must be general infra, not CF-only.
- **KRYL-CF-004 memory boundary** ("shared memory = validated artifacts + arbitration/coherence
  records + provenance references; never a second reasoning substrate") — **respected**: the
  persistent store holds pathway lineage + ν_t provenance (history), and the X5 semantic firewall
  keeps admission reading only currently-supported state, so the store never becomes the reasoning
  substrate.
- **Size ceiling.** `localStorage` ≈ 5 MB. An append-only full-lineage event log (X4: no hard
  delete) grows unbounded. IndexedDB (~hundreds of MB) is the client ceiling. Either way a
  **compaction-of-reconstructible-history** policy is required (X4 already mandates this: compact,
  never delete a pathway's identity/lineage head). Not yet specified. Experiment scale is fine.
- **Immutability (CF-003 §21).** Storage layer does not enforce it; the code appends only. A
  write-events-never-update storage guard would harden it — additive.
- **Determinism on reload (IS-1).** The store is ordered by `logical_time` and append-only →
  reload-then-replay is deterministic *by construction*. **Needs a test** (persist → clear
  in-memory → reload → assert identical identity-decision sequence). Not yet written.

**WS2 required before production:** (a) a compaction policy spec, (b) a reload-determinism test,
(c) an IndexedDB or shared-server backing decision (infra, not architecture).

---

## WS3 — Cross-session pathway continuity

**Verdict: bounded by KRYLO's client-only persistence.**

- Per-browser `localStorage`/IndexedDB → pathways persist across **reloads and sessions on the
  same browser/device**, not across devices or users. Same limitation as `pathstore.js` Path
  Memory today (memory: "UAT test accounts … logout is dead code").
- **This is acceptable for the validated advantage** — multi-event / formation-revision recovery
  operates within a single analysis session's batch sequence; cross-session continuity extends
  the window but is not what the kill experiment demonstrated.
- **Constitutional check:** cross-session continuity must not let a stale pathway from a prior
  session silently feed admission. The X5 firewall handles this — on reload, every pathway's
  `lastCorroboratedBatch` is old → not support-eligible until re-corroborated. **Needs a test**
  (reload a store with old pathways, ingest a fresh batch, assert the old pathways do not enter
  admission).
- True cross-device/user continuity requires a shared server store — deferred with WS2(c).

---

## WS4 — CF-004-MET-01 latency / resource measurement

**Verdict: the invariant is testable; the measurement is not yet built.**

- **INV-006** (CF analytical processing never a synchronous prerequisite for
  `signal → normalize → publish → render`) is currently **asserted structurally**: the canonical
  substrate is an offline module with no guest-path import. `runner.js` / `pathwaystore.js` are
  not called from any `.jsx` render path.
- **MET-01** requires runtime telemetry: guest-facing end-to-end latency (ingest→render),
  analytical queue delay, analytical processing time, state objects examined/written per event.
  **None exists yet** — `telemetry.js` covers connector timings, not CF.
- The falsifiable claim (*analytical workload variation does not move guest latency*) can only be
  tested once CF is wired to *read from* the live pool asynchronously. That wiring is WS5.
- **Order dependency:** MET-01 telemetry must be in place **before** any WS5 wiring is enabled,
  so the first integration is measured, not retrofitted.

**WS4 required before production:** a CF telemetry module emitting the four MET-01 series, plus a
harness that varies analytical load and checks guest-path latency is flat.

---

## WS5 — KRYLO integration boundary

**Verdict: CF plugs in as a parallel async producer, never a replacement. Clean boundary exists.**

- `inferFormation` has exactly **3 live callers**: `targetpacket.jsx:333` (02 FORMATION section),
  `analysisfield.jsx:546` (report-layer diagnostics), `formationprospectusproducer.js`. All pass
  `field.particles` — the synchronous, field-scoped domain-pressure pool.
- **CF does NOT replace these** (Founder, CF §2.1: "CF runs *beside* the synchronous analytical
  path, doesn't gate single-shot queries"). The synchronous `inferFormation(field.particles)`
  path stays exactly as-is.
- **Integration shape:** CF runs a separate async loop that (1) reads the same
  `dispatchBatch → subsignalbuffer → domaingravity` pool the connectors already write, (2)
  maintains persistent pathways + convergence clusters, (3) produces its own **FormationCandidate**
  via `inferFormation(admissibleParticles())` — reusing the *same* admission machinery (CF-I7),
  (4) surfaces that candidate as **distinct, additional** information, clearly labelled as the CF
  read, never overwriting the synchronous 02 FORMATION result.
- **Boundary invariants preserved:** guest render consumes only already-computed state (INV-006);
  CF never mutates the synchronous pool or the packet's synchronous formation; governance
  (`admitCrossDomainRelationship`, `inferFormation` thresholds) is unchanged and shared.
- **What must be built:** the async CF loop + a read-only tap on the pool + a distinct render slot.
  All additive. No change to the 3 existing call sites.

---

## WS6 — Production integration gate

**This is a Founder decision, not a build task. Inputs for the ruling:**

| dimension | state |
|---|---|
| Does the substrate weaken any locked invariant in production? | **No** — WS1–WS5 each check clean, subject to the required-before-production items below |
| Validated advantage | multi-event + formation-revision recovery, **Tier-A/A' reference continuity only**; FP=0 on the persistent decoy; no advantage (correctly) on single-shot |
| Scope honesty | Tier-B staggered formations get no advantage under ratified rules — a real limit |
| Cost | proposed params, Founder-gated, none load-bearing for the result; `COST_BUDGET_RATIO` name collision unresolved |
| Blocking items before any merge | compaction policy (WS2), reload-determinism test (WS2/WS3), CF telemetry + flat-latency harness (WS4), the async loop + read-only pool tap + distinct render slot (WS5) |
| Not required | IS-7…IS-12, Tier-B rule extension, cross-device continuity — all deferred/separate |

**Recommended gate language:** *production integration authorized only after the WS2/WS3/WS4/WS5
"required before production" items are built on the branch and validated, and only as a
distinct, non-gating, clearly-labelled parallel CF read — never a replacement of the synchronous
formation path.*

---

## Consolidated readiness verdict

**The validated substrate can survive production conditions without weakening a locked invariant.**
The gaps are all **additive engineering** (compaction policy, three tests, a telemetry module, an
async loop + read-only tap + render slot) — none is an architectural change, none reopens a
ruling. The one honest limit is scope: CF's staggered-formation advantage is Tier-A/A' reference
continuity, not the broad Tier-B case.

Next: Founder review of these findings → production-integration ruling. No merge, no deploy, no
build of the WS items until that ruling.
