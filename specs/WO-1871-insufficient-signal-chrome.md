# WO-1871 — Quiet Residual Chrome under INSUFFICIENT SIGNAL
## STATUS: BUILD-READY (file map needs element confirm). Bottle Test PASS.

When synthesis is withheld (resolutionEligible:false / queryDomain AMBIGUOUS|INSUFFICIENT), the
export brief now correctly reads "INSUFFICIENT SIGNAL" (WO-1867/4d30643). But surrounding chrome
still renders confident state: the `HP · QUALIFIED` chip and the P4 Action Matrix `RANK #1 /
SCORE 60 / ENGINE LEV-02 ARBITRATED / "Capital floor constrains…"` block show beside an empty brief.
Reproduced (56yo profile, crypto profile).

## 1. SINGLE RESPONSIBILITY
**Job:** When the engine withholds, the surrounding chrome quiets to match — no QUALIFIED chip, no
orphan rank/score block.
**Output:** consistent withheld-state UI.

## 2. CONTRACT
Gate the chrome on the same condition the brief uses:
`synthesis?.resolutionEligible === false || synthesis?.queryDomain === 'AMBIGUOUS'` →
- suppress / neutralize the `HP · QUALIFIED` status chip (show "— / no query-relevant convergence"),
- suppress the P4 RANK/SCORE/ENGINE boilerplate when TOTAL ACTIONS === 0.
Ties to the WO-1868 HP-scoping rule (Validity gates whether HP convergence is query-relevant).

## 3. FILE MAP
| File | Change | Unchanged |
|------|--------|-----------|
| `src/components/analysis/targetpacket.jsx` | gate HP status chip + P4 rank/score block on insufficiency | brief (already gated), all other panels |
| (confirm) `actionmatrix.jsx` | if the rank/score block lives here, gate it on 0 actions | — |

CONFIRM at build: exact component owning the `HP · QUALIFIED` chip and the `RANK #1 / SCORE 60`
block before editing (architecture-first audit).

## 4. BOTTLE TEST
Reduces ambiguity YES · single output YES · boundaries YES (after element confirm) · no undefined
deps YES · no core flexibility growth YES. **PASS.**

## 5. DEFINITION OF DONE
Insufficient query → no `HP · QUALIFIED` chip, no orphan RANK#1/SCORE block; sufficient query
unchanged. Visual check on a withheld scenario (e.g. bare client profile).
