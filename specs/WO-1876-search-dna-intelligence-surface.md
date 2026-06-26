# WO-1876 — Search DNA Intelligence Surface

**Status:** SPEC — BLOCKED pending WO-1868  
**Filed:** 2026-06-25  
**Priority:** Medium-High  
**Depends on:** WO-1868 (Metrics Truth Engine) — must be built first  
**Future expansion:** WO-1869 (Leverage Realization) may contribute additional metrics

---

## 00 · Title

Search DNA Intelligence Surface — Layer 3 Repurposing

---

## 01 · Objective

Transform the current Layer 3 particle field behind the query composer from a primarily atmospheric visual effect into a persistent Search DNA Intelligence Surface that reflects the user's accumulated search behavior, domain focus, and intelligence journey.

The objective is to increase information density without increasing cognitive load.

---

## 02 · Problem Statement

**Current state:**
- Layer 3 is predominantly decorative
- Particle field establishes atmosphere but contributes little analytical value
- Large percentage of screen real estate remains underutilized
- Returning users receive no visible benefit from accumulated platform usage

**Result:** The platform learns from the user, but the user cannot see what the platform has learned.

---

## 03 · Design Principles

**P1 — Query Remains Primary**
- Nothing may compete visually with the search composer
- Search box remains dominant focal point

**P2 — Intelligence, Not Analytics**
- Avoid: KPI dashboard aesthetic, marketing metrics, business intelligence visual language
- Favor: intelligence briefing, behavioral fingerprint, search evolution

**P3 — Progressive Value**
- Surface becomes more useful as platform usage grows
- New users: minimal content
- Experienced users: richer intelligence profile

**P4 — Atmospheric Preservation**
- Particle field remains
- Reduce density ~70–80%
- Retain enough motion to preserve signal formation aesthetic

---

## 04 · Phase 1 Metrics (4 cards)

| Card | Label | Example Value | Definition |
|------|-------|---------------|------------|
| 01 | SIGNALS EXPLORED | 847 | Total completed search investigations |
| 02 | PRIMARY DOMAIN | FINANCIAL | Most frequently searched domain |
| 03 | AVG HORIZON | 18 MONTHS | Average search horizon across completed investigations |
| 04 | CONVERGENCE RATE | 68% | Percentage of searches reaching convergence threshold |

---

## 05 · Progressive Metrics (unlocked after sufficient history)

| Label | Example | Definition |
|-------|---------|------------|
| EMERGING DOMAIN | HEALTH ↑22% | Domain trending upward in recent searches |
| QUERY COMPLEXITY | 7.4 | Composite complexity score across searches |
| SIGNAL YIELD | 72% | Percentage of searches returning actionable signal |
| INTENT STABILITY | 87% | Consistency of underlying objectives across searches |

**Intent Stability examples:**
- High: mortgage, home purchase, school districts, property taxes
- Low: crypto, retirement, startup, vacation, job search

---

## 06 · Layout

Centered around composer. Cards never overlap composer. Cards fade into background hierarchy.

```
     [ SIGNALS ]     [ DOMAIN ]

          [ SEARCH BOX ]

     [ HORIZON ]     [ CONVERGENCE ]
```

---

## 07 · Visual Specification

- Card opacity: 10–20% (max 25%)
- Animation: subtle fade, slow telemetry drift only
- Forbidden: pulsing, flashing, count-up animations, gamification effects

---

## 08 · Typography

**Primary:** IBM Plex Mono (matches existing KRYLO identity)
- Labels: 11–12px, 400 weight
- Values: 24–32px, 500 weight

**Secondary option:** Geist Mono (cleaner, more modern — less institutional)

**Banned:** Orbitron, Audiowide, Exo, Rajdhani, Eurostile clones — sci-fi cosplay, not analytical instrumentation.

---

## 09 · Acceptance Criteria

- [ ] Search composer remains dominant focal point
- [ ] Layer 3 conveys user-specific intelligence
- [ ] Particle field reduced but preserved (~70–80% density reduction)
- [ ] Four Search DNA metrics rendered
- [ ] Progressive metric framework implemented
- [ ] No dashboard aesthetic introduced
- [ ] Information remains legible at glance

---

## 10 · Success Metric

A returning user should be able to answer **"What has KRYLO learned about how I think?"** within 3 seconds of opening the search screen.

---

## File Map

TBD — confirm before build. Likely touches:
- `public/krylo2-feed.html` — Layer 1 search surface (particle field + composer live here)
- New component or inline block for DNA card rendering

**TBD in File Map = BLOCKED from build until confirmed.**

---

## Bottle Test

1. Reduces ambiguity? YES — turns decorative space into intelligence surface
2. Single dominant output? YES — 4 DNA cards around composer
3. All boundaries defined? PARTIAL — file map TBD
4. No undefined dependencies? NO — blocked on WO-1868 data
5. Does not increase expressive flexibility in core? YES — display only, no engine changes

**Status: BLOCKED** — WO-1868 must ship first; file map must be confirmed before build.
