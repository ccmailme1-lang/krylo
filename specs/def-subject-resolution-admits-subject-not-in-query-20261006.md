# DEFECT (DRAFT): Resolved subject does not correspond to the subject named in the query

Status: DRAFT, 2026-10-06. Not filed in Jira. Environment where observed: not recorded (Dev or Prod unknown).

## Observed

Query displayed (truncated by the UI): "Subcritical Systems Subcritical Systems has an NRC-confirmed path to meltdown-proof nuclear plants built in 30 months at up to 55% lower cost. Khosla leads the…"

Result: Target Packet / Structural Brief for **SPACEX**. 175 observations across 6 domains; 1 subject-bound observation (USASPENDING_ENTITY); no formation established.

## Open fact (must be settled before this is treated as a defect)

The displayed query is cut off at "Khosla leads the…". The full text may name SpaceX. If it does, this is not a defect. Required input: the full query text.

## Six-field definition (Ticket Definition Requirement)

1. **Original intent:** the admitted subject corresponds to an entity the query actually names; when resolution is ambiguous or contradicts the explicit subject, the subject is reported unresolved, not substituted.
2. **Acceptance criteria:** for the full query above, trace RAW QUERY -> `interpretStructuralQuery` / `subjectScope` -> admitted subject. Either the subject is the entity the query names, or the subject is unresolved/ambiguous. SPACEX is not admitted unless the full query names it.
3. **Current implementation state:** not traced. Resolver path not yet read. No fix attempted.
4. **Dependencies:** the full query text. `subjectscope.js`, `structuralqueryinterpreter.js`, `entityresolution.js` are the presumed path (unverified).
5. **Superseded by a newer ticket:** none found locally. Jira not searched (no access from this session).
6. **Maps to current product model:** yes (subject resolution gates entity-bound Formation; see `spec-field-signal-vs-entity-attribution.md`).

## Related, not the same

`specs/request-subject-scope-survives-analytical-queries.md` (DRAFT, not filed): opposite symptom, a correctly named entity is lost and the result is NO SUBJECT RESOLVED.

## Non-goals

No change to Formation, relationships, domain measures, or evidence attribution.
