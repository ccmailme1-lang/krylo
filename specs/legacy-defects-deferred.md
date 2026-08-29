# Legacy Defects — Deferred

**Status:** parked bucket. Founder disposition 2026-08-29: **DEFER**.
**Rule:** these are real bugs in the pre-redesign packet / intake layer. They MUST
NOT become reasons to reopen frozen architecture v0.2.2 or interrupt `I_d`
authoring. Fix (or drop) after the integration gate opens, when the surfaces they
live on are being replaced anyway.

---

## LD-1 — `tensor.horizon` is always `'MED'` regardless of the scrubber

**Symptom:** scrubber set to LONG → PRIMARY SIGNAL renders `"a horizon (MED)"`.

**Cause:** `src/components/analysis/analysisidlefield.jsx` (`handleExecute`):

```js
horizon: horizonRes?.bucket ?? 'MED',
```

`resolveHorizon()` (`src/engine/temporalhorizon.js`) returns
`{ horizon, declared_by, confidence, provenance_ref }` — **there is no `.bucket`**.
So the expression is always the `'MED'` fallback.

**Why it is not a one-line fix:** `.bucket → .horizon` would then feed a mismatched
vocabulary downstream —

| module | horizon vocabulary |
|---|---|
| `temporalhorizon.js` `HORIZON_ORDER` | `IMMEDIATE / SHORT / MEDIUM / LONG / STRUCTURAL` |
| `aiae.js` `TTV_MULTIPLIER` keys | `NOW / SHORT / MED / LONG` |
| `lineage.js:85`, `aiae.js:98,330` | `tensor.horizon ?? 'MED'` |
| `querysynthesis.js:1000` (KRYL-1222 #1) | reads `session.tensor.horizon` verbatim into the PRIMARY SIGNAL label |
| `decisionengine.js:60` | `profile.horizon` — different source (lens profile), uses `SHORT/MEDIUM/LONG` |

Correcting it is a §2 shared-field reconciliation of the horizon vocabulary, not a
typo fix.

**Exposed by, not caused by** KRYL-1222 `#1` (`925e2a0`) — that change made
`tensor.horizon` visible in PRIMARY SIGNAL for the first time.

**Disposition:** DEFER / legacy. Revisit when the intake→tensor path is reworked
for the subject-scoped substrate.

---

## LD-2 — `hasDecision` does not recognize "acquisition"

**Symptom:** "Is Anduril a good acquisition target?" reads as a directional signal
(or, with a horizon set, "a horizon") — **no "a decision"** — even though it is a
decision frame.

**Cause:** `src/engine/querysynthesis.js` (`synthGeneral`, ~line 994):

```js
const hasDecision = /\b(… |acquir| …)\b/.test(gq);
```

`\bacquir\b`-style matching catches `acquire / acquiring / acquired` but **not
`acquisition` / `acquisitions`** (the stem is `acquis`, not `acquir`).

**One-line fix available:** `acquir` → `acquir|acquisition`. Not taken because it
polishes the legacy intent classifier, and the architecture already establishes
the more important rule: *the system must observe Anduril even when it cannot
classify the question as a sufficiently specific decision*
(`SPEC-domain-substrate-integration-contract.md` — AC "Subject anchors analysis").

**Disposition:** DEFER / legacy.

---

## Not on this list

- The `IS ANDURIL` pseudo-lens, the `GENERAL` fallback, STAKE/MOVE/WINDOW, the
  premature `FORMATION SIGNAL ACTIVE` — those are **architectural**, not legacy
  defects. They are covered by the integration-contract ACs and the
  subject-scoping contract, and are resolved *by the redesign*, not by patching.
