# SPEC — Relational Change / Temporal Persistence Layer

**Status:** LOCKED. Backend, sampling, retention, and granularity ruled by the Founder 2026-09-29
(see GUIDELINES). Backend capability confirmed operational 2026-09-29 — self-hosted PostgreSQL 16
on the production VPS, `krylo-api` connected, WO-1334 migration ran clean (`[WO-1334] migration
complete`). Implementation NOT STARTED — this ticket still needs the implementation planning step
against the locked persistence policy before any code is written. Supersedes no existing ticket —
checked against KRYL-1220 (subject-binding for MAP, unrelated: no persistence, no temporal state)
on 2026-09-29. Filed as KRYL-1334.

---

### PROBLEM

KRYLO's MAP visualization (and the underlying Formation engine generally) can only ever show the
**current, live state** of structural relationships. It cannot determine whether an established
structural relationship is forming, strengthening, weakening, dissolving, or being reconfigured.

This is not a missing computation. It is a missing **data retention** capability.
`domaingravity.js`'s live signal pool is a 5-minute rolling window (`DEFAULT_WINDOW_MS = 300_000`),
pruned at 10 minutes. No historical Formation / relationship state is retained past that window.
Relational Change is therefore not merely unbuilt — the raw material required to reconstruct it
(what the structure looked like at prior points in time) does not exist in the running system.

Confirmed empirically, 2026-09-29: `formationinference.js`'s temporal field is
`{ maturity: null, direction: null, trajectory: null, velocity: null }`
by explicit design (§22 TEMPORAL absence). This is an honest absence, correctly not papered over,
but currently permanent because nothing upstream ever supplies real values.

---

### SOLUTION

Two-part build, in strict order:

**Part 1 — Persistence**
A new, durable store (separate from the live 5-minute pool, which serves a different, legitimate
purpose — real-time freshness — and must not be repurposed) that captures real Formation state:
which relationships were admitted, for which subject / field / formation scope, at what real
timestamp.

**Part 2 — Relational Change computation**
A pure diff function over two persisted states. It reuses the existing `inferFormation()`
admission logic (no new admission rule) to classify each relationship's state change between the
two points:

- **New** — an edge appears where none existed
- **Strengthening** — an existing relationship becomes more strongly supported (more / stronger
  evidence)
- **Weakening** — support for an existing relationship decreases
- **Dissolution** — an established relationship is no longer established
- **Reconfiguration** — a formation's composition changes without a single clean new / dissolved
  edge

**Explicitly not the measure** (locked by prior ruling, 2026-09-29):
`observation_count(t2) - observation_count(t1)` is signal-volume change, not relational change,
and must never be used as a proxy. No synthetic "change score" may be invented from unrelated
metrics. No temporal state may be presented that is not derived from two real, persisted,
comparable Formation states.

**Architectural invariant (non-negotiable):**
Persistence captures state; it does not manufacture state. Relational Change may only be computed
where two comparable persisted Formation states exist. If historical coverage is insufficient, the
resulting state must remain unresolved / absent rather than inferred from current observations.

Once Part 1 + Part 2 exist, the MAP's spatial axes become a legitimate next step: **X = Time,
Y = Relational Change** (per the ratified spatial model), with Observation Count and Relationship
Connectivity (built 2026-09-28/29, already shipped to localhost) demoted to supporting
node-weighting properties (radius / opacity) rather than the primary spatial axes. That axis
change is a separate follow-on ticket; this ticket covers only the persistence + diff capability.

---

### COMPONENTS

| File / Artifact | Change |
|---|---|
| Existing VPS-configured database (`DATABASE_URL`, confirmed present 2026-09-29; no local DB service on the VPS itself, so externally hosted; schema/capability not yet confirmed) | New table(s)/collection for Formation state captures: subject / field / formation scope, admitted edges, real timestamp |
| New: `src/engine/relationalchange.js` (name TBD) | Diff function: two comparable states in → classified change list out; reuses `inferFormation()` admission semantics |
| `src/engine/formationinference.js` | Temporal field receives real values once Part 1 / 2 exist — **no change** to admission logic itself |
| `public/structure-field.html` | MAP axis change (Time × Relational Change) — **out of scope** for this ticket; separate follow-on |

---

### VALIDATION

- A persisted state taken, then a second comparable state captured after a real relationship
  change occurs in the live pool, correctly classifies that change (new / strengthening /
  weakening / dissolved / reconfigured) when diffed.
- No relationship is ever reported as changed when the underlying admitted edges are identical
  between the two states (false-positive guard).
- Diffs are performed only between states of identical subject + field + formation scope.
  Cross-scope comparison is forbidden.
- `observation_count` delta alone never produces a Relational Change classification.
- When two comparable persisted states do not exist, the result remains unresolved / absent; no
  inference from current live observations is permitted.

---

### ROLLBACK

Additive only. A new table/collection and a new diff function. Zero changes to `inferFormation()`
admission logic, zero changes to the live 5-minute pool. Removing the new store / function returns
the system to its current, already-shipped state with no data loss to anything else.

---

### GUIDELINES — Founder ruling, 2026-09-29 (LOCKED)

1. **Persistence backend:** self-hosted PostgreSQL 16 on the production VPS (moved off Supabase
   2026-09-29 after its hosted project stopped resolving in production — see `as-diff/db.js`
   header). **Confirmed operational** 2026-09-29: `krylo-api` connects over localhost,
   `[WO-1334] migration complete` observed in production logs on the current run. No second store —
   this is the one persistence backend for Relational Change.
2. **Sampling policy:** **hybrid** — baseline clock-driven sampling plus capture whenever a
   materially different Formation state is detected. KRYLO preserves structural states because the
   structure exists or changes, not merely because the clock struck midnight. The exact clock
   interval and the definition of "material change" are determined during implementation
   planning, grounded in existing Formation behavior — not invented ahead of time.
3. **Retention horizon:** 90 days as the initial operating horizon — long enough to expose
   week-to-quarter structural evolution without prematurely committing to indefinite storage.
4. **Comparison granularity:** exact match on subject + field scope + formation scope, identified
   by real timestamp. No cross-scope comparisons, ever.

Per Ticket Definition Requirement (CLAUDE.md §10): all four items are ruled and backend capability
is confirmed. Implementation planning against these four items is the next concrete action —
implementation code itself is not authorized until that planning step is done and reviewed.

**The current static X/Y reassignment on MAP (Observation Count × Relationship Connectivity)
remains halted — not pushed to production — until this capability lands.**
