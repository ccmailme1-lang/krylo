# DEFECT (DRAFT): Subject selection collapses into entity resolution — named-but-unregistered subject becomes `FIELD SCAN — NO SUBJECT RESOLVED`

Status: DRAFT, 2026-10-07. Not filed in Jira (KRYL number pending — Jira is the numbering authority).
Reported by: Founder, from a live production query (Analysis, 2026-10-07).

## Observed

Query submitted (Analysis → New Query):

> Good investment? Media & Entertainment $110bn Paramount / WBD Paramount's $31.00/share cash offer determined superior to a signed Netflix all-stock merger aft…

Rendered:

- Structural Brief header: `FIELD SCAN — NO SUBJECT RESOLVED`
- Domain panel reason: `no entity resolved; no decision cues; no resolved geo; no structural frame`
- 58 observations across 6 domains, presented as field-level co-presence only.

Separately observed in the same render, not investigated: page header reads `NEGOTIATION OPEN`. Its source and whether it is consistent with an UNRESOLVED subject are unknown.

## Expected (Founder)

| Field | Expected |
|---|---|
| Subject | Paramount / WBD (selected from the submitted target) |
| Objective | INVESTMENT |
| Entity resolution | UNRESOLVED or AMBIGUOUS (per resolution semantics) |
| Media & Entertainment | Context |
| $110bn | Context |
| Netflix | Context / comparison |
| Subject replacement | Prohibited |

Required distinction:

```
SUBJECT SELECTED (Paramount / WBD) → ENTITY RESOLUTION → UNRESOLVED / AMBIGUOUS
```

not

```
Paramount / WBD → cannot resolve as one entity → NO SUBJECT
```

## Verdict on current behaviour (Founder)

| Check | Result |
|---|---|
| Subject selection | FAIL |
| Objective selection | FAIL |
| Subject / resolution separation | FAIL |
| Field-level withholding, given resolution failed | CORRECT |
| Downstream substitution (no attribution to Paramount or Netflix) | CORRECT |

Attribution is withheld correctly, but one layer too early.

## Root cause (traced in code, 2026-10-07 — Verification: L/C, not runtime-reproduced)

Classification: **Class C (spec/implementation divergence)** in the sense of CLAUDE.md §1: `subjectScope()` implements "subject = resolved registry entity". The requested contract is "subject is selected first, then resolved". That needs a Founder ruling on the governing contract before any code changes.

1. **Subject selection and entity resolution are one operation.** `src/engine/subjectscope.js:70-93`: `subjectScope()` returns `kind: 'ENTITY'` only if `resolve()` matches a candidate. There is no state for "a subject is named in the query but does not resolve". The final fallback (`:132`) is `UNRESOLVED` with exactly the reason string rendered above.
2. **None of the named parties are in the registry.** `src/data/entityregistry.json` (56 hand-curated entries) has 0 matches for Paramount, Warner, WBD or Netflix. `resolve()` (`src/engine/entityresolution.js:192-224`) therefore returns null for every candidate window, as it is designed to (withhold beats fabricate).
3. **The objective is dropped.** `src/engine/querycontext.js:76-88`: `deriveDecisionCues()` tests `\binvest(?:s|d|ed|ing|e)?\b`, and "investment" does not match it. `subjectScope()` step 3 (`DECISION_FRAME`) therefore never fires for "Good investment?". "good" is also in `TRIM_WORDS` (`subjectscope.js:30`).
4. **No structural frame.** `classifyFrame()` returned `NO_FRAME` for this text (per the rendered reason). Not further traced.
5. **Rendering.** `src/components/analysis/structuralbrief.jsx:96` and `src/engine/briefcontext.js:43-52` map `UNRESOLVED` to `NO SUBJECT RESOLVED`. They render the upstream state faithfully. The defect is upstream.

## Six-field definition (CLAUDE.md §10)

1. **Original intent.** A query that names its subject keeps that subject as the unit of analysis, even when the subject cannot be mapped to one canonical registry entity. The query's objective (e.g. INVESTMENT) is captured independently of subject resolution.
2. **Acceptance criteria.**
   - AC1 — Subject selection is a separate step from entity resolution. A subject named in the target is selected and carried forward with a resolution state (RESOLVED / AMBIGUOUS / UNRESOLVED).
   - AC2 — `FIELD SCAN — NO SUBJECT RESOLVED` appears only when no subject is selected, not when a selected subject fails to resolve.
   - AC3 — Objective selection is independent of subject. "Good investment?" yields OBJECTIVE = INVESTMENT whether or not the subject resolves.
   - AC4 — Context terms (sector, deal size, counterparties such as Netflix) are captured as context, never promoted to subject, and never substituted for the subject.
   - AC5 — No attribution loosening. With an UNRESOLVED or AMBIGUOUS subject, field observations remain unattributed to any entity (the current CORRECT behaviour is preserved).
   - AC6 — A transaction/relationship subject ("Paramount / WBD") is a valid selected subject. It is not required to be a single company.
   - AC7 — Regression fixture: the query above. Expected: Subject = Paramount / WBD, Objective = INVESTMENT, Resolution = UNRESOLVED or AMBIGUOUS, no subject replacement.
   - AC8 — Generic, not Paramount-specific. At least three other named-but-unregistered subjects pass the same contract, and a genuinely subjectless query still produces a field scan.
   - AC9 — Reachability (Full Gate, §10): user query → querycontext → subject selection → entity resolution → scope → structural brief → UI header, verified on a real query.
3. **Current implementation state.** Subject exists only as `subjectScope().kind === 'ENTITY'` (registry match). No selected-but-unresolved state. Objective capture relies on the 15-verb `DECISION_CUE_VERBS` list, which misses noun forms ("investment").
4. **Dependencies.** Founder ruling on the governing Query Contract (no spec under that name exists in `specs/` as of 2026-10-07; nearest is `specs/request-subject-scope-survives-analytical-queries.md`). Consumers of `subjectScope()` / `isScopable()` / `canonicalBriefSubject()` must be traced repo-wide (§2) before any change.
5. **Superseded by a newer ticket?** No. Overlaps `specs/request-subject-scope-survives-analytical-queries.md` (DRAFT, 2026-10-05) item 4 / AC5 ("explicit unresolved-entity state rather than silently converting the query to a field scan"). That draft covers registered entities lost to analytical phrasing. This one covers named subjects absent from the registry and the objective. Decide whether to merge or link them.
6. **Maps to the current product model?** Yes. §20.8 (expose the relationship, don't make the analyst assemble it), §21 (presentation of substantiated structure), §1 Absence-Is-Signal (an unresolved subject is a classified state, not a null that becomes "no subject").

## Non-goals

- No adding Paramount, WBD or Netflix to `entityregistry.json` as the fix. That would pass the fixture without fixing the contract.
- No fuzzy-matching loosening in `resolve()`.
- No attribution of field observations to an unresolved or ambiguous subject.
- No change to the six-domain taxonomy or admission rules.
- No automatic inheritance of a prior query's subject.

## Bottle Test

Not yet run. BLOCKED pending the Query Contract ruling (dependency 4). The file map for the fix is TBD until then.
