# SPEC (DRAFT): Analysis — Recent questions under the question box

Status: DRAFT, 2026-10-15. Not filed in Jira. No code written. Build theme: current black.
Mockups: `specs/reskin/analysis-history-dark.html` (build target), `specs/reskin/analysis-history-light.html` (reskin reference).

## Six-field definition

1. **Original intent:** let a guest see and reuse their recent questions from the Analysis screen, without leaving for History.
2. **Acceptance criteria:** see "Acceptance".
3. **Current implementation state:**
   - Question box: `src/components/analysis/analysisidlefield.jsx` (textarea `rows={4}`, 600px; unchanged by this spec).
   - History data: `src/components/history/historybay.jsx` builds sessions with `buildHistory(getTelemetryLog())` (line 369) — fields used: `query`, `ts`, `complete`, `driftCount`, `source`.
   - Current RE-RUN (`handleRerun`, line 569) **runs immediately**: `requestDomainReset()`, `createSession(id, 'OPEN', entry.query)`, then navigates to Analysis.
4. **Dependencies:**
   - D1 (Founder ruling required): new Re-run behavior is "fill the box, do not submit". That differs from today's RE-RUN, which submits. Class C divergence — Founder rules which governs, and whether History's own RE-RUN changes too.
   - D2: `buildHistory` logic moved to a shared module so Analysis and History read the same source (no second store, §2 hard stop).
5. **Superseded by a newer ticket:** none found locally. Jira not searched.
6. **Maps to current product model:** yes (navMode 'analysis' idle view; History stays the full audit trail).

## File map

| File | Change |
|---|---|
| `src/engine/historyrows.js` (new, lowercase) | Export `buildHistory(log)` moved verbatim from historybay.jsx. |
| `src/components/history/historybay.jsx` | Import `buildHistory` from the new module. No behavior change. |
| `src/components/analysis/recentquestions.jsx` (new) | List: query (serif), type · time (mono), status tag (filled = Complete, dashed = Incomplete), Drift tag only when `driftCount > 0`, Re-run button. Range filter Today / 7 days / 30 days / All, same buckets as historybay.jsx `RANGES`. "View full audit trail" → navMode 'history'. |
| `src/components/analysis/analysisidlefield.jsx` | Render `<RecentQuestions>` below the Signal scope row in the idle view. Re-run handler sets the textarea value and focuses it (per D1 ruling). |

## Acceptance

1. Rows equal `buildHistory(getTelemetryLog())` filtered by range; nothing invented. Empty state: "No questions yet" (honest absence).
2. Re-run places the exact saved `query` text in the box and does not submit (subject to D1).
3. Status readable without color (word + filled/dashed tag). Drift shown only when supported by the record.
4. History tab unchanged in behavior.
5. §6 colors only; §7 sizes on report text.

## Bottle Test

| Question | Answer |
|---|---|
| Reduces ambiguity | YES |
| Single dominant output | YES |
| All boundaries defined | YES |
| No undefined dependencies | NO — D1 ruling pending |
| Does not increase expressive flexibility in core | YES |

**Verdict: BLOCKED** on the D1 ruling only.

## Non-goals

Light theme; changes to telemetry or session creation; removing History's table.
