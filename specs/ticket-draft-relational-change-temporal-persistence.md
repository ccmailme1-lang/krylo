# Ticket Draft — Relational Change / Temporal Persistence Layer

**Summary:** Build persistence + diff capability for Relational Change (Formation snapshots over
time) — prerequisite for MAP's Time × Relational Change axis

**Issue Type:** Task
**Labels:** needs-spec

## Description (6-field Ticket Definition Requirement, CLAUDE.md §10)

**1. Original intent:** KRYLO's Formation engine can only show current, live structural state —
it cannot answer whether an established relationship is forming, strengthening, weakening,
dissolving, or being reconfigured. This ticket builds the minimum real capability to answer that:
a persistence layer that snapshots real Formation state over time, and a diff function that
classifies genuine change between two comparable snapshots. Full spec:
specs/SPEC-relational-change-temporal-axis.md.

**2. Acceptance criteria:** Per the spec's VALIDATION section — a snapshot taken, then a second
snapshot taken after a real relationship change occurs, correctly classifies that change (new /
strengthening / weakening / dissolved / reconfigured); no relationship is ever reported as changed
when the underlying admitted edges are identical between snapshots; diffs only occur between
snapshots of identical subject + field + formation scope; observation_count delta alone never
produces a Relational Change classification; when two comparable persisted states don't exist, the
result stays unresolved/absent, never inferred.

**3. Current implementation state:** NOT STARTED. `formationinference.js`'s `temporal` field is
`{maturity:null, direction:null, trajectory:null, velocity:null}` by explicit design (§22 TEMPORAL
absence) — confirmed empirically 2026-09-29. The live signal pool (`domaingravity.js`) is a
5-minute rolling window, pruned at 10 minutes — no historical state exists anywhere in the running
system today. Backend blocker cleared 2026-09-29: self-hosted PostgreSQL 16 on the production VPS,
`krylo-api` connected, WO-1334 migration confirmed clean in production logs. All four policy items
(backend, sampling, retention, granularity) are Founder-ruled and LOCKED per the spec's GUIDELINES.
No implementation code written yet — the next step is implementation planning against those four
ruled items, not code.

**4. Dependencies:** None on other open tickets. Reuses `inferFormation()`'s existing admission
logic (no changes to it). Does not depend on and does not touch the live 5-minute pool.

**5. Supersession check:** Checked against KRYL-1220 (subject-binding for MAP) — unrelated, no
overlap; KRYL-1220 has no persistence or temporal component. No other open ticket found covering
this capability as of 2026-09-29.

**6. Product-model fit:** Directly serves KRYLO's canonical mission (§15: "finding advantageous
positions before they become obvious" — detecting a shift, not reporting a snapshot) and the
governing evidence chain (EVIDENCE → OBSERVATION → RELATIONSHIP → RELATIONAL CHANGE → FORMATION)
already ratified this session. This is the single largest identified gap against that chain.

## Policy — ruled by the Founder 2026-09-29 (see spec GUIDELINES, LOCKED):
1. Persistence backend — self-hosted PostgreSQL 16 on the production VPS. Confirmed operational.
2. Sampling policy — hybrid (clock-driven baseline + material-change capture).
3. Retention horizon — 90 days.
4. Comparison granularity — exact match on subject + field scope + formation scope.

No implementation code written yet. Next step is implementation planning against the four ruled
items above, not code — implementation itself requires a separate explicit go. The MAP's
Observation Count × Relationship Connectivity axes (built 2026-09-28/29) remain halted — not
pushed to production — until this capability lands.
