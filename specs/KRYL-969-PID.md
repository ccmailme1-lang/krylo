# PROJECT INITIATION DOCUMENT (PID)

**Project:** KRYL-969 — Identity Evolution Engine
**Project Reference:** Jira KRYL-969 (canonical, see specs/KRYL-969-identity-evolution-engine.md for build-level spec)
**Date:** 2026-07-06
**Sponsor:** Mr. XS (Founder)
**Delivery model note:** This project does not run under formal ITIL/PRINCE2 governance. KRYLO's native process is the WO Hardening Template (Bottle Test + Four-Axis Hardening Rubric, `specs/WO-HARDENING-TEMPLATE.md`) — a lighter-weight, per-module gate, not a phase-gated program methodology. This PID maps the work into a recognizable structure without pretending the underlying governance is heavier than it is.

---

## 1. PROJECT DEFINITION

**Background:** KRYLO detects structural evidence (events, hiring, patents, filings) about entities, but has never captured how an entity *describes itself* over time. The observation that triggered this project: a company's declared positioning (mission statements, filings, press releases) often shifts years before the shift shows up in observable structural signals. Capturing that gap is directly on-mission (§19: "finding advantageous positions before they become obvious").

**Objectives:**
1. Capture durable, sourced evidence of declared self-description over time (Phase 1).
2. Convert that evidence into comparable structured claims (Phase 2).
3. Quantify how much a claim has moved between two points in time (Phase 3).
4. Compare declared movement against KRYLO's existing observed-structure signals to surface divergence (Phase 4).

**Desired outcome:** A working signal — "declared identity is diverging from observed structure by X" — usable the same way KRYLO's existing SCI/convergence signals are used today.

**Scope boundary (explicit):** This project does not build a new epistemic class, does not touch scoring/routing paths, does not use NLP/ML by default, and does not infer motive or cause (§ Guardrails, Section 6 below).

---

## 2. BUSINESS CASE

**Why this, why now:** Founder-scored 2026-07-05 — Strategic value 9.2/10, Novelty 8.8/10 relative to existing KRYLO capability, Readiness (at concept stage) 4/10.

**Value is entirely in Phase 4.** Phases 1–3 are infrastructure with no standalone product value — see Section 4 for the honest dependency chain. This project should not be judged on Phase 1–3 deliverables alone; it should be judged on whether Phase 4 is ultimately worth reaching.

**Decision point already flagged to Sponsor (2026-07-06):** given Phase 4 requires inventing an undefined spec (no external standard exists for this problem, unlike Phase 1's EDGAR/Companies House work, which implemented existing published APIs), the Sponsor may choose to stop after Phase 1 and treat the captured evidence archive as the standalone deliverable, deferring 2–4 indefinitely. **This has not yet been decided.**

---

## 3. DELIVERY MODEL vs. STANDARD GOVERNANCE (translation table)

| Standard artifact | KRYLO equivalent | Status |
|---|---|---|
| PID (this document) | New — did not exist before this document | Created 2026-07-06 |
| BSD (Business/Baseline Solution Design) | `specs/KRYL-969-identity-evolution-engine.md` (Phase 1 section) | Complete for Phase 1 only |
| MSD (Model/Master Solution Design) | The per-phase WO Hardening Template pass (§11a: Single Responsibility, Boundary Declaration, Formula/Contract, File Map, Bottle Test) | Complete for Phase 1; not started for Phases 2–4 |
| Workflow / Process Document | Section 4 (Phase Dependency Chain) below | New, in this document |
| Risk/Assumptions Log | Section 5 below | New, in this document |
| Stage Plan | Section 4 below | New, in this document |

There is no separate "BID" equivalent identified in KRYLO's process — if you mean something specific by BID (Bid Document / Business Impact Document), say which and I'll map it explicitly rather than guess.

---

## 4. STAGE PLAN — PHASE DEPENDENCY CHAIN (WORKFLOW)

Each stage consumes only the stage above it. No stage is parallelizable with the one below it — this is a strict pipeline, not a set of independent workstreams.

| Stage | Deliverable | Input | Output | Status | Gate to next stage |
|---|---|---|---|---|---|
| **1** | Narrative Snapshot Capture | External APIs (EDGAR, Wayback, Companies House) | `NarrativeSnapshot` records, real, verbatim, sourced | **COMPLETE — built, verified end-to-end against live services, committed (bc5a41f), tagged (baseline_kryl969_narrative_capture), deployed to production 2026-07-06** | None — already passed |
| **2** | Identity Claim Extraction | One `NarrativeSnapshot` | `IdentityClaim` (verbatim substring + extraction method tag) | NOT STARTED. One open item: anchor-phrase fallback rule needs validation against 2–3 more real filings (internal research, no external dependency) | Real extraction tested against ≥3 companies before hardening |
| **3** | Identity Drift | Two `IdentityClaim`s (earliest + latest) | `IdentityDrift` scalar + components | DRAFT CODE ONLY (`src/engine/identitydrift.js`) — syntax-valid, **not validated against real two-point data**, blend weight (0.5/0.5) explicitly flagged as an unvalidated default | Real two-point test run; weight recalibrated or explicitly accepted with evidence |
| **4** | Declared vs. Observed | `IdentityDrift` + existing KRYLO structural signals | Divergence measure (undefined) | NOT DESIGNED. Six open questions from Founder's 2026-07-05 comment (Jira 10461) unresolved | Full WO Hardening Template pass required before any code |

**Sponsor decision required:** commit to reaching Stage 4, or stop at Stage 1 (already delivered) and formally close Stages 2–4 as deferred/backlog.

---

## 5. RISKS, ASSUMPTIONS, ISSUES LOG

| # | Item | Type | Status |
|---|---|---|---|
| 1 | No external spec/standard exists for Stages 2–4 (unlike Stage 1, which implemented EDGAR/Companies House's own published APIs) | Risk | Open — root cause of session friction, now explicit |
| 2 | Stage 3's blend weight (Jaccard 0.5 / Levenshtein 0.5) is an assumed default, not derived | Assumption | Open — flagged in code, needs real data to close |
| 3 | Stage 4 has six unresolved design questions (snapshot definition edge cases, source hierarchy, historical availability limits, extraction schema completeness, change-detection threshold, lead/lag causal direction) | Issue | Open, logged Jira comment 10461, 2026-07-05 |
| 4 | Companies House Live-tier key not yet obtained — filing-history capture (not SIC codes) unverified against real (non-sandbox) data | Risk | Open, low severity — SIC-code path is fully verified |
| 5 | FMP source dropped (paywalled); replaced by EDGAR Exhibit 99.1 at zero added cost | Issue | Closed 2026-07-05 |
| 6 | Companies House proxy targets sandbox host (Test-tier key); must be swapped to production host once a Live key exists | Risk | Open, flagged inline in `as-diff/engine.js` |

---

## 6. GUARDRAILS (GOVERNANCE CONSTRAINT — CARRIES FORWARD TO ALL STAGES)

Locked in `specs/KRYL-969-identity-evolution-engine.md`, binding regardless of who executes Stages 2–4: no NLP/ML by default; no new epistemic class; no feedback into existing scoring/routing; no motive/cause inference — ever; no invented thresholds (must be derived from real data, cited); absence classified per §22, never defaulted to zero; stay inside the six-domain lock; each stage hardened separately, not bundled.

---

## 7. ROLES

| Role | Owner |
|---|---|
| Sponsor / spec author | Mr. XS (Founder) — per standing process, specs are Founder-authored |
| Boundary/contract definition, critique, build execution once specced | Agent (this session) |
| Stage 2–4 go/no-go decision | Sponsor |

---

## NEXT ACTION

This PID is a planning artifact — no code changes result from it directly. Sponsor decision needed: proceed to Stage 2 research (real anchor-phrase validation, internal only, no new accounts), or close this project at Stage 1 as delivered.
