# CF Kill Experiment — RESULT

Run: `node qa_cf_kill_experiment.mjs` (KRYL-1248). Harness invariants: **all hold** (exit 0).
Verdicts below are at `COST_BUDGET_RATIO = 4` (PROPOSED — see §Founder rulings).

## Table (verbatim)

```
class                     V_B   V_CF       ΔV   cmpB  cmpCF       ΔC  FP_B  FP_CF   wallΔ%   verdict
────────────────────────────────────────────────────────────────────────────────────────────────────────────────
single-shot             0.714  0.714    0.000      4      7    0.250     0      0      ~      KILL   [ΔV ≤ ΔC]
multi-event             0.000  1.000    1.000      7     15    0.381     0      0      ~      RETAIN
formation-revision      0.500  0.933    0.433      7     16    0.429     0      0      ~      RETAIN
frontier-resolution     0.357  0.714    0.357      6     23    0.944     0      0      ~      KILL   [ΔV ≤ ΔC]
frontier-inaccessible   0.714  0.714    0.000      6     12    0.333     0      0      ~      KILL   [ΔV ≤ ΔC]

  single-shot            recall B/CF 1.00/1.00  reuse_CF 0.00  ttr_CF n/a  released —
  multi-event            recall B/CF 0.00/1.00  reuse_CF 1.00  ttr_CF n/a  released —
  formation-revision     recall B/CF 1.00/1.00  reuse_CF 0.67  ttr_CF 0    released —
  frontier-resolution    recall B/CF 0.50/1.00  reuse_CF 0.00  ttr_CF n/a  released MEDIA
  frontier-inaccessible  recall B/CF 1.00/1.00  reuse_CF 0.00  ttr_CF n/a  released —
```

Sensitivity — verdict vs the compute↔value exchange rate:

```
class                       2×      4×      8×     16×
single-shot               KILL    KILL    KILL    KILL
multi-event               KILL  RETAIN  RETAIN  RETAIN
formation-revision        KILL  RETAIN  RETAIN  RETAIN
frontier-resolution       KILL    KILL    KILL  RETAIN
frontier-inaccessible     KILL    KILL    KILL    KILL
```

(`wallΔ%` is µs-scale with no real connector I/O — informational only, excluded from ΔC.
Production latency must be re-measured against real connector I/O before a production verdict.)

## Per-class verdict

| Class | Verdict | Why |
|---|---|---|
| **single-shot** | **KILL** (every ratio) | No continuity to exploit. `Recall_B = Recall_CF = 1`, `ΔV = 0`, CF adds ingest + pathway scan for nothing. Expected negative — the discriminator fires. Out of scope for the Fabric (H5). |
| **multi-event** | **RETAIN** (≥ 4×) | The decisive positive (CF §31 regime). The staggered OWNERSHIP → MEDIA → CAPITAL formation: each event ages out of the window before the next arrives, so **B never forms it** (`V_B = 0`). CF's persistent pathway state (`ν_t`) recovers the full CAPITAL·MEDIA·OWNERSHIP triangle — `reuse = 1.0`, `ΔV = 1.0`. Wins decisively even at a tight 4× compute budget. This is the drawn example. |
| **formation-revision** | **RETAIN** (≥ 4×) | A fracture-polarity OWNERSHIP observation lands after the formation forms. CF reflects the polarity flip **in the same batch** (`ttr = 0`); B holds no persistent record to revise. `ΔV = 0.43`. |
| **frontier-resolution** | **KILL** until 16× | CF *does* recover the MEDIA continuation B never seeks (`recall 0.5 → 1.0`, decoy KNOWLEDGE correctly never released, `FP_CF = 0`). But the stub remote-capability release (`RELEASE_COST` + re-infers) is expensive relative to the modest `ΔV = 0.36`. **Unresolved, not a clean kill** — the value is real; the modeled cost and the structural weight of a resolved frontier are PROPOSED constants. |
| **frontier-inaccessible** | **KILL** (every ratio) | True continuation out of reach. CF correctly recognizes the boundary — no release, `FP_CF = 0`, no hallucination (CF §31 Case 3B satisfied) — but gains nothing over B. Out of scope. |

## Bottom line

- The Fabric proposition **holds for the multi-event / staggered cross-domain formation
  class** — the exact case the design sketch depicted — decisively, even under a tight
  compute budget.
- It **holds for formation-revision** at a moderate budget.
- It is **correctly killed for single-shot and unreachable-frontier** at every budget.
- **frontier-resolution is unresolved**: real structural value (recovers a missed
  continuation, no false positives) but the modeled retrieval cost is high.

This satisfies CF §33 as far as it can be satisfied without Founder rulings: the mechanism
is **not merely an alternate implementation** (§33.8) — B scores `V = 0` where CF scores
`V = 1` on multi-event, which no reshaping of existing lineage produces. It preserves
provenance (§33.5 — every admitted formation reconstructable). It does not manufacture
continuation (§33.4 / §31 Case 1 — `FP_CF = 0` everywhere, decoys never released).

## Founder rulings required before a production verdict

1. **`COST_BUDGET_RATIO`** — the compute↔structural-value exchange rate. The single most
   consequential number in the verdict. At 2× nothing retains; at 4× the two continuity
   classes retain; at 16× frontier-resolution retains too.
2. **`RELEASE_COST` / frontier structural weight** — is a resolved frontier worth more
   structural value than the flat recall leg gives it? The stub charges 5 compute units
   per release; frontier-resolution's verdict is entirely downstream of that.
3. **`ν_t` update rule** — additive-with-decay (`λ = 0.15`) as implemented, vs multiplicative
   corroboration (spec §7).
4. **Retention threshold** — does one RETAIN class (multi-event) authorize the CF IS-1..IS-6
   build, or is a set required (e.g. multi-event + formation-revision, or
   frontier-resolution specifically)?

## Scope / honesty notes

- Offline, synthetic fixtures. Real connector data will have noise, partial coverage, and
  fracture polarity mixed in — the multi-event advantage should be re-tested on a real
  staggered event (an actual acquisition → press release → filing sequence).
- Frontier detection here is a **stub** — the general RESOLVE-conflict producer
  (`observationaffordanceengine.deriveAffordancesFromResolve`) covers `RESOLVE_CONFLICT`
  only, not `FORMATION_BOUNDARY_UNCERTAINTY`. A real frontier detector for the boundary
  case is itself unbuilt.
- `ν_t` decay is slow at `λ = 0.15` (~10 batches to fade a strong pathway). A persistent
  *strong* decoy would be absorbed; only sub-threshold decoys were tested. An adversarial
  "persistent strong decoy" case should be added before RETAIN is acted on.
