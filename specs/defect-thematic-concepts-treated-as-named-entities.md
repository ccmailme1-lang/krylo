# DEFECT: Thematic Concepts Incorrectly Treated as Named Entities

Type: Defect
Status: DRAFT, marked "Started" in the pasted text (Founder, 2026-10-05). Not filed in Jira.

## Problem

KRYLO incorrectly interprets thematic concepts in a field-level query as resolvable named entities.

Example query:

> What structural dependencies are forming around multimodal AI across technology, knowledge, capital, labor, and ownership?

The interpreter treated **"multimodal"** and **"AI"** as structural participants and produced:

> "2 structural participants were named in the query…"

followed by:

> "1 of 1 pair involve a term that isn't a resolvable named entity."

This incorrectly downgrades a valid thematic query into an entity-resolution failure.

## Required Behavior

The interpreter must distinguish between:

* **Resolvable named entities** — companies, people, organizations, places, etc.
* **Thematic concepts / fields** — e.g. multimodal AI, AI infrastructure, robotics, semiconductor manufacturing.
* **Explicitly subjectless queries**.

"Multimodal AI" should be interpreted as a **field/theme**, not as two named entities.

## Acceptance Criteria

1. "Multimodal AI" is interpreted as a thematic field when used in this query context.
2. "multimodal" and "AI" are not independently emitted as structural participants.
3. The query proceeds as a field/theme scan without a false entity-resolution failure.
4. The resulting Target Packet identifies the field/theme explicitly.
5. Domain observations and cross-domain co-presence remain available.
6. No canonical relationship or formation is created solely from thematic interpretation.
7. Genuine named entities continue to resolve normally.
8. Mixed queries preserve both dimensions when appropriate, e.g. "What dependencies are forming around NVIDIA in multimodal AI?" — NVIDIA = named entity, multimodal AI = thematic context.
9. A genuinely unresolvable named entity continues to produce the existing unresolved state.
10. Real-user reachability is verified from query submission through interpretation, field scan, and user-visible Target Packet.

## Guardrail

Do not solve this by adding a hardcoded exception for "multimodal AI." The interpreter must correctly distinguish **entity references from thematic concepts generally**.

## Definition of Complete

A thematic query such as the multimodal AI query produces a valid field-level structural analysis without incorrectly reporting named-entity resolution failure, while genuine entity resolution behavior remains unchanged.

## Related observation (not part of the pasted text)
The Walmart page in the 2026-10-04 11-query run on Dev (localhost) showed the same message ("2 structural participants were named in the query, but 1 of 1 pair involve a term that isn't a resolvable named entity") with participants listed as TECHNOLOGY and OWNERSHIP, which are domain words from the query, not entities. See `specs/query-run-trends-20261004.md` and `specs/request-subject-scope-survives-analytical-queries.md`. Not confirmed to be the same cause.
