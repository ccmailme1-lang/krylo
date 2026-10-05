# NEED / REQUEST: Resolved Subject Scope Must Survive Analytical Query Interpretation

Status: DRAFT (pasted by the Founder, 2026-10-05). Not filed in Jira.

## Need

KRYLO can correctly resolve a named entity in a query, but then produce `FIELD SCAN — NO SUBJECT RESOLVED` when the query is analytically phrased around that same entity.

Example:

Initial query:

> What structural relationships are forming around Tesla across technology, capital, ownership, labor, and media?

Subject resolves to:

> TESLA

Follow-up:

> Why is Tesla's capital/technology/labor structure showing substantially more observable pressure than its knowledge/media structure?

Observed result:

> FIELD SCAN — NO SUBJECT RESOLVED

The system then attributes the resulting cross-domain co-presence to the live field rather than Tesla.

## The gap

**Subject identity/scope is not reliably preserved through query interpretation when the query is phrased as an analytical, comparative, causal, or derived question.**

A query that explicitly names a resolvable entity must not silently fall back to an unscoped field scan merely because the query's grammatical structure differs from the canonical named-entity query pattern.

## Required behavior

When a query contains a resolvable named entity:

1. Resolve the entity.
2. Preserve that entity as the query subject throughout interpretation.
3. Scope observations, relationships, evidence, and derived structural analysis to that subject.
4. If the entity is explicitly present but cannot be resolved, return an explicit unresolved-entity state rather than silently converting the query to a field scan.
5. `FIELD SCAN — NO SUBJECT RESOLVED` must only occur when no subject is actually present/resolvable under the query contract.

## Important distinction

Do **not** solve this by making every subsequent query inherit the previous subject automatically.

The subject must be established through the actual query interpretation / entity-resolution path.

## Acceptance Criteria

### AC1 — Explicit named subject survives analytical phrasing

Given a query containing a resolvable named entity plus analytical language such as: why, how, what explains, what connects, what is driving, what relationships connect, why is X showing, what changed around X — the resolved entity remains the subject.

### AC2 — No silent field-scan downgrade

If a resolvable entity is present in the query, the result must not become `FIELD SCAN — NO SUBJECT RESOLVED` because of the query's analytical phrasing.

### AC3 — Tesla regression

This query must resolve to TESLA:

> What structural relationships connect Tesla's capital, technology, and labor conditions?

The resulting observations and relationships must be attributable to Tesla where evidence supports attribution.

### AC4 — Generic entity coverage

The fix must work for arbitrary resolvable named entities, not a Tesla-specific rule. Test with at least three different entity types/names already supported by the resolver.

### AC5 — Unresolved entity remains honest

A name that cannot be resolved must not be fabricated or guessed into a subject. The system must retain the existing unresolved/no-attribution behavior.

### AC6 — Field scan remains available

A genuinely subjectless query must still produce a field scan. Example:

> What structural relationships are forming between capital, technology, and labor?

This must remain unscoped unless the query contract explicitly establishes a subject.

### AC7 — Attribution boundary preserved

Preserving the subject does not mean every field observation becomes a subject observation. Only evidence that passes the existing subject-attribution/admission rules may be attributed to the entity.

### AC8 — No fabricated relationship

The change is to **scope resolution**, not admission standards. Subject resolution must not cause cross-domain co-presence to become canonical ρ automatically.

### AC9 — Regression coverage

Add tests covering: canonical named-entity query; analytical "why" query; analytical "how" query; relationship query; comparative/derived query; unresolved entity; genuinely subjectless field query.

### AC10 — Reachability

Verify the full path: user query → query interpretation → entity resolution → subject identity → observation scoping → relationship analysis → structural brief → UI. The final UI must show the resolved subject rather than `FIELD SCAN — NO SUBJECT RESOLVED`.

## Non-goals

* No Tesla-specific parsing.
* No automatic inheritance of the previous query's subject.
* No loosening of evidence admission.
* No conversion of co-presence into canonical ρ.
* No change to the six-domain taxonomy.
* No new relationship types.
* No manufactured subject attribution where provenance does not support it.

## Definition of Complete

Complete only when an explicitly named, resolvable subject survives analytical query interpretation through to the rendered structural brief, while genuinely subjectless queries continue to produce field scans and unresolved entities remain unresolved.

## Related observation (not part of the pasted text)
In the 2026-10-04 11-query run on Dev (localhost), Walmart and Berkshire Hathaway both showed "no entity resolved" (`specs/query-run-trends-20261004.md`). Not confirmed to be the same cause.
