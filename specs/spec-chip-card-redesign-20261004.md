# SPEC: Relationships chip and detail card redesign (MAP tab)

Status: DRAFT. Mockup first; no production code until the Founder approves the mockup.
Date: 2026-10-04. Scope file: `public/structure-field.html`. Branch work only; no deploy, no production changes.

## PROBLEM
- The "N ADMITTED RELATIONSHIPS ▸" chip (`#rel-chip`) sits in a computed position that changes per query. In a real Meta run the pinned chip rendered at y=1007 in a 1000px frame (off-screen); cause not found.
- The bottom-right corner of the map box is empty in the Founder's screenshots.
- The hover block (domain circle) shows relationship captions and a CONTRIBUTION line only; formation data has no place in it.
- The stacked per-formation timeline rows (KRYL-1357) were built, shipped, and removed at the Founder's direction (77-row histories covered the map; labels were raw CIKs). Do not rebuild them.

## SOLUTION (Founder intent, confirm anything ambiguous)
1. The corner chip link is replaced by a click on a circle on the map. The card opens from that click. Nothing the card does today is removed.
2. The bottom-right corner of the map box is free space.
3. In the hover block, leave a blank line below the CONTRIBUTION line, then add a new section for formation data, in the same space.
4. OPEN (Founder undecided): which circle triggers the card (the subject's green ring, or the domain circles) and which fields the formation-data section shows.

## COMPONENTS
- Chip: `#rel-chip` (CSS near line 183); placement in `positionRelChip()`.
- Card: `#panel`, shared. `fillEntityPanel()` fills it with the admitted relationships list. `renderFormationTransitionPanel()` is a second filler that currently has no caller.
- Hover block: drawn on the canvas on domain-circle hover (relationship captions, then `CAPITAL — CONTRIBUTION 0.72 φ 0.65 φ̇ 0.63`).
- Data: parent posts `krylo-field-formation` with `entityRelationships` (named-entity relationships) and `formationHistory` (rows: `formation_id`, `state`, `captured_at`).

### Facts to respect
- Formation history rows are keyed by entity pair and relationship type, with no domain field. Do not imply a domain link without a verified mapping.
- The chip is entity-level, not domain-specific. Hover captions and the CONTRIBUTION line are domain-specific.

## VALIDATION
1. Reproduce the off-screen chip bug first; report the cause in 3 sentences.
2. Two static HTML mockups of the new layout, including a 77-item case and a zero-item case.
3. After approval, implement on the branch with a small diff.
4. `node --check` on the extracted script passes; headless browser test shows no page errors; layout holds at 900, 1400 and 1570px widths; clicking the circle opens the card.
5. Report in at most 5 lines: what changed, what was tested, what remains.

## ROLLBACK
Branch only. Discard the branch. Production is untouched. The last production file is `a88fdc3939e0` (commit `0f94767`); earlier copies are in `/opt/krylo-api/.deploy-backup/` on the VPS.

## GUIDELINES
- Colors only from: #000000, #F5F5F7, #66FF00, #1A1A1A, #8A2BE2, #007FFF, #3a3d4a, plus the existing white-alpha greys. Amber and orange are banned.
- Report-style text uses exactly three sizes: 28px Georgia, 15px IBM Plex Mono, 11.5px IBM Plex Mono. HUD micro-labels and buttons are exempt.
- Do not suppress or soften admitted structure. KRYLO shows what it observed and does not compute conclusions or recommendations for the guest.
- Never vanish a control; dim inert parts and keep the explanation at full contrast.
- Lowercase filenames for new files. No secrets in any output.
- No deploy, no production action, no edits to deploy scripts.
