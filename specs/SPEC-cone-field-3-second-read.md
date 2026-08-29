# SPEC — Cone Field: the 3-second read

**Title:** The default cone field must convey direction, persistence, and co-movement at a glance
**Type:** Feature (guest experience · visual)
**Status:** DRAFT — for Founder review of the specific visual treatments (§5/§6 locked). No code.
**Baseline for equivalence:** `15a1d5a` / `baseline_targetpacket_kryl1218_20260828`
**Related:** §16 Direction Honesty (polarity is load-bearing) · KRYL-1213 (SEE state) ·
the "tell a story in 3 seconds or less, or it's cut" standard.

---

## THE STANDARD THIS SPEC SERVES

> Every mark in the guest view tells a story in 3 seconds or less, or it's cut.
> The story must encode a real, grounded variable — orthogonal to the other marks —
> not a narrative pinned on afterward.

## THE TARGET READ

A first-time guest looks at the cone field and, without a legend, gleans:

> "Financial markets are down today. Two other domains are impacted too, less badly.
> It's been going on all day."

That sentence contains four analytical dimensions:

| dimension | in the sentence | on the field today |
|---|---|---|
| **which domains** | "financial markets", "two others" | ✅ cones |
| **severity, relative** | "less badly" than the others | ✅ cone height (magnitude) |
| **direction** | "down" / impacted | ❌ color says building vs. turbulent, not up vs. fracturing |
| **persistence** | "all day" | ❌ no time dimension anywhere in the field |
| **co-movement** | "two others impacted *too*" | ❌ cones read as independent; no linkage |

The field gives severity. Direction, duration, and "these moved together" are absent —
which for direction is a §16 violation (a domain signal shown without its polarity is
fabrication by omission; the Target Packet's Fracture Surface honors this, the field
does not).

---

## PROBLEM

`ConeMap`'s default (SEE / guest) state encodes two axes — height (magnitude) and
color (convergence state) — and nothing else that a first-time viewer can read.
Polarity (`constructive` | `fracture`), which the engine computes per domain and
which §16 makes load-bearing, is not visible on a cone. Persistence and
cross-domain co-movement are not represented at all.

---

## SOLUTION

Three glanceable encodings on the default cone field. Each passes the 3-second bar,
each rides an **existing** axis or a new axis that stays inside §5/§6 — **no new
hue**. The exact treatment per encoding is a Founder pick from the options below.

### 1. Direction — fracture polarity, per cone

Data: `getAllDomainPressures()[d].polarity` — already computed, already read by the
field. A domain in `fracture` polarity must read as distinct-at-a-glance from
`constructive`.

Treatment options (no new color):
- **a. Motion** — use the §6 motion axis: `fracture` = the irregular jitter already
  specced for TURBULENT; `constructive` = coherent pulse. Motion already carries
  state; extend it to carry polarity.
- **b. Form** — wireframe erosion / gap density: a fracturing cone's mesh reads as
  breaking up; a constructive one is intact.
- **c. Orientation** — a subtle downward lean or apex droop for fracture.

Recommendation: **(a)** — motion is the most immediately legible and the §6 motion
spec already reserves jitter for turbulence, so this is an extension, not a new axis.

### 2. Persistence — how long the current state has held

Data: `_pool.get(domain)` timestamps. A helper compares the domain's polarity/level
across a short vs. long window (e.g. 30 min vs. 6 h) → a `heldFor` bucket
(`fresh` | `hours` | `all-session`).

Treatment: **the base ring.** This is the grey footprint that currently encodes
nothing (and by the standard must bind to a real axis or be cut). Bind it:
ring **completeness or radius ∝ how long the domain has held this state.**
A full, wide ring = "been like this a while." A thin arc = "just started."
One mark, one meaning, glanceable.

### 3. Co-movement — contagion

Data: new small computation — each domain's magnitude-delta *direction* over the
window; domains whose deltas agree in sign and timing above a threshold are
co-moving. (`correlationListener.js` is card-based, not this — new logic required.)

Treatment options:
- **a. Tether** — a faint ground-level line between co-moving cones. Drawn **only**
  when co-movement is real; never speculative.
- **b. Shared ground tint** — co-moving cones sit on a common faint shaded patch.

Recommendation: **(a)**, capped at the strongest 1–2 links, so the field never
becomes a web.

---

## NON-GOALS

- No new color. §6 palette and §5 amber ban are absolute.
- No change to cone **height** (magnitude) or the **convergence-state color**.
- Not the INVESTIGATE state — this is the SEE / default field a guest lands on.
- Not the terrain mesh (standing "terrain permanent" ruling — separate).
- No predictive projection (the forecast trajectory stays as-is or out of scope here).
- Not a legend. If a mark needs one, it failed the bar and doesn't ship.

---

## COMPONENTS

| file | change |
|---|---|
| `src/engine/domaingravity.js` (or a new `src/engine/domainpersistence.js`) | `getDomainPersistence(domain) → { heldFor: 'fresh'\|'hours'\|'all-session', sinceMs }` — pure, windowed, reads `_pool` timestamps. |
| `src/engine/domainco-movement.js` (new) | `getCoMovement(windowMs) → Array<[domainA, domainB, strength]>` — magnitude-delta sign+timing agreement; thresholded; returns [] when nothing co-moves. |
| `src/components/spine/conemap.jsx` | Cone: apply the polarity → motion treatment (option 1a). `Footprint`/base ring: drive completeness/radius from `getDomainPersistence` (option 2). ConeScene: render co-movement tethers (option 3a) from `getCoMovement`. |
| `qa_conefield_read.mjs` (new) | proves the three derivations. |

---

## VALIDATION

`qa_conefield_read.mjs` (pure derivations):
- Seed a domain with fracture-polarity signals → `polarity: 'fracture'`; a
  constructive domain → `'constructive'`.
- Seed a domain with signals spanning 6 h → `heldFor: 'all-session'`; signals only
  in the last 20 min → `'fresh'`.
- Seed two domains dropping together → `getCoMovement` returns that pair;
  seed uncorrelated domains → `[]`.

In-field (manual / e2e, against the target read):
- A field with CAPITAL fracturing hard, TECHNOLOGY + LABOR fracturing mildly,
  sustained → a viewer with no legend can state "capital's down worst, tech and
  labor too but less, been going a while." Confirm with 2–3 people cold.
- Constructive-only field → no jitter, complete rings only where persistence is
  real, no tethers.
- `vite build --mode development` clean; existing ConeMap behavior (height, color,
  click, INVESTIGATE) unchanged.

---

## ROLLBACK

Each encoding is its own commit (polarity-motion / persistence-ring /
co-movement-tether). `git revert` any one independently; the field falls back to
height + color only.

---

## GUIDELINES

- **3-second bar is the gate.** If a treatment needs study or a legend, pick a
  different one or drop the encoding.
- **No new hue, ever.** Direction rides motion or form, not color.
- **Real or absent.** A persistence ring or a co-movement tether appears only when
  the underlying variable is measured. Never drawn speculatively (§1).
- **One mark, one meaning.** The base ring encodes persistence and nothing else.
- **Orthogonal.** Height = magnitude, color = convergence state, motion = polarity,
  ring = persistence, tether = co-movement. No two marks carry the same variable.

---

## MATHEMATICAL HARDENING — the validation contract

### Governing calibration rule

> **Defined → measurable → calibrated → eligible for guest semantics.**
> An uncalibrated threshold may participate in development/testing but MUST NOT
> drive a guest-facing encoding. A channel whose θ is uncalibrated renders in its
> null state (no jitter / no ring / no tether), not a guessed one.

### Formal encodings (all pure, windowed, deterministic given the domain-pressure pool)

```
DIRECTION  (existing axis extended)
  polarity(d) ∈ { constructive, fracture }          ← from computeDomainPressure(d)
  jitter_amplitude(d) = σ_turb   if polarity(d) = fracture
                      = 0        if polarity(d) = constructive
  (σ_turb reuses the §6 TURBULENT motion amplitude — no new value)

PERSISTENCE
  W_short, W_long : fixed observation windows
  heldFor(d) = all-session   if the domain's polarity+level is stable across W_long
             = hours         if stable across W_short but not W_long
             = fresh         otherwise
  ring_completeness(d) ∝ heldFor(d)          (fresh → arc, all-session → full ring)

CO-MOVEMENT
  δ_d(t) = sign of the domain's magnitude delta at step t
  co(d_i, d_j) = 1  iff  sign_agreement(δ_i, δ_j) > θ_co  ∧  |lag(δ_i, δ_j)| < τ_max
               = 0  otherwise
  tethers drawn only for pairs with co = 1, capped at the top-k by agreement strength, k ≤ 2
  (15 pairs over 6 domains → hard cap prevents a web)
```

### Orthogonality invariant (formal)

Height = magnitude · Color = convergence state · Motion = polarity ·
Ring = persistence · Tether = co-movement. No two visual channels carry the same
variable (§18). A QA check asserts each channel's input is disjoint from the others'.

### Threshold register

| θ | meaning | derivation | status |
|---|---|---|---|
| `σ_turb` | fracture jitter amplitude | reused from §6 TURBULENT motion spec | **CALIBRATED** (inherited) |
| `W_short`, `W_long` | persistence windows | observation policy (TBD) | **UNCALIBRATED** |
| `θ_co` | sign-agreement floor for co-movement | — | **UNCALIBRATED** |
| `τ_max` | max lag for co-movement | — | **UNCALIBRATED** |
| `k` | max tethers rendered | product constraint: `k ≤ 2` | **CALIBRATED** (bounded) |

**Starting state:** direction (polarity → jitter) is calibrated and ships. Persistence
ring and co-movement tethers hold their null state until `W_*` / `θ_co` / `τ_max` carry
a documented basis.


---

## Cross-cutting principles

This ticket is part of the Formation Guest Model — see `specs/SPEC-CROSSCUTTING-formation-guest-model.md`.

- **Provenance Boundary** — KRYLO shows where the evidence supports the read and where it stops.
- **Trusted Read → Early Action** — the read must be groundable enough that the guest decides whether to act; KRYLO never tells them to.
- **Layered, not dumbed down** — the guest view provides the read; inspection provides the reasoning. Three seconds means compressed evidence, not less intelligence.
