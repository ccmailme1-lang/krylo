# WO-1769 — Refinitiv / High-Freq Feed Procurement

STATUS: BACKLOG — infrastructure procurement. No code until vendor contract signed.
ORIGIN: WO-1768 phase split 2026-06-17. Phase B data dependency.
CLASS: Infrastructure / Data Procurement

---

## 1. Purpose

Acquire daily sector-level notional turnover and market-cap data required for
the VWSC/VWCC precision layers in WO-1768 Phase B. Phase A (WO-1768-A) is
operational without this feed. This WO unblocks Phase B only.

---

## 2. Scope

1. **Vendor contract & legal review** — Refinitiv (LSEG) or equivalent
   (Bloomberg SAPI, FactSet, Quandl/Nasdaq Data Link as fallback).
   Target: daily GICS sector-level notional volume + market cap.

2. **S3 landing zone + Glue catalog** — raw parquet files, partitioned by
   date/sector. Schema must be agreed before signing.

3. **Mini-POC** — ingest 30 days of demo/trial data; verify schema compatibility
   with Krylo sector taxonomy (6 domains: TECHNOLOGY/CAPITAL/KNOWLEDGE/LABOR/
   MEDIA/OWNERSHIP). Confirm GICS → Krylo domain mapping.

---

## 3. Dependency chain

```
WO-1769 (feed procurement)
    └── WO-1770 (schema validation pipeline)
            └── WO-1771 (VWSC upgrade — Phase B of WO-1768)
```

WO-1770 and WO-1771 are not filed until WO-1769 POC passes.

---

## 4. Cost estimate (preliminary)

- Storage: ~+250 GB/day ingress, ~+$3k/month S3 + Glue
- Vendor license: TBD (Refinitiv LSEG pricing requires direct quote)
- Ops overhead: +1 ETL job per day

Go/No-Go on WO-1770 is contingent on ops cost approval.

---

## 5. Not in scope

- Any code changes to existing Krylo modules
- VWSC calculation (that is WO-1771)
- Any UI changes

---

## 6. Done criteria

- Vendor contract signed
- 30-day demo data ingested without schema errors
- GICS → Krylo domain mapping verified against at least 3 sector categories
- S3 parquet partition structure documented and approved
