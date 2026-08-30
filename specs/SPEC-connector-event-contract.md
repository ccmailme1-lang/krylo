# SPEC — Connector Event Contract

**Status:** DRAFT — formalises frozen behaviour. WO-1 substrate work.
**Version:** 0.1
**Scope:** the event object every connector dispatches via
`surfaceRouter.dispatchBatch([...])`, and what `domaingravity._pool` retains.
**Related:** `SPEC-domain-substrate-integration-contract.md` (shared-source AC),
`domain-substrate-wo1-signal-classification.md`, `domain-substrate-baseline-audit.md`.

CLAUDE.md §12 already requires: normalize to 0–100 before dispatch; dispatch via
`dispatchBatch()`; tag `{source, domain, signal, confidence, ts}`; honor parity.
This spec pins the shapes and the units, and records one active defect.

---

## 1. The event object

```
{
  source:     string       // connector id, UPPER_SNAKE ('BLS', 'PATENTSVIEW', 'GDELT', …). REQUIRED.
  domain:     Domain | Domain[]   // one of the six, or an array for a legitimate multi-domain event. REQUIRED.
  signal:     number | string     // see §2. REQUIRED.
  confidence: number       // [0, 1] — a probability. See §3. REQUIRED on a real emission; 0 on failure.
  ts:         number       // epoch ms. REQUIRED.
  polarity:   POLARITY     // POSITIVE | NEGATIVE | ABSENT (signalconstants.js). Optional; absent ⇒ constructive.
  decay?:     DECAY        // DAILY | QUARTERLY | … (signalconstants.js).
  topology?:  string[]     // source-cluster tags (WO-1855). Derived if absent.
  fanout?:    number       // count of domains this one source-event was emitted into.
  fanoutIndex?: number     // 0 = primary emission; > 0 = sibling (KRYL-1093 reconvergence guard).
  facet?:     string       // WO-1 forward — a stable facet id (see §5). Not yet emitted by connectors.
}
```

## 2. `signal` — the overloaded field

Today `signal` carries two different things:

- **numeric connectors** (BLS, GitHub, npm, GDELT, Reddit, FRED, …): `signal` is
  the **0–100 normalized value**.
- **relation / named connectors** (PatentsView `TECHNOLOGY_VELOCITY:<cluster>`,
  `INVENTOR_MIGRATION:<a>→<b>`, …): `signal` is a **name string**; the 0–100
  value is carried elsewhere (`confidence`, see §3 defect).

**Target:** `signal` is always `{ name: string, value: number /* 0–100 */ }`.
Reaching it means a connector pass (WO-1 forward, per-connector, Class B in the
classification matrix). Until then `_pool` retains `signal` raw and the reader
must handle both shapes.

## 3. `confidence` — one unit: `[0, 1]`

**Rule:** `confidence` is a probability in `[0, 1]`. A connector that computes a
0–100 score MUST divide by 100 before dispatch.

### DEFECT-WO1-CONF (ACTIVE — tracked as **KRYL-1228**; coordinated change, not a drive-by)

`domaingravity._pool` currently stores `confidence` as emitted, mixing scales:

- most connectors emit `[0, 1]` (`blsconnector` `0.9`, `githubconnector` `0.4–0.9`);
- at least one emits `0–100` (`patentsviewconnector` `confidence: score`);
- the `_pool` ingestion default for a missing `confidence` is **`50`**, not `0.5`
  (`domaingravity.js` ~line 96).

`computeDomainPressure` then takes `magnitude = mean(confidence)` over the pool —
so a `0.9` BLS entry, a `73` PatentsView entry, and a `50` default are averaged
together. The `[0, 1]` connectors are effectively **drowned out**; the packet's
"OWNERSHIP 56 / 100" is largely the mean of `50` defaults plus the few 0–100
entries.

**Why it is not fixed here:** `computeDomainPressure.magnitude` is displayed as
0–100 by ~14 consumers (`targetpacket.jsx`, `intelligencebrief.jsx`,
`analysisfield.jsx`, `canonicalresolution.js`, …). Normalizing `confidence` to
`[0, 1]` at ingestion forces a matching `×100` at the `magnitude` output and a
sweep of all 34 connectors + the display sites — a coordinated change, not a
minimal edit (§2 gate: shared field, many consumers, blast radius on display).

**Plan:** a dedicated change — (a) connector-boundary normalizer in `dispatchBatch`
(`confidence > 1 ? /100`), (b) `_pool` default `50 → 0.5`, (c) `computeDomainPressure`
returns `magnitude` on the same declared scale, (d) audit all 34 connectors, (e)
re-verify every display site. Tracked as WO-1 sub-item; blocks nothing else.

## 4. `_pool` retention (`domaingravity.js`)

**Done (WO-1, additive):** `_pool` entries now carry `source` and `signal` in
addition to `{ confidence, polarity, ts }`. Every existing consumer reads only the
original three — additive, zero display impact. `getDomainSignals` /
`getAllSignals` now return `source` + `signal` in the object.

**Why:** without `source` on a pool entry the shared-source distinct-facet AC
(`SPEC-domain-substrate-integration-contract.md`) is unverifiable — you cannot
tell a PatentsView TECH entry from a GitHub TECH entry once they are in the pool.

## 5. `facet` — WO-1 forward

For per-`I_d`-signal attribution (not generic domain-activity), a connector will
emit a stable `facet` id naming *which* `I_d` signal the event grounds (e.g.
`CAPITAL/flow`, `TECHNOLOGY/patent_velocity`). This is the bridge to
`signalfacet.js` (`makeSignalFacet`) and is per-connector Class-B work. Not in
this spec's frozen scope — it depends on the six `I_d` `signals` being authored
(Class E, Founder).

## 6. Acceptance (for the parts done here)

- `fecconnector.js` — no `domain: 'MEDIA'` (the `× 0.85` relabel removed).
- `_pool` entries carry `source`; `getDomainSignals(d)[i].source` is populated for
  connector-sourced entries.
- Build clean; `qa_capital_flow` / `qa_kryl1218_*` / `qa_querycontext` /
  `qa_completionchips` green.
- DEFECT-WO1-CONF documented, owned, not silently patched.
