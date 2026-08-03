# The Evolution — Built vs. Vision Reference

Purpose: a factual cross-reference for the IP attorney meeting. Every "this exists today" claim
in the Evolution Roadmap narrative should trace to a row here. Anything not in this table has
not been checked against the repo and should not be presented as built.

Checked against the live codebase 2026-08-03 (grep + direct file reads, not inference).

## Three-tier taxonomy (refined 2026-08-03)

Binary built/not-built loses the most useful signal for this meeting. Three tiers instead:

1. **Implemented** — exists in production code, can be demonstrated live.
2. **Architecturally decomposed** — a real, working enabling primitive exists (proven mechanism,
   proven contract), but the composed capability the roadmap names does not exist yet.
3. **Research / future vision** — the idea is defined in prose or doctrine, but no enabling
   mechanism or technical contract has been built or proven.

Doctrine-only specs (ratified boundaries, topology models) sit in tier 3, not tier 2 — a written
doctrine is not the same as a proven technical contract. Tier 2 requires working code.

## Reference table

| Roadmap component | Real KRYLO file(s) | Tier | Note |
|---|---|---|---|
| Truth Governance Layer (intelligence generation ≠ truth authorization) | `src/engine/cirgate.js` (CI-R, WO-2054) + `src/engine/cipipelinerun.js` (fix, 2026-08-03) | **1 — Implemented (corrected)** | See "2026-08-03 re-audit" section below. Originally marked Tier 1 in error — CI-R had zero live callers. Fixed additively same day; see that section for the current honest claim. |
| Cognitive Event Infrastructure ("CER"-inspired) | `src/engine/subsignalbuffer.js` (KRYL-1132) | **2 — Architecturally decomposed** | The composed capability (general cognitive-event capture/replay) doesn't exist. But the hard enabling problem — isolated, bounded, non-blocking event fan-out with subscribe/read semantics — is proven in production, just currently scoped to §16 signal tuples only, by explicit doctrine. Extending the same pattern to decision-gate events (CI-R/RBCS/Calibration) is a smaller lift than the roadmap implies, because the riskiest part is already solved. Resolves the earlier open "remind me about CER" item: no CER exists in KRYLO's own history — it's the mining thread's external Autodesk analogy, not internal. |
| Waypoint Architecture | — | **3 — Research / vision** | Zero hits in KRYLO's own code. The only "waypoint" string in the repo is inside an unrelated third-party demo project (`specs/palantir-for-family-trips-master/`), not KRYLO code. No enabling mechanism exists yet. |
| Neural Necklace (relationship memory) | `src/engine/entitytopologyregistry.js` (WO-1855) | **2 — Architecturally decomposed** | Real, shipped: a static v1 entity-relationship registry — 3 hardcoded topology clusters + `registerInventorMigrationEdge()` for additive migration edges. That's a genuine, working relationship-storage primitive. The composed capability (adaptive, decaying topology) doesn't exist. The decay mechanism it would need already has a proven template elsewhere (see below). |
| Distributed Cognitive Fabric | Cognitive Mesh doctrine chain (KRYL-1136/1137/1138) | **3 — Research / vision** | Ratified 2026-07 as doctrine — defined in prose, no technical contract or code. Correct per its own gate not to be built yet. If "Cognitive Fabric" in the roadmap narrative means this, say so explicitly in the meeting — don't let the name imply more exists than a ratified doctrine document. |
| Formation Discovery Engine — 4 sub-capabilities | see below | **SPLIT** | 3 of 4 sub-capabilities are Tier 1. See finding below — this is better than the roadmap assumes. |
| Institutional Intelligence / Adaptive Cognitive Organism | — | **3 — Research / vision** | No code, no doctrine, no technical contract. Fine to present as long-term — do not blend with tier-1/2 rows above. |

## Finding: Formation Discovery is not one future engine — it's 3 real engines waiting to be unified

The roadmap frames "emerging / missing / breaking / novel formations" as one Stage-5 engine to
be built later. That's not accurate — 3 of the 4 detection types already exist, shipped, as
separate engines:

| Formation type | Real engine | Tier |
|---|---|---|
| Emerging | Combination Formation System (Line/Triangle/Diamond) | 1 — Implemented |
| Missing | `src/engine/voidclassifier.js` (WO-1854, Structural Void Classifier) | 1 — Implemented — absence-is-signal, per-domain expected-class silence detection |
| Breaking | `src/engine/happypathdisplacementengine.js` (WO-1826) | 1 — Implemented — challenger-displacement with hysteresis |
| Novel (no historical precedent) | — | 3 — Research / vision |

**Why this matters for the meeting:** the honest framing is stronger than the aspirational one.
"We have three of four formation-detection primitives shipped independently; Stage 5 is a
unification pass over existing engines, not a from-scratch build" is a materially better answer
to "is this science fiction" than presenting all of Formation Discovery as future work.

**Caution on "novel = doesn't match the other three":** defining novelty by exclusion (no
topology-cluster match, no void, no displacement) is a promising *implementation hypothesis*,
not a validated definition — flagged correctly in review. If the existing topology taxonomy
(`entitytopologyregistry.js`'s 3 hardcoded clusters) is incomplete, exclusion-based novelty
produces false positives (calls something "novel" that's really just an uncatalogued known
pattern). Present it in the meeting as a candidate approach to prototype, not as settled
architecture.

## 2026-08-03 re-audit: the Platform Framework chain was orphaned, now partially fixed

Applying CLAUDE.md §25/§26 (lexical / concept / behavioral verification; Maturity × Verification
matrix) to the "COMPLETE"-labeled Platform Framework Sequence (WO-2052–2062) found the labels
were never earned under this standard — they predate it. Full trace, real import statements only
(not comments — caught two false-positive comment matches during this pass):

| Component | Maturity | Verification (before today) | Finding |
|---|---|---|---|
| CI-F `cifengine.js` (2053) | B | C | Real, imported by CI-R + RBCS, but both callers were themselves unreachable from the live app. |
| CI-R `cirgate.js` (2054) | B | L only | Real, correct, imports CI-F properly. **Zero callers anywhere** — the only other "cirgate" reference in the repo was a code comment in `identitykernel.js`, not an import. |
| RBCS `rbcsengine.js` (2055) | B | C | Imported by `calibrationengine.js`, itself orphaned (below). Orphaned transitively. |
| LFOS (2056), IB (2057), Decision (2059), Execution (2060) | B | L only | Zero importers each. Fully isolated files. |
| Feedback `feedbackengine.js` (2061) | B | C | `applyObservedOutcomes()` — the bridge function built earlier in this session — had zero callers anywhere. Defined, exported, never invoked. |
| Calibration `calibrationengine.js` (2062) | B | L only | Sole importer, `perceptionprofile.js`, itself had zero importers anywhere. |
| §21's cited precedent `availabilityfilter.js` | B | L only | Full chain traced: `availabilityfilter.js` ← `compositionvectors.js` ← `paretoresolver.js` ← `steeengine.js` ← nothing. Also fully orphaned. |
| `rkmaterializer.js` (2052) | A | R | Different story — genuinely live via `edgar8ksignal.js`, imported and called from `app.jsx` (`runEdgar8KSignalSync()`). |

**What this meant:** the roadmap's strongest claim — "intelligence generation separated from
truth authorization, already exercised in software" — was not true as a running-system property.
The code existed, correctly, but nothing called it. Same orphaning pattern found once before
this session with these same engines; the earlier "closed loop" framing in CLAUDE.md's Platform
Framework Architecture status was written before this verification standard existed and had
never been re-checked against it.

### The fix (additive, same day)

Traced the real gap precisely instead of assuming a redesign was needed: RKM (`rkmstore.js`) has
genuinely live data (`edgar8kconnector.js` calls `createObject()` on every real 8-K filing, and
`cifengine.expandCI()` reads that exact same store via `listAll()`). The only missing piece was
a call site. Built `src/engine/cipipelinerun.js`:

- `realityObjectToCI(obj)` — maps a real RealityObject to the CI input shape `expandCI()`
  expects. Every field traces to a property `edgar8kconnector.js` actually populates
  (`truthStability` → confidence, `metadata.source` → sourceType, `metadata.eventClass` →
  signalType, `metadata.canonicalName`/`ticker` → entityHints). No invented fields.
- `runCIPipeline(ci)` — runs `expandCI → validateGraph → scoreAdmitted`, records the result.
- `runCIPipelineOnRKM()` — runs it once per live RKM object.
- Wired into `app.jsx`'s existing EDGAR sync chain (both the on-mount call and the 5-minute
  interval), immediately after `runEdgar8KSignalSync()`/`runEdgar8KEvidenceSync()` — the same
  real, already-live call site those two use. No existing gate (`editorialgate.js`,
  `domainambiguitygate.js`, etc.) was touched — purely additive, per CLAUDE.md §4.

**Verified, not assumed:** ran a standalone harness creating a RealityObject shaped exactly like
`edgar8kconnector.js`'s real output, then called `runCIPipelineOnRKM()`. It executed without
error and produced a coherent result (1 branch admitted, score 0.0736 — correctly low, since a
single isolated seed with no surrounding causal chain should score low, not because of a bug).

**Current honest status:** CI-F/CI-R/RBCS chain — Maturity A, Verification B (behaviorally
verified in a standalone harness against production-shaped data). **Not yet Verification R** —
that requires confirming it executes inside the actually-deployed app (check
`window.__KRYLO_CI_PIPELINE_RUNS__` in a live browser session after a real EDGAR sync cycle,
post-deploy). Do not present this as fully Runtime-verified until that check happens.
LFOS/IB/Decision/Execution/Calibration/Feedback remain orphaned — this fix only closes the
CI-F→CI-R→RBCS segment, not the whole chain.

## Adaptive decay — a proven template, not yet applied here

If the Necklace's adaptive/decaying relationship weights get built, the decay-coefficient
pattern already governing signal confidence in `financialmarketconnector.js` (DAILY decay) and
`economicflowconnector.js` (QUARTERLY decay) is a directly reusable mechanism — same math,
applied to edge weights in `entitytopologyregistry.js` instead of signal values. Worth naming
in the meeting as evidence the required mechanism-type is already proven, even though the
Necklace itself is not built.

## How to use this

- Tier 1 (Implemented): safe to describe as reduced to practice, demonstrable live.
- Tier 2 (Architecturally decomposed): describe the real, narrower primitive that exists —
  don't let the vision-scale name (Necklace, Cognitive Event Infrastructure) stand in for what's
  actually there. Correct framing: "the enabling mechanism is proven; the composed capability
  is not built."
- Tier 3 (Research / vision): roadmap language only, never past tense. Doctrine documents belong
  here even when ratified — a ratified doctrine is not a technical contract.
