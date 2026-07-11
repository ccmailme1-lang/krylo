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

## Gate 2 — STEE vs STSE (Founder call; not resolvable from code)
`STSE` (KRYL-1002) already exists: Monte Carlo trajectory sim, **PROPOSED-GATED with fabrication-risk flag** ("don't build the full engine yet; reuse SPS + pathstore"). STEE/STSE are one letter apart and both are exploration/candidate-generation engines. **Decide before WO:** is STEE the evolution/rename of STSE, a sibling, or unrelated? If both proceed, risk of two overlapping engines, and STSE's fabrication gate may apply to STEE.

## Open tuning items (not blockers — correctly deferred in spec)
- `tier_limits(domain, tier)` policy table (governance).
- `λ` anchor-attenuation calibration (AUROC loop, like other hyperparams).

## Confidence
- Architecture: **high** (sound, doctrine-clean, SAB-hardened, ~5 major pieces reusable).
- Execution: **medium-high** — mostly assembly + topology-recomposition search + attenuation + Pareto frontier; foundations exist. Gate 2 is the only true unknown.

## Cross-flag
STEE (Pareto candidate-graph frontier) and the SES Phase-2 relevance broker (ranked evidence surface) are both relevance/exploration layers over the same truth substrate. Distinct outputs — keep them sharing the substrate, do not fork into two overlapping relevance engines.
