# DOD Step 3 — Resolve Representation Overlaps (Confirmation Pass)

Status: Confirmation only, per direction. No new investigation, no redesign. Verifying the
three known cases named in the locked DOD against their own stated sub-requirements, citing
the audit that already established each fact.

Exit criterion (locked, unchanged): **every known overlap has an explicit owner, and no
parallel authority for the same ontology role remains unexplained.**

## Case 1 — RKM ↔ WO-2004

| DOD requirement | Status | Citation |
|---|---|---|
| Do not delete either system | ✅ — neither touched, both real and running | commits `52f022f`/`f12f440`; no deletion anywhere this session |
| Document: RKM RealityObject = live knowledge substrate | ✅ | audit 015/017 — `edgar8kconnector.js`, live, mount+5min interval |
| Document: WO-2004 CanonicalEvent/EvidenceNode = existing consumed evidence/event representation | ✅ | audit 017 — feeds WhyTrace (`whytracepanel.jsx`/`intelligencebrief.jsx` via `targetpacket.jsx`) + `structuralconfirmation.js`'s SCI-CONFIRMATION |
| May coexist where they serve distinct consumers | ✅ — confirmed distinct, not asserted | audit 017: RKM → signals (`edgar8ksignal.js`) + CI-F anchor matching (`cipipelinerun.js`); WO-2004 → WhyTrace + SCI-CONFIRMATION. Zero shared consumers found across all connector/component greps this session |
| Shared identity anchored to canonical O substrate | ✅ | audit 001 (RKM `identityId` ← `entityresolution.js` `canonicalId`) + audit 017 (WO-2004 `entityKey` ← same `canonicalId`, with CIK fallback). Same source, no drift, confirmed three separate times (edgar8kconnector.js, rkmstore.js's identityId field, edgar8kevidence.js's entityKeyFor) |
| Evidence capable of feeding canonical πΣ (not spawn a second traceability authority) | ✅ capable, not yet built | Both `RealityObject.evidence[]` and WO-2004's `EvidenceNode` set are plain string-id / object collections — no structural blocker to passing either into `ProvenanceDAG.linkEvidence()`. Audit 012 already named this exact translation as the recommended (not yet built) seam. Confirming capability here, not building it — building it is separate adoption work, not a Step 3 gate |

**Owner declared:** O → `entityresolution.js` (both anchor to it). E → COMPLEMENTARY, two grains,
two consumer sets, no third grain, no ambiguity about which one a given consumer should read.

## Case 2 — CI-F / CI-R / RBCS

| DOD requirement | Status | Citation |
|---|---|---|
| Remains downstream M4 interpretation/projection | ✅ | audit 016 — `cifengine.js`'s own header: "expansion is speculative"; `confidenceMass` decays multiplicatively per hop |
| Does not become Σ authority | ✅ | audit 016 verdict: "NOT a competing Σ-construction authority... different question domain (M4 projection vs. M3 structure)" |

**Owner declared:** M4/interpretation role → CI-F/CI-R/RBCS, exclusively. Σ role remains
`sigmaengine.js`, exclusively. No overlap exists to resolve — audit 016 already closed this;
Step 3 finds nothing further to do here.

## Case 3 — Genealogy

| DOD requirement | Status | Citation |
|---|---|---|
| Remains internal to RKM unless/until an individual predicate is explicitly promoted | ✅ | audit 012 addendum + Founder decision: R is endpoint-agnostic (ontology-level, closed), but promotion of any specific predicate is explicitly deferred, per-predicate, to adoption work |
| No blanket genealogy migration | ✅ | `genealogy` remains `{}` at the only live production call site (`edgar8kconnector.js:207`, re-confirmed unchanged this session — not touched by any commit `40fc73a` through `f12f440`) |

**Owner declared:** genealogy stays an RKM-internal construct until Step 6 evaluates each
predicate individually. Nothing to resolve now — there is no live data to even classify yet.

## New overlaps checked for, none found

Cross-checked the adoption map (021) for any AUTHORITATIVE-vs-AUTHORITATIVE collision beyond
the three known cases: O (one authority), R (one authority), Gᵂ/Σ/πΣ (one authority each,
now proven against two independent data sources). No additional overlap exists in the map.

## Status

Gate: **Step 3 — GREEN.** All three known cases satisfy the DOD's own stated
sub-requirements, cited to existing audits, no redesign performed, no new overlap found.
Exit criterion met: every known overlap has an explicit owner; no parallel authority for the
same ontology role remains unexplained.

Proceeding to Step 4 (complete πΣ adoption) per the locked sequence.
