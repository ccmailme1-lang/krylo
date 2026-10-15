# SPEC (DRAFT): Analysis — ask or browse by domain, type-ahead, results table

Status: DRAFT, 2026-10-15. Not filed in Jira. No code written. Build theme: current black.
Mockups: `specs/reskin/analysis-explore-dark.html` (build target), `specs/reskin/analysis-explore-light.html` (reskin reference). Pattern reference: Glimpse "Discover Trends" (screen recording, 2026-10-15).

## Six-field definition

1. **Original intent:** give a guest without a ready question a way in (browse the six domains), help a guest with a question bind a subject (type-ahead), and show related entities as a scannable table.
2. **Acceptance criteria:** see "Acceptance".
3. **Current implementation state:** question box and idle view in `src/components/analysis/analysisidlefield.jsx`. Domain list exists in `src/engine/ontology.js` (`ANALYSIS_DOMAIN_ORDER`). No browse view, no type-ahead, no related-entity table found (lexical check only — concept and behavioral checks not yet run).
4. **Dependencies:**
   - D1: per-domain observation count — source **TBD**.
   - D2: top entities per domain with counts — source **TBD**.
   - D3: type-ahead candidates — should come from the existing entity resolver, not a new list. Resolver path **UNCONFIRMED** (see open subject-resolution defects in `specs/`).
   - D4: results table rows (related entities, 12-month observation series, change, volume, domain presence, state) — source **TBD**. Change must carry polarity (§16).
5. **Superseded by a newer ticket:** none found locally. Jira not searched.
6. **Maps to current product model:** yes, with a §15/§20 caution: browse and ranking must not rank by past leverage alone; the table shows observed volume and state, not recommendations.

## Suggested split (one ticket each)

1. **Browse by domain** (D1, D2) — smallest; can ship first.
2. **Type-ahead** (D3) — "Analyze “…” ↵" first, then entities and domains.
3. **Results table** (D4) — largest; Download CSV and paging.

## File map

| File | Change |
|---|---|
| `src/components/analysis/domainbrowse.jsx` (new) | Six domains (left) with counts; top entities (right). Click entity → existing query flow with that subject. |
| `src/components/analysis/typeahead.jsx` (new) | Dropdown under the existing textarea; Enter keeps today's submit behavior. |
| `src/components/analysis/relatedentities.jsx` (new) | Table; "← Back to domains"; Download CSV; paging. |
| `src/components/analysis/analysisidlefield.jsx` | Mount the three pieces in the idle view. Question box unchanged (600px, 4 rows). |
| Data producers for D1–D4 | **TBD** |

## Acceptance

1. Every count, entity, series and state is from a traced real source; missing data shows as absent, never zero-filled.
2. Type-ahead never changes what Enter submits; it only offers alternatives.
3. Blue and purple appear only as convergence-state markers.
4. No prediction or recommendation language anywhere.

## Bottle Test

| Question | Answer |
|---|---|
| Reduces ambiguity | YES |
| Single dominant output | NO — three outputs; split as above |
| All boundaries defined | NO — producers TBD |
| No undefined dependencies | NO — D1–D4 TBD |
| Does not increase expressive flexibility in core | YES |

**Verdict: BLOCKED.** Next step: trace D1–D4 (three-question protocol) and split into three tickets.

## Non-goals

Light theme; new identity classes; changes to the resolver.
