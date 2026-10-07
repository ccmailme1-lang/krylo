# DEFECT (DRAFT): Structural Resolution Field shows a five-state legend that its lines may not encode

Status: DRAFT, 2026-10-07. Not filed in Jira. UNCONFIRMED: the screen's source is not in the repository (see `def-structure-field-live-code-not-in-repo-20261007.md`).

## Observed

Founder screenshot: every relationship line is lime; KNOWLEDGE is a dim gray node with no lines; the legend lists all five convergence states.

## What the committed code does (origin/main)

`public/structure-field.html:1143`: a line is drawn `--signal-lime` when `edgeResolution(e, t) > 0.85`, otherwise dashed `rgba(255,255,255,0.5)`. Lime here means "resolved", not BUILDING CONVERGENCE. No call to `convergenceclassifier.js` exists in this file. Per KRYL-1287 comments, every real edge carries a flat strength of 1, so all resolved lines look identical.

The classifier (`src/engine/convergenceclassifier.js`, KRYL-1207) is used by `conemap.jsx`, `spinemap.jsx`, `analysisfield.jsx` and others, but not here.

## Open fact (must be settled before this is treated as a defect)

The screenshot's version may wire the legend to real states. If lime lines and the gray KNOWLEDGE node come from the classifier, this is not a defect. Required input: the pushed source for that screen.

## Six-field definition (Ticket Definition Requirement)

1. **Original intent:** a legend names only encodings the view actually uses (§1 grounding; §16 direction honesty).
2. **Acceptance criteria:** each legend entry maps to a traced render path in the view, or the entry is removed. Lime on this view either means BUILDING CONVERGENCE (classifier-driven) or is relabeled as "resolved".
3. **Current implementation state:** not traced on the screenshot's version. On `main`, line color is resolution-driven only.
4. **Dependencies:** `def-structure-field-live-code-not-in-repo-20261007.md` (source must be pushed first).
5. **Superseded by a newer ticket:** none found locally. Jira not searched (no access from this session).
6. **Maps to current product model:** yes (MAP / structure-field.html).

## Non-goals

No change to edge admission, layout, or the classifier itself.
