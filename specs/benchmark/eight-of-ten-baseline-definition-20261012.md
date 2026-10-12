# The 8 out of 10 baseline: what the frozen rubric requires, stated exactly (2026-10-12)

Source: the frozen rubric and scorer 1's rules (`specs/benchmark/scoring-rules-m1.md`, R2). Nothing here changes a rule or a score. It states what an 8 is made of, so every packet can be judged against it.

## 1. The score
Raw total 0 to 10 from seven criteria; the 1 to 10 value is the raw total rounded; "at or above 8" has been counted on the rounded value (raw 7.5 or more). A strict reading would need raw 8.0 or more: both counts are reported side by side in every evaluation.

| Criterion | Points | What earns the points |
|---|---|---|
| 1 Subject alignment | 2 | 0 subject unresolved; 1 resolved, nothing bound to it; 2 resolved with observations bound to it |
| 2 Relationship coverage | 2 | domains the question names that have an admitted relationship: 0 none, 1 some, 2 all |
| 3 Formation integrity | 1 | the formation shown is built from admitted relationships only (0 for an unresolved subject) |
| 4 Structural depth | 2 | 0 no synthesis, a label not supported by its evidence, or no named domain covered; 2 every named domain covered, linked or supported, and the synthesis connects relationships; otherwise 1 |
| 5 Traceability | 1 | every synthesis statement passes the validator and at least three filing accessions are shown |
| 6 Temporal honesty | 1 | the source-dated change section with its retrieval basis (or "nothing to compare") is shown |
| 7 Consistency | 1 | 0.5 the MAP's formation equals Analysis's on a frozen snapshot with no page errors; 0.5 History rebuilt from the store shows the same formation and relationship count |

## 2. What an 8 therefore requires
An 8 is the integrity floor plus coverage of what the question names:
- **Integrity floor, 6 points, all required:** subject resolved with observations bound (2), formation from admitted relationships only (1), traceability (1), temporal section (1), MAP and History agree with Analysis (1).
- **Plus at least 2 more from criteria 2 and 4:** at least one named domain covered gives criterion 2 at least 1 and criterion 4 at least 1; every named domain covered, with connecting synthesis, gives up to 4.

| Situation | Maximum raw | Consequence |
|---|---|---|
| Subject unresolved | 0 | no packet can pass; identity is the first gate |
| Resolved, no named domain covered | 6 | cannot reach 8, whatever else is perfect |
| Resolved, some (not all) named domains covered | 8 | passes only if every other criterion is full |
| Resolved, all named domains covered and connected | 10 | an 8 has two points of slack |

So the bar is reachable without covering every domain, but a question about domains that have no admitted relationship (or an unresolved subject) cannot pass, and a packet with partial coverage has no slack: one lost point elsewhere (a missing accession, a MAP disagreement, a page error) fails it.

## 3. What currently stops a packet from reaching 8 (from the recorded baselines)
- Subject unresolved: 0 (Databento, Integrated Biosciences, Daytona in the frozen private-company set).
- A question naming only domains with no admitted relationship: capped at 6 (technology, knowledge, media questions; labor questions are newly covered for listed companies).
- Packets scoring 7.5 to 7.9 under a strict reading: counted as 8 on the rounded rule.
- Independent reviewers rate lower than the mechanical score on the same page (GPT: 5.5 and 7 on a Broadcom packet the scorer put at 8.0); those ratings are kept separate and are not part of the mechanical pass.

## 4. Populations the baseline applies to
35-case benchmark (frozen v1), 20-query routine set (frozen v1), 8-query private-company set (frozen v1, 2026-10-12). Each is scored separately; a population passes only when every case in it is at or above 8; averages never stand in for that.
