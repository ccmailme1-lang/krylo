# WO-1768 — INVESTOR Synthesizer: Macro Divergence Signal Layer

STATUS: BACKLOG — spec locked, not built.
ORIGIN: Burry role-play 2026-06-17. Fit=8. INVESTOR lens maps to synthGeneral — no dedicated macro divergence output.
LENS: INVESTOR

---

## 1. Problem

INVESTOR lens currently routes to `synthGeneral` via `SYNTH_MAP`:

```js
INVESTOR: synthGeneral,
```

`synthGeneral` produces confidence:0.71 (hardcoded), D/E:0.5×LOW (hardcoded),
generic leverage framing. A macro divergence thesis — non-consensus short against
crowded tech multiples, hard cash-flow OWNERSHIP play, CAPITAL compression read —
produces the same generic output as any unclassified query.

The Non-Consensus Window (WO-1734), Weak Signal Detection (WO-1726), and
Cross-Domain Synthesis (WO-1722) are all operational but their output never
reaches INVESTOR synthesis. The detection layer fires; the synthesizer ignores it.

---

## 2. Scope

This WO DOES:
- Add `synthInvestor()` to `querysynthesis.js`
- Wire INVESTOR → synthInvestor in SYNTH_MAP
- Surface macro divergence signals from the existing detection layer
  (WO-1734 state, WO-1726 weak signals, WO-1722 cross-domain synthesis)
- Invert convergence as a crowded-trade signal when TURBULENT state is present
- Replace hardcoded confidence/leverage with domain-derived values

This WO does NOT:
- Add geographic isolation (BABA / Asia vs US capital flow)
- Build WO-1733 (Attention Saturation) — that remains BACKLOG
- Change any engine outside querysynthesis.js
- Add new data feeds

---

## 3. Core signal inversion rule (LOCKED)

Standard synthesizers treat convergence as opportunity.
INVESTOR synthesizer treats convergence as crowded-trade risk when:

```
TECHNOLOGY state = TURBULENT_CONVERGENCE
AND MEDIA state = BUILDING_CONVERGENCE or TURBULENT_CONVERGENCE
AND CAPITAL state < BUILDING_CONVERGENCE
```

This pattern = "narrative saturating faster than capital confirming."
Output label: CROWDED TRADE — FADE SIGNAL.

When TECHNOLOGY = BUILDING_CONVERGENCE AND CAPITAL = BUILDING_CONVERGENCE
AND Non-Consensus gap is DIVERGING:
Output label: NON-CONSENSUS WINDOW OPEN.

---

## 4. Synthesizer inputs

`synthInvestor()` receives the standard `(session, numbers, query)` signature.
It additionally reads from the session tensor whatever is available:

- `session.tensor.nonConsensus` — from WO-1734 (DIVERGING / CONVERGING / AMBIGUOUS)
- `session.tensor.weakSignals` — from WO-1726 (emergingSignals[])
- `session.tensor.crossDomain` — from WO-1722 (mungerScore, synthesis)
- `session.tensor.domainStates` — signal scores per domain

If any of these are undefined (not yet wired in session), the synthesizer falls
back to observable domain scores only. No throw — graceful degradation.

---

## 5. Output shape

Mirrors the standard synthesizer contract (confidence, primaryInsight,
attentionStack, keyDrivers, recommendedAction, etc.) with INVESTOR-specific
framing:

```
stateLabel:        'NON-CONSENSUS WINDOW' | 'CROWDED TRADE' | 'STRUCTURAL DECAY' | 'CAPITAL COMPRESSION'
confidence:        derived from Fs + nonConsensus gap width (not hardcoded)
primaryInsight:    macro divergence framing — what the crowd is missing
attentionStack:    domain signals ordered by divergence from consensus, not raw score
keyDrivers:        structural factors (HY spread, yield curve, EDGAR deal flow velocity)
recommendedAction: position framing — entry window vs fade signal
leverage:          deRatio derived from CAPITAL/OWNERSHIP domain score ratio
```

---

## 6. Crowded-trade detection matrix

| TECHNOLOGY state    | CAPITAL state       | MEDIA state         | Output label            |
|---------------------|---------------------|---------------------|-------------------------|
| TURBULENT           | < BUILDING          | BUILDING / TURBULENT | CROWDED TRADE — FADE    |
| BUILDING            | BUILDING            | BUILDING            | CONVERGENCE — CAUTION   |
| BUILDING            | < BUILDING          | any                 | NON-CONSENSUS WINDOW    |
| HIGH                | HIGH                | HIGH                | PLATFORM BET — CROWDED  |
| any                 | TURBULENT           | any                 | CAPITAL COMPRESSION     |
| INSUFFICIENT/LOW    | any                 | any                 | STRUCTURAL DECAY        |

Priority (highest wins): CROWDED TRADE > CAPITAL COMPRESSION > NON-CONSENSUS WINDOW > CONVERGENCE CAUTION > PLATFORM BET > STRUCTURAL DECAY.

---

## 7. Non-consensus confidence formula

```
confidence = (Fs × 0.40) + (nonConsensusDelta/100 × 0.35) + (weakSignalCount/10 × 0.25)
```

Where:
- `nonConsensusDelta`: WO-1734 `consensusDelta` — gap between Krylo signal and estimated consensus
- `weakSignalCount`: count of active weak/emerging signals from WO-1726
- Clamped [0, 1]

If tensor fields unavailable: fall back to `Fs × 0.71` (matches existing synthGeneral behavior).

---

## 8. Leverage framing (INVESTOR-specific)

INVESTOR queries are not personal D/E ratio questions. Leverage for INVESTOR = signal leverage: how much information asymmetry exists before consensus.

```
typeLabel:  'CODE'  (information leverage)
tierLabel:  derived from nonConsensusDelta — HIGH if delta > 30, MOD 10-30, LOW < 10
deRatio:    nonConsensusDelta / 100 (proxy for information edge)
permissionless: true
industryNorm:   0.3 (baseline consensus formation speed)
```

If no nonConsensusDelta available: tierLabel = 'MOD', deRatio = 0.3.

---

## 9. attentionStack ordering (inverted for INVESTOR)

Standard synthesizers rank by signal strength (highest pressure first).
INVESTOR ranks by **divergence from consensus** — a weak signal that diverges
from consensus is more valuable than a strong signal that confirms it.

```
rank = divergenceScore × (1 - consensusAgreement)
```

Where `consensusAgreement` is WO-1734's `populationAgreement` field if available,
otherwise 0.5 (neutral).

---

## 10. Dependencies

- WO-1766/1767 (domain ambiguity gate + vector) — COMPLETE
- WO-1734 (Non-Consensus Window) — COMPLETE
- WO-1726 (Weak Signal Detection) — COMPLETE
- WO-1722 (Cross-Domain Synthesis) — COMPLETE
- WO-1756/1761 (ingress hygiene) — COMPLETE

WO-1733 (Attention Saturation) enhances this WO but is not required.

---

## 11. Files modified

- `src/engine/querysynthesis.js` — add `synthInvestor()`, update SYNTH_MAP

No other files.

---

## 12. Validation criteria

BAU harness: `qa_wo1768_investor_synth.mjs`

Required test vectors:

| Query                                               | Expected stateLabel            | Notes                          |
|-----------------------------------------------------|--------------------------------|--------------------------------|
| "tech sector overvalued, looking for hard assets"   | CROWDED TRADE or NON-CONSENSUS | TECHNOLOGY high, CAPITAL low   |
| "defensive positioning, cash-flow survivors"        | STRUCTURAL DECAY or CAPITAL COMPRESSION | BUILDING or lower |
| "I think AI multiples are mispriced"               | NON-CONSENSUS WINDOW           | explicit non-consensus thesis  |
| "what is the current market momentum"              | not CROWDED TRADE              | neutral query → CAUTION         |

Confidence must not be hardcoded 0.71 in any vector.
Leverage tierLabel must not be hardcoded 'HIGH' for a 0.0 D/E ratio (WO-1755 bug class).
