# WO-2005A — Signal Epistemic Taxonomy (Governance Layer)
Date: 2026-06-26
Status: SPEC — BUILD-READY (schema only; no runtime logic)
Governs: evidencetiers.js — the immutable descriptor for every evidence class
Feeds: WO-2004 (EvidenceNode schema), WO-2005B (calibration + SCI computation)
Position in sequence: WO-1879 → **WO-2005A** → WO-2004 → WO-2005B → WO-2006

---

## Constitutional Statement

This WO defines the **immutable semantic characteristics** of every evidence class
KRYLO ingests. It is a type system for evidence, not an algorithm.

**Non-Goal:** This specification does not define scoring, confidence, ranking, or
recommendation algorithms. It defines only the immutable semantic characteristics
of evidence classes. Future contributors must not add scoring logic here.

**What belongs here:** What the evidence *is*.
**What does not belong here:** What we currently believe about its behavioral values.

---

## Core Design Invariants (Constitutional — Permanent)

### Admission Invariant
> All admissible evidence enters the EvidenceGraph without preferential weighting.
> Epistemic descriptors SHALL NOT influence ingestion, routing, or domain pressure formation.

### Interpretation Invariant
> Epistemic descriptors MAY influence identity strengthening, corroboration, validation,
> ranking, and recommendation — but only after admission, never before.

These two invariants permanently resolve the §16 parity question:
**Parity governs admission. Epistemics governs interpretation.**

§16 (no single source dominates cone pressure field) is preserved absolutely.
Epistemic tier operates on a different object at a different layer. No conflict.

---

## 1. Single Responsibility

**Job:** Export a static, immutable descriptor from `evidencetiers.js` for every
evidence class, defining only what that evidence *is*. No runtime behavior.
**Output:** A file. Not a computation.

---

## 2. Intrinsic vs Calibrated (the load-bearing distinction)

**Intrinsic properties** are defined by the nature of the evidence. They change only
if the ontology changes (a new evidence class is added, or a class is reclassified).
They live in WO-2005A.

**Calibrated properties** are estimates the system learns or refines over time.
They start as priors and are updated by accumulated path memory. They live in
WO-2005B's calibration store, not here. Future developers who want to tune
`anchorStrength` or `independencePrior` must do so in the calibration layer —
not by editing this file.

This separation prevents governance drift: WO-2005A cannot become
"the place where we tweak scores."

---

## 3. EvidenceDescriptor Interface (Intrinsic Only)

```ts
interface EvidenceDescriptor {
  // What class of evidence is this?
  epistemicClass:
    | 'STRUCTURAL'      // physically costly or impossible to fabricate at scale
    | 'OPERATIONAL'     // costly to fake at organizational scale
    | 'FINANCIAL'       // constrained by legal liability
    | 'NARRATIVE'       // manageable and retractable
    | 'SPECULATIVE';    // trivially manufactured

  // How long does this evidence class remain valid before decay?
  persistence:
    | 'INSTANT'     // hours
    | 'SHORT'       // days
    | 'MEDIUM'      // weeks–months
    | 'LONG'        // months–years
    | 'VERY_LONG';  // years (infrastructure, permits)

  // How far ahead does this class typically signal?
  predictiveHorizon:
    | 'HOURS'
    | 'DAYS'
    | 'WEEKS'
    | 'MONTHS'
    | 'YEARS';

  // How does the evidence value decay as it ages?
  decayModel: 'NONE' | 'LINEAR' | 'EXPONENTIAL';

  // How does the Identity Kernel use this evidence? (WO-2004 canonical role)
  canonicalRole:
    | 'LONG_TERM_BASELINE'  // updates expected operating envelope; doesn't create events alone
    | 'STATE_TRANSITION'    // creates or strengthens an existing CanonicalEvent
    | 'CAUSAL_PRECURSOR'    // precedes public narrative; high Happy Path discovery weight
    | 'ENTITY_LINKED'       // strengthens attribution to a specific company/facility/region
    | 'ANOMALY_DETECTOR';   // does not create identity alone — requests corroboration

  // Identity Kernel permissions (WO-2004 reads these)
  canCreateCanonicalEvent:     boolean;   // false for ANOMALY_DETECTOR
  canStrengthenCanonicalEvent: boolean;
  canSplitCanonicalEvent:      boolean;   // true only for STRUCTURAL CAUSAL_PRECURSOR with conflict
}
```

---

## 4. EvidenceCalibration Interface (NOT part of this WO — defined here for boundary clarity)

These properties are **not intrinsic**. They are initial priors that the system refines.
They live in WO-2005B's calibration store. They are documented here only to make
the boundary explicit.

```ts
// Managed by WO-2005B calibration layer — not exported from evidencetiers.js
interface EvidenceCalibration {
  evidenceType:            string;       // foreign key into EvidenceDescriptor map

  // Non-fabricability ceiling (0–1). Initial prior; can be refined by observed behavior.
  // STRUCTURAL floor ≈ 0.80 by definition — physical world must corroborate.
  anchorStrength:          number;

  // How independent is this evidence from the broader information environment?
  // Prior: set from first principles. Observed: derived from path memory co-occurrence.
  independencePrior:       number;       // 0–1, initial estimate
  independenceObserved?:   number;       // 0–1, derived at N≥20 co-occurrence observations

  calibrationConfidence:   number;       // 0–1, rises with N
  lastCalibrated:          Date;
}
```

**Why `independencePrior` not `independenceClass`:**
The value 0.98 for EIA power is a prior belief about physical isolation from narrative
channels — not a measured fact. The rename reflects what the number actually is.
`independenceObserved` is what the system derives from accumulated co-occurrence data.
When observed diverges from prior, the system updates — the prior remains as the anchor.

---

## 5. Descriptor Table (evidencetiers.js exports — intrinsic properties only)

| evidenceType | epistemicClass | persistence | predictiveHorizon | decayModel | canonicalRole | canCreate | canStrengthen | canSplit |
|---|---|---|---|---|---|---|---|---|
| POWER_CONSUMPTION | STRUCTURAL | LONG | MONTHS | LINEAR | LONG_TERM_BASELINE | false | true | false |
| POWER_LOAD | STRUCTURAL | SHORT | DAYS | EXPONENTIAL | STATE_TRANSITION | true | true | false |
| POWER_INFRA | STRUCTURAL | VERY_LONG | YEARS | NONE | CAUSAL_PRECURSOR | true | true | true |
| POWER_DATACENTER_DEMAND | STRUCTURAL | MEDIUM | MONTHS | LINEAR | ENTITY_LINKED | true | true | false |
| POWER_DISCONTINUITY | STRUCTURAL | INSTANT | DAYS | EXPONENTIAL | ANOMALY_DETECTOR | false | true | false |
| WATER_USAGE | STRUCTURAL | LONG | MONTHS | LINEAR | LONG_TERM_BASELINE | false | true | false |
| NETWORK_TRAFFIC | STRUCTURAL | SHORT | DAYS | EXPONENTIAL | STATE_TRANSITION | true | true | false |
| FREIGHT_LOGISTICS | STRUCTURAL | MEDIUM | MONTHS | LINEAR | CAUSAL_PRECURSOR | true | true | false |
| CONSTRUCTION_PERMITS | STRUCTURAL | VERY_LONG | YEARS | NONE | CAUSAL_PRECURSOR | true | true | true |
| COMPUTE_CAPACITY | STRUCTURAL | MEDIUM | MONTHS | LINEAR | ENTITY_LINKED | true | true | false |
| SEC_FILING | FINANCIAL | LONG | MONTHS | LINEAR | ENTITY_LINKED | true | true | false |
| EARNINGS_CALL | FINANCIAL | MEDIUM | MONTHS | LINEAR | ENTITY_LINKED | true | true | false |
| ANALYST_REPORT | NARRATIVE | SHORT | WEEKS | EXPONENTIAL | STATE_TRANSITION | false | true | false |
| NEWS_ARTICLE | NARRATIVE | SHORT | DAYS | EXPONENTIAL | STATE_TRANSITION | false | true | false |
| PRESS_RELEASE | NARRATIVE | SHORT | DAYS | EXPONENTIAL | STATE_TRANSITION | false | true | false |
| SOCIAL_MEDIA | SPECULATIVE | INSTANT | HOURS | EXPONENTIAL | ANOMALY_DETECTOR | false | false | false |

Calibrated priors (`anchorStrength`, `independencePrior`) live in WO-2005B's calibration
seed file, keyed by the same `evidenceType` strings. They are maintained separately.

---

## 6. File Map

| File | Change |
|------|--------|
| `src/engine/evidencetiers.js` | NEW — exports `EVIDENCE_DESCRIPTORS` map (intrinsic only) + `getDescriptor(type)` |

One file. No runtime behavior. No other files change.

---

## 7. Bottle Test

1. **Reduces ambiguity?** YES — tier is deterministic from evidence class; no inference
2. **Single dominant output?** YES — a static descriptor map; zero runtime computation
3. **All boundaries defined?** YES — intrinsic/calibrated split explicit; calibration lives in 2005B
4. **No undefined deps?** YES — standalone; depends on nothing
5. **No core flexibility growth?** YES — read-only schema; Non-Goal statement is a build-time lock

**Verdict: BUILD-READY**

---

## 8. Definition of Done

`evidencetiers.js` exports `EVIDENCE_DESCRIPTORS` (keyed by evidenceType string)
containing only intrinsic properties, and `getDescriptor(type)`.
All current connector output types are covered.
WO-2004 EvidenceNode references `descriptorKey` into this map.
No scoring logic is present. No numeric values other than booleans appear in this file.
