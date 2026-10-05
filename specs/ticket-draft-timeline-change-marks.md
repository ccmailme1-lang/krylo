# Ticket draft: Timeline change marks and time ticks on the MAP scrubber

Status: APPROVED for build (Founder GO, 2026-10-05). Not yet filed in Jira — no KRYL number assigned. Build in Dev only until filed.

## 1. Original intent
Show on the MAP scrubber what changed and when: a mark on the scrubber line at each time a relationship's saved state changed, with the change (before -> after state) readable on hover. Add time ticks along the track so a range like "Oct 4 -> Oct 4" reads as real clock time. Purpose (Founder, 2026-10-05): make the record of change visible now, as a deliberate step toward a platform that accumulates and uses its own history.

## 2. Acceptance criteria
- Change record: for each `formation_id`, order its saved rows by `captured_at`. A mark exists only when the current row's `state` differs from the immediately preceding row's `state` for that same `formation_id`. Same-state captures draw nothing.
- Hover on a mark shows: both entities, the relationship type, `before -> after` state, and the `captured_at` time of the change.
- Mark position = that change's `captured_at`, mapped linearly against the earliest and latest `captured_at` in the complete history dataset displayed by the scrubber. No per-formation normalization, interpolation, or invented timestamps.
- Time ticks with labels in the viewer's local time: hourly when the range is under 1 day, every 12 hours for 1 to 7 days, daily beyond 7 days.
- With no changes, the scrubber shows the ticks and no marks; with no history, the existing dimmed "NO FORMATION HISTORY YET" state is unchanged.
- Colors only from the locked palette; no amber or orange.
- Verified in Dev with seeded rows (including a 77-relationship case) and one real query; no page errors; layout holds at 900, 1400 and 1570 px.

## 3. Locked design decisions (Founder, 2026-10-05)
- Mark color/shape by the change's after-state (precedent: `.fh-dot`, KRYL-1350):
  - STRENGTHENING -> lime `#66FF00`, circle
  - WEAKENING -> blue `#007FFF`, circle
  - RECONFIGURATION -> purple `#8A2BE2`, diamond
  - NEW, DISSOLUTION, and any future state -> Light Gray `#e0e0dc`, circle
- Multiple changes at the same `captured_at` -> one combined mark; hover lists every change. Color = the shared after-state when all agree, gray when they differ.
- Zero range (earliest `captured_at` equals latest) -> no marks.
- Entity names in hover = raw stored `entity_a` / `entity_b`, no name resolution.
- Every tick is drawn; a tick label that would overlap its neighbor is skipped.
- Clock ticks replace the old edge-stagger ticks (`buildTicks()`); the line carries only clock time.
- Hover uses the native `title` tooltip (KRYL-1350 precedent).

## 4. Current implementation state
Built in `public/structure-field.html` on branch `claude/elegant-ramanujan-gd8d02`. Verified in headless Chromium with seeded `formationHistory` messages at 900/1400/1570 px. The "one real query" check against live Dev is still open. Every saved relationship so far has a single `NEW` row, so no real change exists yet in the data.

## 5. Dependencies
- `formation_state` rows (`formation_id`, `state`, `captured_at`, `entity_a`, `entity_b`, `relationship_type`) via `/v1/formation-state`.
- `structurepanel.jsx` posting `formationHistory` to `public/structure-field.html` (unchanged).
- Prod's engine stores history in a local file because Postgres is unreachable from the VPS, so Dev and Prod histories differ.

## 6. Files
- `public/structure-field.html` only.

## 7. Superseded by a newer ticket?
No. It replaces the removed stacked-rows approach from KRYL-1357.

## 8. Maps to the current KRYLO product model?
Yes. It presents already-saved structure and measured time differences; it does not predict or recommend (Formation Is Not a Verdict, section 21).

## 9. Out of scope
- `src/components/spine/conemap.jsx:20` maps WEAKENING to `#ffaa00` (amber). Noted, untouched.
- No changes to canonical ρ, formation identity, persistence, or the Stage 1 Formalization.
