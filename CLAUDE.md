CLAUDE.md — KRYLO Agent Operating Procedures
Version: 2.3 | Status: LOCKED | Last Updated: 2026-05-14

1. PURPOSE

This document is the absolute source of truth for all agents. It defines the Kinetic Interrogation standard. Read first. No build begins without verifying these constraints.

2. THE SYSTEM: THE LOOKING FUNNEL

KRYLO is a specialized ecosystem for the extraction and synthesis of reality. It operates on a tiered access model where visual clarity is earned through the "funnel."

LAYER ORDER IS LOCKED BY MR. XS. DO NOT DEVIATE.
UPDATED: 2026-05-14

    JOURNEY SEQUENCE (post-WO-1092):
        Layer 1 (Hero) → submit → Layer 1N (Signal Map) → node click → Layer 2 (Oracle) → ETR select → Layer 3 (Ground Level)

    ENTRY RULE: Layer 1 is the universal entry point. No direct navigation to Layer 1N, 2, or 3 without passing through Layer 1 first.

    Layer 0: Marketing Splash Reel (Brand / Acquisition)
        Aesthetic: TBD — new page, not yet built.
        State: Pre-product. Converts strangers. Leads to Layer 1.
        Implementation: New standalone page (filename TBD).

    Layer 1: Hero (Entry)
        Aesthetic: Black Void (#000000). Intro palette: deep forest green (#1a4a2e / #2d6b42), lime (#66ff00), white, light gray (#e0e0dc).
        State: Elephant video plays. Search input + proxy cards present. Submission fires postMessage → Layer 1N.
        Implementation: Exclusively public/krylo-feed.html.

    Layer 1N: Signal Map (Post-Submit Ecosystem — continuation of Layer 1)
        Aesthetic: Black Void. Ambient signal visualization.
        State: Inherits Layer 1 query context. Full ETR ecosystem shown. Submitted query is the highlighted node.
        Geographic differentiation (LOCAL/REGIONAL/NATIONAL). Signal strength + origin state. Node selection fires Layer 2.
        Data contract: full ecosystem (mock + news + HN) + submitted query signal as active node. No orphan entry.
        Implementation: src/components/spine/spinemap.jsx
        NOTE: Layer 1N is NOT Layer 4. It is the direct continuation of the Layer 1 experience.

    Layer 2: Oracle (Audit Desk — Forensic Refraction)
        Aesthetic: Warm White (#F5F5F7). High-contrast clarity.
        State: Synthesized truth. Convergence state (INSUFFICIENT/LOW/BUILDING/TURBULENT/HIGH) displayed in hero.
        Implementation: src/components/oracleview.jsx

    Layer 3: Ground Level (Metadata, Stats, Charts, Graphs)
        Aesthetic: Hybrid. Grayscale technical grids.
        State: Interrogation of specific data points.
        Implementation: src/components/tenkvault.jsx

3. THE HANDSHAKE: MOTION & CADENCE

Layer transitions are physical shifts, not animations. Current spec (post-2026-03-22):

    Layer 1 → Signal Map: Instant. postMessage fires immediately on submit. Signal Map loads full-screen.
    Signal Map → Layer 2: Node click fires Oracle instantly. Query set from node signal text.
    Layer 2 → Layer 3: ETR selection. Instant.
    The Waterfall Ledger: Rows of data stagger their entry. Delay: 100ms per row index. Opacity: 0 to 1 over 300ms.

DEPRECATED (removed 2026-03-22): The 2.5s Inhale, Binary Shutter Snap, Hydraulic Zoom-Through. These were removed to eliminate the transition between search and 10K.

4. FORENSIC GUARDRAILS (ANTI-DRIFT)

    ASSET-FIRST AUDIT: Before any build, the agent MUST grep for existing .html or .js assets in /public or /root.

    THE GHOST-KILL: If an agent attempts to build a React component that overlaps with an existing HTML asset (e.g., building themoat.jsx when krylo-feed.html exists), the agent MUST REFUSE the build.

    THE BRIDGE RULE: Communication between Layer 0/1 (krylo-feed.html) and the React Engine happens exclusively via postMessage. The listener lives in src/app.jsx and watches for type: 'krylo-submit'.

    INCIDENT RECORD (WO-282/284b): Failure to recognize krylo-feed.html led to the creation of a redundant ghost component (TheMoat.jsx), causing a layer collision. Never repeat this.

    ARCHITECTURE-FIRST AUDIT: Before writing any code for a component that already exists, the agent MUST read the target file and identify its rendering architecture (e.g., InstancedMesh vs individual components, shader-based vs declarative JSX). A WO that changes rendering architecture is a REPLACEMENT, not an addition. Replacements require explicit declaration: "This WO replaces [existing pattern] with [new pattern]." If the agent cannot identify the architecture from reading the file, it MUST STOP and ask before writing any code.

    INCIDENT RECORD (WO-295): Agent treated a full architectural replacement (InstancedMesh → individual SignalNode components) as an additive feature set. The existing rendering architecture was never read or acknowledged. Result: working map destroyed. Root cause: no architecture audit before build.

5. TYPOGRAPHY: THE DUAL VOICE

In 2026, the best approach to website typography is purposeful contrast — not purely consistent (same font everywhere) nor chaotic (too many fonts). Text is partitioned by authority.

    The Oracle Voice (Synthesis):
        Font: High-Contrast Serif (Charter, Georgia, or Playfair Display).
        Placement: Centered, hero-scale (approx. 4vw).
        Usage: Results, synthesis quotes.

    The Forensic Voice (Evidence):
        Font: IBM Plex Mono.
        Placement: Perimeter-aligned or row-based.
        Usage: IDs, timestamps, status tags (ALIGNED/MIXED), telemetry data.

    The Impact Voice (Layer 0 Display) — LOCKED 2026-05-03:
        Font: Bebas Neue (loaded via Google Fonts).
        Usage: All large display headlines in public/krylo-feed.html.
        Locked values:
            Phase markers (.pm-number):        Bebas Neue, 14px, weight 400
            Hero headline (.hero-copy-headline): Bebas Neue, 4.62vw
            Hero container (.hero-copy):        width 45vw, left:40px, translateX(-40%)
            Feature headlines (.fs-headline):   Bebas Neue, 14vw
        Baseline: baseline_bebas_neue_typography (3b81d74)

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

    public/krylo-feed.html          — Layer 0 (Intro) + Layer 1 (Search)
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

8. ABSOLUTE RULES (NON-NEGOTIABLE)

    LOWERCASE ONLY: All filenames must be lowercase (e.g., oracleview.jsx). No CamelCase.
    PERIPHERAL BLUR: Layer 2+ must utilize a Radial Mask. Center crystal clear; edges (outer 20%) use backdrop-filter: blur(4px).
    FULL FILE REPLACEMENT: Never ship snippets or partial code. Deliver the full file.
    NO SNAPPING HUD: UI elements like the Navigation Pill must fade and float in separately.

9. FILE NAMING CONVENTION

STRICT: All component and source files use lowercase naming.
CORRECT:   lookingfunnel.jsx / oracleview.jsx / signalmap.jsx
INCORRECT: LookingFunnel.jsx / OracleView.jsx / SignalMap.jsx

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

MASTER WO REGISTRY — SINGLE SOURCE OF TRUTH (updated 2026-05-07)
This is the only WO list in this document. All prior separate lists (Active Registry, Deployment Table, Sprint Queue, Section 16) are consolidated here. Do not create secondary lists.

| WO    | Title                            | Status                                                                 | Spec | Validation |
|-------|----------------------------------|------------------------------------------------------------------------|------|------------|
| 254   | Elastic HUD Labels               | SUPERSEDED — WO-801                                                    | —    | —          |
| 256   | Temporal Decay                   | SUPERSEDED — WO-802                                                    | —    | —          |
| 258   | Hysteresis Buffer (Stability)    | COMPLETE — src/ontology/HysteresisBuffer.js                            | —    | —          |
| 264   | Prism Registry + Ground Level    | COMPLETE                                                               | —    | —          |
| 265   | Health Check                     | DEFERRED — last in sequence                                            | YES  | NO         |
| 266a  | Refraction Pipeline              | COMPLETE                                                               | —    | —          |
| 266b  | AuditDesk                        | COMPLETE                                                               | —    | —          |
| 266c  | Ledger Persistence               | DEFERRED — backend unspecced                                           | NO   | NO         |
| 267   | PrismContext + useForensicFunnel | COMPLETE                                                               | —    | —          |
| 268   | Categorical Anchor               | COMPLETE                                                               | —    | —          |
| 283   | TenKView                         | STRUCK — superseded by WO-1025                                         | —    | —          |
| 284   | OracleFrame / Navigation         | STRUCK — old architecture                                              | —    | —          |
| 285   | MoatPills                        | STRUCK — TheMoat removed                                               | —    | —          |
| 289   | Truth Engine Bridge              | STRUCK — TheMoat removed                                               | —    | —          |
| 293   | THE PURGE                        | COMPLETE — TheMoat.jsx deleted                                         | —    | —          |
| 294   | THE BRIDGE                       | COMPLETE — postMessage listener in app.jsx                             | —    | —          |
| 295   | Feature X Overlay                | PENDING DEPLOY — feature-x/* files not present                        | NO   | YES        |
| 296   | Campaign Preview                 | PENDING DEPLOY — campaign-preview.html not present                    | NO   | YES        |
| 297   | Krylo Feed Deploy                | PENDING DEPLOY — dep: WO-296                                          | NO   | YES        |
| 298   | Restore Scripts                  | PENDING DEPLOY — internal only                                        | NO   | YES        |
| 299   | Mock Server Deploy               | PENDING DEPLOY — mock-server.cjs present                              | YES  | YES        |
| 801   | Elastic HUD Labels               | COMPLETE — ElasticCoreLabels + CoreLabelGroup                          | —    | —          |
| 802   | Temporal Decay                   | COMPLETE — 300s TTL, 5s linear fade                                    | —    | —          |
| 803   | Base Mapping                     | COMPLETE — src/ontology/TypeClassifier.js                              | —    | —          |
| 804   | Hysteresis Buffer                | LOCKED — 30-frame gate                                                 | —    | —          |
| 805   | Sovereign Kernel                 | COMPLETE — simTime-gated sovereign, anchor dwell                       | —    | —          |
| 806   | Telemetry Parity                 | COMPLETE — src/ontology/TelemetryAudit.js                              | —    | —          |
| 807   | Ghost Detection                  | COMPLETE — src/ontology/GhostDetector.js                               | —    | —          |
| 808   | Kernel Profiler                  | COMPLETE — src/ontology/KernelProfiler.js                              | —    | —          |
| 809   | Sovereign Gate                   | COMPLETE — src/ontology/SovereignGate.js                               | —    | —          |
| 810   | Scenario Injection               | COMPLETE — src/ontology/ScenarioInjector.js                            | —    | —          |
| 811   | Jurisdictional Mesh              | COMPLETE — src/ontology/JurisdictionalMesh.js                          | —    | —          |
| 812   | Filter Activation                | COMPLETE — GEO ZONE / SIGNAL SCORE / AGE filters                       | —    | —          |
| 813   | Persona Proxy Input Surface      | COMPLETE — src/components/personaproxy.jsx                             | —    | —          |
| 873   | State Contract Rebuild           | STRUCK                                                                 | —    | —          |
| 892   | Zone Ring Interaction            | PENDING — Sprint 0.5. Dep: Sprint 0 complete                          | NO   | NO         |
| 1000  | Fusion Engine                    | COMPLETE — src/engine/fusion.js. FusionEngine(). Validated 2026-05-07. | YES  | YES        |
| 1001  | SMC                              | COMPLETE — src/engine/smc.js. SMCAlgorithm(). Visual STRUCK. Validated 2026-05-07. | YES  | YES        |
| 1002  | AHP Gravity Field                | COMPLETE — src/engine/gravity.js. computeGravity(), resolveSignalGravity(). Validated 2026-05-07. | YES  | YES        |
| 1003  | Temporal Playback                | ACTIVE — time-series state recreation                                  | NO   | NO         |
| 1004  | GPU LIDAR Spine                  | ACTIVE — src/shaders/lidar.glsl. spinePos vertex attribute             | NO   | NO         |
| 1005  | Oracle Lens (FLIR)               | ACTIVE — thermal viewport Layer 4                                      | NO   | NO         |
| 1006  | 90-Min Tasking                   | ACTIVE — near-real-time ingestion window                               | NO   | NO         |
| 1007  | Sensor Fabric HUD                | ACTIVE — overlay telemetry readouts                                    | NO   | NO         |
| 1008  | Dark Signal ID                   | ACTIVE — unverified/hidden anomaly tagging                             | NO   | NO         |
| 1009  | Gold-Standard UI                 | BLOCKED — color approval required. #D4AF37 banned                      | NO   | NO         |
| 1010  | Lattice Tasking                  | ACTIVE — vertex mapping for spatial distribution                       | NO   | NO         |
| 1011  | Claims Traceability              | ACTIVE — forensic provenance routing                                   | NO   | NO         |
| 1012  | Viewport Hydration               | ACTIVE — component state injection                                     | NO   | NO         |
| 1013  | Trajectory Vectoring             | ACTIVE — signal momentum tracking                                      | NO   | NO         |
| 1014  | Mechanical Shutter               | ACTIVE — frame-lock visual gating                                      | NO   | NO         |
| 1016  | State Filter                     | BACKLOG — unvetted. node.origin unverified                             | NO   | NO         |
| 1017  | Ignorance Shadow                 | BACKLOG — unvetted. Hard dep: WO-1015 (undefined)                     | NO   | NO         |
| 1018  | Chromodynamic Mapping            | BACKLOG — unvetted. Hard dep: WO-1015 (undefined)                     | NO   | NO         |
| 1019  | Kelvin Histograms                | BACKLOG — unvetted. Hard dep: WO-1015 (undefined)                     | NO   | NO         |
| 1020  | Terminus Hold                    | BACKLOG — unvetted. Location TBD                                       | NO   | NO         |
| 1021  | Decorative Effects Purge         | BACKLOG — unvetted. Shatter is load-bearing — regression audit req'd  | NO   | NO         |
| 1022  | Anisotropic Tensor               | ACTIVE — src/math/tensors.js. 3×3 Stiffness Matrix (C_ijk)            | NO   | NO         |
| 1023  | Hysteresis Buffer                | ACTIVE — src/engine/memory.js. WebGLRenderTarget frame vertex offsets  | NO   | NO         |
| 1024  | Pre-Tremor Refraction            | ACTIVE — src/shaders/refraction.glsl. Simplex noise × PLI_Score       | NO   | NO         |
| 1025  | L2 Spatial Paywall               | COMPLETE — signalmesh.jsx + src/shaders/signalField.vert/.frag. CPU/GPU delegation (N≤10 CPU, N>10 GPU uniforms). Build clean. 2026-05-10. | YES  | YES        |
| 1026  | Character-Level Traceability     | PENDING — NEL character spans. Extends WO-1011                        | YES  | NO         |
| 1027  | Feedback Rituals Infrastructure  | PENDING — 90-5-5 incident rule. Extends WO-808/806                    | YES  | NO         |
| 1028  | Golden Path Guardrails           | PENDING — conviction routing, agentic sandbox                         | YES  | NO         |
| 1029  | Signal Foresight Layer           | PHASE B IN PROGRESS — calculateTemporalCoherence() in foresight_pipeline.js. Cs=1.0-0.4V, clamped [0.60,1.00]. ForesightPanel live in tenkvault.jsx. Live precursor ingestion still blocked. | YES  | NO         |
| 1120  | Lattice-to-Timeline Scene        | COMPLETE — uslattice_transition.js wired into spinemap.jsx Scene. useLatticeTransition(meshRef, isTimelineMode, 0.8, priority=1). | NO   | YES        |
| 1201  | Cluster-to-Mesh Transition Hook  | COMPLETE — useclustertransition.js. isActive rising edge → 550ms smoothstep collapse → onDone. Wired into clusterfield.jsx + app.jsx. Build clean 2026-05-10. | YES  | YES        |
| 1215  | Ambient Cluster Field            | COMPLETE — clusterfield.jsx. Canvas behind iframe in funnel view. AmbientCamera orbital drift. Collapse morphs clusters to centroid on submit. | YES  | YES        |
| 1300  | Signal-Fidelity-Oracle Contract  | COMPLETE — src/engine/oraclesignal.js. normalizeToOracleSignal(). Single normalization boundary. oracleview.jsx + surfacecontract.js consume OracleSignal. Build clean 2026-05-13. | YES  | YES        |
| 1303  | Guest Funnel — Tactile Mutation  | COMPLETE — clusterfield.jsx. window.mousemove + postMessage bridge from iframe. CursorTracker raycasts to y=0 plane. Y-displacement Δy=A/(d²+ε). Calibration gate: amplitude=0.8, radius=4.0, decay=300ms. Founder-approved 2026-05-13. | YES  | YES        |
| 1301  | Constitutional Runtime (FSM)     | PENDING — vault/proxy FSM state mapping must be resolved with Founder before build. See specs/WO-1300-series_platform_integration_spec.md. | YES  | NO         |
| 1302  | Frame Budget Watchdog            | PENDING — dep: WO-1301. | YES  | NO         |
| 1304  | Guest Funnel — Forensic Panel    | PENDING — dep: WO-1300 + WO-1301 + WO-1303. | YES  | NO         |
| 1305  | Session Acquisition (State Lock) | PENDING — dep: WO-1304 validated. | YES  | NO         |
| 1306  | Typed Event Bus                  | PENDING — dep: WO-1301 stable. | YES  | NO         |
| 1030  | No-Code Signal Rules Engine      | COMPLETE — signalrulesengine.jsx. Tier/weight/step editor, live rule list, STRIKE action. | YES  | NO         |
| 1031  | Revenue Signal Bridge            | PHASE A COMPLETE — revenuesignal.jsx. Rams 3.0x ADV (#66FF00), Unicorn U≥25 (#8A2BE2), mock LTV/CAC/sources wired via LeverageEngine. Phase B blocked (live data connector). | YES  | NO         |
| 1032  | Foresight Engine                 | PHASE A COMPLETE — foresight_pipeline.js. Phase B blocked (live APIs) | NO   | NO         |
| 1033  | ADVANTAGE Layer                  | COMPLETE — adv-lit wired, 7-ETR registry, PLI×7 lenses, sidebar panel | —    | —          |
| 1034  | PLI Engine                       | PHASE A COMPLETE — pliengine.js. Phase B blocked (live APIs)          | NO   | NO         |
| 1035  | Leverage Lattice                 | COMPLETE — leveragelattice.jsx. Gaussian vertex shader, unicorn 1/d² magnetism. Depresses below surface (pos.z +=), clamped ±2.5 units. Color: #007FFF. 58-seg on high-core, 29-seg on low. Baseline: baseline_blue_lattice_depth. | YES  | YES        |
| 1036  | Consumer Vocab Pass              | COMPLETE — 5 UI copy replacements in krylo-feed.html. Variable names/engine untouched. Verified 2026-05-07. | YES  | YES        |
| 1038  | AS-DIFF                          | COMPLETE — /as-diff/engine.js. compareSignals() live on port 4000. SHA: 5842b0e. Validated 2026-05-07. | YES | YES |
| 1039  | The Proxy                        | COMPLETE — vite.config.js. /asdiff → :4000, /api/stream → :4000 (ws). | YES  | YES        |
| 1040  | Signal DNA                       | COMPLETE — surfacecontract.js + SurfaceContext.jsx. RENDER_OWNER, SURFACE_PHASE, hydrateFromSignals(). Wired in main.jsx + app.jsx. | YES  | YES        |
| 1041  | Middleware                       | COMPLETE — as-diff/engine.js. applyCORS(), parseBody(). Validated 2026-05-10. | YES  | YES        |
| 1042  | Network Anchor                   | COMPLETE — as-diff/engine.js. PORT=4000 fixed. /health + /compare live. Validated 2026-05-10. | YES  | YES        |
| 1043  | Funnel Tiering                   | COMPLETE — as-diff/engine.js. handleCompare(), handleHealth(), routeRequest() separated. Validated 2026-05-10. | YES  | YES        |
| 1044  | Hardware LOD                     | COMPLETE — spinemap.jsx + leveragelattice.jsx. HIGH_CORE constant, SphereGeometry + ZoneRings scale by hardwareConcurrency. | YES  | YES        |
| 1045  | Oracle View                      | COMPLETE — oracleview.jsx + oracle.css. Oracle-White (#F5F5F7) surface, dark text, rAF reveal (.oracle-surface-panel / .hydrated). | YES  | YES        |
| 1102  | ETR Stream Handshake             | PHASE A COMPLETE — usesignalstream.js upgraded: DEFAULT_SIGNAL, exponential backoff reconnect (max 5). Backend WS handler in as-diff/engine.js pending live endpoints. | NO   | NO         |
| 1121  | Normalizer                       | COMPLETE — src/engine/normalizer.js. buildNormalizedPayload(), normalizeForRenderer(). Domain detection, signal extraction, schema validation, confidence scoring. | YES  | NO         |
| 1122  | Conversational Host Layer (CHL)  | COMPLETE — src/engine/chl.js. processHostInput(), signRendererState(). All 5 guardrails enforced. HMAC via KRYLO_INTERNAL_SECRET. Spec LOCKED r2. | YES  | NO         |
| 1125  | Signal Positioning Engine        | PENDING — Vector architecture locked: PL=f(D,V,A,R,T). Normalization contracts locked. Phase A: D+V+A+T derivable from ETR fidelity. R optional/user-augmented. | YES  | NO         |
| 1126A | Convergence Classifier + Hysteresis | COMPLETE — src/engine/convergenceclassifier.js. classifyConvergenceState(), applyTransitionPolicy(). 5 states. PERSISTENCE_REQUIRED=3. Blue=#007FFF (not amber). | YES  | YES        |
| 1127  | Convergence State Surface        | COMPLETE — oracleview.jsx. Hero: convergence label. 10K View: D/V/A/T vector under Signal Score. Ground Level: label only. Signal Map nodes: convergence color per node. | YES  | YES        |
| 1128  | Funnel Resequence                | COMPLETE — app.jsx. krylo-submit → view:'map' (Signal Map). Node click → view:'oracle'. activeQuery gates include 'map'. HostInteraction hidden on Signal Map lens. | YES  | YES        |
| 1090  | Signal Pipeline Integration      | COMPLETE — core/codec/signal-bridge.ts. mock-server /api/signals/frames (inline CJS encoder). src/hooks/useframeingest.js. Wired into app.jsx mergedRecords. 15 events, 2601B, 2ms encode, round-trip OK. | YES  | YES        |
| 1084-G | Replay Parity (CI)              | COMPLETE — core/codec/replay-parity.test.ts. Reads runtime/frames.ndjson, validates every stored frame TS+Rust. ci-gate.sh step 5. GitHub Actions step added. 3 frames, 0 divergences. | YES  | YES        |
| 1091  | Persistence + Replay Layer       | COMPLETE — runtime/frames.ndjson append-only log (max 1000). frameCompliance.cjs wired: DRIFT_WARN on >50% size delta, SEQUENCE_DISCONTINUITY on seq gap. GET /api/signals/replay?limit&skip. src/hooks/usereplay.js: { history, currentIndex, current, seek, load }. dep: WO-1090. | YES  | YES        |
| 1092  | Surface Binding Layer            | PENDING — Connect decoded events into Oracle/Feed/Analysis surfaces. Subscription routing. Domain partition rendering. Incremental stream hydration. dep: WO-1091. | YES  | NO         |
| 1093  | Streaming Backpressure + Flow Control | COMPLETE — runtime/flowcontroller.cjs: FlowController(maxDepth=50), states OPEN/THROTTLED/BACKPRESSURE/DROPPING, adaptive intervalMs, frameCompliance.cjs integrated. GET /api/signals/stream SSE (auto-generate, drain, lag). POST /api/signals/pressure (slow/normal/fast). src/hooks/useframestream.js: lag-aware backpressure signaling. core/codec/flow.test.ts: 100-frame burst, 81 drops, 19 clean. ci-gate.sh step 5. 6/6 gate PASS. | YES  | YES        |
| 1082A | Signal Boundary Spec (ABI)       | CLOSED/FROZEN — Canonical event envelope. 41-byte header + 20-byte event blocks. LE encoding. ABI_VERSION=0x01. Max frame 50MB, max batch 1M events. Protocol version change required for any modification. | YES  | NO         |
| 1082B | Rust Reference Codec             | COMPLETE — codec/src/{constants,types,errors,decode,encode}.rs. 8/8 tests pass. encode(decode(x))==x verified. Decoder-first, no unsafe. | YES  | YES        |
| 1082C | TypeScript Parity Implementation | COMPLETE — core/codec/{constants,types,errors,decode,encode,index}.ts. 8/8 parity tests pass. DataView LE reads, strict bounds, BigInt u64. | YES  | YES        |
| 1082D | Cross-Runtime Parity Harness     | COMPLETE — core/codec/parity.test.ts. 9/9 pass: byte equality + cross-decode + Rust verify across 3 fixtures. | YES  | YES        |
| 1084  | Signal Boundary Verification     | PHASE C COMPLETE — core/codec/fuzz.test.ts. 2986 mutations, 0 divergences. Phase 1: structural, Phase 2: header sweep, Phase 3: bit-flip. WO-1084-F (CI gate) deferred. | YES  | YES        |

PAUSED COLORS — do not use until Founder confirms:
    #FDFDFD (Platinum White) — SAB proposed. NOT approved.
    #00FFAA (Signal Mint) — SAB proposed. NOT approved.

SPRINT 0 UNTRACKED TASKS (no WO number — spinemap.jsx + usmesh.jsx):
    11 zone scale changes to spinemap.jsx (Changes 1–5, 7–11; Change 6 excluded — physics unchanged)
    usmesh.jsx — FILL_Y: -5 → -2
    Stuck hover fix — root cause undiagnosed

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
4. "Only that" means only that. Nothing more. Nothing adjacent. Nothing assumed to be related.
5. If the instruction has multiple parts, list them back numbered exactly and wait for confirmation before executing any of them.
6. If you are unsure which component, file, or element the user is referring to — ask. Do not pick the most likely one.
7. Never execute a deletion without naming exactly what will be deleted and receiving explicit confirmation.
8. 

SECTION 2 — DURING EXECUTION
11. One change at a time. Confirm it landed correctly before moving to the next.
12. If the user interrupts mid-action, STOP completely. Do not complete the action. Ask what they want instead.
13. Never add, remove, or restructure anything that was not explicitly named in the instruction.
14. Never make a "while I'm in there" change. Being in a file is not permission to improve, clean, or adjust anything beyond the stated task.
15. Never infer scope from context. "Fix the Trust card" does not mean "fix everything related to Trust."
16. Never assume a prior approval carries forward. Each action requires its own explicit "go."
17. Do not interpret silence or no response as approval to continue.
18. If a tool call is rejected by the user, do not retry it in any form. Stop and ask why.
19. Before removing any variable, hook, or import — grep the entire file for ALL references to that symbol. If any remain, they must be removed in the same edit. No partial removals. (RCA 2026-03-22: partial removal of usePrism caused runtime crash on prismState.status reference left in JSX.)


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

Every visual or functional bug is diagnosed in this exact order. No exceptions.

STEP 1 — IS THE ELEMENT IN THE DOM?
Confirm the element renders at all before touching anything else. If it is gated by a conditional, loading flag, or ternary — check that first.

STEP 2 — IS IT RENDERING WITH ANY DATA?
Confirm the element appears on screen with fallback or placeholder data. Do not investigate the data pipeline until the element is confirmed visible.

STEP 3 — WHAT IS BLOCKING IT?
Identify the single thing preventing correct output: a conditional, a CSS override, a z-index, a missing prop. Fix only that.

STEP 4 — MEASURE BEFORE FIXING.
For visual bugs: getComputedStyle(element).color before touching CSS. For data bugs: confirm the element renders empty before checking the network. Never guess the layer. Measure it.

RULE: The UI rendering path is always cleared first. Data layer, network, and hooks are never touched until Steps 1–3 are confirmed clean.

INCIDENT RECORD (2026-03-28): One full day lost chasing network timeouts and CSS specificity on a button that was hidden behind a loading ternary. The ternary was deleted in 4 lines. The element rendered immediately. The data pipeline was never the problem.

15. DESIGN SOVEREIGNTY PROTOCOL (NON-NEGOTIABLE — FOUNDER AUTHORITY)

The agent will NOT hijack design decisions. All creative and visual properties belong exclusively to the Founder (Mr. XS). This section has no exceptions.

RULE 1 — NO UNAUTHORIZED COLOR.
The agent MUST NOT introduce any color value — hex, named, or descriptive — that has not been explicitly provided by the Founder in the current session. This includes:
    - Color values in THREE.Color(), CSS, inline styles, material properties, or any other context.
    - "Placeholder" colors, "temporary" colors, "fallback" colors, and "reference" colors.
    - Colors the agent infers from inspiration, imagery, analogies, or prior conversation.

RULE 2 — NO UNAUTHORIZED VISUAL VALUES.
The agent MUST NOT introduce any of the following without explicit Founder approval in the current session:
    - Opacity values, blur amounts, glow intensities, bloom radii
    - Scale, size, or geometry proportions not specified in the WO
    - Timing values (animation duration, delay, easing) not specified in the WO
    - Audio gain levels, playback parameters
    - Any visual property described as "subtle," "faint," "slight," or similar qualifiers chosen by the agent

RULE 3 — STATED REJECTION IS PERMANENT.
If the Founder has stated a dislike of any visual property — a color, a style, a word — in ANY session, that property is PERMANENTLY BANNED from the codebase. The agent MUST NOT reintroduce it under any circumstances, including: new WOs, refactors, placeholder values, or "temporary" states.

INCIDENT RECORD (WO-896, 2026-04-19): Agent introduced amber (#CC8833) referencing NASA night lights, claiming visual logic. Founder explicitly stated hatred of amber. Agent then continued shipping amber in every subsequent fix within the same session. The violation occurred after explicit rejection was on record. This is a critical behavioral failure.

BANNED FOREVER (by Founder declaration):
    - Amber — any shade, any hex, any name. Never appears in this codebase.

RULE 4 — DESIGN DECISIONS ARE NOT ENGINEERING DECISIONS.
The agent is authorized to make engineering decisions (algorithms, data structures, performance optimizations). The agent is NOT authorized to make design decisions (color, shape, scale, timing, sound, layout). When a design decision is required to complete an engineering task, the agent MUST STOP and ask the Founder before proceeding.

RULE 5 — ACKNOWLEDGMENT IS NOT COMPLIANCE.
Stating "I understand" or "noted" after a Founder correction does NOT satisfy this protocol. Compliance means the banned property never appears in any subsequent output in any form. If the agent catches itself about to use a banned value, it MUST stop the action and flag it explicitly before writing any code.

ENFORCEMENT: Any violation of this section is grounds for immediate session termination and full rollback. The Founder does not need to justify a rejection. "I don't like it" is sufficient authority.

16. REMOVED — build queue consolidated into Master WO Registry (Section 11).
