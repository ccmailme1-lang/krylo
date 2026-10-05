# NEED / REQUEST: Structural Brief Should Synthesize Observable Structure When No Formation Is Established

Status: DRAFT (pasted by the Founder, 2026-10-05). Not filed in Jira.

## Need

When KRYLO observes substantial activity across multiple domains but cannot establish a canonical cross-domain relationship, the Structural Brief currently stops at:

> "No domain formation established…"

This is technically truthful, but insufficient for the product's Structural Intelligence promise.

Example, OpenAI:

* 175 observations
* 6 of 6 domains observed
* TECHNOLOGY: 76
* CAPITAL: 74
* LABOR: 57
* OWNERSHIP: 49
* MEDIA: 39
* KNOWLEDGE: 14
* No domain formation established because fewer than two domains are connected.

The system correctly withholds formation. The need is for a grounded synthesized interpretation of the observable structure that led to that determination.

## Required behavior

When no formation is established, KRYLO should still produce a grounded structural readout that distinguishes:

1. **Observable domain pressure**
2. **Observed cross-domain co-presence**
3. **Relationships actually admitted**
4. **Relationships not yet established**
5. **Material structural divergence or imbalance**
6. **What evidence would be required to establish the next relationship**

The synthesis must remain grounded in admitted observations and existing structural rules.

## Example desired behavior

For the OpenAI result:

> **Technology and capital are the two strongest observed domains, with labor also materially present. However, no cross-domain relationship is currently established because the evidence does not yet connect those domains. The current structure therefore shows concentrated activity rather than demonstrated convergence. Knowledge is materially weaker than the other domains, creating an observable divergence but not an admitted relationship.**

This is an interpretation of the existing evidence, not a new relationship.

## Guardrails

The synthesis must NOT: convert domain magnitude into a relationship; convert co-presence into canonical ρ; infer causality; invent evidence; use field observations as subject observations; treat formation as a verdict; fill missing measures; imply that a relationship exists when admission criteria are unmet.

## Acceptance Criteria

* **AC1 — No-formation cases remain informative.** A subject with substantial multi-domain observations but no admitted formation receives a concise structural synthesis.
* **AC2 — Formation remains withheld.** The system continues to state explicitly that no formation has been established.
* **AC3 — Co-presence is labeled correctly.** Any cross-domain pattern not admitted as a relationship is explicitly identified as co-presence or equivalent non-admitted structure.
* **AC4 — Divergence may be surfaced.** Material differences between domain observations may be surfaced as structural divergence, provided the underlying observations support it.
* **AC5 — No causal inference.** The synthesis cannot state or imply that one domain caused another unless an admitted relationship/evidence path supports that claim.
* **AC6 — Evidence boundary is visible.** The brief identifies the evidence limitation preventing relationship admission when that limitation is known.
* **AC7 — Subject scope is preserved.** Only observations attributable to the resolved subject may contribute to the subject-level synthesis.
* **AC8 — Field scans remain separate.** Subjectless field scans must not be synthesized as if they describe a named entity.
* **AC9 — Existing truth standard remains intact.** NO_EVIDENCE, UNRESOLVED, UNSUPPORTED, and absence states remain distinct and are not converted into positive findings.
* **AC10 — UI makes the distinction legible.** The guest can immediately distinguish what KRYLO observes, what KRYLO connects, and what KRYLO has not established.

## Definition of Complete

For a subject with substantial observations but no admitted formation, KRYLO produces a useful, evidence-grounded structural interpretation while explicitly withholding any relationship or formation that the evidence does not establish.

The system should answer "What does the observable structure currently tell us?" without pretending it has answered "What relationship has formed?"

## Open question (not part of the pasted text)
The OpenAI example numbers are field-wide readings, while AC7 allows only subject-attributable observations into the synthesis. The example needs a subject-level version before build.
