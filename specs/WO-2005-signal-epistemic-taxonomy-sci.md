# WO-2005 — Signal Epistemic Taxonomy + Structural Confirmation Index
Date: 2026-06-26
Status: SPEC — Phase A BUILD-READY (schema only); Phase B blocked on WO-2004
Governs: evidencetiers.js (Phase A); SCI computation in Identity Kernel (Phase B); MetricStrip surface (Phase C)
Feeds: WO-2004 (EvidenceNode schema), §19 Path Memory (Structural Precursor Score)

---

## Core Principle

**Not all signals are epistemic equals.**

The load-bearing insight: certain signal classes are difficult or impossible to fabricate at
scale. A company can retract a press release. Grid operators cannot retroactively
un-deliver megawatt-hours. The electrons had to flow. That asymmetry belongs in the
signal schema — not in a trust weight that gets tuned away, but as a structural property
of the evidence type itself.

**KRYLO's current filtration problem:** ten news sources agreeing does not increase
structural confirmation. Adding more T4 sources to a hypothesis does not make it
more real. The SCI asks a different question: how many *independent, non-narrative*
reality checks has this hypothesis survived?

**The §16 boundary (load-bearing):**
§16 parity rule governs cone pressure — no single source dominates the raw signal field.
Epistemic tier governs CanonicalEvent synthesis weight — a separate object in a separate
layer. These do not conflict. Parity = cone field. Tier = identity kernel weight.

---

## 1. Single Responsibility

**Job:** Define a deterministic, source-intrinsic epistemic tier for every signal class
KRYLO ingests. Derive the Structural Confirmation Index (SCI) from T1–T3 coverage
of a CanonicalEvent's evidence portfolio. Expose SCI as an 8th vital metric.

**Output:** Per CanonicalEvent: `{ sci: number, structuralCoverage: Record<T1-type, bool>, narrativeCoverage: number }`.

---

## 2. The Taxonomy (T1–T5)

Tier is **intrinsic to the evidence class**, not the source. Set at ingestion. Never computed.

| Tier | Class | Examples | AnchorStrength | Non-Fabricability |
|------|-------|----------|----------------|-------------------|
| T1 | Structural | EIA power, grid load, utility permits, freight tonnage, water usage, construction permits, compute capacity | 0.90–1.0 | Very High — physical world must corroborate |
| T2 | Operational | Hiring (headcount), procurement, supply chain orders, facility buildout, logistics throughput | 0.70–0.89 | High — costly to fake at scale |
| T3 | Financial | SEC filings, earnings releases, capital expenditure disclosures, audited guidance | 0.50–0.69 | Medium-High — legal liability constrains fabrication |
| T4 | Narrative | News articles, earnings calls (language), press releases, analyst commentary, interviews | 0.25–0.49 | Medium — manageable, retractable |
| T5 | Speculative | Social chatter, unverified rumors, forum consensus, sentiment signals | 0.05–0.24 | Low — trivially manufactured |

**Rule:** Tier is never upgraded by co-occurrence with higher-tier evidence. A T4 source
that happens to appear alongside T1 evidence is still T4. Identity strength rises; tier does not.

---

## 3. Structural Signal Classes (T1 Detail)

The Structural tier is the primary innovation of this WO. Every T1 type carries
additional behavioral properties beyond anchorStrength.

| Evidence Type | Persistence | Volatility | Predictive Horizon | Canonical Role | Decay Model |
|---|---|---|---|---|---|
| POWER_CONSUMPTION (EIA state monthly) | LONG | Low | Months–Years | LONG_TERM_BASELINE | LINEAR |
| POWER_LOAD (ISO/RTO real-time) | SHORT | High | Hours–Days | STATE_TRANSITION | EXPONENTIAL |
| POWER_INFRA (utility permits, interconnection queues) | VERY_LONG | Very Low | Years | CAUSAL_PRECURSOR | NONE |
| POWER_DATACENTER_DEMAND (data center disclosures) | MEDIUM | Medium | Quarters | ENTITY_LINKED | LINEAR |
| POWER_DISCONTINUITY (derived analytics, anomaly) | INSTANT | Very High | Days–Weeks | ANOMALY_DETECTOR | EXPONENTIAL |
| WATER_USAGE | LONG | Low | Months–Years | LONG_TERM_BASELINE | LINEAR |
| NETWORK_TRAFFIC | SHORT | High | Hours–Days | STATE_TRANSITION | EXPONENTIAL |
| FREIGHT_LOGISTICS | MEDIUM | Medium | Weeks–Months | CAUSAL_PRECURSOR | LINEAR |
| CONSTRUCTION_PERMITS | VERY_LONG | Very Low | Years | CAUSAL_PRECURSOR | NONE |
| COMPUTE_CAPACITY | MEDIUM | Medium | Months–Quarters | ENTITY_LINKED | LINEAR |

**Canonical Role semantics (consumed by WO-2004 Identity Kernel):**
- `LONG_TERM_BASELINE` — updates expected operating envelope; does not trigger event on its own
- `STATE_TRANSITION` — creates or strengthens an existing CanonicalEvent; timestamped and attributed
- `CAUSAL_PRECURSOR` — highest Happy Path discovery influence; precedes public narrative by design
- `ENTITY_LINKED` — strengthens attribution to specific company, facility, or region
- `ANOMALY_DETECTOR` — does not create identity alone; requests corroboration before anchoring

---

## 4. EvidenceDescriptor Interface

Every signal source maps to exactly one descriptor. Descriptors live in `evidencetiers.js`.
The Identity Kernel reads descriptors — it does not define them.

```ts
interface EvidenceDescriptor {
  tier:                   'T1' | 'T2' | 'T3' | 'T4' | 'T5';
  evidenceType:           string;           // e.g. 'POWER_CONSUMPTION'
  anchorStrength:         number;           // 0–1
  persistenceClass:       'INSTANT' | 'SHORT' | 'MEDIUM' | 'LONG' | 'VERY_LONG';
  predictiveHorizon:      'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
  causalWeight:           number;           // 0–1; how much this shifts causal chain confidence
  canonicalRole:          CanonicalRole;    // how Identity Kernel uses this evidence
  decayModel:             'NONE' | 'LINEAR' | 'EXPONENTIAL';
  canCreateCanonicalEvent:    boolean;      // false for ANOMALY_DETECTOR
  canStrengthenCanonicalEvent: boolean;    // true for all T1
  canSplitCanonicalEvent:     boolean;     // true only for T1 CAUSAL_PRECURSOR with conflict
}
```

The Identity Kernel reads `canCreateCanonicalEvent` and `canStrengthenCanonicalEvent`
to decide behavior — no hard-coded logic per evidence type. Adding a new T1 source
= adding one descriptor entry. Zero Identity Kernel changes required.

---

## 5. Structural Confirmation Index (SCI)

**Definition:** How many independent, non-fabricable reality checks has this hypothesis survived?

SCI is computed POST identity formation — it is a property of the CanonicalEvent's
evidence portfolio, not an input to identity. It never influences merge/split decisions.

### Formula

```
Coverage(type) = 1 if any attributed T1/T2/T3 node of that type exists, else 0

StructuralBurdenScore  = Σ [ Coverage(t) × anchorStrength(t) ] for all T1 types
OperationalBurdenScore = Σ [ Coverage(t) × anchorStrength(t) ] for all T2 types
FinancialScore         = Σ [ Coverage(t) × anchorStrength(t) ] for all T3 types
NarrativeScore         = Σ [ Coverage(t) × anchorStrength(t) ] for all T4+T5 types

SCI = (StructuralBurdenScore × 0.50 + OperationalBurdenScore × 0.25 + FinancialScore × 0.15 + NarrativeScore × 0.10) × 10
```

**Weights rationale:** T1 structural carries 50% of SCI weight because it is the
only tier where fabrication is physically costly. Narrative (T4+T5) carries 10% —
additional narrative sources do not raise the index meaningfully. This is intentional.

**SCI does not increase with duplicate sources within the same tier/type.** Ten
news articles agreeing contribute the same NarrativeScore as one. Independence is the
unit of measure, not volume.

### Display format (MetricStrip — Phase C)

```
SCI  9.4
  ✓ Power · ✓ Construction · ✓ Freight · ✓ Hiring · ✓ Capex  △ Filings  ✗ Announcement
```

`✓` = T1/T2 covered  `△` = T3 covered (financial, retractable)  `✗` = not covered (narrative only)

---

## 6. SCI-Adjacent Metrics

Three additional metrics derive from the same descriptor layer. These are Phase B+.

### Structural Momentum
Rate of change across T1 structural signals over a rolling window.
> If power + permits + freight are all accelerating simultaneously → high momentum.
> Signals a structural transition before narrative has caught up.

```
StructuralMomentum = Δ(StructuralBurdenScore) / Δt   [normalized 0–1]
```

### Structural Divergence
Disagreement between structural tier and narrative tier on the same hypothesis.
> Structural says accelerating; narrative says stalled → fracture signal.
> This is the Burry signal: physical world diverging from consensus narrative.

```
StructuralDivergence = |StructuralBurdenScore - NarrativeScore|   [0–1]
High divergence + fracture polarity = primary §20 trigger (Direction Honesty Principle)
```

### Structural Precursor Score
How often a structural pattern of this type and tier composition has historically
preceded the outcome being modeled. Extends §19 Path Memory (WO-1869) to apply
to structural signal classes, not just query routes.

```
StructuralPrecursorScore = getLRPrior({ routeKey: structuralSignatureKey, ... })
```

This is the "hold signal Burry needed but never had" — how long fractures of this
structural class have historically taken to realize. Cannot be built until path memory
has structural-signal-tagged records at N ≥ 5.

---

## 7. Competing Hypothesis Ranking (Happy Path implication)

With SCI, the Happy Path engine can compare two hypotheses by structural burden,
not narrative volume. Example from the Founder's framework:

**Hypothesis A:** CEO confirms AI expansion. Analysts agree. NarrativeScore = high. SCI = 1.2.
**Hypothesis B:** Grid demand ↑. Utility queues expand. Permits accelerate. Construction ↑. Water ↑.
  StructuralBurdenScore = high. SCI = 8.7.

**Hypothesis B ranks higher even with less media coverage.**

Implication for Happy Path gate: add `sci` as a multiplier in HP qualification.
A HP candidate with SCI < 3.0 is structurally under-confirmed — surface with caveat.
A HP candidate with SCI > 7.0 has survived multiple independent reality checks — elevate.
Specific threshold values are Founder's call at build time.

---

## 8. File Map

| File | Phase | Change |
|------|-------|--------|
| `src/engine/evidencetiers.js` | A (now) | NEW — T1-T5 descriptor map + EvidenceDescriptor constants |
| `src/engine/pathstore.js` | A (now) | Tag emitted routes with structuralSignatureKey for Structural Precursor Score |
| `src/engine/identitykernel.js` | B (after WO-2004) | NEW — reads descriptors; computes structuralBurdenScore on EvidenceGraph |
| `src/engine/metricsengine.js` | B | Add `sci` as 8th output of `computeMetrics` |
| `src/components/analysis/metricstrip.jsx` | C | Render SCI as 8th hero metric with tier coverage row |

---

## 9. Bottle Test

1. **Reduces ambiguity?** YES — tier is deterministic from source descriptor, not computed
2. **Single dominant output?** YES — SCI as primary metric; adjacent metrics are derived
3. **All boundaries defined?** YES — §16 parity conflict resolved; tier ≠ cone pressure
4. **No undefined deps?** Phase A YES (schema only); Phase B requires WO-2004
5. **No core flexibility growth?** YES — descriptor is read-only schema; SCI is post-formation

**Verdict: Phase A BUILD-READY. Phase B blocked on WO-2004.**

---

## 10. Definition of Done

**Phase A:** `evidencetiers.js` exports descriptor map for all current connectors (EIA power
at minimum). EvidenceNode schema in WO-2004 is stable and references descriptorKey.

**Phase B:** SCI computed on a live CanonicalEvent. Structural divergence detectable.
Hypothesis ranking by SCI functional in Happy Path engine.

**Phase C:** SCI renders as 8th metric on MetricStrip. Tier coverage row visible.
Structural Momentum and Divergence surface on CanonicalEvent detail panel.
