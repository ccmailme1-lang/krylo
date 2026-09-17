# SPEC — Analysis Result Formation Deep Dive

**Status:** RATIFIED — 2026-09-07
**Version:** v0.3
**Supersedes:** v0.2

**Ratification note:** AC-13 ("No Parallel Formation Pipeline") is ratified as the target
requirement, not a claim that the current repository already satisfies it. AF-01 (Relationship/
Formation Pathway Fragmentation — `formationinference.js` vs `aiae.js` vs
`formationlayer/formationrelationship.js`, zero cross-wiring, verified 2026-09-06) is the
architecture-investigation dependency for achieving AC-13, tracked separately as its own work
item (KRYL-1281, opened 2026-09-07). Ratifying this spec does not depend on resolving that
investigation first — the spec defines the desired product topology; AF-01 determines the
implementation delta. AC-07 (Formation placement in the HAPPY PATH, between BLUF and Body &
Key Findings) is confirmed NOT yet satisfied by the live HAPPY PATH panel as of this ratification
(verified directly against a live screenshot, 2026-09-07: `01 · BLUF / INTRODUCTION` is
immediately followed by `02 · BODY & KEY FINDINGS`, no Formation section between them) —
implementation, not just spec language, is required.

---

## 1. Purpose

KRYLO begins with a customer question.

**Analysis Search** is the sole entry point into an investigation. The resulting **Formation Map** is the structural deep dive of that same investigation.

Formation is therefore an integral component of the Analysis Result—not an independent search, competing investigation, separate destination, or downstream analytical product.

This specification defines the conceptual, narrative, and architectural relationship between Analysis and Formation, including the placement of Formation within the **HAPPY PATH → EXPORT BRIEF**.

---

## 2. Product Principle

```text
CUSTOMER QUESTION
        ↓
ANALYSIS SEARCH
        ↓
ANALYSIS RESULT
        ├── Findings / Evidence / Observations
        └── Formation Map
                ↓
        Discussion & Analysis
                ↓
        Conclusion & Outlook
                ↓
        Action Plan
```

The customer asks once.

KRYLO carries that question through the investigation.

Formation reveals the structural relationships established by that investigation.

---

## 3. Core Definition

### 3.1 Analysis Search

Analysis Search is the single entry point.

The query establishes:

* subject
* scope
* query context
* temporal scope
* investigative intent

Formation inherits this context.

### 3.2 Formation

Formation is the structural representation of relationships admitted through the Analysis investigation.

Formation does not initiate a second investigation.

It does not independently reinterpret the subject.

It does not manufacture observations or relationships.

### 3.3 Formation's Role

Formation answers:

> **How is what KRYLO found structurally connected?**

Analysis answers:

> **What did KRYLO find?**

Action Plan answers:

> **What can I do about it?**

These are different views of one continuous investigation.

---

# 4. Analysis Result Composition

The Analysis Result contains two complementary information layers:

### A. What the investigation established

* Subject
* Observations
* Evidence
* Domain findings
* Established relationships
* Unresolved information
* Unavailable information

### B. How the findings connect

* Formation Map
* Structural relationships
* Relationship conditions
* Resource / Time / Cost characteristics
* Evidence traceability

The Formation Map MUST remain bound to the same investigation that produced the findings.

---

# 5. HAPPY PATH → EXPORT BRIEF TOPOGRAPHY

The exported Brief SHALL follow this conceptual sequence:

```text
HAPPY PATH
└── EXPORT BRIEF
    │
    ├── 00 · HEADER & CLASSIFICATION
    │
    ├── 01 · BLUF / INTRODUCTION
    │
    ├── FORMATION MAP
    │
    ├── 02 · BODY & KEY FINDINGS
    │
    ├── 03 · DISCUSSION & ANALYSIS
    │
    └── 04 · CONCLUSION & OUTLOOK
```

## 5.1 Formation Placement

**The Formation Map SHALL appear immediately after the BLUF / Introduction and before the Body & Key Findings.**

Formation SHALL NOT be treated as a conventional numbered section equivalent to Body, Discussion, or Conclusion.

It is a **structural orientation layer within the Analysis Result**.

Conceptually:

```text
00 · Header & Classification
        ↓
01 · BLUF / Introduction
        ↓
   ┌──────────────────────────────┐
   │ FORMATION MAP                │
   │                              │
   │ Structural orientation       │
   │ of the investigation         │
   └──────────────────────────────┘
        ↓
02 · Body & Key Findings
        ↓
03 · Discussion & Analysis
        ↓
04 · Conclusion & Outlook
```

---

# 6. Why Formation Precedes Key Findings

The Formation Map is not merely an illustration of findings already consumed.

It provides the **structural orientation through which subsequent findings can be understood**.

The intended progression is:

> **BLUF → STRUCTURE → DETAIL → INTERPRETATION → OUTLOOK**

The BLUF establishes what matters.

Formation establishes how the investigation is structurally organized.

Key Findings provide the detailed findings that establish and substantiate that structure.

Discussion & Analysis interprets the established structure.

Conclusion & Outlook identifies what follows from the investigation.

This preserves:

> **Recognition precedes narrative detail.**

---

# 7. Formation Is Not Metadata

Formation MUST NOT be placed within or treated as part of:

**00 · Header & Classification**

Header & Classification establishes:

* provenance
* epistemic state
* scope
* classification
* temporal context
* originator
* signal / validity state

Formation is a synthesized structural result derived from admitted evidence.

It therefore belongs to the **result surface**, not the metadata boundary.

---

# 8. Formation Is Not a Retrospective Illustration

Formation MUST NOT be positioned as a later visualization whose purpose is merely to summarize previously presented findings.

Specifically:

```text
FINDINGS → FORMATION
```

is insufficient as a conceptual model when Formation is being used only to retrospectively illustrate the findings.

The intended relationship is:

```text
BLUF
  ↓
FORMATION
  ↓
FINDINGS
  ↓
ANALYSIS
```

Formation provides the structural frame within which the detailed findings can subsequently be read.

---

# 9. Formation as Structural Orientation

Formation is the customer's first structural view of the investigation after the BLUF.

Its purpose is to expose:

* established relationships
* structural arrangement
* relationship character
* relationship-level Resource / Time / Cost observations
* evidence-bearing structure

The Formation Map is therefore a **recognition surface**, not a metrics dashboard.

The customer should be able to recognize structural differences before being required to absorb detailed narrative explanation.

---

# 10. Progressive Disclosure

The Brief SHALL preserve the following conceptual progression:

```text
TAKEAWAY
   ↓
STRUCTURE
   ↓
EVIDENCE / FINDINGS
   ↓
INTERPRETATION
   ↓
OUTLOOK
```

Within Formation itself:

```text
FORMATION
   ↓
RELATIONSHIP
   ↓
CONDITION
   ↓
R/T/C
   ↓
EVIDENCE
```

Formation does not replace evidence.

It organizes the customer's perception of the relationships established by evidence.

---

# 11. Relationship Between Findings and Formation

Key Findings and Formation are complementary rather than sequentially independent.

**Key Findings establish what was observed.**

**Formation establishes how those observations are structurally related.**

Therefore:

> Formation does not manufacture the findings it connects.

Every visible structural relationship MUST remain traceable to observations and evidence admitted through the Analysis investigation.

---

# 12. Formation Data Boundary

The canonical data flow remains:

```text
Analysis Query
      ↓
Subject + Scope
      ↓
Domain Observations
      ↓
Evidence
      ↓
Relationship Admission
      ↓
Formation
      ↓
Formation Map
```

There SHALL be:

* no parallel Formation investigation
* no second Formation search
* no independent Formation relationship store
* no query-specific synthetic Formation state
* no unsupported relationship synthesis

R/T/C observations SHALL be admitted to existing relationships and materialized on the canonical relationship geometry.

---

# 13. Single Investigation Invariant

### AR-FORM-01 — Single Investigation

Formation MUST remain part of the originating Analysis investigation.

Formation interaction MAY change:

* displayed view
* selection
* temporal position
* inspection depth
* relationship visibility

Formation interaction MUST NOT change the originating query or investigative scope unless the customer explicitly initiates a new Analysis Search.

---

# 14. Formation Result-Bound Invariant

### AR-FORM-02 — Formation Inherits Context

Formation SHALL inherit:

* subject
* scope
* temporal context
* investigative context

from the originating Analysis Search.

No independent Formation context may be silently introduced.

### AR-FORM-03 — Formation Is Result-Bound

Formation MUST be derived exclusively from structural evidence **admitted through the Analysis investigation**.

---

# 15. Structural Deep Dive

Formation is not:

* a score
* a risk indicator
* a health indicator
* a recommendation engine
* a verdict
* an AI conclusion
* a replacement for evidence

Formation represents established structure.

The customer remains responsible for interpretation, prediction, decision, and action.

KRYLO's responsibility is to make the structure:

* accurate
* attributable
* coherent
* inspectable

---

# 16. R/T/C Material Continuity

R/T/C observations remain characteristics of existing relationships.

They SHALL NOT create:

* new relationships
* new formations
* parallel maps
* Formation-level aggregate scores

The canonical relationship geometry remains singular.

```text
Relationship
│
├── Structural
│   ├── State
│   ├── Strength
│   └── Confidence
│
└── Observational
    ├── Resource
    ├── Time
    └── Cost
```

---

# 17. Export Brief vs Live Formation

The **Export Brief** and live Formation experience serve different presentation modes of the same investigation.

### Live Formation

May support:

* spatial exploration
* selection
* expansion / collapse
* tracing
* comparison
* temporal navigation
* inspection

### Export Brief

Must preserve a coherent linear reading path.

The Formation Map therefore occupies a deliberate structural position rather than remaining permanently persistent across the document.

It should be visually prominent without becoming a competing navigation surface.

---

# 18. No Separate Formation Destination

The following pattern is prohibited:

```text
Search
  ↓
Analysis
  ↓
Formation Search
  ↓
Formation
```

The required pattern is:

```text
Search
  ↓
Analysis Result
  ├── Findings
  └── Formation Map
```

Formation is a deep dive **within the result of the original investigation**.

---

# 19. Acceptance Criteria

### AC-01 — Query Continuity

Formation remains bound to the originating Analysis Search.

### AC-02 — No Second Query

Formation does not require a second query.

### AC-03 — Shared Context

Formation inherits the Analysis subject, scope, and temporal context.

### AC-04 — Structural Derivation

Formation is derived from structural evidence admitted through the Analysis investigation.

### AC-05 — Evidence Traceability

Every visible structural relationship remains traceable to supporting evidence / observations.

### AC-06 — Result Integration

Formation is rendered as an integral component of the Analysis Result.

### AC-07 — Export Placement

In the HAPPY PATH → EXPORT BRIEF, Formation appears immediately after the BLUF / Introduction and before Body & Key Findings.

**Status at ratification: NOT YET SATISFIED.** Verified directly against the live HAPPY PATH
panel, 2026-09-07 — `01 · BLUF / INTRODUCTION` is immediately followed by `02 · BODY & KEY
FINDINGS`. Implementation required.

### AC-08 — Structural Orientation

Formation functions as the structural orientation layer of the Brief rather than a retrospective illustration of findings.

### AC-09 — No Unsupported Synthesis

Formation does not manufacture observations, relationships, or conclusions unsupported by the investigation.

### AC-10 — No Verdict

Formation does not substitute for customer interpretation, prediction, decision, or action.

### AC-11 — Temporal Continuity

Temporal exploration within Formation changes the portion of the existing investigation being viewed, not the investigative scope.

### AC-12 — Material Continuity

Absent R/T/C, Formation remains visually equivalent to the established baseline.

When R/T/C exists, it materializes on the existing canonical relationship geometry.

### AC-13 — No Parallel Formation Pipeline

There is one canonical Formation data path and one canonical relationship geometry.

**Status at ratification: TARGET REQUIREMENT, not yet satisfied.** AF-01 (KRYL-1281) found three
independently-implemented relationship/formation systems (`formationinference.js`, `aiae.js`,
`formationlayer/formationrelationship.js`) with zero cross-wiring, verified 2026-09-06. Ratifying
this spec commits to AC-13 as the target architecture; it does not assert the repository already
satisfies it. Reconciliation is tracked separately as KRYL-1281, not blocking this ratification.

---

# 20. Governing Topography

The governing HAPPY PATH is:

```text
CUSTOMER QUESTION
        ↓
ANALYSIS SEARCH
        ↓
ANALYSIS RESULT
        ↓
BLUF
        ↓
FORMATION
        ↓
FINDINGS
        ↓
DISCUSSION / ANALYSIS
        ↓
CONCLUSION / OUTLOOK
        ↓
ACTION PLAN
```

The governing conceptual progression is:

> **What matters → How it is connected → What was established → What the structure means → What follows**

---

# 21. Governing Statement

> **Analysis Search is where the customer asks. Analysis investigates. The Formation Map is the structural orientation and deep dive into the investigation revealed by that Analysis. The BLUF establishes what matters; Formation establishes how it is connected; the Findings establish the details; Discussion interprets the established structure. The customer asks once. KRYLO carries the question through the investigation. Recognition precedes narrative.**
