# KRYLO — Narrative Assembly Contract v1.0

**Status:** Architecture Specification — consolidated from 8-stage audit
**Formerly referenced as:** "P1" (informal shorthand only — see §0 naming note)
**Depends on:** `specs/SPEC-reconn-factor-v1.1.md`

---

## 0. Naming note (LOCKED)

"P1" is retired as a formal name for this capability — it collided with three other
existing referents in this codebase: RECONN's own release-phase "P1" (spec header,
§31), the shipped `searchprofile.jsx`/`analysiscontinuum.jsx` UI stage "P1 — PROFILE
/ SEARCH" (WO-1316), and the frozen Perceptual Legibility hypothesis "P1 —
Representational." This capability is formally **Narrative Assembly**. "P1" survives
only as informal internal shorthand for the underlying product requirement.

---

## 1. Purpose

> **Tell the story of how KRYLO got from the original question to the observed
> Formation, using only the observations, relationships, chronology, and evidence
> actually present in the structural substrate.**

## 2. Architecture

```
SUBSTRATE → RECONN → NARRATIVE ASSEMBLY → GUEST OUTPUT
```

- **RECONN** establishes what reconnaissance KRYLO has — the canonical, normalized
  payload.
- **Narrative Assembly** determines how the reader follows that reconnaissance as a
  developing story.

Decoupled in authority, dependent as input contract: Narrative Assembly does not
become a second integration/canonicalization engine, and RECONN does not become a
narrative engine.

## 3. Governing rule

> **Assembly is permitted. Invention is not.**

Operational test: if Narrative Assembly needs to invent a connective sentence to
make the story work, the underlying substrate is insufficient and Narrative
Assembly must expose the gap instead of filling it.

## 4. The cross-cutting principle (the central finding of this audit)

Every deep-verification pass converged on the same requirement, independently
discovered five separate times:

> **RECONN must preserve distinctions that exist in authoritative substrate
> objects. Normalization must not erase semantic class boundaries.**

Evidence:
- Ingestion time (`ts`) is not historical event time (`eventDate`) — collapsing
  them fabricates chronology.
- `PROJECTION` (inferred) is not observation — collapsing them fabricates
  certainty.
- The formal relationship ontology and the live Formation vocabulary are not
  demonstrated to be the same thing — collapsing them picks a winner without
  authority to do so.
- Subject-bound evidence facets and formation-admitted gravity-pool observations
  are not the same evidence class — collapsing them is the exact bug the
  substrate already fixed once (`adsubject.js`'s WO-5B split).

## 5. What Narrative Assembly requires

Narrative Assembly may consume, from RECONN's canonical payload:
- `intent` (Question, Context/scope)
- `observations[]`, preserving whatever class distinctions RECONN's contract
  carries
- `relationships[]`, as RECONN admits them — never reconstructed independently
- `formations[]`
- `comparisons[]` / requested comparisons
- `temporalState`, only once RECONN has normalized it — never raw `ts`
- categorized inference state (once RECONN defines it) — never bare `PROJECTION`
  presented as fact
- `evidence[]`, once RECONN's roll-up exists
- the `state` vector (PRESENT/PARTIAL/NOT MEASURED/UNAVAILABLE/WITHHELD) per
  dimension

## 6. What Narrative Assembly is prohibited from doing

- Independently reconstructing observations, relationships, chronology,
  comparisons, formations, or evidence from raw substrate when those objects are
  available through RECONN's canonical payload.
- Selecting a relationship vocabulary/authority on its own.
- Promoting `PROJECTION`/inferred content into narrated fact.
- Sorting raw ingestion timestamps and presenting the result as chronology.
- Inventing a connective sentence where the substrate doesn't support one —
  the gap must be exposed, not bridged.
- Determining significance, causality, motive, or recommendation. Narrative
  Assembly assembles; it does not interpret meaning for the guest (§21 FORMATION
  IS NOT A VERDICT applies here without exception).

## 7. Stage-by-stage audit findings

| # | Stage | Finding | Owner |
|---|---|---|---|
| 01 | Question | Strong — canonical INTENT largely implemented. Gap: Question Coverage state math (RECONN §8) not built. | RECONN |
| 02 | Context | `observations[]` cannot represent the two authoritative observation classes (`observations` / `formationObservations`) the substrate already separated in `adsubject.js`. RECONN's contract is currently less expressive than the substrate it's meant to normalize. | RECONN |
| 03 | Developments/Chronology | `confirmationVelocity()` and `buildPath()` are real, well-built, live-authoritative-in-design capabilities — **zero callers**, Class A wiring defect. RECONN's `Θ(x)` temporal normalization (§13) doesn't exist in code. Raw `ts` is ingestion/poll time, not historical event time — not sufficient evidence of chronology on its own. | Substrate (Class A) + RECONN |
| 04 | Relationships | **Superseded finding, see revision below** — RECONN §10's "governed relationship ontology" is real on both sides: `relationontology.js`'s formal, versioned 14-value `RelationType` (13 consumers, 7 genuinely semantic including two live connectors) and `domainintelligence.js`'s live 15-pair cross-domain vocabulary (actively determines admitted Formation edges). End-to-end trace across two real connectors (SEC, PatentsView) established this is **not evidence of two architecturally separate systems** — PatentsView's connector already carries a relationship identity (`rc.id`/`topology`) intentionally toward Formation, and that identity is dropped at one specific, shared, already-identified boundary (`domaingravity.js`'s pool-write function keeps only `confidence/polarity/ts/source/signal/canonicalId/eventDate`, no `id`/`topology`) — a propagation break, not an architectural fact. SEC shows a *different* defect: its connector aggregates before any per-relationship identity is even created for the Formation-side signal. `aiae.js`'s ranked candidates are not relationships (ruled out). `formationrelationship.js`'s Connector Layer is independently confirmed broken (`deriveRelationships()` always returns `[]`, KRYL-1280) and unreachable via UI (KRYL-1279). **Conclusion carried forward: repair/define the identity-propagation contract before designing any new relationship model or mapping layer — do not ratify a composite edge or any mapping yet.** | **RECONN / Founder ruling required — narrowed to identity propagation, not vocabulary choice** |
| 05 | Tension/Divergence/Change | `convergenceclassifier.js` is live, authoritative, heavily wired (23 consumers including `app.jsx`, `conemap.jsx`, `scoutingreport.js`) — and every output self-declares `stateType: PROJECTION` ("inferred from signals, never an observed/closed outcome"). That label is silently dropped one hop downstream: `convergenceRead()` has no field for `stateType` at all, and the one real call site that reads the classifier's raw output (`scoutingreportproducer.js`) never threads it through. `groundedness` (a continuous 0–1 scalar) is not an adequate substitute — it measures degree of grounding, not categorical epistemic status (observed vs. inferred vs. absent are different dimensions). | Substrate (Class A propagation defect) + RECONN (contract vocabulary gap) |
| 06 | Formation | Strongest substrate in the whole audit. `inferFormation()` is mature, well-governed, §21-compliant in its own code. Gap: the null-path (`return null`) discards the classification reason computed just before it (which domain/edge/floor gate failed) — traced in full (9 consumers, all truthiness-gated, none deep-read the null case; `cf/` resolved as either explicitly non-guest-path or zero-importer). Recommended fix: Option C, a separate additive export, zero blast radius. Not yet built. | Substrate |
| 07 | Evidence | Per-object provenance is real and fail-closed (`readFacet()` rejects any facet missing `source_set_hash`/`provenance`). No canonical `evidence[]` roll-up exists. A same-sounding decoy, `buildEvidenceGraph()` (`consultingexport.js`), exists but is wired to the legacy pre-WO-5B advisory pipeline **KRYL-1235 flags for quarantine** — must not be reused for this purpose. | RECONN |
| 08 | Unresolved | Strongest stage overall — "classified, never-fabricated absence" independently verified across `targetpacket.jsx` (`NO_FORMATION_ESTABLISHED`), `formationprospectus.js` (`held(id,'NO_FORMATION')`), `domainsignalresolution.js` (`STRUCTURAL_ABSENCE`). Same underlying gap as stage 06 — Option C closes it. | Substrate |

## 7a. Relationship Architecture Audit — invariants (locked, supersedes any earlier "two separate authorities" framing)

Full end-to-end trace across two real connectors (SEC, PatentsView) closed this
audit with a materially different conclusion than the original stage-04 finding:
**not evidence of two architecturally separate relationship systems — evidence of
a relationship chain whose identity-continuity is currently broken at one
specific, shared, already-identified boundary** (`domaingravity.js`'s pool-write
function). SEC shows a second, different defect (aggregation before any
per-relationship identity is created for the Formation-side signal at all).

Until that propagation contract is repaired or deliberately ruled otherwise, the
following invariants are locked:

1. **Never fabricate the relationship between representations.** A `RelationCore`
   and a Formation domain-pair may not be joined unless the substrate itself
   establishes the linkage (e.g. a real, surviving identifier).
2. **Never discard either representation merely to simplify RECONN.** If a typed
   relation exists, preserve it. If a Formation relationship exists, preserve it.
3. **Do not declare either representation the universal relationship authority
   yet.** The audit proved both are real and live. It did not prove either is the
   complete model.
4. **RECONN must preserve provenance and identity.** Every relationship-like
   object entering RECONN must remain attributable to the structural object that
   actually produced it.
5. **Future linkage must be additive.** If a legitimate connection between a
   `RelationCore` and a Formation edge is later established, that must be an
   explicit, governed relationship between the two — never a reinterpretation of
   existing data.

**Next step, not yet authorized:** repair/define the identity-propagation
contract (starting from the one already-identified drop point in
`domaingravity.js`) before designing any new relationship model, composite edge,
or mapping layer. No bridge, composite edge, or `relationships[]` redesign is
authorized by this contract.

## 8. Unresolved RECONN dependencies (explicit — not resolved by this contract)

This contract does not freeze the relationship portion of Narrative Assembly's
input. Instead:

> Narrative Assembly consumes canonical RECONN relationships and never
> reconstructs or selects relationship authority.

The underlying object is marked **RECONN dependency — authority unresolved**
pending a Founder/architecture ruling on §7 stage 04 above.

Full list of RECONN-owned prerequisites, none of which Narrative Assembly may
resolve on its own:

1. Relationship identity-propagation repair (blocking — see §7a). Narrowed from
   "vocabulary choice" to "fix the specific drop point in `domaingravity.js`,"
   plus a Founder ruling only if repair reveals the two representations
   genuinely cannot/should not be linked after all.
2. Wire `confirmationVelocity()`/`buildPath()` to a real, live observation stream
   (Class A — mechanical once a source is identified).
3. Stop dropping `stateType: PROJECTION` at the `convergenceRead()` boundary
   (Class A propagation fix).
4. Extend `observations[]`'s contract to carry the subject-bound vs.
   formation-admitted distinction.
5. Add a categorical inference state to RECONN's state vocabulary (distinct from
   observed and from not-measured).
6. Build the canonical `evidence[]` roll-up over existing per-object provenance.
7. Normalize `ts`/`eventDate` into `Θ(x)` (§13).
8. Compute Question Coverage state (§8).

## 9. What Narrative Assembly owns

Nothing from §8. Every gap found across all 8 stages belongs to RECONN or the
substrate beneath it. Narrative Assembly remains a pure downstream consumer —
confirmed, not assumed, across five independent deep-verification passes.

## 10. Non-goals (P1 requirements, unchanged)

- No prediction, forecasting, or recommendation.
- No composite intelligence/narrative-quality score.
- No fabricated connective narrative where substrate is insufficient.
- No independent chronology construction from raw ingestion timestamps.
- No promotion of governed inference into narrated observed fact.

## 11. Completion criterion

Narrative Assembly is ready for implementation once, and only once:
- The relationship authority ruling (§8.1) is made, **or** the spec is
  implemented against the explicit "authority unresolved" placeholder in §8,
  never against a silently-chosen default.
- At minimum stages 06 and 08 (Formation, Unresolved) are RECONN-compliant
  end-to-end, since they are the strongest and most guest-value-dense stages.
- Every other stage's consumption is gated on RECONN actually emitting the
  distinction/normalization/roll-up that stage's finding requires — Narrative
  Assembly never backfills a RECONN gap itself, even temporarily.
