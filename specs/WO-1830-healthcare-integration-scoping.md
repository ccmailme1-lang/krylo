# WO-1830 — Healthcare Integration Scoping
Date: 2026-06-24
Author: Mr. XS
Status: SCOPING COMPLETE — architecture decision required before any connector WO

---

## Decision Required Before Build

This document defines the data boundary, compliance posture, and signal normalization
path for institutional health systems. No connector WO may be filed until the three
open decisions in §4 are resolved by Founder.

---

## 1. Data Boundary

**What Krylo may ingest from health systems:**
- Aggregate, de-identified population health indicators (e.g., CMS public datasets, CDC WONDER)
- Publicly available hospital capacity and utilization metrics (HHS Protect Public Data Hub)
- Drug approval signals from FDA (public API — no PHI)
- Payor/payer market signal data from public filings (EDGAR Form 10-K, CMS cost reports)

**What Krylo may NOT ingest:**
- Any data containing Protected Health Information (PHI) as defined by HIPAA §164.514
- HL7 FHIR patient records, clinical observations, or encounter data
- Any data from an EHR system without a signed BAA (Business Associate Agreement)
- Any data requiring patient consent under 42 CFR Part 2 (substance use disorder)

**Boundary rule:** Krylo is a signal intelligence instrument, not a clinical data processor.
All health signals must derive from de-identified aggregate sources only.

---

## 2. Compliance Posture

| Regulation | Krylo Stance |
|------------|-------------|
| HIPAA Privacy Rule | Ingest only de-identified / public aggregate — no BAA required at v1 |
| HIPAA Security Rule | N/A for public data; required if BAA ever signed |
| HL7 FHIR R4 | Schema reference only — Krylo does not consume FHIR resources at v1 |
| 21st Century Cures Act | No patient-facing surface — not applicable |
| SOC 2 Type II | Required before any institutional contract; not yet certified |
| CMS Data Use Agreement | Required for CMS Limited Data Sets — defer to Phase B |

**Phase A constraint:** All health connectors at v1 use public, de-identified data only.
BAA-gated data sources are Phase B, blocked on SOC 2 certification and legal review.

---

## 3. Signal Normalization Path

Health signals normalize to the KRYLO 0–100 scale via the following domain mapping:

| Health Data Source | KRYLO Domain | Normalization |
|-------------------|-------------|---------------|
| Hospital capacity / bed utilization | LABOR | % occupancy → 0–100 |
| Drug approval velocity (FDA) | KNOWLEDGE | approvals per quarter z-score |
| Payor market concentration (EDGAR) | CAPITAL | Herfindahl index → 0–100 |
| CMS cost per episode trends | CAPITAL | z-score vs 5yr rolling median |
| Public health emergency declarations | MEDIA | binary event → pressure spike |

All health signals dispatch via `surfacerouter.dispatchBatch()` — no direct cone write.
Decay tier: QUARTERLY (health system data moves on quarter cycles).

---

## 4. Open Decisions — Founder Resolution Required

| Decision | Options | Default if not resolved |
|----------|---------|------------------------|
| A. BAA path | (1) Never sign — public data only forever. (2) Sign BAA with specific institutional partners for Phase B. | Never sign — public data only |
| B. HL7 FHIR schema adoption | (1) Reference only (no ingest). (2) Ingest FHIR R4 de-identified bundles in Phase B. | Reference only |
| C. SOC 2 priority | (1) Pursue SOC 2 Type II now — enables BAA. (2) Defer — health vertical stays public-only. | Defer |

**No healthcare connector WO may be filed until Decision A is resolved.**

---

## 5. Next WO (when unlocked)

If Decision A = public-only: file WO for CMS public data connector (no BAA).
If Decision A = BAA path: file SOC 2 readiness WO first, then BAA connector WO.

---

## 6. Architecture Note

The HIPAA data boundary and the KRYLO "We don't predict. We detect." positioning are
compatible: detection of structural pressure in health system capacity, payor concentration,
and drug pipeline velocity does not constitute clinical decision support and does not
trigger FDA Software as a Medical Device (SaMD) regulation.

This positioning must be reviewed by legal counsel before any institutional contract is signed.
