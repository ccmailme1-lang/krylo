# KRYL-974 (WO-969 label) — EntityStateLedger MVP Spec
## STATUS: SPEC ONLY. Interface boundary lock — no implementation in this pass.

Per Founder directive 2026-07-03: this is a substrate decision, not an implementation task.
The unresolved constraint this spec exists to close: how time-indexed state interacts with
SCI/RBCS/convergence without silently duplicating or destabilizing current scoring logic.
Jumping straight to implementation risks embedding a half-defined temporal model into
ingestion paths, bifurcating "current truth" vs "historical truth," and forcing premature
SCI/RBCS refactors before ledger semantics are specified. This spec exists to prevent that.

Numbering note: filed as KRYL-974 per the Jira-exclusive numbering decision
([[project_jira_exclusive_numbering]]) — "KRYL-969" in prior discussion was informal
shorthand for the Strategic Narrative Evolution Engine concept, not a reserved Jira number.

## 1. SINGLE RESPONSIBILITY
**Job:** Append-only, observational record of an entity's signal/metric state at a point in
time. Nothing else.
**Output:** a queryable sequence of past states per entity, sufficient to reconstruct
before/after windows and detect drift — not a scoring system, not a replay engine.

## 2. THE ARCHITECTURAL FORK THIS SPEC LOCKS

KRYLO today is a **static state system**: current snapshot per entity, signals overwrite or
decay, inference is present-only. This spec defines the MVP layer of a **time-indexed entity
state machine** without committing KRYLO to temporalizing every downstream metric yet.

**What this spec does NOT decide:** whether SCI(t), RBCS(t), or trajectory-based convergence
ever get built. Those are separate, later decisions, gated on this ledger existing and being
observed for a while first. This spec is the substrate, not the commitment to use it everywhere.

## 3. ENTITYSTATELEDGER SCHEMA (LOCKED)

```
EntityStateLedgerEntry {
  entity_id:          string    — canonical entity identifier (matches existing entity/domain IDs)
  timestamp:          string    — strict ISO-8601, UTC, with ordering guarantee (see §5)
  signal_snapshot:     object   — compressed, NOT raw. Post-normalization representation
                                  (see §4 for exact capture point)
  metric_snapshot:     object   — OBSERVED OUTPUTS only: { sci, convergence, divergence,
                                  momentum, ...whatever WO-2005B/structuralconfirmation.js
                                  produced for this entity at this timestamp }. Never
                                  recomputed by the ledger — copied verbatim from whatever
                                  the scoring engines already emitted.
  source_hash:         string   — provenance anchor; hash of the input evidence/signal set
                                  that produced this snapshot, for audit/reproducibility
  event_trigger_id:    string | null — optional; the CanonicalEvent (WO-2004) or ingestion
                                  event that caused this snapshot to be written, if any.
                                  Reserved for later causal stitching — NOT used by the MVP.
}
```

**Compression note:** "compressed, not raw" means the signal_snapshot stores the same
normalized 0–100 scale representation (§16) already flowing through the pipeline, not the
original unnormalized source payloads. This is a size/storage decision, not a semantic one —
no new normalization logic is introduced by this ledger.

## 4. INGESTION HOOK BOUNDARY — LOCKED (per explicit instruction: pick one, no ambiguity)

**Capture point: POST-NORMALIZATION, POST-SCORING.**

Concretely, in the existing locked execution sequence
(`specs/WO-2063-2067-execution-ordering.md`): a ledger write happens at the END of Phase 3
(Adaptation) — after a Domain Package's output has been normalized and mapped to Decision
Invariants, AND after `structuralconfirmation.js`'s `computeStructuralSuite()` has run and
produced SCI/divergence/momentum for that entity — but BEFORE Phase 4 (cross-domain
Composition), since the ledger is per-entity, not cross-domain.

**Why this point and not earlier:** the schema's own `metric_snapshot` field is defined as
"observed outputs" (SCI, convergence, etc.) — those values don't exist until scoring has run.
Capturing pre-normalization or pre-scoring would mean the ledger either stores raw payloads
(violates "compressed, not raw") or stores nothing in `metric_snapshot` (violates the schema).
Post-scoring is the only point where both `signal_snapshot` and `metric_snapshot` are
simultaneously available and true to what the schema requires.

**Why not post-Composition (Phase 4):** Composition output is inherently cross-domain and
comparative (Decision/Epistemic/Constraint-Alignment vectors, per WO-2074). The ledger is
scoped to single-entity state history — composition-stage data belongs to a different,
not-yet-specified cross-entity ledger concept, out of scope here.

## 5. WRITE RULES (NON-NEGOTIABLE)

- **Append-only.** No entry is ever mutated after being written.
- **No retroactive mutation.** A later-discovered correction gets a NEW entry with a new
  timestamp, never edits to an old one.
- **No cross-time aggregation inside the ledger layer.** The ledger stores individual
  snapshots only. Any trend/delta/drift computation is a SEPARATE, later-built consumer
  reading the ledger — never logic embedded in the write path.
- **Ledger is observational, not computational.** It records what scoring engines already
  produced. It never derives, adjusts, or recomputes a value.
- **Ordering guarantee:** timestamps must be monotonically non-decreasing per `entity_id`
  at write time (the ledger rejects/flags an out-of-order write rather than silently
  reordering — exact rejection behavior is an implementation detail for the build pass,
  not decided here).

## 6. RELATIONSHIP CONTRACT (LOCKED — prevents premature entanglement)

- **SCI/RBCS/convergence remain current-state evaluators.** Nothing about their computation
  changes. They do not read from the ledger. They do not know it exists.
- **KRYL-974/EntityStateLedger is a state-history substrate**, populated by reading
  (read-only) the outputs those evaluators already produce, at the boundary defined in §4.
- **No coupling beyond read-only snapshot emission.** The ledger has exactly one
  relationship to the rest of KRYLO: it observes and records. It does not feed back into,
  gate, or influence any existing scoring path. That remains true until (and unless) a
  separate, future decision explicitly changes it.

## 7. WHAT THIS SPEC EXPLICITLY EXCLUDES

- No code changes to SCI, RBCS, or any existing scoring engine.
- No "integration" of the ledger into any live pipeline yet.
- No backfilling of historical data / no logic for reconstructing pre-ledger history.
- No replay engine design.
- No decision on SCI(t)/RBCS(t)/trajectory-based convergence — those are separate, later,
  bigger decisions this spec deliberately does not make.
- No decision on retention/compaction policy beyond "append-only, periodic compaction
  optional" — exact compaction strategy is a build-time decision, not a spec-time one.

## 8. BOTTLE TEST

| Question | Answer |
|---|---|
| Does this reduce ambiguity in the system? | YES — locks the one open boundary question (capture point) explicitly |
| Does this have a single dominant output? | YES — a queryable append-only entity state sequence |
| Are all boundaries explicitly defined? | YES — §4 capture point, §5 write rules, §6 relationship contract all locked |
| Can this be built without touching an undefined dependency? | YES — reads existing, already-built outputs (structuralconfirmation.js, decisioninvariants.js); no new upstream dependency |
| Does this avoid increasing expressive flexibility in the core? | YES — purely observational; SCI/RBCS/convergence computation is completely unchanged |

**Verdict:** PASS

## 9. FOUR-AXIS HARDENING RUBRIC

- **Structural Integrity:** preserves all existing invariants — ledger is read-only w.r.t.
  every existing engine, no runtime contract changes anywhere else.
- **Semantic Consistency:** terminology (entity_id, snapshot, provenance/source_hash)
  aligns with existing identitykernel.js/structuralconfirmation.js vocabulary — no
  duplicate constructs invented.
- **Execution Containment:** fully declarative in this pass (spec only); when built, side
  effects are bounded to the ledger's own write path, no cross-module mutation.
- **Drift Exposure:** the §4/§5/§6 locks exist specifically to prevent this spec's own
  ambiguity — capture point, write rules, and relationship contract are all fixed, not
  living definitions.

**Outcome tag:** PASS

## 10. DEFINITION OF DONE (for this spec-only pass)

This ticket (KRYL-974) is Done when: this file exists, is committed, and is linked from
CLAUDE.md/memory as the locked reference for any future EntityStateLedger implementation
work. No code is written or verified in this pass — there is nothing to grep for yet.

## NEXT STEP (separate, future decision — not started here)

If/when implementation is greenlit: turn §3-§6 into a minimal ingestion patch, verified to
not touch or alter SCI/RBCS/convergence computation at all — a pure read-only tap at the
Phase 3 boundary already defined in §4.
