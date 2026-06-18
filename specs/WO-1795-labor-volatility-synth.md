# WO-1795: Labor Volatility Synthesizer (White/TKO Protocol)

**Status:** BACKLOG  
**Origin:** Dana White / TKO Group Holdings role-play, Fit=9  
**Filed:** 2026-06-17  
**Depends on:** WO-1726 (COMPLETE), WO-1736 (COMPLETE), WO-1126A (COMPLETE)  
**Unblocks:** WO-1796

---

## Problem

TKO Group Holdings (UFC + WWE + PBR) derives its margin structure almost entirely from classifying athletes as independent contractors. This is not a detail — it is the foundational architectural decision that separates the UFC's P&L from any traditional sports league. Fighter contracts carry no guaranteed salaries, no health benefits, no pension obligations, and no union bargaining rights. The UFC's margin efficiency versus NFL/NBA/MLB is the direct product of this classification.

If contractor law shifts (legislative or judicial), the entire valuation thesis for TKO changes. Krylo currently has no model for this risk. `synthInvestor()` treats labor as a generic input; no synthesizer prices the specific contractor-classification architecture that makes the UFC's financial model possible.

---

## The Friction Asset (Bidirectional Field)

Dana White's use of controversy and hostility toward press/media is a deliberate signaling strategy. It is also a risk variable. The same behavior that drives fight promotion virality (FRICTION_AMPLIFIES) can trigger institutional counterparty withdrawal (FRICTION_DAMAGES).

**Architecture requirement:** `friction_coefficient` must be a bidirectional field resolved by counterparty type:

```
if counterparty_type = 'FAN_BASE':        friction_coefficient > 0 (AMPLIFIES reach)
if counterparty_type = 'INSTITUTIONAL':   friction_coefficient < 0 (DAMAGES relationship)
    institutional = TKO board / broadcast partners (ESPN/Netflix) / Saudi PIF
```

The friction behavior is the same. The counterparty determines whether it is a brand asset or a liability. Do not model as two separate variables.

---

## Key Variables

### contractor_model_integrity (CMI)
**Shared field — WO-1796 reads this.**

The structural health of the independent contractor classification. Measures:
- Legislative pressure on gig/contractor worker classification (KNOWLEDGE cone regulatory signal)
- Active litigation count and trajectory (proxy via MEDIA cone on labor/worker classification news)
- State-level regulatory divergence (California AB5-class legislation spreading)
- Congressional attention level (MEDIA cone government action sub-signal)

CMI scale: 0.0 (reclassification imminent) → 1.0 (contractor model structurally secure)

WO-1796 reads CMI to determine whether boxing expansion is economically viable under the current margin architecture.

### friction_coefficient
Bidirectional per above. Aggregate measure across active controversy events.

### labor_regulatory_pressure
Current legislative/judicial momentum toward worker reclassification. Derived from:
- KNOWLEDGE cone (regulatory clarity forming)
- MEDIA cone (labor/contractor news density)
- WO-1736 regulatory convergence window (if ENFORCEMENT_AHEAD = Phase C, pressure is HIGH)

### unionization_probability
0.0–1.0 heuristic estimate derived from:
- Active fighter organizing signals (MEDIA cone)
- Historical precedent rate from other combat sports
- CMI trajectory (declining CMI → rising probability)

### sovereign_influence_score
Saudi PIF / Sela partnership depth. Measures:
- Capital dependency (what % of expansion is PIF-funded)
- Autonomy constraints (contractual promotional restrictions)
- Geopolitical alignment risk (US-Saudi relations as second-order risk)

---

## Intent Classification (regex triggers)

Fires `synthLaborVolatility()` when INVESTOR lens is active and query contains:

```
ufc|dana white|tko|white holdco|zuffa|wwe|pfl|boxing|mma|fighter|
contractor|union|labor|reclassification|ab5|gig worker|independent|
saudi|pif|sela|sovereign fund|friction|controversy|press|promotion velocity|
sports promotion|combat sports|talent rights
```

---

## Four Branches

### 1. isLabor
Trigger: `contractor|union|labor|reclassification|ab5|gig|independent|worker`

- **CONTRACTOR MODEL STABLE** — CMI high, no active legislative threat, regulatory pressure LOW
- **REGULATORY PRESSURE BUILDING** — CMI declining, legislative activity in KNOWLEDGE cone, labor_regulatory_pressure ELEVATED

### 2. isFriction
Trigger: `controversy|press|media|friction|hostility|carnival|barker|brand`

- **FRICTION ASSET ACTIVE** — friction_coefficient > 0, controversy driving reach amplification
- **INSTITUTIONAL WITHDRAWAL RISK** — friction_coefficient negative vs. institutional counterparties (board, broadcast, PIF)

### 3. isSovereign
Trigger: `saudi|pif|sela|sovereign|fund|boxing|zuffa|international|expansion`

- **SOVEREIGN CAPITAL ALIGNED** — PIF partnership amplifying boxing expansion, autonomy maintained
- **AUTONOMY CONSTRAINT FORMING** — capital dependency creating promotional restrictions or geopolitical exposure

### 4. Default
- **TKO HOLDCO SIGNAL ACTIVE** — baseline output covering CMI, friction posture, sovereign exposure, labor pressure

---

## Output Contract

Standard synthesizer contract plus TKO-specific fields:

```
stateLabel, confidence, primaryInsight, momentum, trajPoints,
attentionStack, keyDrivers, recommendedAction, timeHorizon,
impactLevel, bluf, purpose, fiveWs, evidence, assumptions,
assessment, threats, opportunities, alternativeView, outlook, actions, leverage

// TKO-specific
contractor_model_integrity  — SHARED FIELD — WO-1796 reads this (0.0–1.0)
friction_coefficient        — bidirectional: positive=AMPLIFIES, negative=DAMAGES
labor_regulatory_pressure   — LOW / ELEVATED / HIGH / CRITICAL
unionization_probability    — 0.0–1.0
sovereign_influence_score   — LOW / MODERATE / HIGH (PIF dependency depth)
margin_at_risk              — estimated margin % at risk on full reclassification
```

---

## Margin Impact Model

If fighter reclassification occurs (CMI → 0.0):
- Guaranteed salaries required: estimated 40–60% of current fighter compensation shifts to fixed cost
- Health/benefits obligation: estimated additional 15–20% of fighter payroll
- Union bargaining rights: revenue sharing precedent from NBA/NFL (45–51% of revenue to players)
- Net margin impact: estimated 20–35 percentage point compression

`margin_at_risk` = estimated percentage points of EBITDA margin lost on full reclassification.

---

## Attention Stack (default branch)

| Rank | Signal | Category | Color |
|------|--------|----------|-------|
| 1 | Contractor Model Integrity | LABOR / Regulatory Pressure | LIME |
| 2 | Friction Coefficient | MEDIA / Amplification vs. Damage | BLUE |
| 3 | Sovereign Influence | CAPITAL / PIF Dependency | BLUE |
| 4 | Unionization Probability | LABOR / Organizing Signal | DIM |

---

## Implementation Notes

- File: `src/engine/querysynthesis.js` — add `synthLaborVolatility()` above domain router
- Wire: `SYNTH_MAP` — INVESTOR lens, TKO entity signals
- `contractor_model_integrity` must be top-level field
- `friction_coefficient` bidirectional — single field, not two fields
- Regulatory pressure input: WO-1736 regulatory convergence window Phase C = ENFORCEMENT_AHEAD → pressure HIGH
- `margin_at_risk` is a range estimate (conservative/base/severe), not a single point forecast

---

## Pass Criteria

- [ ] isLabor: fires on "UFC contractor reclassification union labor law" via INVESTOR lens
- [ ] isFriction: fires on "Dana White controversy press friction brand"
- [ ] `contractor_model_integrity` present as top-level field (0.0–1.0)
- [ ] `friction_coefficient` resolves positive for fan-facing controversy, negative for institutional
- [ ] `margin_at_risk` present and non-zero
- [ ] WO-1796 can read `contractor_model_integrity` without additional fields
- [ ] Build clean, node --check passes
