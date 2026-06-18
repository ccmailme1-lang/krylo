# WO-1786: Content-to-Commerce Conversion Engine (Vaynerchuk Protocol)

**Status:** BACKLOG — BLOCKED on WO-1785  
**Origin:** Vaynerchuk / VaynerX role-play, Fit=8  
**Filed:** 2026-06-17  
**Depends on:** WO-1785 (RELEVANCE_WARFARE_SYNTH — must ship first)

---

## Problem

VaynerX's portfolio increasingly depends on live-shopping conversion (Stan platform, VaynerCommerce, social commerce integrations) as the monetization layer downstream of Vaynerchuk's content. Krylo has no model for the durability of content-driven commerce — specifically whether the Vaynerchuk attention flywheel is actually converting at the rates his agency pitches to Fortune 1000 clients.

The critical ambiguity: if conversion metrics are declining, is it because:
1. The content→commerce pipeline is structurally weakening (platform-level problem), OR
2. Vaynerchuk's personal brand velocity is decaying and taking conversion with it (a WO-1785 problem)?

Without WO-1785's `brand_velocity` field, WO-1786 cannot distinguish these two causes from the same conversion decline signal. The response to each is entirely different.

---

## Blocking Dependency

**Cannot build before WO-1785.** The `brand_velocity` field from `synthRelevanceWarfare()` resolves the diagnostic ambiguity. If `brand_velocity` is HIGH and conversion is declining, the problem is structural (commerce layer). If `brand_velocity` is DECLINING and conversion is declining, the personal brand is the root cause.

---

## Three States

### CONVERSION_COMPOUNDING
**Trigger:** brand_velocity HIGH + MEDIA→CAPITAL cone convergence positive

Live-shopping flywheel is accelerating. Content reach is translating to transaction velocity above baseline. Characteristics:
- MEDIA cone = BUILDING CONVERGENCE or higher
- CAPITAL cone = rising (transaction velocity increasing)
- Stan/VaynerCommerce metrics trending positively
- Attention-to-transaction latency decreasing (faster conversion per content piece)

Output: compounding signal, platform infrastructure holding, expansion signal for portfolio.

### CONVERSION_PLATEAUING
**Trigger:** brand_velocity STABLE + MEDIA cone stable + CAPITAL cone growth rate decelerating

Content reach is sustaining but conversion growth rate is declining. The flywheel is losing rotational momentum without yet stalling. This is the most actionable state — the window to intervene before decoupling.

Characteristics:
- Attention volume stable, but attention-to-transaction ratio declining
- Fortune 1000 client CPM arbitrage advantage narrowing
- Live-shopping platform growth decelerating vs. prior quarter

Output: plateau warning, attention-to-transaction gap widening, intervention window estimate.

### CONVERSION_DECOUPLING
**Trigger:** brand_velocity DECLINING + MEDIA cone = TURBULENT or DECLINING + CAPITAL cone flat or declining

Most dangerous state: content reach and commerce conversion moving in opposite directions. Or both declining simultaneously. The personal brand's function as zero-cost CAC is breaking down.

Diagnostic split (requires brand_velocity from WO-1785):
- `brand_velocity` HIGH + decoupling → infrastructure problem (platform, not person)
- `brand_velocity` DECLINING + decoupling → personal brand is the root cause

Output: decoupling alert, root cause attribution (brand vs. infrastructure), stack_at_risk flag from WO-1785.

---

## Agency-Philosophy Tension Model

VaynerMedia serves Fortune 1000 clients with mass-scale agency services. Vaynerchuk's public philosophy argues for niche/relevance over mass reach. This creates a structural tension:

- If his public thesis (niche wins) is correct → his own clients' mass-scale campaigns are suboptimal by his own logic
- If mass-scale continues to work for Fortune 1000 → his public thesis loses its demonstration value

WO-1786 surfaces this tension explicitly as `agency_tension_score`: the delta between VaynerMedia client campaign performance (mass-scale) and Interest Media organic performance (niche). A widening gap in either direction is informative.

---

## Output Contract

```
conversionState         — COMPOUNDING / PLATEAUING / DECOUPLING
root_cause              — BRAND_DECAY / INFRASTRUCTURE / PLATFORM_SHIFT / UNKNOWN
attention_transaction_latency — trend: IMPROVING / STABLE / WIDENING
agency_tension_score    — delta: Fortune 1000 mass-scale vs. Interest Media niche performance
live_shopping_velocity  — HIGH / MODERATE / STALLING
platform_durability     — ROBUST / WATCH / AT_RISK
brand_velocity_input    — echo of WO-1785 brand_velocity (for audit trail)
synthesis               — plain-language conversion posture summary
```

---

## Implementation Notes

- File: `src/engine/contenttocommerce.js` — standalone module
- Export: `computeConversionState(brand_velocity, signals)` → conversion output object
- No direct wiring to SYNTH_MAP — consumed by `synthRelevanceWarfare()` via import
- MEDIA cone state (WO-1126A) → attention velocity input
- CAPITAL cone state → transaction velocity input
- `agency_tension_score` requires two data points — Fortune 1000 performance proxy (CAPITAL cone) vs. organic performance proxy (MEDIA cone organic sub-signal)

---

## Pass Criteria

- [ ] `computeConversionState(brand_velocity='HIGH', signals_declining)` → CONVERSION_DECOUPLING + root_cause=INFRASTRUCTURE
- [ ] `computeConversionState(brand_velocity='DECLINING', signals_declining)` → CONVERSION_DECOUPLING + root_cause=BRAND_DECAY
- [ ] `computeConversionState(brand_velocity='HIGH', signals_compounding)` → CONVERSION_COMPOUNDING
- [ ] `brand_velocity` sign correctly attributes root cause of decoupling
- [ ] `agency_tension_score` present in all states
- [ ] Output slots into `synthRelevanceWarfare()` assessment / threats arrays
- [ ] Build clean, node --check passes
