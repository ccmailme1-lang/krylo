# WO-1775: Creator HoldCo Synthesizer (Beast Industries Protocol)

**Status:** BACKLOG  
**Origin:** MrBeast / Beast Industries role-play, Fit=8  
**Filed:** 2026-06-17  
**Depends on:** WO-1768 (COMPLETE), WO-1767 (COMPLETE), WO-1720 (COMPLETE), WO-1126A (COMPLETE)  
**Unblocks:** WO-1776

---

## Problem

No valuation synthesizer exists for "Creator HoldCos" — entities that derive enterprise value from a personality-flywheel rather than traditional media or CPG fundamentals. Beast Industries (Jimmy Donaldson / MrBeast) is the first company in this category to approach IPO scale. Krylo currently routes all INVESTOR lens queries to `synthInvestor()`, which outputs a generic macro/portfolio/tactical frame. A query about Beast Industries valuation receives the same output as a query about a steel company. This is a category error, not a missing data problem.

---

## Key Constructs

### Donaldson Equity Premium (DEP)
The premium above enterprise fundamentals attributable to the Donaldson personality moat. DEP is a **bidirectional scalar** by design:

- **Upside direction:** DEP inflates the enterprise multiple above Disney/NBCU baseline. FlyWheelPremium = DEP × FlyWheelVelocity
- **Downside direction:** DEP is the single-point-of-failure. WO-1776 inverts it: CarryRisk = DEP × reputational_volatility

**Architecture requirement:** DEP must remain a single scalar with both directions accessible. Do not split into two separate fields. WO-1776 reads the same variable with an inversion coefficient — no contract change required.

### Flywheel Velocity (FV)
FV = media views / retail conversion rate

Measures the cross-pollination between content virality (MEDIA cone) and retail shelf velocity (Feastables / OWNERSHIP cone). Accelerating FV = flywheel is compounding. Stalling FV = the conversion cycle is decoupling — media attention not translating to CPG revenue.

### Platform Multiplier (PM)
PM = Creator Platform subscribers → CPM arbitrage

Measures the structural advantage of zero-cost customer acquisition vs. traditional media CAC. As Beast Industries builds the Creator Platform into a programmatic ad-tech layer (publisher model), PM expands. If the platform remains bespoke brand deals, PM stays low and the valuation reverts toward pure CPG multiples.

### Governance Discount (GD)
GD = IPO-readiness friction

The drag introduced when a "move-fast" creator entity adopts corporate-compliance governance for public-market access. Scale-to-governance lag is the primary transition risk. GD is an input to WO-1776's governance_readiness_score.

---

## Intent Classification (regex triggers)

Fires `synthCreatorHoldco()` when INVESTOR lens is active and query contains:

```
creator|holdco|hold co|flywheel|donaldson|mrbeast|mr beast|beast industries|
beast platform|feastables|creator economy|personality brand|creator multiple|
creator valuation|personal moat|media-to-retail|cac arbitrage
```

---

## Four Branches

### 1. isFlywheel
Trigger: `flywheel|velocity|conversion|retail|feastables|media.to.retail|cac`

- **FLYWHEEL ACCELERATION** — FV rising, PM expanding, DEP high
- **FLYWHEEL STALL** — FV decelerating, media/retail decoupling detected

### 2. isValuation
Trigger: `valuation|multiple|ipo|premium|enterprise value|discount|comps|disney|nbcu`

- **CREATOR_HOLDCO PREMIUM** — Maps Beast Industries multiple against Disney/NBCU baseline; DEP as the premium above traditional media comps

### 3. isGovernance
Trigger: `governance|compliance|audit|public market|sec|regulated|corporate|board|structure`

- **IPO READINESS FRICTION** — GD quantified; transition risk from creator culture → audited corporate culture

### 4. Default
- **CREATOR HOLDCO SIGNAL ACTIVE** — General INVESTOR lens output with creator-specific framing

---

## Output Contract

Full synthesizer output contract (matches all other synths):

```
stateLabel, confidence, primaryInsight, momentum, trajPoints,
attentionStack, keyDrivers, recommendedAction, timeHorizon,
impactLevel, bluf, purpose, fiveWs, evidence, assumptions,
assessment, threats, opportunities, alternativeView, outlook, actions, leverage
```

Additional fields specific to this synth:
```
dep         — Donaldson Equity Premium scalar (0.0–3.0)
fv          — Flywheel Velocity (accelerating / stalling / decoupling)
pm          — Platform Multiplier state (expanding / static / bespoke-only)
gd          — Governance Discount (low / moderate / high friction)
```

WO-1776 reads: `dep`, `gd` from this output. No additional fields required.

---

## Valuation Frame

Creator HoldCo multiple = Flywheel Premium above Disney/NBCU baseline

| Component | Traditional Media | Creator HoldCo |
|-----------|-------------------|----------------|
| CAC | Paid acquisition | Zero-cost (content flywheel) |
| Distribution | Linear / cable / streaming | Platform-native + algorithmic |
| CPM arbitrage | Negotiated rates | Structural advantage |
| Personality moat | None | DEP (primary premium driver) |
| Single-point-of-failure risk | Low | HIGH (DEP collapse = thesis collapse) |

---

## Attention Stack (default branch)

| Rank | Signal | Category | Color |
|------|--------|----------|-------|
| 1 | Flywheel Velocity | Media → Retail Conversion | LIME |
| 2 | DEP — Donaldson Moat | Personality / Brand Equity | LIME |
| 3 | Platform Multiplier | CAC Arbitrage / Infrastructure | BLUE |
| 4 | Governance Discount | IPO Readiness / Friction | DIM |

---

## Implementation Notes

- File: `src/engine/querysynthesis.js` — add `synthCreatorHoldco()` above domain router
- Wire: `SYNTH_MAP` — add `CREATOR_HOLDCO: synthCreatorHoldco`
- Ingress: `src/engine/ingress.js` — add `CREATOR_HOLDCO` to `LENS_BROKER_DOMAIN_MAP` under INVESTOR
- No new domain cone — routes through MEDIA + OWNERSHIP convergence via existing 6-cone model
- DEP scalar: `parseFloat(Math.min(3.0, 0.5 + ncHits * 0.35).toFixed(1))` where ncHits = creator/flywheel keyword density

---

## Pass Criteria

- [ ] `synthCreatorHoldco()` fires on "Beast Industries valuation flywheel" query via INVESTOR lens
- [ ] isFlywheel branch: FLYWHEEL ACCELERATION on velocity rising, FLYWHEEL STALL on decoupling
- [ ] isValuation branch: DEP field present in output, comp frame references Disney/NBCU
- [ ] isGovernance branch: GD field present, governance_readiness language in assessment
- [ ] DEP field accessible by WO-1776 without contract change
- [ ] Build clean, node --check passes
