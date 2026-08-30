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
| E | 12 | Founder must author the measure (the 6 concentration measures + 6 others) |
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
| large-scale reallocations (Reallocation dim measure) | **E** | Founder formula |
| capital-intensity change | **E** | Founder formula |
| deployment velocity | **E** | Founder formula |
| `capital_concentration` measure | **AUTHORED** (Founder 2026-08-29) → **D** for data | **top-holder share** = `max(holder_capital) / Σ(holder_capital) × 100`. Measure done; no wired source (SEC 13F / Form D / fund-filing class). CAPITAL.md §3.1. |

### OWNERSHIP — connectors: SEC 13D/13G, EDGAR 8-K, Companies House, FEC, Census(+LAB)

| candidate signal | class | note |
|---|---|---|
| 13D/13G disclosure activity rate | **B** | `secownershipconnector` dispatches a signal; generic, not a defined rate; `_pool` strips |
| control-change event rate (M&A / divestiture / merger) | **B** | `edgar8k*` + `secownership` emit events; no windowed rate measure |
| transaction value where disclosed | **C** | 8-K sometimes carries it; not extracted as a quantity |
| new-entity / spin-out / consolidation count | **D** | no reliable wired source |
| **ownership / control concentration measure** | **E** | Founder formula |

### TECHNOLOGY — connectors: PatentsView(+OWN+CAP), GitHub, npm, Kalshi, FDA(partial), displacement engine

| candidate signal | class | note |
|---|---|---|
| patent velocity per cluster (`TECHNOLOGY_VELOCITY`) | **B** | normalized 0–100, has polarity, via `relationontology`; **defects:** multi-domain dispatch not facet-distinct (WO-2), cluster- not subject-scoped, `_pool` strips |
| assignee acceleration (`ASSIGNEE_ACCELERATION`) | **B** | same |
| repository / package activity | **B** | GitHub/npm produce a real 0–100 composite, but it is **generic "tech activity"**, not a named `I_d` signal; `confidence` 0–1; `_pool` strips |
| displacement margin | **B/E** | `happypathdisplacementengine` computes it; `DISPLACEMENT_MARGIN=8` marked CALIBRATE → **E** for the calibration |
| adoption-metric rate (deployment footprint) | **D** | no wired source |
| infrastructure build / decommission count | **D** | no wired source |
| **capability concentration measure** | **E** | Founder formula |

### KNOWLEDGE — connectors: OpenAlex, arXiv, PubMed, FDA(partial), PatentsView `INVENTOR_MIGRATION`

| candidate signal | class | note |
|---|---|---|
| publication / preprint activity per field | **B** | openalex/arxiv/pubmed produce activity; generic, `_pool` strips, needs per-field definition |
| citation flow / accumulation | **C** | OpenAlex citation data available; not computed as a signal |
| inventor / expertise migration | **B** | `INVENTOR_MIGRATION` relation exists; the KNOWLEDGE-facet (knowledge carried) not extracted |
| collaboration-network density / churn | **D** | no wired source |
| diffusion rate | **E** | Founder formula (time creation → broad adoption) |
| **expertise concentration measure** | **E** | Founder formula |

### LABOR — connectors: BLS, USAJobs, Census(+OWN), SupplyChain(TECH/CAP/LAB)

| candidate signal | class | note |
|---|---|---|
| job-opening activity per occupation/region | **B** | `usajobsconnector`; generic, `_pool` strips |
| employment / wage / occupational series | **B** | `blsconnector`; `confidence: 0.9` (unit issue); generic |
| workforce / establishment counts per geography | **B** | `censusconnector`; **LAB/OWN facet-distinctness** (WO-2); `_pool` strips |
| hiring / layoff event rate at scale | **D** | WARN-notice class not connected |
| labor-action event count | **D** | no wired source |
| **geographic redistribution measure** | **E** | Founder formula |
| **skill-mix shift measure** | **E** | Founder formula |

### MEDIA — connectors: GDELT, Reddit, FEC(+CAP)

| candidate signal | class | note |
|---|---|---|
| news tone / attention | **B** | `gdeltconnector`; real tone-weighted 0–100; `_pool` strips; generic-not-per-subject |
| social propagation velocity | **B** | `redditconnector`; real 24h velocity × upvote quality; `_pool` strips |
| PAC / ad-spend velocity (attention pressure) | **B — DEFECTIVE** | `fecconnector` MEDIA signal `= CAP signal × 0.85` — a relabel, **fails the shared-source distinct-facet AC**. WO-2 fix #3. |
| **attention concentration measure** | **E** | Founder formula |
| **narrative coherence measure** | **E** | Founder formula |
| information-asymmetry aggregate (edge-property, §5) | **D/E** | no source + no measure |

---

## The 12 Class-E measures (Founder authorship, WO-1 critical path)

**Authored:** 1 of 12 — `capital_concentration` = **top-holder share** (Founder
2026-08-29, CAPITAL.md §3.1). Once authored, a measure drops to Class D (needs a
wired source) or C (data present).

1–6. The six concentration measures — CAPITAL / OWNERSHIP / TECHNOLOGY / KNOWLEDGE
   (expertise) / LABOR (geographic) / MEDIA (attention).
7. CAPITAL deployment velocity.
8. CAPITAL capital-intensity change.
9. KNOWLEDGE diffusion rate.
10. LABOR geographic-redistribution measure.
11. LABOR skill-mix shift measure.
12. MEDIA narrative-coherence measure.
   *(+ displacement-margin calibration; + information-asymmetry.)*

**No code path can produce any of these until the measure is authored.** Mark the
field blocked; implement everything around it.

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
