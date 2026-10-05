# WORK ORDER: FIELD SCAN → Surface Structural Candidates from Cross-Domain Co-Presence

Type: Product Capability / Enhancement
Status: DRAFT, marked "Started" in the pasted text (Founder, 2026-10-05). Not filed in Jira.

## Problem

Theme-based field queries can identify strong domain concentration and cross-domain co-presence, but stop before identifying the specific entities or infrastructure nodes repeatedly occupying those intersections.

Example:

> "Where are the infrastructure bottlenecks and dependencies forming underneath the AI industry before they become obvious?"

KRYLO currently returns domain concentrations and co-presences but does not answer **where** the emerging structural concentration is located.

## Required Capability

Add a **FIELD SCAN → STRUCTURAL CANDIDATES** analytical layer.

Given a field/theme query, KRYLO should identify named entities, infrastructure nodes, or other participants that repeatedly appear across the strongest relevant cross-domain intersections.

Candidates must remain explicitly **candidates** until sufficient evidence establishes a canonical relationship or formation.

## Truth Boundary

* Candidate ≠ admitted relationship.
* Co-presence ≠ relationship.
* Domain magnitude ≠ bottleneck.
* Repeated appearance ≠ dependency.
* Do not infer causality.
* Do not fabricate missing participants or evidence.
* Preserve unresolved subject state for genuinely subjectless field queries.
* Canonical ρ remains unchanged until normal admission requirements are satisfied.

## Acceptance Criteria

1. A field/theme query can proceed from domain scan to structural candidates.
2. Candidates are specific named entities or identifiable infrastructure nodes grounded in observed evidence.
3. Candidates are ranked or surfaced based on repeated participation across relevant domain intersections.
4. Each candidate has traceable supporting observations.
5. The UI clearly distinguishes **STRUCTURAL CANDIDATE** from canonical ρ and established formation.
6. The system can state when no credible candidate can be established.
7. No candidate is promoted to a bottleneck, dependency, or relationship without satisfying existing admission rules.
8. Existing subject-resolved queries and canonical relationship behavior remain unchanged.
9. A field query such as the AI infrastructure query can answer **where to look next**, rather than stopping at domain co-presence.
10. The complete path is verified: query → field interpretation → evidence extraction → candidate generation → persistence/retrieval as required → user-visible candidate output.

## Example Desired Output

> **STRUCTURAL CANDIDATES**
>
> Technology is the dominant field, with capital and labor the strongest adjacent domains.
>
> The following entities repeatedly appear across those intersections and warrant structural examination:
>
> **Candidate A** — Technology ↔ Capital ↔ Labor
> Evidence: (the pasted text is cut off here)

## Open question (not part of the pasted text)
"Warrant structural examination" and "where to look next" read close to a recommendation, which KRYLO's rule against telling the guest what to decide (Formation Is Not a Verdict, section 21) does not allow. The wording needs a Founder decision before build.
