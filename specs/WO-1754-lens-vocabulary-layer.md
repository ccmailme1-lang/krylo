# WO-1754 — Lens-Specific Entry Vocabulary Layer

**Status:** BACKLOG
**Filed:** 2026-06-15
**Origin:** Persona feedback synthesis session. 10 professional archetypes independently described Krylo using their own vocabulary — none used the platform's native language ("signal intelligence," "Truth Engine," "convergence state"). Each mapped the platform to the closest tool they already trust.

---

## PROBLEM

The platform speaks one language. Professional users arrive in ten different ones.

| Cohort | How they described Krylo | Native vocabulary |
|---|---|---|
| Labor & Employment (Legal) | "AI platform for legal workflow optimization" | Workflow, matter, precedent |
| Machine Learning (Legal-Tech) | "ML-enabled analysis tool" | Schema, model, inference |
| CMO — B2B SaaS | "Marketing intelligence platform" / "Service analytics dashboard" | Pipeline, category, timing |
| Health Ministry | "Health data decision support" | Protocol, taxonomy, coverage |
| Humanitarian | "Global humanitarian insights tool" | Donor cycles, funding mapping, institutional |
| Banking | "Banking intelligence solution" / "Financial analytics platform" | Macro, allocation, deterministic |
| CMO — Consumer Brand | "Consumer brand strategy AI" / "Trend forecaster" | Cultural moment, category, launch window |

The engine is identical for all of them. Only the surface needs to change.

---

## SPEC

### What changes
The ingress surface — chip chain labels, situation placeholder copy, section headers, synthesis readout labels — adapts its vocabulary based on the active lens selection.

The engine, domain routing, signal field, and convergence classifier are **untouched**.

### Vocabulary profiles per lens

| Lens | Situation label | Floor label | Horizon label | Synthesis header |
|---|---|---|---|---|
| INVESTOR | Strategic Position | Capital Threshold | Deployment Window | Market Intelligence |
| REALTOR | Market Entry | Price Floor | Transaction Window | Property Signal |
| LEGAL | Matter Context | Risk Threshold | Filing Window | Case Intelligence |
| HEALTH | Clinical Context | Coverage Floor | Care Window | Health Signal |
| SALES | Deal Context | Revenue Floor | Close Window | Pipeline Intelligence |
| ATHLETE | Career Context | Contract Floor | Season Window | Performance Signal |
| STUDENT | Learning Context | Cost Floor | Enrollment Window | Academic Signal |
| GENERAL | Situation | Floor | Horizon | Signal Synthesis |

### What does NOT change
- Domain names (TECHNOLOGY · CAPITAL · KNOWLEDGE · LABOR · MEDIA · OWNERSHIP) — locked
- Convergence state labels (BUILDING CONVERGENCE, TURBULENT, etc.) — locked
- Engine output, tensor structure, acquisition payload — locked
- Intelligence Brief classification banners — locked

### Implementation scope
- `src/components/analysis/analysisidlefield.jsx` — chip chain + section headers
- `src/engine/ingress.js` — add `LENS_VOCABULARY` map
- `src/engine/querysynthesis.js` — surface-level copy only, no logic changes

---

## PASS CRITERIA
1. Selecting LEGAL lens → chip chain reads "Matter Context / Risk Threshold / Filing Window"
2. Selecting HEALTH lens → chip chain reads "Clinical Context / Coverage Floor / Care Window"
3. Selecting INVESTOR lens → chip chain reads "Strategic Position / Capital Threshold / Deployment Window"
4. Engine output (domain, tensor, synthesis) is identical regardless of lens vocabulary active
5. GENERAL lens (fallback) renders current copy unchanged

---

## DEPENDENCIES
- WO-1702 (Ingress Contract Completion Layer) — COMPLETE
- WO-1718 (Chip Query Builder) — COMPLETE
- WO-1364 (Cascade Acquisition Payload) — COMPLETE

## ORIGIN NOTE
Filed from persona feedback synthesis. Professional cohorts (Legal/Banking/CMO/Health) each reframed Krylo in their own vocabulary. The gap between platform language and market language is a positioning and adoption risk, not an architecture risk. This WO closes that gap at the surface layer only.
