# BUG-004 — Happy Path SCORE/DELTA look static across unrelated queries

STATUS: OPEN — pattern confirmed, root cause not yet isolated
FILED: 2026-06-16
WO: WO-1759
RELATED: BUG-001, BUG-002 (found during the same test sequence)

## Pattern (4 for 4)

Across four different test queries (mortgage/REAL_ESTATE,
freelance-revenue/GENERAL, comparative-signal/GENERAL,
18-month-equity-stake/GENERAL), the Action Matrix's Happy Path strip shows:

- `SCORE 60 / 100` — identical every time
- `DELTA ↑ 0 pts above next` — identical every time

while a separate, different badge number next to the lead action title
DID vary (92, then 85, 85, 85). Both numbers are presented as describing
the same lead action, but they disagree and one of them never moves.

## What's confirmed vs. not

Confirmed: `SCORE` = `hp.score * 100` and `DELTA` = `(hp.score -
alt[0].score) * 100`, both read from `session.tensor.arbitration.topK`
(the LEV-02 AIAE engine) — `src/components/analysis/actionmatrix.jsx:254-255`.

Not yet confirmed: why `topK[0].score` and `topK[1].score` produce exactly
0.60 and an identical second-place score across totally unrelated domains
and queries. Candidates, not verified: (a) `aiae.js` falls back to a
default/placeholder candidate set when input signal is weak (plausible for
the 3 GENERAL/low-Fs cases, but the REAL_ESTATE case had real — if
contaminated — numeric input and still scored 60/0); (b) the badge number
(92/85) is a different, legitimately-static field (`impact` weights are
hand-authored constants per action definition in querysynthesis.js, e.g.
`impact:0.65`), which would make ITS sameness expected/by-design — only
the arbitration SCORE/DELTA's non-variance would be the actual bug.

## Fix shape

Not buildable yet — needs someone to trace `aiae.js`'s candidate
generation/scoring path for these specific action types before a fix can
be scoped. File is BACKLOG pending that investigation, not pending a Go.
