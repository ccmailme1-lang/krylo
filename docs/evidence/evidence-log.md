# KRYLO — Evidence Log

**Status:** LIVE (started 2026-10-07). The only source investor-facing claims may cite.

**Rules**
- One row per claim. No row → the claim does not go in external material.
- Each row carries the CLAUDE.md §1 classification: **Maturity** A (production, live) / B
  (primitive exists) / C (spec only) / D (vision) × **Verification** L (lexical) / C (conceptual)
  / R (runtime-traced) / B (behaviorally observed).
- Misses and null results are logged with the same weight as hits.

---

## 1. Logged evidence

| Date | Claim | Evidence | Class | Source |
|---|---|---|---|---|
| 2026-09-22 | Guest pilot is live with external testers | Telemetry rows in production; guest feedback received | A / B | `specs/REPORT-guest-pilot-verified-findings-20260922.md` |
| 2026-09-22 | Guests read honest no-signal states as "broken" | Guest "J" feedback; traced to designed `NO_LIVE_SIGNAL` path | A / R | same report §2.2 B |
| 2026-09-22 | Canonical domain classification is deterministic and inspectable | Read in full: regex lexicon, no ML or external call | A / R | same report §3.2 |
| 2026-10-07 | 34 connector modules exist on disk | Files in `src/engine/connectors/`; 31 referenced by name elsewhere in `src/`; live invocation not traced | B / L | repo |

## 2. Validation VCs expect — status

| Category | What it would prove | Status |
|---|---|---|
| Retrospective back-tests | KRYLO admits real relationships from pre-event evidence | **Not run.** Candidates in `docs/market/problem-markets.md` |
| Relationship precision | Admitted relationships hold up under expert review | **Not measured** |
| Provenance completeness | Every presented relationship traces to evidence | **Not measured** across production output |
| Workflow pull | Guests return to KRYLO on live work, not curiosity | **Not measured** — telemetry attribution fixed 2026-09-22 |
| Willingness to pay | A buyer pays for a single-subject read | **No pilot priced yet** |
| Retention | Paid users renew/expand | **No paid users yet** |

## 3. Back-test protocol (to run)

1. Fix the cutoff date before the event. Use only evidence dated before it.
2. Run KRYLO on the subject. Record admitted relationships and formations, with timestamps and
   evidence links.
3. Compare to what actually happened. Record hits, misses, and false relationships.
4. Log the result here with class A/B or below. Publish misses alongside hits.

## 4. Back-test queue

| Candidate | Subject | Domains | Status |
|---|---|---|---|
| Texas winter storm, Feb 2021 | Energy → fabs/petrochemicals → electronics/materials | CAPITAL, TECHNOLOGY, OWNERSHIP | Queued |
| Ever Given, Mar 2021 | Suez blockage → shipping → downstream supply | CAPITAL, OWNERSHIP | Queued |
| Tōhoku / Renesas, Mar 2011 | Fab damage → auto MCU supply | TECHNOLOGY, CAPITAL | Queued — data-source coverage for 2011 unconfirmed |
| Paramount / Skydance, 2024–25 | Media consolidation | MEDIA, OWNERSHIP, CAPITAL | Queued |
| Nepal, Sept 2025 | Social-media ban → protests → government change | MEDIA, LABOR | Queued |
