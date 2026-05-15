# WO-1033: ADVANTAGE
**Status:** Pending — awaiting Go
**Date:** 2026-05-03

---

## What It Is

ADVANTAGE is an on-demand gap analysis layer that lives on individual ETR cards. It surfaces the **Prospect Window** — how early the user is, what correlations exist, and what the signal means for their specific context.

The premise: every ETR is a dig site. The elephant lights when there's something worth excavating.

---

## The Business Problem It Solves

> "In your world, what is the cost of knowing second?"

KRYLO runs a Truth Engine to produce Signal Intelligence. ADVANTAGE is where that intelligence becomes actionable — the moment the user moves from *knowing* to *acting*.

The gap between when KRYLO surfaces a signal and when the market knows is the product. ADVANTAGE measures and delivers that gap.

---

## Activation — The Elephant

The KRYLO elephant logo is embedded in each ETR card as the ADVANTAGE readiness indicator.

**Visual states:**
- **Lit** → correlation detected, ADVANTAGE available. Elephant glows lime (#66FF00). Glow intensity and size: TBD — Founder to specify.
- **Dark** → no correlation detected, ADVANTAGE unavailable. No glow. Elephant opacity: TBD — Founder to specify.

**Eligibility:** An ETR card renders the elephant only when all of the following fields are populated: `origin`, `category`, `score`. Cards missing any of these fields do not display the elephant.

**Activation logic:** The elephant listens for correlations — any signal connecting to another ETR across category, origin, velocity, or source chain. Correlation present = elephant lit. No score threshold. No manual gate.

**The lit elephant IS the Prospect Window opening.**

---

## Correlation Detection Engine

**Owner:** New file — `src/engine/correlationListener.js`

**Logic:**
- On ETR load, scan all active ETRs in the registry
- For the current ETR, check for matches on any of: `category`, `origin`, `velocity` (range TBD — Founder to confirm tolerance), `source agency`
- If ≥1 match found → flag this ETR as correlation-detected
- ETR card responds to flag and lights the elephant

**Scan cadence:** TBD — Founder to confirm frequency.

---

## Architectural Note — Integration Path

ETR cards currently exist as static HTML in `public/krylo-feed.html`. ADVANTAGE requires an inline expand behavior on individual cards. Before build begins, the integration strategy must be confirmed:

- **Option A:** ADVANTAGE panel is injected as static HTML/JS directly into `krylo-feed.html` — consistent with current architecture
- **Option B:** ETR cards are migrated to a React component (`src/components/etrcard.jsx`) and ADVANTAGE is built as `src/components/advantage.jsx` — cleaner long-term, requires migration work

**This decision must be made before any code is written. Default assumption is Option A unless Founder confirms Option B.**

---

## User Interaction Flow

1. User sees lit elephant on ETR card
2. User hits the elephant
3. ADVANTAGE query fires — packages ETR data + correlated ETRs
4. Card unfurls inline (expands downward)
5. ADVANTAGE panel renders in three tiers

**Unfurl animation:** TBD — Founder to specify timing and easing.

---

## Layout — Inline Unfurl

Card expands downward. Three tiers render top-to-bottom inside the expanded card.

---

### Tier 1 — Core: Gap Analysis + Insights

**Gap Analysis:**
- List of correlated ETRs detected by the correlation engine
- For each correlated ETR: name, category, origin, score, and correlation type (category match / origin match / velocity overlap / source overlap)
- Typography: IBM Plex Mono

**Insights:**
- Plain-English synthesis from Opus 4.7
- Answers: what is the gap, is it widening or closing, what does it mean
- Typography: serif (per KRYLO dual voice spec — Oracle Voice for synthesis)

---

### Tier 2 — Supporting: Window + Charts

**Window Indicator:**
- Visual representation of how early/late the user is relative to broad awareness
- Position calculated from: source count, velocity rate, coverage density
- Specific labels and visual form: TBD — Founder to review at mock stage

**Charts:**
- Signal Overlap — how many ETRs share this signal's category + origin (recharts)
- Velocity Comparison — this ETR's velocity vs. correlated ETRs (recharts)
- Chart types (bar / line / area) and exact configuration: TBD at mock review

---

### Tier 3 — Extended: Modeling Options

Three model options rendered. The model matching the ETR's category is the **active model** (highlighted). The other two are visible and selectable — user can switch manually if desired.

| Model | Active for Categories | What It Delivers |
|-------|----------------------|-----------------|
| **Competitive** | MONETARY, GEO-POL | Who else is positioned on this signal. Zero-sum framing. Positioning against others. |
| **Market** | FINANCIAL, RESEARCH, EMERGING | Where the untapped demand is. Competitor gap map. Opportunity window width. |
| **Client** | PUBLIC HEALTH, SOCIAL IMPACT, LATEST NEWS | What unmet need this signal exposes. Personal relevance. Consequence framing. |

User hits active model → deeper model output renders below. Layout of deep model output: TBD at mock review.

---

## Output (Three Deliverables — All Models)

Every model produces these three outputs regardless of type:

1. **Window** — how much time before this signal becomes common knowledge
2. **Gap** — what adjacent signals are dark (the void is the opportunity)
3. **Relevance** — what this means for the user's specific context

Output rendered by Opus 4.7 in plain English. IBM Plex Mono for data labels, serif for synthesis text (per KRYLO dual voice spec).

---

## Pipeline

Extends WO-1032 (Foresight Engine — Multi-Model Pipeline).

**DeepSeek** → ingestion + competitive landscape scan + correlated ETR packaging
**o3** → trajectory math, window timing, gap detection, velocity projection
**Opus 4.7** → plain-English ADVANTAGE output, model-specific synthesis

ADVANTAGE prompt templates are added to WO-1032 as a fourth use case alongside foresight. Each model (Competitive / Market / Client) requires its own prompt template.

---

## Build Phases

**Phase A — Mock data (buildable now)**
- Correlation engine scanning mock ETR registry
- Elephant activation on mock correlations
- Inline unfurl layout with static data
- All three tiers rendered
- Window indicator with hardcoded position (exact form TBD at mock review)

**Phase B — Live data (requires WO-1032 complete)**
- Correlation engine connected to live ETR registry
- DeepSeek → o3 → Opus 4.7 pipeline fires on elephant hit
- Window indicator calculated from live velocity + source density
- Charts populated with real signal data

---

## Presentation Sequence

| Level | Trigger | What User Sees |
|-------|---------|---------------|
| Card at rest | Elephant lit | Lit elephant — ADVANTAGE available |
| Inline expand | Elephant hit | Tier 1: Gap Analysis + Insights |
| Scroll down | — | Tier 2: Window indicator + Charts |
| Scroll down | — | Tier 3: Modeling options (active model highlighted) |
| Model hit | Model card tap | Deep model output (TBD at mock review) |
| Layer 3 | One more click | Full God's Eye depth (WO-1025) |

---

## File Map

| File | Role |
|------|------|
| `src/engine/correlationListener.js` | New — correlation detection, elephant activation |
| `public/krylo-feed.html` | Modified — elephant indicator per card, expand trigger, ADVANTAGE panel (Option A) |
| `src/components/advantage.jsx` | New — only if Option B (React migration) is confirmed |

---

## Open Items — Founder Input Required Before Build

| Item | Blocker |
|------|---------|
| Elephant size and position on card | Design Sovereignty — cannot proceed without |
| Elephant dark state opacity | Design Sovereignty — cannot proceed without |
| Unfurl animation timing and easing | Design Sovereignty — cannot proceed without |
| Window indicator labels and visual form | Design Sovereignty — review at mock stage |
| Velocity correlation tolerance range | Engineering spec |
| Correlation scan cadence | Engineering spec |
| Integration path — Option A (HTML) vs Option B (React migration) | Architecture decision |
| Deep model output layout | Review at mock stage |

---

## Dependencies

| WO | Type | Status |
|----|------|--------|
| WO-1032 | Pipeline — Phase B blocked until complete | Pending |
| WO-1025 | Layer 3 drill-down — linked from Tier 3 | Pending |

---

## Notes

- Feature name: **ADVANTAGE** — broad audience resonance across financial, policy, and personal use cases
- Elephant activation is a correlation listener, not a quality gate
- Model routing is automatic — category determines active model, user can override
- Dual voice applies throughout: IBM Plex Mono for data, serif for Opus synthesis output
- "Mining for gold" — ETR is a dig site, elephant lights when there's something worth excavating
