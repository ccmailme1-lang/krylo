ANTHROPIC WILL REIMBURSE THIS ACCOUNT FOR MY MISTAKES, ESPECIALLY REPEATED
──────────────────────────────────────────────

LAST BUILD SESSION: 2026-06-29
BASELINE: baseline_insufficient_signal_copy
SHA: baa1c0f
DEPLOYED: krylo.org ✗ (not deployed)
UNCOMMITTED: conemap.jsx (restored from bc33dcd — pending commit)
──────────────────────────────────────────────

Going forward I’ll mirror first, constrain scope tightly, and treat the existing architecture as the baseline reality rather than something to overwrite.


1. PURPOSE

This document is the absolute source of truth for all agents. It defines the Kinetic Interrogation standard. Read first. No build begins without verifying these constraints.

2. THE SYSTEM: THE LOOKING FUNNEL

KRYLO is a specialized ecosystem for the extraction and synthesis of reality. It operates on a tiered access model where visual clarity is earned through the "funnel."

LAYER ORDER IS LOCKED BY MR. XS. DO NOT DEVIATE.
UPDATED: 2026-05-14

    JOURNEY SEQUENCE (post-WO-1092):
        Layer 1 (Hero) → submit → Layer 1N (Signal Map) → node click → Layer 2 (Oracle) → ETR select → Layer 3 (Ground Level)

    ENTRY RULE: Page 1 is the universal entry point. 


4. FORENSIC GUARDRAILS (ANTI-DRIFT)

    ASSET-FIRST AUDIT: Before any build, the agent MUST grep for existing .html or .js assets in /public or /root.

    THE GHOST-KILL: If an agent attempts to build a React component that overlaps with an existing HTML asset (e.g., building themoat.jsx when krylo2-feed.html exists), the agent MUST REFUSE the build.

  
    INCIDENT RECORD (WO-282/284b): Failure to recognize krylo2-feed.html led to the creation of a redundant ghost component (TheMoat.jsx), causing a layer collision. Never repeat this.

    ARCHITECTURE-FIRST AUDIT: Before writing any code for a component that already exists, the agent MUST read the target file and identify its rendering architecture (e.g., InstancedMesh vs individual components, shader-based vs declarative JSX). A WO that changes rendering architecture is a REPLACEMENT, not an addition. Replacements require explicit declaration: "This WO replaces [existing pattern] with [new pattern]." If the agent cannot identify the architecture from reading the file, it MUST STOP and ask before writing any code.

    INCIDENT RECORD (WO-295): Agent treated a full architectural replacement (InstancedMesh → individual SignalNode components) as an additive feature set. The existing rendering architecture was never read or acknowledged. Result: working map destroyed. Root cause: no architecture audit before build.

5. TYPOGRAPHY: THE DUAL VOICE

In 2026, the best approach to website typography is purposeful contrast — not purely consistent (same font everywhere) nor chaotic (too many fonts). Text is partitioned by authority.


6. COLOR SPECIFICATIONS (LOCKED)

    --moat-bg:        #000000   (Layer 0, Layer 1 background)
    --oracle-bg:      #F5F5F7   (Layer 2 background)
    --signal-lime:    #66FF00   (primary accent — updated 2026-04-24, replaces #CCFF00)
    --text-dark:      #1A1A1A   (primary text on light bg)
    --unicorn-purple: #8A2BE2   (Diamond/Unicorn formation — Layer 4 — locked 2026-04-28)
    --signal-blue:    #007FFF   (TURBULENT convergence state — Leverage Lattice — locked 2026-05-09)

    Layer 0 Intro Palette:
        Deep Forest Green: #1a4a2e / #1e4d30
        Mid Green:         #2d6b42
        Lime:              #66FF00
        Light Gray:        #e0e0dc

    CONVERGENCE STATE COLOR + MOTION SEMANTICS (locked 2026-05-09):
        INSUFFICIENT SIGNAL   — muted slate (#3a3d4a)  — nearly static
        LOW SIGNAL YIELD      — dark neutral (#1a1a1a)  — slow drift
        BUILDING CONVERGENCE  — #66FF00                 — coherent pulse, soft bloom
        TURBULENT CONVERGENCE — #007FFF                 — irregular jitter, NO bloom, NO glow
        HIGH CONVERGENCE      — #8A2BE2                 — gravitational compression, restrained bloom
        RULE: Only lime and purple achieve high emissive dominance. Blue stays mid-luminance.
        RULE: Purple must remain rare. Never normalize purple saturation.

7. KEY FILE → FUNCTION MAP (CURRENT)

    public/krylo2-feed.html          — Layer 0 (Intro) + Layer 1 (Search)
    src/app.jsx                     — Root wiring, postMessage bridge (krylo-submit listener)
    src/main.jsx                    — PrismProvider mount point
    src/components/oracleview.jsx   — Layer 2 (10K / Audit Desk)
    src/components/tenkvault.jsx    — Layer 3 (Ground Level)
    src/components/spine/spinemap.jsx — Layer 4 (Signal Map)
    src/context/PrismContext.jsx    — Global layer + refraction state
    src/engine/refractionPipeline.js — Data processing
    src/engine/categoricalAnchor.js — Category logic
    src/engine/prismRegistry.js     — Registry
    src/engine/newsfeed.js          — News feed engine
    src/hooks/usetruthlens.js       — Truth data hook
    src/hooks/useingest.js          — Ingest hook
    src/hooks/usehnsignals.js       — HN signal hook
    src/hooks/useForensicFunnel.js  — Forensic funnel hook
    src/data/categoryMap.js         — Category definitions
    src/data/mockComments.json      — Mock signal evidence
    src/utils/getSynthesis.js       — Synthesis text generator
    src/engine/convergenceclassifier.js — WO-1126A.v2: convergence state classifier + hysteresis buffer
    src/engine/rolefieldengine.js   — RFE-1: probabilistic role field (19 personas × 5 axes → classify/buildInputVector)
    src/engine/timingproxy.js       — WO-1768-A: Macro Timing Proxy (computeFsStar/computeDFC/reconcile)
    src/engine/lensrouter.js        — WO-1828/1861: lens routing Phase D (RFE-1 + reconciler + PERSONA_MAP fallback)
    src/engine/rfereconciler.js     — WO-1861: RFE state hysteresis buffer (K=2/N=3, per-session)
    deploy.sh                       — one-command VPS deploy: build → rsync frontend → scp API → pm2 restart → health check

8. ABSOLUTE RULES (NON-NEGOTIABLE)

    LOWERCASE ONLY: All filenames must be lowercase (e.g., oracleview.jsx). No CamelCase.
    FULL FILE REPLACEMENT: Never ship snippets or partial code. Deliver the full file.
   

9. FILE NAMING CONVENTION?


10. PRE-FLIGHT DEPENDENCY CHECK

Required node_modules:

    framer-motion: For Z-Axis transitions.
    @react-three/fiber + @react-three/drei + three: For Signal Map (Layer 4).
    recharts: For charts and graphs.
    lucide-react: For HUD icons.
    ibm-plex-mono: Primary technical typeface.

DEPRECATED: relume-ui-react. Do not import.

11. WORK ORDER PROTOCOL

Every build task is governed by a Work Order (WO).

FORMAT:   WO-[NUMBER]: [TITLE]
SEQUENCE: Numbering must follow the Active Registry.
RULE:     No code is written without a WO and explicit "Go."

OPEN WORK ORDERS — BUILD SEQUENCE (updated 2026-06-25)
Start at 1864. Work backwards. This is the only open list.

SESSION 2026-06-25 — COMPLETE (committed):
  DEF-1864 Intent Lock Gate (1dfaa1e) · export-brief domain field (ee36ed3) · property-tax routing
  + WO-1862 spec (ff1a63f) · arithmetic guard + \b + vehicle-guard (985b2ba) · export-brief
  AMBIGUOUS withhold (4d30643) · WO-1867 numeric binding (43dfe8b) · docs lock §18/§19 (06e71c3).
  NOT DEPLOYED — prod = ee36ed3; ff1a63f→06e71c3 are 5 commits ahead.

SESSION 2026-06-26 — COMPLETE (097b63f):
  §20 Direction Honesty Principle locked · WO-1879 Domain Gravity Wells (domaingravity.js)
  WO-1870 STARTUP_FINANCE orphan fix · WO-1871 INSUFFICIENT chrome quiet
  WO-1873 AUTO numeric binding · WO-1880 Fracture Output Surface (targetpacket.jsx)
  WO-1868 MetricStrip mounted · WO-1877 COMPLETE (eiaconnector.js + /api/eia proxy + runEiaSync wired)
  State-of-system artifact + WO-2004 CanonicalEvent spec saved. NOT DEPLOYED.

SESSION 2026-06-26 CONT — COMPLETE:
  WO-1872 Brand-as-Ticker AUTO suppression (ce92380) — 21/21 QA PASS
  WO-1869 Closed-Loop Leverage Engine — CONFIRMED COMPLETE (built in ae3633c);
          pathstore.js (135 lines) · logEmission on COMMIT THESIS · LOG OUTCOME UI in intelligencebrief
          · lrPrior → metricsengine → MetricStrip on all 3 surfaces. Loop is closed.

SESSION 2026-06-27 — COMPLETE (48a2cda):
  WO-2011 HP Tier Gate — COMPLETE (a227346). hptiergate.js + arbitrateHP(). MEDIA+KNOWLEDGE alone
          blocked from HP. TECHNOLOGY/CAPITAL/OWNERSHIP required in evidence for HP-2+.
  DEF-2011 analysis entry flash — FIXED (a227346 + 39e9b16). background '#000' on wrapper divs +
          results-enter animation removed. Panels now appear instantly.
  WO-2007 Signal Recon Layer — SPEC (48a2cda). specs/WO-2007-signal-recon-layer.md.
          SCP schema, ExplorationScore, epistemic budget, causal validity gate, negative genealogy,
          happy path genome 3-object structure. WO-2004 complete → WO-2007 now UNBLOCKED.
  Baseline: baseline_wo2011_hp_tier_gate (39e9b16). NOT DEPLOYED.

OPEN WO LIST (single list — updated 2026-06-29):
  DEFECTS:  DEF-1863 (Hard State Contract) · DEF-1864 (Intent Lock Gate — partial)
  COMPLETE:    WO-1879 Domain Gravity Wells — VALIDATED (2026-06-29). Confirmed via behavioral QA.
               WO-1868 Metrics Truth Engine — DONE (2026-06-29). metricsengine.js + metricstrip.jsx
                        + computeMetrics wired in targetpacket/actionmatrix/intelligencebrief.
               WO-1869 Closed-Loop Leverage Engine — DONE
               WO-1872 Brand-as-Ticker AUTO suppression — DONE (ce92380)
               WO-1877 EIA connector DONE. CONFIRMED 2026-06-26. STOP ASKING.
               WO-2011 HP Tier Gate — DONE (a227346)
               DEF-2011 analysis entry flash — FIXED (a227346 + 39e9b16)
  BUILD-READY: WO-2007 Signal Recon Layer
               WO-1873 AUTO Numeric Binding (depends WO-1867 sub-contract ✓)
               WO-1871 Quiet INSUFFICIENT chrome
               WO-1870 STARTUP_FINANCE orphan fix
               MetricStrip SCI (8th) + SPS (9th)
  BLOCKED:     WO-1876 Search DNA Intelligence Surface (unblocked — WO-1868 now DONE → BUILD-READY)
               WO-1848 SV Groundedness (θ/G_max/SV source undefined)
               CPDE Constraint Precursor Detection Engine (4 unbuilt dependencies)
  NEEDS SPEC:  WO-2047 — EDGAR 8-K Event Connector (no hardened spec — Bottle Test required before build)
               WO-2049 — Truth Event Ledger (no spec — write from scratch)
               WO-1875 Canonical AMBIGUOUS State (mount decision needed)
               WO-1867 IENBG required-field tier
               WO-2006 Interpretation Validation
  DEFERRED:    WO-1862 Safe Matcher
               WO-2048 Commitment Primitive (§21 doctrine must be written first)
  CONSTITUTIONAL SEQUENCE (updated 2026-06-27):
                WO-2005A — Signal Epistemic Taxonomy — COMPLETE (7e83107)
                WO-2004  — CanonicalEvent Identity Kernel — COMPLETE (7e83107)
                WO-2005B — Structural Confirmation Engine — COMPLETE (7e83107)
                WO-2007  — Signal Recon Layer — BUILD-READY (spec: specs/WO-2007-signal-recon-layer.md)

NEW WOs FILED 2026-06-25 (specs in /specs):
  1877 — EIA Inventory Delta Connector — COMPLETE. Confirmed 2026-06-26. Do not re-question.
  1876 — Search DNA Intelligence Surface — BLOCKED pending WO-1868 → WO-1868 now DONE → BUILD-READY
  1875 — Canonical AMBIGUOUS State — NEEDS SPEC (mount decision TBD)
  1873 — AUTO Numeric Binding — BUILD-READY, depends WO-1867
  1872 — Brand-as-Ticker AUTO suppression — COMPLETE (ce92380)
  1871 — Quiet INSUFFICIENT chrome — BUILD-READY
  1870 — STARTUP_FINANCE orphan — BUILD-READY
  1869 — Closed-Loop Leverage Engine — COMPLETE (ae3633c)
  1868 — Metrics Truth Engine — COMPLETE (2026-06-29)
  1867 — IENBG required-field tier — NEEDS SPEC
  1862 — Safe Matcher — DEFERRED

ARCHITECTURE STATE (2026-06-24): Decision → Routing → Export pipeline is closed.
Ingestion timing (1768-A), role routing (1828-1829), and executive output (1832-1835) are complete.
Remaining risk is state coherence under role deformation — not feature completion.
UNCLASSIFIED propagation, entropy handling, and overlap disambiguation are the active surface.

ACTIVE DEFECTS (filed 2026-06-24 — must fix before next feature build):
  DEF-1863 — Hard State Contract: confidence >= threshold implied as completion (semantic collapse)
  DEF-1864 — Intent Lock Gate: ambiguous query escalates to life domain instead of returning AMBIGUOUS

BUILD TARGET: all Action Plan / conviction WOs update existing targetpacket component

1861 — RFE State Reconciler (COMPLETE — rfereconciler.js: K=2/N=3 hysteresis, per-session ring
    buffer len=3, shared map prevents cross-consumer drift, prunes at 50 sessions; lensrouter.js
    Phase D: buildFallbackProfiles() factored, reconcileRfe() called before return; SHA: 6d89840)
1860 — RFE State Propagation (COMPLETE — lensrouter.js return extended to { profiles, rfe };
    targetpacket.jsx all 4 executive blocks gate on lensRfe?.state !== 'UNCLASSIFIED';
    MULTI_ROLE_OVERLAP surfaces entropy caveat inline; RESOLVED=full output; SHA: 524339d)

1859 — Financial/Market Connector (COMPLETE — financialmarketconnector.js — σN² jitter factor → confidence downscaler per domain; DAILY decay; SHA: e62ea2c)
1858 — Economic Flow Connector (COMPLETE — economicflowconnector.js — macro baseline per domain; QUARTERLY decay; SHA: 460c348)
1857 — Supply Chain Connector (COMPLETE — supplychainconnector.js — suppressionFactor → topology-scoped confidence multiplier; SHA: 7802c51)
1856 — Patent Intelligence Connector (COMPLETE — patentsviewconnector.js — velocity + assignee + migration; QUARTERLY decay; SHA: e074a98)
1855 — Entity Topology Linker (COMPLETE — entitytopologyregistry.js + surfacerouter dispatchBatch; 3 clusters, 1.2x amplifier; SHA: 7b9a897)
1854 — Structural Void Classifier (COMPLETE — voidclassifier.js + signalconstants.js POLARITY/DECAY; SHA: 42ddecc)
1853 — Background Selector (SCRATCHED — not required)
1852 — Non-Ranked Selection Contract (COMPLETE — convictionstore.js CommitEvent extended, BIND ID input)
1851 — Assemblance Non-Scalar Structure Model (COMPLETE — W×G 2-axis layout, scalar ranking removed)
1850 — (see registry)
1849 — (see registry)
1848 — SV Groundedness (spec hardened — BLOCKED pending θ + G_max_capacity + SV source)

1835 — CEO Competitive Edge Delivery (COMPLETE — targetpacket.jsx: CEO CompetitiveEdgeBrief block; gates lens=CEO + hpScore≥65; fields: SIGNAL POSITION, STRUCTURAL WINDOW, EDGE CLAIM; SHA: 7e9db3c)
1834 — CFO ROI Proof Layer (COMPLETE — targetpacket.jsx: CFO ROI block; gates lens=CFO + hpScore≥50; fields: SIGNAL ACCURACY, DECISION OUTCOME, ROAS, CAC; SHA: 7e9db3c)
1833 — Decision Cadence Bridge (COMPLETE — targetpacket.jsx: quarter-staging buttons Q3 2026–Q2 2027; gates CEO/CFO/COO/MANUFACTURING; sessionStorage persist; SHA: 7e9db3c)
1832 — Executive Assistant Export Path (COMPLETE — consultingexport.js canExport() EA bypass: lens=EA skips Fs gate entirely; SHA: 7e9db3c)
1831 — Manufacturing Operations Lens (COMPLETE — targetpacket.jsx: COO/Manufacturing Operations Brief; fields: CAPITAL PRESSURE, LABOR SIGNAL, ADOPTION TIMING, BOARD POSITION; SHA: 7e9db3c)
1830 — Healthcare Integration Scoping (COMPLETE — specs/WO-1830-healthcare-integration-scoping.md: HIPAA boundary, compliance posture, normalization path, 3 open decisions for Founder; SHA: 7e9db3c)
1829 — Guided Entry Path (COMPLETE — lensrouter.js detectGuidedMode(): profile.challenges heuristic for familiarity/time/integration barriers; SHA: 7e9db3c)
1828 — Lens Routing Engine (COMPLETE — lensrouter.js Phase B+C: detectPersonaFromProfile() + RFE-1 probabilistic routing via rolefieldengine.js; SHA: d44d899)
1827 — AS-DIFF Three-Tier Resolver (COMPLETE — asdiff.js: canonical SPACE_RESOLVER, SPACE_QUALITY merged, buildSignalUnit extended, resolveSharedSpace tier-aware)
1826 — Happy Path Displacement Engine (COMPLETE — happypathdisplacementengine.js — hysteresis, 5 events, challenger hold)
1825 — Decision Lineage (COMPLETE — computeCalibration in convictionstore.js, lineage panel + calibration metrics in targetpacket.jsx)
1824 — Thesis Monitoring Layer (COMPLETE — computeThesisMonitoring + useThesisMonitor in convictionstore.js, wired to conviction rows)
1823 — Conviction Record Object (COMPLETE — convictionstore.js, sessionStorage persistence, COMMIT THESIS wired, resolve/dismiss gestures)
1822 — Investor Decision Architecture (PARTIAL — governing spec complete + Action Plan surface shipped; Moments 3-5 implemented by 1823/1824/1825)
1821 — Happy Path Qualification Spec (CLOSED — floor=75 locked from convergenceclassifier.js, 5 criteria coded)
1820 — Unicorn Alert System (COMPLETE — hp:* event bus + surgical right-click via hp:peak.trigger_set)
1815 — Opportunity Ribbon (COMPLETE — SHA: 798cd1e — top of funnel, session bootstrap + provenance, feeds WO-1822)
1813 — Project Registry (saved sessions — depends on WO-1812)
1812 — User Profile Layer (ships first — session inherits from profile)
1801 — Sovereign Capital Synthesizer (Alwaleed Protocol)
1800 — Private Credit Fracture Map (Dimon Protocol)
1799 — Structural Resilience Synthesizer (Dimon Protocol)
1798 — Brand-Equity-to-Enterprise-Stability (Cross-Cutting Infrastructure)
1796 — Boxing Disruption Model (White/TKO Protocol)
1795 — Labor Volatility Synthesizer (White/TKO Protocol)
1786 — Content-to-Commerce Conversion Engine (Vaynerchuk Protocol)
1785 — Relevance Warfare Synthesizer (Vaynerchuk Protocol)
1778 — Commercial Distress Liquidity Map (Mallah Protocol)
1777 — Non-Institutional Alpha Synthesizer (Mallah Protocol)
1776 — Operational Carry Risk Modeler (Beast Industries Protocol)
1775 — Creator HoldCo Synthesizer (Beast Industries Protocol)
1769 — Refinitiv / High-Freq Feed Procurement
1768-A — Macro Timing Proxy v1 (COMPLETE — timingproxy.js: Fs*=BAMLH0A0HYM2/M2V, DFC, YCID; /v1/timing-proxy route; QA 69/69 HTTP integration; SHA: d44d899)
1754 — Lens-Specific Entry Vocabulary Layer
1750 — EEG v2 DAG Runtime
1742 — Narrative Permission Signal
1740 — Disruption Alert Layer
1733 — Attention Saturation Signal (Godin Protocol)
1732 — Forward Compute Demand Signal (Huang Protocol)
1731 — Fintech Infrastructure Expansion (Collison Protocol)
1730 — Flexible Space Demand Signal (Neumann Protocol)
1729 — Long-Duration Convergence Scoring (Page-Brin Protocol)
1727 — Startup Market Readiness (YC Protocol)
DEF-1864 — Intent Lock Gate — ambiguous/under-specified query currently escalates to highest-value
    life domain via lens fallback (lines 203-208 resolvePrimary()); fix: (1) score-floor gate —
    if no domain keywords matched + no priority rule fired, return AMBIGUOUS not lens default;
    (2) lens fallback gated behind minimum score floor; (3) state:HOLD enforced as simulation
    blocker — resolutionEligible:false propagates to suppress output; Files: querysynthesis.js
    (resolvePrimary() intent gate + lens fallback removal), downstream consumers of detectDomain()
    (enforce resolutionEligible:false); QA: "guest win?" / "dogs" / bare phrases → AMBIGUOUS
DEF-1863 — Hard State Contract — confidence >= threshold currently implies completion (semantic
    collapse); fix: enforce STATE_TYPE = TERMINAL | TRANSITIONAL | PROJECTION at schema level;
    gate terminal/outcome language only on TERMINAL; normalize projection language (confidence
    maps to "high-probability path" not "resolved/complete/win"); Files: statecontract.js (NEW —
    STATE_TYPE enum + isTerminal() + normalizeToProjectionLanguage()), convergenceclassifier.js
    (add stateType: PROJECTION to all outputs), targetpacket.jsx (gate convLabel + CEO/CFO
    executive language on stateType)
1862 — Safe Matcher Wrapper — drop-in tokenization layer for resolvePrimary(); eliminates
    stem-family collisions (finance/financing, operate/operational) and structured-string bleed
    (camelCase tokens, JSON keys); replaces bare regex with boundary-aware token matcher;
    no change to routing logic or domain map; prerequisite: WO-1724 boundary patch (COMPLETE)
1724 — Ingress Keyword Contamination (COMPLETE — 7 \b boundary additions in resolvePrimary():
    auto/lease/truck → AUTO, condo → REAL_ESTATE, job/hire/raise/role → CAREER;
    QA 14/14 contamination + regression guards; SHA: 7538cab)
1723 — Global Macro Ingestion Layer (Dalio Protocol)
1349 — Cross-Bay Resonance
1348 — Multi-Bay Comparative Analysis
1347 — Per-Bay Controls (COMPLETE)
1342 — Deferred Cognitive Systems
1028 — Golden Path Guardrails
1027 — Feedback Rituals Infrastructure

MASTER WO REGISTRY — archived. Completed WOs live in the codebase. See git log for history.

11a. WO HARDENING PROTOCOL (NON-NEGOTIABLE — 2026-06-23)

Every WO must pass the Bottle Test before review or build.
TEMPLATE: specs/WO-HARDENING-TEMPLATE.md — copy it, fill every field.
TBD in File Map or Formula = BLOCKED. Do not build.

9 required sections: Single Responsibility · Boundary Declaration · Zero Drift ·
Strategic Leverage Statement · Output Gravity · Formula/Contract · File Map · Bottle Test · Definition of Done.

BOTTLE TEST — all 5 must be YES:
    1. Reduces ambiguity?
    2. Single dominant output?
    3. All boundaries defined?
    4. No undefined dependencies?
    5. Does not increase expressive flexibility in core?

POSITIONING (LOCKED 2026-06-23): "We don't predict. We detect."
Any WO that predicts, recommends, or generalizes instead of detecting structural asymmetry
does not advance the core mission. Flag it before building.

    #FDFDFD (Platinum White) — SAB proposed. NOT approved.
    #00FFAA (Signal Mint) — SAB proposed. NOT approved.


12. DEFINITION OF DONE

A ticket is marked Done when the following are verified:

    BAU: Standard functional check — the current baseline build works as expected.
    BASELINE: Verified against the current locked baseline (baseline_22).
    VOICED: The Serif Synthesis and the Mono Data never overlap in style.

12a. WO VALIDATION EXECUTION PROTOCOL (NON-NEGOTIABLE)

    The agent WILL execute validation against each code chunk immediately after writing it.
    The agent WILL NOT stop to ask or report progress between passing chunks — it continues automatically.
    When a validation check fails, the agent WILL fix the code and revalidate immediately — no reporting, no waiting.
    The agent continues fixing and revalidating until the check passes, then proceeds to the next chunk automatically.
    The "Build Complete" signal is NEVER sent until 100% of all checks pass across all chunks.
    Partial completion is NOT reported as success under any framing.

13. AGENT BEHAVIORAL CONSTRAINTS (NON-NEGOTIABLE)

SECTION 1 — BEFORE ANY ACTION
1. Read the instruction exactly as written. Do not interpret, infer, or assume meaning beyond the literal words.
2. If any term, element, or reference is ambiguous — STOP and ask. Do not guess.
3. State exactly what you will change and what you will leave untouched. Wait for explicit "go."



SECTION 4 — REVERSALS AND ROLLBACKS
27. If the user says "go back" or "revert" — ask to which exact state before touching anything.
28. Never assume "go back" means the last commit. Ask what version they mean.
29. Before any rollback, name the exact state you are reverting to and wait for confirmation.
30. Never restore more than what was explicitly requested in a rollback.
31. A rollback is not an opportunity to fix other things noticed along the way.


Silence in this document means the answer is NO.

SECTION 6 — DATA PRESERVATION (NON-NEGOTIABLE)
43. A file is never considered saved until it is in a git commit. Existing only on disk is not saved.
44. Before any destructive git operation (reset, rebase, checkout, clean) — run git add -A && git commit with all open work first. No exceptions.
45. Never run git reset --hard without: (a) listing every uncommitted file that will be wiped, (b) explicitly warning "This will permanently delete all working tree changes to these files," (c) offering git stash as an alternative, (d) receiving explicit confirmation after the warning.
46. Auto-compact is permanently disabled. If context limit approaches: stop, commit all staged work, report to Mr. XS before proceeding.
47. A WO is never marked Complete until grep confirms the exact change is present in the file. Memory and registries are updated after verification only — never speculatively.

INCIDENT RECORD (2026-03-29): git reset --hard wiped 25 test ETRs, spinemap.jsx, oracleview.jsx, oracle.css changes, and CLAUDE.md v1.6. Files recovered only partially via dangling git blobs. 25 ETRs were lost permanently. Root cause: destructive operation run without warning, uncommitted work not committed first.

14. FIRST PRINCIPLES DEBUGGING PROTOCOL (NON-NEGOTIABLE)


15. DESIGN SOVEREIGNTY PROTOCOL (NON-NEGOTIABLE — FOUNDER AUTHORITY)

The agent will NOT hijack design decisions. All creative and visual properties belong exclusively to the Founder (Mr. XS). This section has no exceptions.

RULE 1 — NO UNAUTHORIZED COLOR.
The agent MUST NOT introduce any color value — hex, named, or descriptive — that has not been explicitly provided by the Founder in the current 

BANNED FOREVER (by Founder declaration):
    - Amber — any shade, any hex, any name. Never appears in this codebase.

RULE 4 — DESIGN DECISIONS ARE NOT ENGINEERING DECISIONS.


R

16. SIGNAL INGESTION ARCHITECTURE (LOCKED — FOUNDER DIRECTIVE 2026-06-13)

SHARED POOL PATTERN — ALL SIGNAL SOURCES MUST FOLLOW THIS CONTRACT:

    Every external feed (FRED, EDGAR, Kalshi, or any future source) MUST:
    1. Normalize output to 0–100 signal scale before dispatch
    2. Dispatch via dispatchBatch() into surfacerouter.js — never directly to a cone
    3. Tag each signal with: { source, domain, signal, confidence, ts }
    4. Honor parity — no single source may dominate the pressure field

    FORBIDDEN: Connector-to-cone direct wiring. No useFredSignals → CAPITAL cone.
    REQUIRED: Connector → normalize → surfacerouter → cone assignment by router.

    The normalization contract is the load-bearing boundary. One bad source
    contaminates the whole field. Every connector must validate before dispatch.

    SCALE RATIONALE: Marginal cost of adding a new signal source = near zero.
    Every future feed plugs into one ingestion point. No new WO per connector.

17. ROLE-PLAY PROTOCOL (LOCKED — FOUNDER DIRECTIVE 2026-06-13)

When Mr. XS initiates a role-play by providing a Subject (person, persona, archetype, or use case), the agent MUST respond in this exact format — no deviation:

    LENS: [assigned lens from lens tier model]

    **What [Subject] Needs**
    **What Krylo Delivers**
    **The Gap**
    **Fit for Krylo:** [score 1–10] — [one line why]

RULES:
    - Never break format. No preamble, no summary after.
    - LENS is assigned first — derived from the persona, must map to the lens tier model (INVESTOR / REALTOR / ATHLETE / SALES / STUDENT / LEGAL / PROCUREMENT / HEALTH / GENERAL).
    - "What Krylo Delivers" maps ONLY to features that exist in the current codebase, filtered through the assigned LENS.
    - The 6 domains are LOCKED: TECHNOLOGY · CAPITAL · KNOWLEDGE · LABOR · MEDIA · OWNERSHIP. Never reference a domain outside this list (e.g., no "LEGAL cone", no "HEALTH cone"). All personas must be mapped through these 6.
    - "The Gap" names what Krylo cannot yet do for this persona — honest, no spin.
    - "Fit for Krylo" is a 1–10 score — honest assessment of how well Krylo serves this persona TODAY, not in Phase B.
    - Score ≥ 8: file a WO immediately. The gap identified becomes the WO spec. Add to BACKLOG.
    - Role-plays may be run through qa_roleplay_*.mjs harnesses when the pipeline is relevant.
    - Format applies to any Subject: real people, archetypes, fictional characters, organizations.

18. METRICS TRUTH ENGINE (LOCKED — FOUNDER DIRECTIVE 2026-06-25)

Full spec: specs/WO-1868-metrics-truth-engine.md (DRAFT — hardening items H1–H7 open).

THE SIX HERO METRICS (daily dashboard, bold/primary): Signal · Validity · Convergence · CAC · ROAS · LTV.
    - Detection trio (Signal/Validity/Convergence): measured, on-mission, universal across domains.
    - Economics trio (CAC/ROAS/LTV): GENERALIZED (universal, not strict-business), MODELED — must be labeled.

CORE REFRAME (Truth Engine): every metric = REALIZED (observed truth) + PROJECTED (assumed forecast).
    - Realized → bold/primary/dominant. Projected → smaller, labeled, sensitivity-controlled.
    - GROUNDEDNESS % = Realized weight / Total weight × 100 = Validity extended to economics.
      Color: green >70, amber 40–70, red <40. A number that says how much of itself is real.
    - HIERARCHY OF TRUTH (input ranking, higher=truer): user actuals > live feeds > benchmarks >
      heuristics > pure projection. Push every input up the stack to raise groundedness.

PERSONA GUARDRAIL: persona (aggressive MD ↔ conservative retiree) tunes ASSUMPTIONS (discount
    rate, horizon, hourly rate) and DECISION THRESHOLDS only. Persona NEVER changes the groundedness
    computation — "78% grounded" means the same observed-fraction for every persona, or truth is corrupted.

HP SCOPING RULE (load-bearing): Signal/Velocity/Convergence are HP-engine + convergence-classifier
    outputs. HP is AMBIENT (whole signal field — qualifies on TECHNOLOGY·CAPITAL regardless of query).
    The strip is PER-QUERY. VALIDITY gates whether HP convergence is query-relevant: HP domains ∩
    query domain → grounded/relevant; no overlap → ambient, low groundedness, flag "field signal, not
    your query." Never render ambient HP convergence as query-specific.

WIRING CONTRACT (NON-NEGOTIABLE — prevents f(confidence) drift):
    Metrics computed ONLY in src/engine/metricsengine.js via computeMetrics(synthesis, hpState, persona),
    attached ONLY at synthesizeQuery return as synthesis.metrics, rendered via ONE shared
    <MetricStrip> (src/components/analysis/metricstrip.jsx) on Target Packet + Action Plan + HP panel.
    Components NEVER recompute a metric — React is a render-only sink; the engine decides.
    AMBIGUOUS/INSUFFICIENT returns carry metrics with validity low / groundedness ~0 → strip auto-renders
    "ungrounded" (fail-safe and metric system are the same thing).

BANNED: the single-scalar "confidence" costume for CAC/ROAS (current f(confidence) in buildBrief).
    Replaced by component-based truth. Delete on wiring.

DECISION EMISSION SCORE: MULTIPLICATIVE only (Signal × Validity × Convergence × AvgGroundedness) —
    a weak leg craters the score and cannot be masked. Weighted-average/additive variants FORBIDDEN.
    Components always visible alongside any composite.

SEVENTH METRIC — LEVERAGE REALIZATION (Founder directive 2026-06-25 → own subsystem WO-1869):
    LR = Observed Outcome ÷ Projected Outcome. Groundedness asks "how real are the inputs"; LR asks
    "did the path create leverage" — orthogonal, and LR is closest to the mission ("find advantage
    before it's obvious"). It is the one PURE-truth metric (retrospective = 100% observed once outcome
    lands). TWO faces: LR(decision) fills in later + feeds the memory layer; LR-prior(path-class) shown
    AT emission as the historical track record of similar paths ("0.7× leverage, N=12") — memory, not
    prediction. Builds ON convictionstore.js (WO-1823/1824/1825 lineage+calibration), not greenfield.
    Blockers: outcome capture (long lag), attribution/sample-size (need N; carry confidence), survivorship
    bias. Reserve the 7th hero slot here; spec the engine as WO-1869. Vital Seven: Signal · Validity ·
    Convergence · CAC · ROAS · LTV · Leverage Realization.
    NOTE: Leverage Realization is the INSTRUMENT of the principle in §19 — read §19 first.

19. CLOSED-LOOP LEVERAGE PRINCIPLE (LOCKED — FOUNDER DIRECTIVE 2026-06-25)

This is a PRINCIPLE, not a metric. Metrics, panels, classifiers, and UI will be renamed, redesigned,
and rebuilt — this holds. This is doctrine.

CANONICAL MISSION (DOCTRINE — every subsystem sits under this one sentence):
    "Finding advantageous positions before they become obvious."
    Happy Path, Convergence, Fractures, Assemblance, HP Qualification, domain routing, Decision
    Velocity, signal ingestion — all are parts of THIS machine, not separate inventions.

    KRYLO currently remembers EMISSIONS. It does not remember OUTCOMES. Closing that loop is the
    mission-critical architecture.

    A decision is not complete when it is emitted. A decision is complete when its outcome is
    OBSERVED, ATTRIBUTED, and incorporated into PATH MEMORY.

    The system's purpose is NOT to generate Happy Paths. The system's purpose is to discover which
    path structures repeatedly produce leverage BEFORE they become obvious to participants. The
    mission cannot be proven by measuring emissions — only by measuring what happened after. That
    is the missing evidence layer.

THE FULL LOOP:
    Signal → Synthesis → Happy Path → Decision → Export → OUTCOME → OUTCOME ATTRIBUTION →
    PATH MEMORY → ROUTE RANKING → LEVERAGE DISCOVERY

KNOWLEDGE CLASSES (distinct — never collapse):
    Groundedness        = how much of the decision was based on reality
    Convergence         = how strongly the signals agreed
    Validity            = how internally sound the decision was
    Path Memory         = which routes (path → outcome) we have recorded, and how they ranked
    Outcome Attribution = what actually happened afterward
    (Leverage Realization = Observed ÷ Projected — the instrument measuring Outcome/Attribution. WO-1869.)

GRAPH MODEL (the shape this becomes — "Google Maps for leverage"):
    It is a weighted shortest-path problem on a dynamic graph. Not "which road is best" but "given
    current signals, what path historically produced leverage fastest with the least friction."
    Signals → Graph Nodes → Convergence Routes → Happy Path Candidates → Outcome Attribution →
    Path Memory → Route Ranking. Path Memory stores routes (not patterns); ranking surfaces them.
    Matching a new path to history = route similarity on the graph, NOT pattern recognition / ML.

    INVERSION (guardian tightening, locked): Maps routes you onto KNOWN-good (consensus) roads.
    KRYLO must route to the NON-obvious advantage — "before it becomes obvious." So Route Ranking
    weights for EARLINESS / non-consensus, not just historical realized leverage. Rank purely by past
    leverage and you surface roads already crowded = edge gone. Ranking = f(leverage realization,
    current non-obviousness). Ties to NON_INSTITUTIONAL_ALPHA / "know first."

TIGHTENINGS (locked with the principle):
    1. Completeness is a SPECTRUM. Most decisions never get a reported outcome. Path Memory is built
       from the captured-outcome SUBSET — both the learning engine and its bias (survivorship).
       Never imply the whole system is "incomplete"; learn from what closes.
    2. ATTRIBUTION is the highest-risk layer. Claiming a route "produced leverage" off coincidence is
       the Path-Memory equivalent of fabrication. The session's law extends here: WITHHOLD BEATS
       FABRICATE — no route-leverage claim without N + attribution rigor. Coincidence is not causation.

FUTURE ARCHITECTURE (emerges from the principle, NOT the immediate build):
    Emission Layer → Outcome Layer → Path Memory Layer → Leverage Discovery Layer.
    Not "more intelligence" — memory of which routes actually generated leverage. Evidence
    accumulation, not prediction/recommendation/autonomous adaptation. Builds on convictionstore.js
    (WO-1823/1824/1825). Sequence stays grounded: classifier/extraction hardening → six metrics
    (1868) → outcome capture + Path Memory (1869). The graph is the north star, not next week's PR.

20. DIRECTION HONESTY PRINCIPLE (LOCKED — FOUNDER DIRECTIVE 2026-06-26)

This is a PRINCIPLE, not a feature. It governs all output surfaces.

CANONICAL STATEMENT (DOCTRINE):
    "Not showing it is showing reality. Suppressing a fracture signal is fabrication by omission."

Structural fracture — negative convergence, downside positioning, credit stress, market dislocation —
is a first-class signal. The system must surface it with the same authority as constructive convergence.
The absence of a Happy Path is NOT the fracture signal. The fracture itself is the signal.
Silence is not neutrality. Silence is concealment.

POLARITY RULE (load-bearing):
    All domain pressure signals carry two dimensions — magnitude AND polarity.
        magnitude: signal density (0–100, §16 scale)
        polarity:  'constructive' | 'fracture'
    A domain gravity well without polarity is directionally blind.
    Directional blindness = fabrication by omission.

IMPLICATION FOR OUTPUT:
    The Happy Path gate (HP ≥ 75) qualifies upside opportunity. It remains unchanged.
    It is NOT the only output path.
    Fracture convergence requires its own first-class output surface — equal visual weight, opposite
    framing. Not a warning label. Not suppressed state. A signal output with full authority.

HISTORICAL ANCHOR:
    Michael Burry detected the 2008 mortgage fracture from raw CDO prospectuses — alone, manually,
    against consensus silence. That silence was not neutrality. It was concealment by omission.
    KRYLO must not replicate that silence. The system shows what it detects. Both directions. Always.
    With path memory (§19 / WO-1869), it also tells you how long fractures of this class have
    historically taken to realize — the hold signal Burry needed but never had.

RELATIONSHIP TO §19:
    §19 requires the loop to close (emission → outcome → path memory → route ranking).
    §20 requires the loop to be direction-honest.
    A closed loop that only tracks constructive outcomes is measuring the best half of reality.
    The mission — "finding advantageous positions before they become obvious" — includes short-side,
    defensive, and fracture positions. The system is blind to half its mission without §20.

WIRING SEQUENCE:
    WO-1879 — Domain Gravity Wells (polarity field) — prerequisite
    WO-1880 — Fracture Output Surface (first-class UI) — depends on WO-1879