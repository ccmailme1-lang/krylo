# WO-1802: Contrarian Frontier Synthesizer (Thiel Protocol)

**Status:** BACKLOG  
**Origin:** Peter Thiel / Founders Fund / Thiel Fellowship role-play, Fit=9.1  
**Filed:** 2026-06-17  
**Depends on:** WO-1734 (COMPLETE), WO-1726 (COMPLETE), WO-1126A (COMPLETE)

---

## Problem

Thiel's framework ("Zero to One," "n=1 contrarian") requires identifying "important truths" — insights that are correct but not yet consensus. `synthInvestor()` handles non-consensus positioning at the market level. Thiel operates at the civilizational level: systemic mispricings at the technological frontier where the entire analytical establishment has the wrong frame.

The "cultural resistance metric" is the specific gap: how does a radical startup survive institutional pushback long enough for the thesis to compound? This is not market timing — it is conviction duration under hostility.

---

## Key Constructs

**Important Truth Detection:** A belief that is correct and non-consensus. Measured via WO-1734 (Non-Consensus Detector) + WO-1726 (Weak Signal Detector) cross-reference. When a signal is WEAK (pre-crowd) AND non-consensus (diverging from establishment), it is a candidate "important truth."

**Cultural Resistance Score:** The institutional friction against a radical thesis. High cultural resistance = the establishment is actively fighting the idea = the non-consensus edge is intact. Low resistance = the idea is becoming mainstream = the Thiel edge is evaporating.

**Thiel Fellowship Model:** Funding Gen Z founders who build outside traditional tech hubs and academic tracks. Proxy: early-stage company formation signals in non-traditional geographies (EDGAR Form D, non-SF/NYC/Boston).

---

## Intent Classification

```
thiel|zero to one|important truth|contrarian|founders fund|
non.consensus|mispriced|systemic|frontier|radical|
cultural resistance|institutional pushback|palantir|anduril|
fellowship|gen z|outside track|distributed|competition is for losers
```

---

## Four Branches

1. **isImportantTruth** — IMPORTANT_TRUTH_DETECTED / TRUTH_BECOMING_CONSENSUS (non-consensus × weak signal cross-fire)
2. **isCultural** — CULTURAL_RESISTANCE_INTACT / ESTABLISHMENT_CAPITULATING (resistance score high = edge intact)
3. **isFrontier** — FRONTIER_OPPORTUNITY_WINDOW (tech + knowledge convergence pre-crowd)
4. **Default** — CONTRARIAN_SIGNAL_ACTIVE

---

## Output Contract

Standard contract plus:
```
important_truth_score   — cross-product: nc_delta × weak_signal_slope (0.0–1.0)
cultural_resistance     — INTACT / SOFTENING / CAPITULATING
establishment_consensus — distance from mainstream adoption (HIGH=far, LOW=arriving)
frontier_window         — open / closing / closed
conviction_duration     — estimated months before thesis becomes consensus
```

---

## Note on BEV

WO-1798 `bev_score` is NOT applicable here. Thiel's thesis is not personality-brand driven — it is an analytical framework. No `computeBEV()` import required.

---

## Pass Criteria

- [ ] isImportantTruth fires on "non-consensus mispriced systemic important truth" via INVESTOR lens
- [ ] `important_truth_score` = non_consensus_delta × weak_signal_slope
- [ ] `cultural_resistance` = INTACT when establishment is actively opposing the thesis
- [ ] `cultural_resistance` = CAPITULATING when mainstream begins adopting
- [ ] WO-1734 + WO-1726 are the data sources — no new detection logic
- [ ] Build clean, node --check passes
