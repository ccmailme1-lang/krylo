# WO-1 — Signal Classification Matrix (A–F)

**Status:** the audit deliverable. Read-only classification, 2026-08-29.
**Against:** the six `I_d` §3 candidate signal inventories + `domain-substrate-baseline-audit.md` (`9f02c70`).

**Classes:**
- **A** — exists and contract-compliant (wired, subject-scopable, 0–100, provenance, single-axis attribution)
- **B** — exists but deficient (connector produces a related quantity with a fixable defect)
- **C** — derivable from existing evidence (raw data is in a wired connector; no measure computed)
- **D** — requires new measurement (needs a new source / connector)
- **E** — requires Founder-authored definition (the *measure/formula* must be authored before any code)
- **F** — not currently supportable

---

## Headline

**Class A count: 0.** Nothing is a contract-compliant `I_d` signal today. Every
connector-backed quantity is (a) **generic domain-activity intensity**, not a
specific `I_d` signal; (b) read through the **lossy `_pool`** which strips
`source` and signal-type; (c) **field-scoped**, not `A(d, Subject)`. Those three
are the WO-1 substrate defects — frozen behaviour, buildable now.

| class | count | nature |
|---|---|---|
| A | 0 | — |
| B | 15 | connector-backed; blocked on the 3 substrate repairs + subject scope |
| C | 4 | data present, measure not computed |
| D | 10 | new source required |
| E | 0 remaining (all 12 authored 2026-08-29/30 → Class D for data) | authorship blocker CLOSED |
| F | 0 | — |

---

## Per-domain

### CAPITAL — connectors: FRED, Treasury, WorldBank, USASpending, FEC (all `domain:'CAPITAL'`)

| candidate signal | class | note |
|---|---|---|
| sector / fund / ETF flows | **C** | FRED/Treasury macro series present; no flow measure computed |
| debt issuances | **C** | Treasury/FRED partial |
| financing rounds | **D** | no wired source |
| capital calls | **D** | no wired source |
| buybacks / dividends | **D** | SEC/XBRL "where available" — not wired |
| large-scale reallocations (Reallocation dim measure) | **E** | Founder formula (not yet authored) |
| `capital_intensity_change` measure | **AUTHORED** (Founder 2026-08-30) → **D** | `(CI_end − CI_start)/CI_start × 100`, `CI = capital_employed/output`. CAPITAL.md §3.3. Signed; magnitude = min(100,\|v\|), polarity = sign. |
| `capital_deployment_velocity` measure | **AUTHORED** (Founder 2026-08-30) → **D** | `deployed_in_window / committed_at_window_start × 100` (cap 100). CAPITAL.md §3.2. Rate of state change, not amount. |
| `capital_concentration` measure | **AUTHORED** (Founder 2026-08-29) → **D** for data | **top-holder share** = `max(holder_capital) / Σ(holder_capital) × 100`. Measure done; no wired source (SEC 13F / Form D / fund-filing class). CAPITAL.md §3.1. |

### OWNERSHIP — connectors: SEC 13D/13G, EDGAR 8-K, Companies House, FEC, Census(+LAB)

| candidate signal | class | note |
|---|---|---|
| 13D/13G disclosure activity rate | **B** | `secownershipconnector` dispatches a signal; generic, not a defined rate; `_pool` strips |
| control-change event rate (M&A / divestiture / merger) | **B** | `edgar8k*` + `secownership` emit events; no windowed rate measure |
| transaction value where disclosed | **C** | 8-K sometimes carries it; not extracted as a quantity |
| new-entity / spin-out / consolidation count | **D** | no reliable wired source |
| `ownership_concentration_top_holder_share` measure | **AUTHORED** (Founder 2026-08-30) → **D** for data | **top-holder control share** = `max(holder_control) / Σ(holder_control) × 100`. Measure done; no wired source (beneficial-ownership / voting-control class). OWNERSHIP.md §3.1. Control-rights share, NOT capital (CAPITAL). |

### TECHNOLOGY — connectors: PatentsView(+OWN+CAP), GitHub, npm, Kalshi, FDA(partial), displacement engine

| candidate signal | class | note |
|---|---|---|
| patent velocity per cluster (`TECHNOLOGY_VELOCITY`) | **B** | normalized 0–100, has polarity, via `relationontology`; **defects:** multi-domain dispatch not facet-distinct (WO-2), cluster- not subject-scoped, `_pool` strips |
| assignee acceleration (`ASSIGNEE_ACCELERATION`) | **B** | same |
| repository / package activity | **B** | GitHub/npm produce a real 0–100 composite, but it is **generic "tech activity"**, not a named `I_d` signal; `confidence` 0–1; `_pool` strips |
| displacement margin | **B/E** | `happypathdisplacementengine` computes it; `DISPLACEMENT_MARGIN=8` marked CALIBRATE → **E** for the calibration |
| adoption-metric rate (deployment footprint) | **D** | no wired source |
| infrastructure build / decommission count | **D** | no wired source |
| `technology_capability_concentration` measure | **AUTHORED** (Founder 2026-08-30) → **D** for data | **top-capability-provider share** = `max(provider_capability_share)`. Measure done; no wired provider capability-share source. TECHNOLOGY.md §3.1. NOT adoption / displacement / activity / usage. |

### KNOWLEDGE — connectors: OpenAlex, arXiv, PubMed, FDA(partial), PatentsView `INVENTOR_MIGRATION`

| candidate signal | class | note |
|---|---|---|
| publication / preprint activity per field | **B** | openalex/arxiv/pubmed produce activity; generic, `_pool` strips, needs per-field definition |
| citation flow / accumulation | **C** | OpenAlex citation data available; not computed as a signal |
| inventor / expertise migration | **B** | `INVENTOR_MIGRATION` relation exists; the KNOWLEDGE-facet (knowledge carried) not extracted |
| collaboration-network density / churn | **D** | no wired source |
| `knowledge_diffusion_rate` measure | **AUTHORED** (Founder 2026-08-30) → **D** | `new_adopters_in_window / reachable_population × 100`. KNOWLEDGE.md §3.2. Reachable-population denominator must be SOURCED — structural absence in nearly all real cases (accepted). |
| `knowledge_expertise_concentration` measure | **AUTHORED** (Founder 2026-08-30) → **D** for data | **top-holder expertise share (CR-1)** = `max(holder_expertise) / Σ(holder_expertise) × 100`. KNOWLEDGE.md §3.1. Expertise stock, NOT publication/citation flow or diffusion. |

### LABOR — connectors: BLS, USAJobs, Census(+OWN), SupplyChain(TECH/CAP/LAB)

| candidate signal | class | note |
|---|---|---|
| job-opening activity per occupation/region | **B** | `usajobsconnector`; generic, `_pool` strips |
| employment / wage / occupational series | **B** | `blsconnector`; `confidence: 0.9` (unit issue); generic |
| workforce / establishment counts per geography | **B** | `censusconnector`; **LAB/OWN facet-distinctness** (WO-2); `_pool` strips |
| hiring / layoff event rate at scale | **D** | WARN-notice class not connected |
| labor-action event count | **D** | no wired source |
| `labor_geographic_concentration` measure | **AUTHORED** (Founder 2026-08-30) → **D** for data | **top-location workforce share (CR-1)** = `max(location_headcount) / Σ(location_headcount) × 100`. LABOR.md §3.1. Static locational concentration, NOT redistribution/skill-mix/hiring rate. |
| `labor_geographic_redistribution` measure | **AUTHORED** (Founder 2026-08-30) → **D** | `Σ\|share_end(loc) − share_start(loc)\| / 2 × 100` (dissimilarity-index). LABOR.md §3.2. The *change*, distinct from static concentration. |
| `labor_skill_mix_shift` measure | **AUTHORED** (Founder 2026-08-30) → **D** | `Σ\|share_end(skill) − share_start(skill)\| / 2 × 100` (dissimilarity-index over a stated taxonomy). LABOR.md §3.3. |

### MEDIA — connectors: GDELT, Reddit, FEC(+CAP)

| candidate signal | class | note |
|---|---|---|
| news tone / attention | **B** | `gdeltconnector`; real tone-weighted 0–100; `_pool` strips; generic-not-per-subject |
| social propagation velocity | **B** | `redditconnector`; real 24h velocity × upvote quality; `_pool` strips |
| PAC / ad-spend velocity (attention pressure) | **B — DEFECTIVE** | `fecconnector` MEDIA signal `= CAP signal × 0.85` — a relabel, **fails the shared-source distinct-facet AC**. WO-2 fix #3. |
| `media_attention_concentration` measure | **AUTHORED** (Founder 2026-08-30) → **D** for data | **top-source attention share (CR-1)** = `max(source_attention) / Σ(source_attention) × 100`. MEDIA.md §3.1. Source-base concentration, NOT velocity/coherence/tone/volume. |
| `media_narrative_coherence` measure | **AUTHORED** (Founder 2026-08-30) → **D** | `max(frame_share) / Σ(frame_share) × 100` (CR-1 on frames). MEDIA.md §3.2. Structural property only, never a truth signal; requires SOURCED per-source frame classification. |
| information-asymmetry aggregate (edge-property, §5) | **D/E** | no source + no measure |

---

## The 12 Class-E measures (Founder authorship, WO-1 critical path)

**Authored: 12 of 12 — the Class-E authorship blocker is CLOSED (Founder
2026-08-29/30).** All authored, all `dataState: CLASS_D` (measure defined, no
wired source), all rendering live in the Target Packet SIGNAL panel as classified
STRUCTURAL absence.

*Concentration family (§3.1 each), all CR-1, all `% (0–100, identity)`:*
1. `capital_concentration` — top-holder share (CAPITAL.md §3.1).
2. `ownership_concentration_top_holder_share` — top-holder control share (OWNERSHIP.md §3.1).
3. `technology_capability_concentration` — top-capability-provider share (TECHNOLOGY.md §3.1).
4. `knowledge_expertise_concentration` — top-holder expertise share (KNOWLEDGE.md §3.1).
5. `labor_geographic_concentration` — top-location workforce share (LABOR.md §3.1).
6. `media_attention_concentration` — top-source attention share (MEDIA.md §3.1).

*Rate / change / shift / coherence measures:*
7. `capital_deployment_velocity` — `deployed_in_window / committed_at_window_start × 100` (CAPITAL.md §3.2).
8. `capital_intensity_change` — signed `(CI_end − CI_start)/CI_start × 100` (CAPITAL.md §3.3).
9. `knowledge_diffusion_rate` — `new_adopters / reachable_population × 100`, sourced denominator required (KNOWLEDGE.md §3.2).
10. `labor_geographic_redistribution` — `Σ|Δ location share| / 2 × 100` (LABOR.md §3.2).
11. `labor_skill_mix_shift` — `Σ|Δ skill share| / 2 × 100` (LABOR.md §3.3).
12. `media_narrative_coherence` — `max(frame_share)/Σ(frame_share) × 100`, sourced frame classification required, structural property only (MEDIA.md §3.2).

Every measure is Class D (needs a wired source). None fabricates, estimates,
zero-fills, or volume-proxies a value.

**Production-visible (KRYL-1229):** the Target Packet 01 ANALYSIS SIGNAL panel
(`domainsubstratetabs.jsx`) reads `domainIntelligence(d).signalDefs`. An AUTHORED
measure with `dataState: CLASS_D` renders as classified STRUCTURAL absence — measure
name, `DATA UNAVAILABLE · SOURCE REQUIRED`, `absenceClass: STRUCTURAL`, plus the
formula/boundary as reference.

**Still Class E (not part of the 12):** displacement-margin calibration;
information-asymmetry aggregate.

**Remaining path is implementation/integration, not ontology design:**
WO-1 (source wiring) → WO-5B (subject binding, `A(d, Subject)`) → WO-6 (Anduril
end-to-end acceptance).

---

## What proceeds now (frozen behaviour — WO-1 substrate repairs)

The Class-B deficiencies are all one of three fixable substrate defects, whose
required behaviour is already frozen:

1. **`_pool` lossy projection** — `domaingravity.js` `_pool` keeps `{confidence,
   polarity, ts}`; it must also keep `source` and a `facet`/`signal` identity so
   attribution and the distinct-facet AC are possible. Authored signals read from
   a source-preserving surface, not `getDomainSignals`.
2. **Confidence unit** — one runtime contract (proposed: `confidence ∈ [0,1]`;
   `signal ∈ [0,100]`). Connectors emitting `0–100` confidence (`patentsview`)
   normalize at the boundary; `_pool` rejects out-of-range.
3. **FEC facet** — remove `MEDIA signal = CAP signal × 0.85`. CAP gets the actual
   flow figure; MEDIA gets an independently-derived ad-spend-velocity figure, or
   the connector fails the distinct-facet AC.

Sequencing: (1) and (2) are `domaingravity.js` + a connector-boundary contract;
(3) is `fecconnector.js` alone. Do (1)+(2) first (they define the surface (3)
must conform to).
