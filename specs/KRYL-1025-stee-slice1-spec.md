# KRYL-1025 — STEE Slice 1: Projection + Topology Recomposition + Pareto Frontier
## Hardened per §11a — Bottle Test v1.0

---

## HEADER

**KRYL-1025 — STEE (Search Truth Evaluation Engine), Slice 1**
Date: 2026-07-11
Author: qualified draft (Founder to ratify), grounded to real shapes
Target file(s): `src/engine/steeengine.js` (NEW — engine only)

Slice scope: **STEE-AM-01** (immutable TruthGraphProjection) + **STEE-AM-04** (validated topology recomposition) + **STEE-AM-05** (Pareto admission). Deferred to later slices: AM-03 anchor attenuation (needs λ calibration), AM-02 policy tier-limits (needs governance table), ledger persistence.

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Given one CanonicalEvent's validated evidence graph, expose the Pareto frontier of structurally valid sub-topologies that explain it — without touching the truth graph.

**Output:** One Pareto candidate frontier — `{ frontier, dominated, projectionHash, isolationVerified }`.

---

## 2. BOUNDARY DECLARATION

**Input contract:** a CanonicalEvent (or projection-shaped object): `{ nodes: Map|iterable, edges: [{from,type,to}], rootSeeds?: string[] }`. Runtime source: `rkmstore.listAll()` (read-only) or an event passed in.

**Output contract:** `{ frontier: Candidate[], dominated: {candidateId, dominatedBy}[], projectionHash, isolationVerified: bool }`, where `Candidate = { id, edges (⊆ projection.edges), objectives: {coverage, parsimony} }`. Frontier order carries NO ranking meaning (§ mirrors paretoresolver).

**Explicit exclusions:** does NOT create nodes/edges (no invented relationships). Does NOT resolve identity (`identitykernel`/ERK owns). Does NOT evaluate evidence quality (STEE consumes it, does not compute SCI). Does NOT recommend or arbitrate (LEV-02 owns). Does NOT mutate the CanonicalEvent (projection is read-only). Does NOT ingest.

Per the STSE↔STEE contract: STEE evaluates truth-integrity structure; it never models the search environment (STSE) nor issues recommendations (LEV-02).

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Inference layer touched → result does NOT write back to the truth graph — projection is read-only; input CanonicalEvent returned unmutated (hash before == after).
- [x] Scoring layer touched → output is NOT a recommendation — a Pareto frontier of valid topologies, no scalar "best", no action.

**Drift notes:** `candidate.edges ⊆ projection.edges` is enforced per candidate — no edge is ever invented. STEE mutates only its own candidate orderings (overlay), never truth objects.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** It exposes the *frontier of structurally valid explanations* for an event rather than collapsing to one — surfacing overlooked but supported structural routes ("expose, don't pick"), which is where non-obvious advantage hides.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a Pareto frontier of validated sub-topologies that explain a CanonicalEvent."**

---

## 6. FORMULA / CONTRACT

**Projection (AM-01):** `P = { nodes (frozen refs), edges (frozen), hash = computeVersionHash(nodes, edges) }`. `identitykernel.computeVersionHash` already exists. STEE-owned mutable = candidate edge-subset orderings only.

**Candidate generation (AM-04):** enumerate a bounded set of edge subsets `c.edges ⊆ P.edges` that preserve reachability from `rootSeeds`. Slice 1 generator: the full set + each leave-one-redundant-edge-out variant that keeps coverage == 1. **No new edges; no reversed edge unless its reverse already exists in P and is validated.**

**Objectives per candidate (≥2 orthogonal, real, ∈[0,1]):**
```
coverage(c)  = |reachable(rootSeeds, c.edges)| / |P.nodes|      (how much of the event the topology explains)
parsimony(c) = 1 − |c.edges| / |P.edges|                        (structural economy — fewer edges, more parsimonious)
```
Orthogonal: coverage measures completeness, parsimony measures economy; neither is a function of the other.

**Pareto admission (AM-05):** admit `c` to the frontier iff no other candidate dominates it on `{coverage, parsimony}`, via the existing `dominatesVector` primitive (`paretoresolver.js`). No scalar acceptance — `coherence > baseline` is forbidden.

Units: objectives 0–1. `projectionHash`: BLAKE-style version string from `computeVersionHash`.
Normalization: objectives already 0–1; not a §16 signal-scale output (this is structural, not a pressure signal).

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/steeengine.js` (NEW) | `exploreTopology(event)` → frontier; projection, recomposition, Pareto, isolation check | — |
| `src/engine/identitykernel.js` | REUSE `computeVersionHash` (read-only) | its computation |
| `src/engine/paretoresolver.js` | REUSE `dominatesVector` primitive (read-only) | `resolveParetoCrossDomain` (domain-specific, not used) |
| `src/engine/rkmstore.js` | REUSE `listAll` as runtime event source (read-only) | its computation |

Note: `identitykernel`'s reachability/branching helpers are internal (not exported). Slice 1 computes `coverage` (BFS reachability) inside STEE — small, self-contained. If a later slice needs them shared, export from `identitykernel` then.

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — one bounded, deterministic frontier per event |
| Does this have a single dominant output? | YES — the Pareto candidate frontier |
| Are all boundaries explicitly defined? | YES — read-only projection, no invented edges, no recommendation |
| Can this be built without touching an undefined dependency? | YES — event shape, `computeVersionHash`, `dominatesVector`, `listAll` all verified |
| Does this avoid increasing expressive flexibility in the core? | YES — read-only, subset-only recomposition, transparent objectives |

**Verdict:** PASS

---

## 9. FOUR-AXIS HARDENING RUBRIC (4AR)

**SI:** Read-only over the truth graph; preserves invariants; isolation asserted by hash equality.
**SC:** Terminology (projection, recomposition, frontier, coverage, parsimony) aligns with the STEE.md doctrine + reconciliation; reuses `computeVersionHash`/`dominatesVector` rather than re-deriving.
**EC:** Pure function; side-effect-free; no cross-module mutation.
**DE:** Objectives + generator are static; no living definition. Candidate generator is bounded (deterministic).

**Outcome tag:** CONSTRAINED — PASS with a downstream note: the slice-1 candidate generator is intentionally minimal (full + leave-one-out); richer recomposition (multiple valid spanning topologies) is a later slice, not a redefinition.

---

## 10. DEFINITION OF DONE

**Verification:**
1. `grep -n "export function exploreTopology" src/engine/steeengine.js` returns the export.
2. Every candidate satisfies `c.edges ⊆ projection.edges` (no invented edge) — asserted.
3. Isolation: `computeVersionHash` of the input event's nodes/edges is identical before and after `exploreTopology` (input unmutated).
4. The returned `frontier` is Pareto-valid: no frontier member is dominated by another; every `dominated` entry is dominated by a named candidate.
5. No scalar "best" field is emitted — frontier only.

Memory + Jira (KRYL-1025) updated only after 1–5 pass.

---

## NOTES

- Deferred slices: AM-03 anchor attenuation (λ), AM-02 policy tier-limits (governance table), Exploration Ledger persistence (`ses_snapshot_id` + `environment_state` per the reconciliation contract).
- STSE acronym flag stands: contract STSE = the SES State Engine (`searchenvironmentstate.js`), NOT KRYL-1002's Monte-Carlo STSE. Naming reconciliation is a separate Founder decision, not part of this build.
