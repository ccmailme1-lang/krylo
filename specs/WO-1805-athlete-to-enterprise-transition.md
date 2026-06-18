# WO-1805: Athlete-to-Enterprise Transition Model (Brady Protocol)

**Status:** BACKLOG  
**Origin:** Tom Brady / TB12 role-play, Fit=8.0  
**Filed:** 2026-06-17  
**Depends on:** WO-1798 (Brand-Equity-to-Enterprise-Stability infrastructure), WO-1126A (COMPLETE)

---

## Problem

The athlete-to-entrepreneur transition follows a predictable arc: athletic identity creates initial credibility, but enterprise success requires decoupling from that identity over time. Brady's TB12 model — high-performance health, wellness, fitness — is structurally well-positioned: it is methodologically grounded (performance science), not purely personality-dependent.

The two gaps: (1) **competitor-replacement loop** — when does TB12's audience migrate to challenger brands that offer the same methodology without the athlete premium? (2) **legacy-decay risk** — at what point does the athletic identity become a liability for enterprise credibility (nostalgic association vs. current relevance)?

---

## Key Constructs

**Transition Phase Model:** Five phases of the athlete→enterprise arc:
- PHASE_1_ACTIVE: Athletic identity at peak, enterprise credibility borrowed from performance
- PHASE_2_TRANSITION: Retirement announced, enterprise must stand independently
- PHASE_3_DECOUPLING: Brand succeeds on product merit independent of athlete associations
- PHASE_4_LEGACY: Athletic identity is heritage asset — positive for premium but limits new audience acquisition
- PHASE_5_COMMODITY: Enterprise competes on price/features vs. competitors without brand premium

**Competitor Replacement Loop (CRL):** Rate at which TB12's audience is migrating to challenger brands (Whoop, Momentous, Athletic Greens) offering equivalent methodology. CRL HIGH = migration accelerating, brand premium eroding.

**Methodology Moat:** The degree to which TB12's performance methodology is proprietary and not replicable by competitors. Higher methodology moat = CRL is slower (harder to replicate the "why").

---

## BEV Integration

Imports `computeBEV()` from WO-1798:
- `brand_velocity`: current TB12 / Brady brand relevance
- `moat_durability`: methodology moat strength (how independent is TB12 from Brady-the-person)
- `dilution_risk`: legacy-to-venture transition friction (PHASE_4 risk)
- `concentration_risk`: HIGH if TB12 enterprise value depends on Brady's continued active promotion

---

## Intent Classification

```
brady|tb12|performance|wellness|lifestyle|health|athlete brand|
athlete entrepreneur|legacy brand|sports brand|competitor|
challenger brand|methodology|whoop|athletic greens|
transition|retirement|enterprise|sport to business
```

---

## Four Branches

1. **isTransition** — transition phase classification (PHASE_1 through PHASE_5)
2. **isCompetitor** — COMPETITOR_REPLACEMENT_LOOP (CRL velocity — who is taking Brady's audience)
3. **isLegacy** — LEGACY_ASSET_HOLDING / LEGACY_LIABILITY_FORMING (when athletic identity stops helping)
4. **Default** — TB12_ENTERPRISE_SIGNAL_ACTIVE

---

## Output Contract

Standard + WO-1798 BEV fields + Brady-specific:
```
bev_score                 — from computeBEV()
transition_phase          — PHASE_1 through PHASE_5
competitor_replacement_rate — HIGH / MODERATE / LOW (migration to challengers)
methodology_moat          — STRONG / MODERATE / ERODING
legacy_risk               — ASSET / NEUTRAL / LIABILITY
time_to_phase_shift       — estimated months before next transition phase
```

---

## Pass Criteria

- [ ] `computeBEV()` imported, `bev_score` present
- [ ] `transition_phase` correctly classifies athletic brand arc position
- [ ] `competitor_replacement_rate` HIGH when challenger brand signals detected
- [ ] `legacy_risk` = LIABILITY when bev declining + transition phase = PHASE_4/5
- [ ] Build clean, node --check passes
