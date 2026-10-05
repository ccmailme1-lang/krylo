# Ticket draft: Timeline change marks and time ticks on the MAP scrubber

Status: DRAFT, not filed in Jira. Build in Dev only until approved.

## 1. Original intent
Show on the MAP scrubber what changed and when: a mark on the scrubber line at each time a relationship's saved state changed, with the change (before -> after state) readable on hover. Add time ticks along the track so a range like "Oct 4 -> Oct 4" reads as real clock time. Purpose (Founder, 2026-10-05): make the record of change visible now, as a deliberate step toward a platform that accumulates and uses its own history.

## 2. Acceptance criteria
- A mark appears on the scrubber line only where the same relationship (`formation_id`) was captured again with a different `state`. Same-state captures draw nothing.
- Hover on a mark shows: both entities, the relationship type, `before -> after` state, and the `captured_at` time of the change.
- Mark position = `captured_at` mapped linearly between the first and last capture. No interpolation, no invented timestamps.
- Time ticks with labels in the viewer's local time: hourly when the range is under 1 day, every 12 hours for 1 to 7 days, daily beyond (Founder to confirm).
- With no changes, the scrubber shows the ticks and no marks; with no history, the existing dimmed "NO FORMATION HISTORY YET" state is unchanged.
- Colors only from the locked palette; no amber or orange.
- Verified in Dev with seeded rows (including a 77-relationship case) and one real query; no page errors; layout holds at 900, 1400 and 1570 px.

## 3. Current implementation state
Not built. The stacked timeline rows (KRYL-1357) were removed from Dev and Prod. Every saved relationship so far has a single `NEW` row, so no real change exists yet in the data. The scrubber currently shows only the range label and the thumb.

## 4. Dependencies
- `formation_state` rows (`formation_id`, `state`, `captured_at`) via `/v1/formation-state`.
- `structurepanel.jsx` posting `formationHistory` to `public/structure-field.html`.
- Prod's engine stores history in a local file because Postgres is unreachable from the VPS, so Dev and Prod histories differ.

## 5. Superseded by a newer ticket?
No. It replaces the removed stacked-rows approach from KRYL-1357.

## 6. Maps to the current KRYLO product model?
Yes. It presents already-saved structure and measured time differences; it does not predict or recommend (Formation Is Not a Verdict, section 21).
