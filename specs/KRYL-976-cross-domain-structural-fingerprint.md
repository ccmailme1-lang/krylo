# WO HARDENING — KRYL-976

## HEADER

**KRYL-976 — Cross-Domain Structural Fingerprint Exposure**
Date: 2026-07-04
Author: spec pass per Founder request, grounded against real files (not the original secondhand draft)
Target file(s): `src/engine/structuralfingerprint.js` (new — only file touched)

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Assemble the domain-agnostic structural properties a CanonicalEvent already has — evidence-tier distribution, canonical-role distribution, SCI, graph topology, identity dynamics — into one fixed-length vector that is comparable across domains, since none of those properties are currently exposed together in one place.

**Output:** One `StructuralFingerprint` object per CanonicalEvent.

---

## 2. BOUNDARY DECLARATION

**Input contract:** a `CanonicalEvent` object, exactly as produced by `identitykernel.js` (`createCanonicalEvent` / `addNode` / `mergeEvents`). No new input shape.

**Output contract:**
```
StructuralFingerprint {
  identityId,
  epistemicDistribution:  { STRUCTURAL, OPERATIONAL, FINANCIAL, NARRATIVE, SPECULATIVE },  // fraction of covered evidence types per class, sums to 1
  roleDistribution:       { LONG_TERM_BASELINE, STATE_TRANSITION, CAUSAL_PRECURSOR, ENTITY_LINKED, ANOMALY_DETECTOR }, // fraction of nodes per canonical role, sums to 1
  sci:                    { score, groundedness },        // from structuralconfirmation.computeSCI
  topology:               { continuityScore, branchingFactor, stabilityScore }, // from evidenceGraph, already computed
  dynamics:               { velocity, lifecyclePhase },   // from identitydynamics.computeTruthDynamics
  vectorVersion: 1,        // bump only if the field set/order below changes
}
```
Every field above already exists somewhere in the codebase today (verified against real files 2026-07-04, see File Map) — this ticket assembles them, it does not compute a single new number.

**Explicit exclusions:**
- Does NOT compute similarity or correlation between two fingerprints. KRYLO exposes the fingerprint; a human or downstream consumer decides if two fingerprints look alike. No `compareFingerprints()`-style function in this ticket.
- Does NOT introduce a new evidence type, epistemic class, or canonical role. Uses only the five-class/five-role taxonomy already defined in `evidencetiers.js`.
- Does NOT touch identity merge/split logic, SCI's formula, RBCS, or any routing/scoring path.
- Does NOT wire into any UI surface in this ticket — this is engine-only, exposition-only scope.

---

## 3. ZERO DRIFT CONFIRMATION

- [ ] Detection layer touched → N/A, this reads only post-formation CanonicalEvents, never touches ingestion/routing.
- [x] Scoring layer touched → `computeSCI` is called (same as `whytrace.js`/KRYL-980), but its result is only read and assembled, never altered, never fed back into SCI/RBCS. Confirmed NOT a recommendation — it's a structural readout.
- [x] Inference layer touched → `computeSCI` is inference-derived and gets recomputed here (same category as KRYL-980, not a pure join — see 4AR/Drift Exposure below). Confirmed result does NOT write back to signal scores; this module has no exported mutator.
- [ ] UI layer touched → N/A, out of scope for this ticket.

**Drift notes:** This is the second module (after `whytrace.js`) that recomputes an inference-derived value (SCI) for exposition rather than purely retrieving stored state. Per the classification convention established in the KRYL-980 hardening pass: this must be documented in the file header as a recompute, not a join, and nothing may import this module's output back into a scoring/identity/routing path.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** Every domain today expresses its signal only in domain-specific terms, so a structural pattern repeating across two unrelated domains (say, TECHNOLOGY and OWNERSHIP) is invisible unless someone hand-codes the resemblance. This exposes the shape of a detected event in domain-agnostic terms, so a human analyst can notice a repeating structural pattern first — without KRYLO itself asserting the correlation, which stays strictly on the detect side of the detect-vs-predict line.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a fixed-length, domain-agnostic structural fingerprint per CanonicalEvent, built entirely from properties that already exist in the codebase today."**

---

## 6. FORMULA / CONTRACT

**Formula / contract:**
```
epistemicDistribution[class] = count(coveredTypes where evidencetiers.getDescriptor(type).epistemicClass == class) / count(coveredTypes)
roleDistribution[role]       = count(graph nodes where evidencetiers.getDescriptor(node.evidenceType).canonicalRole == role) / count(nodes)
sci                          = structuralconfirmation.computeSCI(event.evidenceGraph)  // { score, groundedness } read directly, no new math
topology                     = { event.evidenceGraph.continuityScore, .branchingFactor, .stabilityScore }  // read directly, already computed by identitykernel.buildGraph
dynamics                     = identitydynamics.computeTruthDynamics(event.identityId)  // { velocity, lifecycle } read directly
```

Units: `epistemicDistribution`/`roleDistribution` are fractions in [0,1] summing to 1 each. `sci.score` is [0,10] (existing SCI scale). `sci.groundedness`, `topology.continuityScore`, `topology.stabilityScore` are [0,1] (existing scales). `topology.branchingFactor` is an unbounded non-negative float (existing scale, not normalized elsewhere either). `dynamics.velocity` is an existing signed float (stability delta per unit time); `dynamics.lifecyclePhase` is one of the five existing named phases.

Normalization (§16): this is an internal engine-to-engine fingerprint, not a cone-pressure signal — it is explicitly NOT subject to the 0–100 signal scale, since it never enters `surfacerouter.js`'s dispatch path. If a future ticket wants to surface this on a cone/UI, that ticket must define its own §16-compliant normalization; this one does not.

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/structuralfingerprint.js` | NEW — `buildFingerprint(event)`, exported | — |
| `src/engine/identitykernel.js` | none | read-only consumer of `CanonicalEvent`/`evidenceGraph` shape |
| `src/engine/structuralconfirmation.js` | none | read-only consumer of `computeSCI()` |
| `src/engine/evidencetiers.js` | none | read-only consumer of `getDescriptor()`, `EPISTEMIC_CLASS`, `CANONICAL_ROLE` |
| `src/engine/identitydynamics.js` | none | read-only consumer of `computeTruthDynamics()` |

No other file is touched. No UI file is in scope.

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — makes a structural resemblance across domains perceivable via one shared representation, where today it's invisible. |
| Does this have a single dominant output? | YES — one `StructuralFingerprint` per event. |
| Are all boundaries explicitly defined? | YES — see section 2. |
| Can this be built without touching an undefined dependency? | YES — all four source functions (`computeSCI`, `getDescriptor`, graph topology fields, `computeTruthDynamics`) already exist and were verified against the real files this session. |
| Does this avoid increasing expressive flexibility in the core? | YES — uses only the existing 5-class/5-role taxonomy, adds zero new categories. |

**Verdict:** PASS

---

## 9. FOUR-AXIS HARDENING RUBRIC (4AR)

**1. Structural Integrity (SI):** Preserves all existing invariants (read-only against four already-locked modules). No hidden dependencies — all four imports are explicit and already verified to exist. Runtime contract is versioned (`vectorVersion: 1`) so a future field-order change is detectable rather than silent.

**2. Semantic Consistency (SC):** Reuses `EPISTEMIC_CLASS` and `CANONICAL_ROLE` names verbatim from `evidencetiers.js` — no renaming, no new terms for existing concepts. No duplication of any existing construct.

**3. Execution Containment (EC):** Declarative — `buildFingerprint(event)` is a pure function, no side effects, no mutation of any input. Contained entirely to the one new file.

**4. Drift Exposure (DE):** The fixed field set is static and versioned, low drift risk. The one thing to watch: this module recomputes `computeSCI` (inference-derived), same category as `whytrace.js` — must carry the same "recompute, not join" classification note in its header, and nothing may treat its output as a safe new scoring input later.

**Outcome tag:** PASS

---

## 10. DEFINITION OF DONE

**Verification:**
```bash
node --input-type=module -e "
import { createEvidenceNode, createCanonicalEvent } from './src/engine/identitykernel.js';
import { buildFingerprint } from './src/engine/structuralfingerprint.js';
const n1 = createEvidenceNode({ id: 'n1', evidenceType: 'POWER_CONSUMPTION' });
const event = createCanonicalEvent({ nodes: new Map([['n1', n1]]), edges: [], rootSeeds: ['n1'] });
console.log(JSON.stringify(buildFingerprint(event), null, 2));
"
```
Confirms: fingerprint object has all five sections populated, `epistemicDistribution`/`roleDistribution` each sum to 1, `vectorVersion` present. No `SyntaxError`, no crash on a minimal one-node event.

---

## NOTES

Nothing in this spec requires KRYL-977, KRYL-978, KRYL-980, or KRYL-981 to exist — same "conceptual dependency only, not filesystem dependency" discipline applied during KRYL-980's own correction. This is spec-only; no code has been written. Build requires an explicit Go per CLAUDE.md §11.
