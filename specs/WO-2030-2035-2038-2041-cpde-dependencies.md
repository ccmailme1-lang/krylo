# WO-2030 / WO-2035 / WO-2038 / WO-2041 — CPDE Dependency Chain

**Status:** SPECCED 2026-07-02 (Founder-provided values). NOT YET BUILT.
**Unblocks:** KRYL-939 (CPDE), once all four are implemented.

Grounded against real KRYLO code: `src/engine/domaingravity.js` (`getAllDomainPressures()`,
`computeDomainPressure()`, `FRACTURE_POLARITY_THRESHOLD`) and `src/engine/surfacerouter.js`
(signal dispatch, `{ source, domain, signal, confidence, ts }` shape per CLAUDE.md §16).
No invented types — everything below maps to a real existing data shape.

---

## WO-2030 — Attention Engine

**Job:** Rank incoming signals and keep only the top 15 per domain.

**Input contract:** signals matching the §16 shape — `{ source, domain, signal, confidence, ts }`.

**Output contract:** top 15 signals per domain, ranked, recomputed on every packet pulse from
`surfacerouter.js`.

**Formula:** `rank_score = confidence × exp(-λ × (now - ts))` — exponential time-decay on
recency, weighted by confidence. `λ` (decay rate) NOT YET SPECIFIED by Founder — needed before
build (distinct from WO-2035's decay rate, which is defined below).

**File map:** NEW `src/engine/attentionengine.js` — `rankSignals(signals, domain)` →
top-15 array. Consumes `surfacerouter.js` dispatch stream. Does not mutate signals.

**Bottle Test:** PARTIAL — `λ` still TBD, everything else concrete. **BLOCKED on `λ` only.**

---

## WO-2035 — Truth Pressure Field

**Job:** Track cumulative directional pressure per domain from signal confidence.

**Input contract:** ranked signals from WO-2030.

**Output contract:** pressure value per domain (extends `domaingravity.js`'s existing pressure
model, does not replace it — `FRACTURE_POLARITY_THRESHOLD = 0.40` already exists there and now
has a defined role, see below).

**Formula (Founder-specified, concrete):**
- `confidence > 0.70` → domain pressure `+= 1.5`
- `confidence < 0.40` → domain pressure `-= 1.0` (note: this threshold already exists as
  `FRACTURE_POLARITY_THRESHOLD` in `domaingravity.js:20` — reuse the constant, don't redefine it)
- All domain pressure decays **15% per hour** (linear, not compound — confirm with Founder if
  compound decay was intended, spec says "linear decay rate of 15% per hour")

**File map:** NEW `src/engine/truthpressurefield.js` — `updatePressure(domain, signal)`,
`getPressure(domain)`. Imports `FRACTURE_POLARITY_THRESHOLD` from `domaingravity.js` rather than
duplicating it.

**Bottle Test:** PASS — fully concrete, no TBDs. **BUILD-READY once WO-2030 exists** (consumes
its output).

---

## WO-2038 — Simulation Engine

**Job:** Diff a baseline domain-pressure state against a perturbed one.

**Input contract:** `Before` = a snapshot from `getAllDomainPressures()` (`domaingravity.js:147`,
already returns `{ [domain]: pressureValue }`). `After` = the same snapshot with one scalar
delta applied (a variable shift or signal removal — the specific perturbation is caller-supplied,
not computed by this engine).

**Output contract:** a single scalar — geometric (Euclidean) distance between the `Before` and
`After` pressure vectors.

**Formula:** `variance = sqrt(Σ_domains (after[d] - before[d])²)` — standard Euclidean distance
across the 6 locked domains.

**File map:** NEW `src/engine/simulationengine.js` — `simulate(before, after)` → `number`. Pure
function, no side effects, no direct call into `domaingravity.js` (caller passes both snapshots
in).

**Bottle Test:** PASS — fully concrete, no TBDs. **BUILD-READY independently** — doesn't depend
on WO-2030/2035, only needs two pressure-shaped objects as input (which `getAllDomainPressures()`
already produces).

---

## WO-2041 — Constraint Impact Engine

**Job:** Combine signal priority, domain pressure, and simulation variance into one impact score.

**Input contract:** `SignalPriority` (from WO-2030's rank_score), `DomainPressure` (from WO-2035),
`ΔState` (from WO-2038's `simulate()` output).

**Output contract:** single `ImpactDelta` scalar per constraint.

**Formula (Founder-specified):**
```
ImpactDelta = (Σ_i (SignalPriority_i × DomainPressure_i)) × ΔState
```

**File map:** NEW `src/engine/constraintimpactengine.js` — `computeImpact(rankedSignals,
pressureByDomain, deltaState)` → `number`. Imports from `attentionengine.js`,
`truthpressurefield.js`, `simulationengine.js`.

**Bottle Test:** PASS — formula concrete. **BLOCKED on WO-2030's `λ` transitively** (consumes
`SignalPriority`, which requires WO-2030 to be buildable first).

---

## Build order (real dependency chain, not assumed)

1. **WO-2038** — buildable now, zero blockers, pure function.
2. **WO-2030** — needs `λ` (decay rate) from Founder, otherwise buildable now.
3. **WO-2035** — buildable once WO-2030 exists (needs ranked signals as input).
4. **WO-2041** — buildable once WO-2030 + WO-2035 + WO-2038 all exist.
5. **CPDE (KRYL-939)** — buildable once all four exist. Still needs its own spec beyond the
   dependency contracts above (the actual precursor-detection logic) — see
   `specs/structural detection engine.md` for CPDE's own data model, which is separately defined
   from its dependencies.

**Only remaining open question:** WO-2030's `λ` (time-decay rate for signal recency ranking).
Everything else in this chain is concrete and build-ready.
