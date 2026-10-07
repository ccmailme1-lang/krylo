# KRYLO — Data Room Metrics

**Status:** DRAFT (2026-10-07). Definitions first; values only from instrumented data. No value is
entered by estimate.

---

## 1. Current instrumentation

- Product telemetry: `src/engine/telemetry.js` `emitTelemetry()`.
- Guest attribution attached to every event from 2026-09-22. Earlier rows are mostly
  unattributed (108 of 5,054 recovered by backfill) — pre-fix usage cannot be counted per guest.
- Source: `specs/REPORT-guest-pilot-verified-findings-20260922.md` §1.1.

## 2. Metric definitions

| Metric | Definition | Type | Value |
|---|---|---|---|
| Active guests | Distinct attributed `profile_id` with ≥1 session in period | Activity | Not yet reported |
| Returning guests | Active guests with sessions in ≥2 distinct weeks | Activity | Not yet reported |
| Subjects interrogated | Distinct queries submitted per guest | Activity | Not yet reported |
| Formation rate | Share of queries returning ≥1 admitted formation | Product | Not yet reported |
| Honest-absence rate | Share of queries ending in a no-signal / withheld state | Product | Not yet reported |
| Pilot pass rate | Pilots meeting the gtm-strategy.md §3 criterion | Outcome | No pilots yet |
| Pilot → paid | Paid conversions / completed pilots | Outcome | No pilots yet |
| Net revenue retention | Standard definition | Outcome | No revenue yet |

Activity is not impact (CLAUDE.md §20.6): report activity and outcome metrics separately, never as
one figure.

## 3. Hero metrics (CLAUDE.md §14)

Signal · Validity · Convergence are measured. CAC · ROAS · LTV are modeled and must be labeled
**Projected** until realized data exists. Every reported metric shows Realized and Projected
separately.
