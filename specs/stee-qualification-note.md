# STEE — Qualification Note (intake/gate, not a spec)

Source: `specs/STEE.md` (SAB-reviewed, 5 amendments folded, marked "READY FOR WO GENERATION").
Role of this note: verify STEE against the actual codebase before WO generation. The Founder drafts the WO; this is the qualification gate.

## Disposition
**Qualified — additive, doctrine-clean, worth building.** Not a strike. Two gates to resolve before WO (§ below).

## Architecture fit
Read-only exploration layer above the truth layer. Aligns with doctrine: perception over prediction, evidence before inference, exploration without contamination, no recommendations (LEV-02 stays the arbiter). Additive, not a competing inference layer. SAB already hardened the 5 failure modes (AM-01…AM-05).

## Reuse map — load-bearing machinery already exists (NOT greenfield-from-zero)
| STEE needs | Already in code |
|---|---|
| CanonicalEvent + evidence tiers (`d(v,C)`, tiering) | `rkmstore.js`, `identitykernel.js` (WO-2004) |
| SCI / structural confirmation (`P_integrity = SCI × Independence`, AM-03) | `structuralconfirmation.js` (`computeSCI`, `computeStructuralDivergence`) |
| Pareto admission (AM-05) | `paretoresolver.js` — `dominatesVector` + `resolveParetoCrossDomain`, "order carries no ranking meaning" (exact match) |
| LEV-02 arbitration authority | `arbitrate()` (targetpacket/intelligencebrief/analysisidlefield) |
| Exploration Ledger | `pathstore.js` (§19 path memory) |
| `projection_hash` reproducibility (AM-01/ledger) | `identitykernel.js` `computeVersionHash(nodes, edges)` already exists |

## Gate 1 — "TruthGraph" is latent, not missing (largely resolves in STEE's favor)
No single named `TruthGraph` object, but the substrate is real and distributed:
- `identitykernel.js` **is a graph** — `nodes` (Map), `edges` (`{from,type,to}`), BFS traversal, continuity, branching, version hash.
- `structuralconfirmation.js` operates on an `evidenceGraph` → SCI / divergence (the `P_integrity` source).
- `rkmstore.js` = canonical-object/epistemic store (nodes + tiers + supersede/merge/contradiction).

⇒ `TruthGraphProjection` (AM-01) is a **thin read-only adapter** over identitykernel nodes/edges (immutable handles) + rkmstore tiers, SCI feeding integrity, `d(v,C)` on the edge set identitykernel already traverses. Overlay topology is the only STEE-owned mutable part — exactly the spec. **Prerequisite work = assembly adapter, not a new graph.**

## Gate 2 — STEE vs STSE — RESOLVED (2026-07-11, Founder-provided reconciliation contract)
Resolved via the **STSE ↔ STEE Reconciliation Contract** (authority-boundary contract, not a feature merge). Governing sentence:
> STSE models the state of the search environment; STEE evaluates the truth integrity of observations within that environment. STSE provides context. STEE provides validation. Neither engine performs the other's function.

Authority split: **STSE** owns search environment / retrieval conditions / signal availability / volatility. **STEE** owns evidence quality / source reliability / independence / contradiction / confidence / falsifiability. The **Relevance Broker** (SES Phase 2) sits between them — may consume both, may modify neither. Disposition: **STEE cleared for WO generation.**

### Three grounding flags before WO (implementation translation, not conceptual blockers)
1. **STSE acronym repurposed.** Contract's STSE = "Search Truth **State** Engine" = environment authority = **`searchenvironmentstate.js` (SES), already built.** This is NOT KRYL-1002 STSE ("Monte Carlo trajectory sim", fabrication-gated). Same acronym, different engine — WO must rename one or explicitly reassign the acronym, or two "STSE"s collide.
2. **Enforcement hooks are Python idiom; KRYLO is JS/React ESM.** `hasattr`/`module_origin`/`imports()`/async queues → translate to: directory boundaries (`stse/`, `stee/`, `common/observations/`), an **ESLint `no-restricted-imports` import-boundary rule (NO eslint config exists yet — new tooling)**, runtime guards checking exported surface (not `hasattr`). Cannot be copied literally.
3. **`CanonicalObservation` shared primitive does not exist.** Code has `runtimeobservablestore.js` (`setObservation`/`getObservations`) + `CanonicalEvent` (`rkmstore`) but no formal `CanonicalObservation` / `common/observations`. Building that dependency-neutral shared primitive (import-only, must never import stse/ or stee/) is a real prerequisite task.

### Contract-added implementation work (fold into WO acceptance criteria)
- Doctrine boundary sentence in preamble.
- Namespace isolation `stse/ | stee/ | common/observations/` + CI import gate.
- API surface: STSE→STEE `get_observation_stream(query_scope, context_tag)` (pull); STEE→STSE `post_quality_metrics(observation_id, metrics)` (push). JS equivalents.
- Runtime guards (capability-absence + namespace-identity).
- Exploration-Ledger gains read-only `ses_snapshot_id` + `environment_state`; STEE may reference, never emit `updated_environment_state` (STSE owns state evolution).

## Open tuning items (not blockers — correctly deferred in spec)
- `tier_limits(domain, tier)` policy table (governance).
- `λ` anchor-attenuation calibration (AUROC loop, like other hyperparams).

## Confidence
- Architecture: **high** (sound, doctrine-clean, SAB-hardened, ~5 major pieces reusable).
- Execution: **medium-high** — mostly assembly + topology-recomposition search + attenuation + Pareto frontier; foundations exist. Gate 2 is the only true unknown.

## Cross-flag
STEE (Pareto candidate-graph frontier) and the SES Phase-2 relevance broker (ranked evidence surface) are both relevance/exploration layers over the same truth substrate. Distinct outputs — keep them sharing the substrate, do not fork into two overlapping relevance engines.
