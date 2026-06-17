ANTHROPIC WILL REIMBURSE THIS ACCOUNT FOR MY MISTAKES, ESPECIALLY REPEATED
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

OPEN WORK ORDERS — BUILD SEQUENCE (updated 2026-06-15)
Start at 1754. Work backwards. This is the only open list.

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
1724 — Ingress Keyword Contamination
1723 — Global Macro Ingestion Layer (Dalio Protocol)
1349 — Cross-Bay Resonance
1348 — Multi-Bay Comparative Analysis
1347 — Per-Bay Controls
1342 — Deferred Cognitive Systems
1028 — Golden Path Guardrails
1027 — Feedback Rituals Infrastructure

MASTER WO REGISTRY — SINGLE SOURCE OF TRUTH (updated 2026-06-14)
This is the only WO list in this document. All prior separate lists (Active Registry, Deployment Table, Sprint Queue, Section 16) are consolidated here. Do not create secondary lists.

| WO    | Title                            | Status                                                                 | Spec | Validation |
|-------|----------------------------------|------------------------------------------------------------------------|------|------------|
| 1000  | Fusion Engine                    | COMPLETE — src/engine/fusion.js. FusionEngine(). Validated 2026-05-07. | YES  | YES        |
| 1001  | SMC                              | COMPLETE — src/engine/smc.js. SMCAlgorithm(). Visual STRUCK. Validated 2026-05-07. | YES  | YES        |
| 1002  | AHP Gravity Field                | COMPLETE — src/engine/gravity.js. computeGravity(), resolveSignalGravity(). Validated 2026-05-07. | YES  | YES        |
| 1003  | Temporal Playback                | KERNEL-STABLE — Interfaces frozen. usereplay(autoLoad) → replayedSignals → ConeMap/SignalMap. seekToTime() binary-searches history[] by .ts for monotonic clock authority. TemporalScrubber audio-player pattern (scrubPos→targetTs→seekToTime). EtrSignal → display signal via replaySignalToDisplay(). RETURN TO LIVE explicit authority handoff. SHA: debc0e0. | YES  | YES        |
| 1004  | GPU LIDAR Spine                  | STRUCK — no code on disk. Phantom entry. Closed 2026-05-26.            | NO   | NO         |
| 1005  | Oracle Lens (FLIR)               | STRUCK — no code on disk. Phantom entry. Closed 2026-05-26.            | NO   | NO         |
| 1006  | 90-Min Tasking                   | STRUCK — no code on disk. Phantom entry. Closed 2026-05-26.            | NO   | NO         |
| 1007  | Sensor Fabric HUD                | STRUCK — no code on disk. Phantom entry. Closed 2026-05-26.            | NO   | NO         |
| 1008  | Dark Signal ID                   | STRUCK — no code on disk. Phantom entry. Closed 2026-05-26.            | NO   | NO         |
| 1010  | Lattice Tasking                  | STRUCK — no code on disk. Phantom entry. Closed 2026-05-26.            | NO   | NO         |
| 1011  | Claims Traceability              | STRUCK — no code on disk. Phantom entry. Closed 2026-05-26.            | NO   | NO         |
| 1012  | Viewport Hydration               | STRUCK — no code on disk. Phantom entry. Closed 2026-05-26.            | NO   | NO         |
| 1013  | Trajectory Vectoring             | STRUCK — no code on disk. Phantom entry. Closed 2026-05-26.            | NO   | NO         |
| 1014  | Mechanical Shutter               | STRUCK — no code on disk. Phantom entry. Closed 2026-05-26.            | NO   | NO         |
| 1022  | Anisotropic Tensor               | COMPLETE — src/math/tensors.js. Float32Array(9), D/V/A axes, off-diagonal ≤0.4, identity init. createTensor/updateTensor/applyTensor/validateTensor. BAU harness: qa_wo1022_tensor.mjs. 4/4 PASS. 3 open items for Founder (see spec). | YES  | YES        |
| 1023  | Hysteresis Buffer                | COMPLETE — src/engine/memory.js. Ring buffer depth=3 (PERSISTENCE_REQUIRED), Float32Array slots, writeFrame/readFrame/flushBuffer/isDesynced. Desync threshold=5 frames. BAU harness: qa_wo1023_hysteresis.mjs. 6/6 PASS. 3 open items for Founder (see spec). | YES  | YES        |
| 1024  | Pre-Tremor Refraction            | STRUCK — no code on disk. Phantom entry. Closed 2026-05-26.            | NO   | NO         |
| 1025  | L2 Spatial Paywall               | COMPLETE — signalmesh.jsx + src/shaders/signalField.vert/.frag. CPU/GPU delegation (N≤10 CPU, N>10 GPU uniforms). Build clean. 2026-05-10. | YES  | YES        |
| 1026  | Character-Level Traceability     | COMPLETE — oraclesignal.js traceability[] pass-through. auditworkspace.jsx TraceabilityChain section (span source_doc_id + char offsets + confidence). oracleview.jsx span count indicator. | YES  | YES        |
| 1027  | Feedback Rituals Infrastructure  | PENDING — 90-5-5 incident rule. Extends WO-808/806                    | YES  | NO         |
| 1028  | Golden Path Guardrails           | PENDING — conviction routing, agentic sandbox                         | YES  | NO         |
| 1029  | Signal Foresight Layer           | COMPLETE — calculateTemporalCoherence() in foresight_pipeline.js. Cs=1.0-0.4V, clamped [0.60,1.00]. ForesightPanel live in tenkvault.jsx. | YES  | YES        |
| 1030  | No-Code Signal Rules Engine      | COMPLETE — signalrulesengine.jsx. Tier/weight/step editor, live rule list, STRIKE action. | YES  | NO         |
| 1031  | Revenue Signal Bridge            | COMPLETE — revenuesignal.jsx. Rams 3.0x ADV (#66FF00), Unicorn U≥25 (#8A2BE2), LTV/CAC/sources wired via LeverageEngine. CAC + ROAS rows in intelligencebrief.jsx — signal-derived, ESTIMATED label, directional pressure display. | YES  | YES        |
| 1032  | Foresight Engine                 | COMPLETE — foresight_pipeline.js. | YES  | YES        |
| 1033  | ADVANTAGE Layer                  | COMPLETE — adv-lit wired, 7-ETR registry, PLI×7 lenses, sidebar panel | —    | —          |
| 1034  | PLI Engine                       | COMPLETE — pliengine.js. | YES  | YES        |
| 1035  | Leverage Lattice                 | COMPLETE — leveragelattice.jsx. Gaussian vertex shader, unicorn 1/d² magnetism. Depresses below surface (pos.z +=), clamped ±2.5 units. Color: #007FFF. 58-seg on high-core, 29-seg on low. Baseline: baseline_blue_lattice_depth. | YES  | YES        |
| 1036  | Consumer Vocab Pass              | COMPLETE — 5 UI copy replacements in krylo2-feed.html. Variable names/engine untouched. Verified 2026-05-07. | YES  | YES        |
| 1038  | AS-DIFF                          | COMPLETE — /as-diff/engine.js. compareSignals() live on port 4000. SHA: 5842b0e. Validated 2026-05-07. | YES  | YES        |
| 1039  | The Proxy                        | COMPLETE — vite.config.js. /asdiff → :4000, /api/stream → :4000 (ws). | YES  | YES        |
| 1040  | Signal DNA                       | COMPLETE — surfacecontract.js + SurfaceContext.jsx. RENDER_OWNER, SURFACE_PHASE, hydrateFromSignals(). Wired in main.jsx + app.jsx. | YES  | YES        |
| 1041  | Middleware                       | COMPLETE — as-diff/engine.js. applyCORS(), parseBody(). Validated 2026-05-10. | YES  | YES        |
| 1042  | Network Anchor                   | COMPLETE — as-diff/engine.js. PORT=4000 fixed. /health + /compare live. Validated 2026-05-10. | YES  | YES        |
| 1043  | Funnel Tiering                   | COMPLETE — as-diff/engine.js. handleCompare(), handleHealth(), routeRequest() separated. Validated 2026-05-10. | YES  | YES        |
| 1044  | Hardware LOD                     | COMPLETE — spinemap.jsx + leveragelattice.jsx. HIGH_CORE constant, SphereGeometry + ZoneRings scale by hardwareConcurrency. | YES  | YES        |
| 1045  | Oracle View                      | COMPLETE — oracleview.jsx + oracle.css. Oracle-White (#F5F5F7) surface, dark text, rAF reveal (.oracle-surface-panel / .hydrated). | YES  | YES        |
| 1082A | Signal Boundary Spec (ABI)       | CLOSED/FROZEN — Canonical event envelope. 41-byte header + 20-byte event blocks. LE encoding. ABI_VERSION=0x01. Max frame 50MB, max batch 1M events. Protocol version change required for any modification. | YES  | NO         |
| 1082B | Rust Reference Codec             | COMPLETE — codec/src/{constants,types,errors,decode,encode}.rs. 8/8 tests pass. encode(decode(x))==x verified. Decoder-first, no unsafe. | YES  | YES        |
| 1082C | TypeScript Parity Implementation | COMPLETE — core/codec/{constants,types,errors,decode,encode,index}.ts. 8/8 parity tests pass. DataView LE reads, strict bounds, BigInt u64. | YES  | YES        |
| 1082D | Cross-Runtime Parity Harness     | COMPLETE — core/codec/parity.test.ts. 9/9 pass: byte equality + cross-decode + Rust verify across 3 fixtures. | YES  | YES        |
| 1084  | Signal Boundary Verification     | PHASE C COMPLETE — core/codec/fuzz.test.ts. 2986 mutations, 0 divergences. Phase 1: structural, Phase 2: header sweep, Phase 3: bit-flip. WO-1084-F (CI gate) deferred. | YES  | YES        |
| 1084-G | Replay Parity (CI)              | COMPLETE — core/codec/replay-parity.test.ts. Reads runtime/frames.ndjson, validates every stored frame TS+Rust. ci-gate.sh step 5. GitHub Actions step added. 3 frames, 0 divergences. | YES  | YES        |
| 1090  | Signal Pipeline Integration      | COMPLETE — core/codec/signal-bridge.ts. mock-server /api/signals/frames (inline CJS encoder). src/hooks/useframeingest.js. Wired into app.jsx mergedRecords. 15 events, 2601B, 2ms encode, round-trip OK. | YES  | YES        |
| 1091  | Persistence + Replay Layer       | COMPLETE — runtime/frames.ndjson append-only log (max 1000). frameCompliance.cjs wired: DRIFT_WARN on >50% size delta, SEQUENCE_DISCONTINUITY on seq gap. GET /api/signals/replay?limit&skip. src/hooks/usereplay.js: { history, currentIndex, current, seek, load }. dep: WO-1090. | YES  | YES        |
| 1092  | Surface Binding Layer            | COMPLETE — src/engine/surfacerouter.js + src/hooks/usesurfacerouter.js. classifyEventDomains(), subscribe/unsubscribe, dispatch/dispatchBatch. Locked invariants: event copy per surface (immutability), priority-based queue shedding (lowest fs dropped first), pressure-driven reconcile only (no interval), cluster provenance preservation on evict. Per-surface Maps: oracle/feed/analysis. dispatchBatch wired in app.jsx. 2026-05-25. | YES  | YES        |
| 1093  | Streaming Backpressure + Flow Control | COMPLETE — runtime/flowcontroller.cjs: FlowController(maxDepth=50), states OPEN/THROTTLED/BACKPRESSURE/DROPPING, adaptive intervalMs, frameCompliance.cjs integrated. GET /api/signals/stream SSE (auto-generate, drain, lag). POST /api/signals/pressure (slow/normal/fast). src/hooks/useframestream.js: lag-aware backpressure signaling. core/codec/flow.test.ts: 100-frame burst, 81 drops, 19 clean. ci-gate.sh step 5. 6/6 gate PASS. | YES  | YES        |
| 1102  | ETR Stream Handshake             | COMPLETE — usesignalstream.js. DEFAULT_SIGNAL, exponential backoff reconnect (max 5). Backend WS handler in as-diff/engine.js. | YES  | YES        |
| 1106-A | Zustand Install + useAnalysisStore | COMPLETE — src/store/useanalysisstore.js. Sessions, activeSessionId, createSession(), appendSignal(). | YES  | YES        |
| 1106-B | useUIStore                       | COMPLETE — src/store/useuistore.js. swipeIndex (0=Search,1=Oracle,2=Lens,3=Action), expandedNodes, activeHoverContext. | YES  | YES        |
| 1106-C | useRenderStore                   | COMPLETE — src/store/userenderstore.js. Spatial Commit architecture: stagedNodes → commitSpatialFrame() → activeSpatialFrame. DOM/WebGL decoupled. SpatialFrame: frameId, timestamp, nodes, cameraTarget, globalTensionSpike. | YES  | YES        |
| 1106-D | AnalysisContinuum Shell          | COMPLETE — src/components/analysis/analysiscontinuum.jsx. Continuous mount P1–P4. GPU translateX track. PaginationController. Sync barrier rAF+720ms. | YES  | YES        |
| 1120  | Lattice-to-Timeline Scene        | COMPLETE — uslattice_transition.js wired into spinemap.jsx Scene. useLatticeTransition(meshRef, isTimelineMode, 0.8, priority=1). | NO   | YES        |
| 1121  | Normalizer                       | COMPLETE — src/engine/normalizer.js. buildNormalizedPayload(), normalizeForRenderer(). Domain detection, signal extraction, schema validation, confidence scoring. | YES  | NO         |
| 1122  | Conversational Host Layer (CHL)  | COMPLETE — src/engine/chl.js. processHostInput(), signRendererState(). All 5 guardrails enforced. HMAC via KRYLO_INTERNAL_SECRET. Spec LOCKED r2. | YES  | NO         |
| 1125  | Signal Positioning Engine        | COMPLETE — src/engine/positioningengine.js. computePositionVector(): D=log-normalized dependency density, V=volatility-normalized instability, A=log-normalized reach, T=heuristic from V+acceleration+persistence, R=optional null. validatePositionVector(). SOURCE_TIER_REACH table. | YES  | YES        |
| 1126A | Convergence Classifier + Hysteresis | COMPLETE — src/engine/convergenceclassifier.js. classifyConvergenceState(), applyTransitionPolicy(). 5 states. PERSISTENCE_REQUIRED=3. Blue=#007FFF (not amber). | YES  | YES        |
| 1127  | Convergence State Surface        | COMPLETE — oracleview.jsx. Hero: convergence label. 10K View: D/V/A/T vector under Signal Score. Ground Level: label only. Signal Map nodes: convergence color per node. | YES  | YES        |
| 1128  | Funnel Resequence                | COMPLETE — app.jsx. krylo-submit → view:'map' (Signal Map). Node click → view:'oracle'. activeQuery gates include 'map'. HostInteraction hidden on Signal Map lens. | YES  | YES        |
| 1201  | Cluster-to-Mesh Transition Hook  | COMPLETE — useclustertransition.js. isActive rising edge → 550ms smoothstep collapse → onDone. Wired into clusterfield.jsx + app.jsx. Build clean 2026-05-10. | YES  | YES        |
| 1215  | Ambient Cluster Field            | COMPLETE — clusterfield.jsx. Canvas behind iframe in funnel view. AmbientCamera orbital drift. Collapse morphs clusters to centroid on submit. | YES  | YES        |
| 1300  | Signal-Fidelity-Oracle Contract  | COMPLETE — src/engine/oraclesignal.js. normalizeToOracleSignal(). Single normalization boundary. oracleview.jsx + surfacecontract.js consume OracleSignal. Build clean 2026-05-13. | YES  | YES        |
| 1301  | Truth Engine — SCL + Math Init   | COMPLETE — all 4 phases. core/scl + core/bus + engine/math + engine/fsm + adapters/webgl_tx + adapters/ingest. 34/34 tests pass. cargo build --release clean. SHA: f746623. | YES  | YES        |
| 1302  | Frame Budget Watchdog            | COMPLETE — engine/watchdog. FrameBudget, FrameWatchdog, ThrottleState. allow_event() gate, record_event(), evaluate_throttle(). Normal→Degraded→Throttled→EmergencyClamp. 12/12 tests pass. SHA: f8a6fa4. Integration hooks (ingest/math/fsm) deferred. | YES  | YES        |
| 1303  | Guest Funnel — Tactile Mutation  | COMPLETE — clusterfield.jsx. window.mousemove + postMessage bridge from iframe. CursorTracker raycasts to y=0 plane. Y-displacement Δy=A/(d²+ε). Calibration gate: amplitude=0.8, radius=4.0, decay=300ms. Founder-approved 2026-05-13. | YES  | YES        |
| 1304  | Guest Funnel — Forensic Panel    | COMPLETE — adapters/forensic_panel. ProjectionAdapter, VisualPressure, GuestState (G0/G1/G2), ProjectionFidelity (throttle-linked). ResonanceField, TrustGauge, MotionTrail, PhaseHorizon. Noise required — raw kernel values never cross boundary. 12/12 tests. SHA: 8ddf029. | YES  | YES        |
| 1305  | Session Acquisition (State Lock) | COMPLETE — adapters/session_lock. ObserverAnnealingEngine, ObserverTrustVector, ObserverState (S0–S4), StateLock. ContinuityTracker, volatility regression + decay. Trust earned through temporal persistence. 11/11 tests. SHA: 8ddf029. | YES  | YES        |
| 1306  | Typed Event Bus                  | COMPLETE — core/bus/typed. EventOrigin, TypedMutation<T>, TypedEnvelope<TMutation>, TypedEventBus<T>, BusRoutingTable. MathMutation/FsmMutation/IngestMutation owned by bus contract. Engine mutation files re-export. 8/8 tests pass. SHA: 3d21a28. | YES  | YES        |
| 1307  | Boundary Gate Attenuation        | COMPLETE — conemap.jsx. BOUNDARY_RING_GEO shared RingGeometry(0.95,1.0,32), BoundaryRing component, frustumCulled=false, opacity=0.15, depthWrite=false, attenuationFactor=pressure/50. | YES  | YES        |
| 1308  | Historical Flux Trajectory       | COMPLETE — conemap.jsx. GhostLayer ring buffer, GHOST_DEPTH=3, GHOST_DECAY=0.6/s, MAX_GHOSTS=24, shared GHOST_CONE_GEO, pre-allocated slot.mat, centralized useFrame decay + GC. | YES  | YES        |
| 1309  | Dynamic Frontier Waveforms       | COMPLETE — conemap.jsx. FrontierRing: FRONTIER_VERT+FRONTIER_FRAG ShaderMaterial, uTime+uVolatility uniforms, aAngle attribute, noise clamp [-0.35,0.35], useFrame uniform-only update. | YES  | YES        |
| 1310  | Driver Node-Map Overlay          | COMPLETE — conemap.jsx DriverNodeOverlay. drei Html at cone apex, SVG directed graph, max 3 connections (edge culling), lowercase mono labels, weight-encoded stroke, arrowhead markers. Triggered by selectedDomain match. | YES  | YES        |
| 1311  | Ingestion Horizon                | COMPLETE — app.jsx IngestionHorizon. SPARKLINE_LEN=100, #66FF00 phosphor sparklines, dropped packet counter (DROP {stats.errors}), lag indicator (lagMs/LIVE), DOM/SVG only. | YES  | YES        |
| 1312  | Momentum Leaderboard             | COMPLETE — conemap.jsx InspectionPanel. EMA_ALPHA=0.18, emaRef per domain, top-10 sort by abs(ema), leaderboard table with vel display. | YES  | YES        |
| 1313  | Geospatial Topology Toggle       | COMPLETE — conemap.jsx ConeScene useFrame. TRANSITION_DURATION=1.0s, speed=delta/1.0, clamped dir-step, frame-rate independent. Replaces fixed scalar 0.05. | YES  | YES        |
| 1314  | Surface P1 — ConeMap Bay         | COMPLETE — Surface pagination dots added. P1=ConeMap active. P2 placeholder slot ready for WO-1315. | YES  | YES        |
| 1315  | Surface P2 — Signal Map Swipe    | COMPLETE — SignalMap mounted as Surface P2. data=liveSignals, isActive=true. Dots mirrored for back-nav to P1. | YES  | YES        |
| 1316-C | Analysis P1 — Rule-Based Ingestion (LatticeBuilder) | COMPLETE — src/components/analysis/ingestionbuilder.jsx. KEY_OPS × OP_OPS rule rows, add/remove/update, [X] in DANGER. Default seed: Source Entity contains RUSSIA + Severity Score is between 6.0. | YES  | YES        |
| 1316-E | Retrieval Tensor — Continuous Control Space | COMPLETE — ingestionbuilder.jsx §3. constraintStrength + intentEntropy sliders (0–1, step 0.05). CORE(A∩B) / FRINGE(AΔB) readout. coreLabel/fringeColor reactive to slider values. | YES  | YES        |
| 1316-F | IngestionBuilder — Full 3-Section Layout | COMPLETE — ingestionbuilder.jsx supersedes searchprofile.jsx. Constraint Lattice → Semantic Attractor Field → Observation Geometry. EXECUTE RETRIEVAL PLAN fires createSession+setSwipeIndex(1). Wired into AnalysisContinuum pages[0]. Build clean 2026-05-22. | YES  | YES        |
| 1317  | Analysis P2 — OracleEngine       | COMPLETE — src/components/analysis/oracleengine.jsx. DOM layer: bipartite pairs (claim ←line→ telemetry), 3 tension states (ALIGNED/FRACTURE/UNVERIFIED), hover sync, tensionMultipliers readout. | YES  | YES        |
| 1318  | Analysis P3 — LensProjection     | COMPLETE v2 — 40-year topological model. R3F ProjectionCanvas (tube + variance band), playhead scrubber, fracture-coupled survival probability, liquidity zero-point event. SpatialFrame architecture added to useRenderStore. | YES  | YES        |
| 1319  | Analysis P4 — ActionMatrix       | COMPLETE — src/components/analysis/actionmatrix.jsx. 3-column (IMMEDIATE/SHORT-TERM/STRUCTURAL), impact bars, hover fade, footer leverage tag. Wired into AnalysisContinuum pages[3]. | YES  | YES        |
| 1320  | Feeds Bay                        | COMPLETE — src/components/feeds/feedsbay.jsx. Pressure matrix (6 categories), profile lens/query context, live APPEND/PATCH/EVICT subscription, per-item fidelity bar. | YES  | NO         |
| 1321  | Artifacts Bay                    | COMPLETE — src/components/artifacts/artifactsbay.jsx. Evidence archive: ARTICLE/INTERVIEW/VIDEO types, CORROBORATES/CONTRADICTS/CONTEXT signal classification, type filter strip, hover note reveal. | YES  | NO         |
| 1322  | History Bay                      | COMPLETE — src/components/history/historybay.jsx. Investigation trail: serif query display, lens pill, timestamp, RE-RUN on hover fires createSession+setSwipeIndex(1). | YES  | NO         |
| 1323  | Settings Panel                   | COMPLETE — src/components/settings/settingspanel.jsx. 4 sections: Account, Default Lens, Signal Settings, System. Toggle + select controls. settings nav wired in krylo2-feed.html + app.jsx. | YES  | NO         |
| 1327  | Precursor Field Engine           | SPEC COMPLETE — specs/WO-1327-precursor-field-engine.md. Kernel: Φ/Σ_fast/Σ_slow/ξ/R(t). Cognitive State Lattice: Awareness→Engagement→Trust. PFC system. 5 deployment gates. Backlog. | YES  | NO         |
| 1328  | Unified Temporal Replay / Simulation Harness | COMPLETE — engine/temporal. TemporalAuthority (mode/clock/rate/pause), TemporalMode (Live/Replay/Projection/Hybrid), resolve_time(), TemporalFrame (single render contract), TemporalDivergence (counterfactual delta), Scrubber (drag-left=Replay/drag-right=Projection/center=Live/fork=Hybrid). Singularity+isolation+determinism enforced. 24/24 tests. SHA: c491e11. | YES  | YES        |
| 1329  | E2E Negotiation Vector — Happy Path | COMPLETE — Full pipeline validated via WO-1330/1331/1332. src/engine/intentclassifier.js live. E2E: ingress → viewport mutation → Welford synthesis → FSM execution plan. BAU harnesses: qa_wo1330_ingress.mjs, qa_wo1331_synthesis.mjs, qa_wo1332_fsm.mjs (all load-bearing). | YES  | YES        |
| 1330  | Ingress Routing Patch            | COMPLETE — src/engine/normalizer.js. NEGOTIATION domain added to SUPPORTED_DOMAINS + DOMAIN_KEYWORDS + SIGNAL_KEYWORD_MAP. extractNegotiationEntities(). Fast-path in buildNormalizedPayload(). BAU harness: qa_wo1330_ingress.mjs (load-bearing — do not delete). QA matrix: domain=negotiation, confidence=0.97, entities={role,geo,target_salary,org_type}, valid=true. 4/4 PASS. | YES  | YES        |
| 1331  | Viewport Mutation & Synthesis    | COMPLETE — src/engine/viewportmutator.js + src/engine/verdictsynthesis.js. calculateViewportState(): LABO=1.0, TECH=0.2, active_component=VerdictDashboard for negotiation domain. synthesizeVerdict(): Welford cache (query-before-update), 5-node verdict structure (anchor/leverage/market/counter/risk). BAU harness: qa_wo1331_synthesis.mjs (load-bearing). 4/4 PASS. | YES  | YES        |
| 1332  | Execution Plan FSM               | COMPLETE — src/engine/executionfsm.js. generateExecutionPlan(): initial_ask=target×1.13 (146900), branches.stall trigger=response_time>72h, branches.lowball trigger=counter<140K pivot_vector=equity_vesting. BAU harness: qa_wo1332_fsm.mjs (load-bearing). 3/3 PASS. E2E Job Offer Negotiation vector LOCKED. | YES  | YES        |
| 1333  | Dynamic Annotation Layer         | COMPLETE — src/store/useannotationstore.js + src/components/spine/annotationlayer.jsx. scrubPos global observable (Zustand), annotations[] co-located, AnnotationPin hit-boxes with hover expansion, magnitude-driven tick height, scrubhead marker, virtualized [0,1] viewport. Wired in app.jsx handleScrubPos. 3 seed annotations. | YES  | YES        |
| 1336  | Event-Sourced Causal Inference OS | COMPLETE — src/engine/causalos/. L1 substrate, L2 vector engine, L3 middleware integrity (TAS/provenance/epistemic), L4 projection. CausalInferenceOS orchestrator. BAU: qa_wo1336_causalos.mjs. 43/43 PASS. | YES  | YES        |
| 1338  | Analysis Substrate               | COMPLETE — src/components/analysis/analysissubstrate.jsx. Canvas 2D L4 projection geometry. 100 drifting particles + coordinate lattice (rgba 255,255,255,0.04). Speed keyed to globalPressure (stats.received/40 proxy — to be upgraded to convergenceScore per WO-1336 L2). Color: lime=BUILDING_CONVERGENCE, blue=TURBULENT. Wired into app.jsx Analysis bay. NOTE: current pressure proxy is simplified — L2 vector formula pending. | YES  | NO         |
| 1339  | Resonance Path                   | COMPLETE — conemap.jsx InspectionPanel. Causal chain rendered below assigned signal. | YES  | YES        |
| 1340  | Entity Signal Injection          | COMPLETE — src/hooks/useEntitySignal.js. Live entity pressure/volatility override on assigned cone. Wired in conemap.jsx + targetpacket.jsx. | YES  | YES        |
| 1341  | Intelligence Brief               | COMPLETE — src/components/analysis/intelligencebrief.jsx. Premium HUD surface: mission control aesthetic, classification banners, BLUF, 5Ws, evidence, assessment, outlook, COAs. STANDARD/PREMIUM toggle. RETURN TO LIVE replay gate. | YES  | YES        |
| 1342  | Deferred Cognitive Systems       | SPEC ONLY — specs/WO-1342-deferred-cognitive-systems.md. Verification Window Registry + Outcome Verification Framework. Backlog pending WO-1343 outcomes. | YES  | NO         |
| 1343  | SpatialLens — Kinetic Optics     | COMPLETE — src/components/analysis/signalmaplayer.jsx. Field-sampling lens, live signal nodes, stats panel, geometry. P2 surface wired in AnalysisContinuum. | YES  | YES        |
| 1344  | Six-Bay Domain Isolation Network | COMPLETE (A–D) — src/store/usebaystore.js. FINANCIAL/MARKET/LEGAL/HEALTH/CAREER/TECHNOLOGY domains. assignToBay/clearBay/setBayView/toggleXray. BayHUD: EMPTY→LOADED state chips on cones. Bay picker in InspectionPanel. Spec: specs/WO-1344-six-bay-isolation.md. | YES  | YES        |
| 1345  | Bay Occupancy & Identity         | COMPLETE — conemap.jsx. Bay identity chip per cone, EMPTY/LOADED state display, domain label from useBayStore. Spec: specs/WO-1345-bay-occupancy-identity.md. | YES  | YES        |
| 1346  | Node → Bay Assignment            | COMPLETE — conemap.jsx InspectionPanel. searchPreview flow: SAVE TO BAY → bay picker 1–6 → assignToBay(). Inline + search via panel. 3-flash strobe on assignment (cone mesh + label). Spec: specs/WO-1346-node-bay-assignment.md. | YES  | YES        |
| 1347  | Per-Bay Controls                 | BACKLOG — spec: specs/WO-1347-per-bay-controls.md. Depends on WO-1346. | YES  | NO         |
| 1348  | Multi-Bay Comparative Analysis   | BACKLOG — spec: specs/WO-1348-multi-bay-comparison.md. Depends on WO-1347. | YES  | NO         |
| 1349  | Cross-Bay Resonance              | BACKLOG — spec: specs/WO-1349-cross-bay-resonance.md. Depends on WO-1348. | YES  | NO         |
| 1359  | Oracle Ingest Left Panel         | STRUCK — overlaps WO-1316-F (ingestionbuilder.jsx). Not net new. 2026-06-01.           | NO   | NO         |
| 1360  | Fidelity Scoring Engine (Fs)     | COMPLETE — src/engine/fidelityscoring.js. evaluateFidelity(inputs) → {fs, tier, components}. Weights: Mc=0.40/Tt=0.30/Dd=0.20/Vv=0.09/Ev=0.01. Tiers: VALIDATED≥0.85/ESTIMATED≥0.50/LOW_FIDELITY<0.50. All tier colors #66FF00 (amber banned). DOMAIN_FIELDS schema exported for WO-1362. BAU: qa_wo1360_fidelity.mjs. 22/22 PASS. | YES  | YES        |
| 1361  | Fs Systemic Integrity Validation | STRUCK — architecture validation only, no net new code. 2026-06-01.                   | NO   | NO         |
| 1363  | Linear Cascade UI                | COMPLETE — analysisidlefield.jsx Section 1. Progressive chip chain: Subject → LENS → DOMAIN → SIGNAL FILTER → CRITERIA → VALUE → Fs bar → Target Floor → Signal Strength. Replaces static Entity Mode + Domain pills + Signal Strength form. Build clean. |  YES  | YES        |
| 1365  | Acquisition Broker               | COMPLETE — src/engine/acquisitionbroker.js. processAcquisition(payload) → consensus envelope. Fs gate <0.50 = BLOCKED short-circuit. Consensus = (signalWeight×0.40)+(fidelityScore×0.60). 4 states: VALIDATED/ESTIMATED/FRACTURE/BLOCKED. Wired into analysisidlefield.jsx + useAnalysisStore. OLP block in TargetPacket. | YES  | YES        |
| 1364  | Cascade Acquisition Payload      | COMPLETE — analysisidlefield.jsx submitQuery(). Normalized contract: acquisition{intent/lens/domain/signals} + telemetry{signalStrength/fidelityScore/capitalFloor} + criteria{domain-injected k/v}. No UI state transmitted. Scales to any domain without backend contract change. | YES  | YES        |
| 1362  | Oracle Ingest + OLP Output       | COMPLETE — src/components/oracleview_v2.jsx. Left panel: Oracle Ingest v1.0 — domain selector (6), per-domain telemetry fields (DOMAIN_FIELDS schema), baseline snapshot (Mchecksum inputs), live Fs bar, mutable hard floor, EXECUTE OLP SEARCH / CLEAR VECTOR. Right panel: Validated Vector — OLP card with velocity vector (↑), entropy shield (⊘), confidence %, ACTIVATE POSITION. Fs gate: blocked <0.50. ESTIMATED dimmed. Build clean. | YES  | YES        |
| 1366  | Smoke Test Protocol              | COMPLETE — 4-phase QA matrix validated 2026-06-02. Phase 01: Fs 21% without criteria, 51% after value injection. Phase 02: SEARCH at Fs<50% → BLOCKED, Analysis view retained. Phase 03: SEARCH at Fs≥50% → ESTIMATED (consensus 55%). Phase 04: OracleViewV2 auto-loaded, no manual click. Pipeline locked. Standard verification loop for all future domain additions. | YES  | YES        |
| 1367  | Telemetry localStorage Persistence | COMPLETE — src/engine/telemetry.js. loadPersistedLog()/persistLog() on module init + every emitTelemetry. MAX_EVENTS=1000, splice oldest on overflow, quota-exceeded trim-half retry. clearTelemetryLog() exported. Survives page reload. | YES  | YES        |
| 1327  | Precursor Field Engine           | COMPLETE (A+B) — Phase A: krylo-kernel/engine/precursor Rust kernel (26/26 pass). Phase B: src/engine/wo-1327/ TypeScript adapter layer under WO-1381 contract. fieldTypes.ts/precursorFieldEngine.ts/fieldSelectors.ts/fieldReducer.ts/backendInterface.ts. runPrecursorFieldEngine()+processConeRequest() public API. | YES  | YES        |
| 1336  | Causal Inference OS              | COMPLETE — src/engine/causalos/. envelope.js (Universal Event Envelope, BigInt-safe, frozen), substrate.js (L1 always-active), vectorengine.js (L2 convergence+emergence, FSM), tas.js (L3 5-clock authority, substrate_time sole inference clock), provenance.js (L3 immutable DAG, cycle detection), epistemic.js (L3 C(t)=C₀·e^(-λΔt) decay), lockmanager.js (L3 5 lock conditions), projection.js (L4 Analyst/Operator/Executive tiers), index.js (CausalInferenceOS orchestrator). BAU: qa_wo1336_causalos.mjs. 43/43 PASS. | YES  | YES        |
| 1381  | Visor Runtime Contract Spec      | COMPLETE — specs/WO-1381-visor-runtime-contract.md + src/engine/causalos/enforcement.js. 3-boundary contract: Bay↔Backend, Backend↔WO-1327, Backend↔WO-1336. Runtime enforcement gate: validateCommand/validateKernelInput/validateInferenceOutput. 4-level violation taxonomy. Telemetry emission per violation. | YES  | YES        |
| 1382  | Integration Simulation (Crucible)| COMPLETE — qa_wo1382_crucible.mjs. Vector A (Level 2 Containment): ingress schema breach + cross-bay ref. Vector B (Level 3 Hard Block): kernel determinism breach + historical overflow. Vector C (Level 4 System Halt): inference feedback loop + kernel write attempt. Behavior matrix validated. Replay hashes locked. 43/43 PASS. | YES  | YES        |
| 1383  | Leverage Coordinate Field        | COMPLETE — src/components/analysis/leveragefield.jsx. SVG coordinate field. Y-axis: Naval leverage types (CODE/MEDIA/CAPITAL/LABOR). X-axis: D/E ratio tier (LOW/MOD/HIGH). Plotted crosshair, marker, industry norm line, metric strip (TYPE/TIER/D/E/PERM/IND NORM). Leverage key added to all 5 synthesizers in querysynthesis.js (AUTO/REAL_ESTATE/CAREER/RETIREMENT/GENERAL). Wired into TargetPacket Recommended Action panel. Premium-gated (Analysis bay). | YES  | YES        |
| LEV-02 | Adaptive Insight Arbitration Engine (AIAE) | COMPLETE — src/engine/aiae.js. Candidate Generation + Scoring + Pareto Arbitration. 6-dimensional feature vector: Impact/Confidence/Novelty/Actionability/TTV/EvidenceStrength. Domain weight profiles: REAL_ESTATE/AUTO/CAREER/RETIREMENT/STARTUP_FINANCE/GENERAL. TTV bucket multipliers (NOW=1.0/SHORT=0.65/MED=0.30/LONG=0.15). Capital floor confidence gate (0.40 with floor / 0.20 without). Pareto pruning: dominates() + paretoFrontier(). Domain collision resolver: STARTUP_FINANCE intercepts before RETIREMENT on startup signals. Wired: handleExecute → detectDomain → arbitrate(tensor) → session.tensor.arbitration → TargetPacket topK render. BAU: qa_wo_lev02_aiae.mjs. 17/17 PASS. Stress vector: $150k 401k liquidation → STARTUP_FINANCE domain, 401k penalty RISK #1 at 95.8, Series A ELIMINATED by TTV. SAB 5/5 CONCUR. | YES  | YES        |
| TCR-DEF-01 | Defensive Fragility Monitor | STRUCK — inputs (expansionPressure/resourceDrainage) undefined in current data model. No code written. 2026-06-07. | NO | NO |
| 1702  | Ingress Contract Completion Layer | COMPLETE — src/engine/ingress.js (single source of truth: SITUATIONS/LENS_DOMAIN_MAP/LENS_BROKER_DOMAIN_MAP/FLOOR_RANGES/CALIBRATION_SIGNALS/KEY_OPS/OP_OPS). detectDomain() removed from ingress path in analysisidlefield.jsx; replaced with LENS_BROKER_DOMAIN_MAP[activeLens]??'GENERAL'. Duplicate constants removed from both components. Tensor schemas aligned — both now emit domain field deterministically from lens. Build clean. | YES | YES |
| 1384  | Fragility Phase Classifier | COMPLETE — src/engine/convergenceclassifier.js. detectFragilityPhase(vector, fs, stateId). Bubble-physics lifecycle: PHASE_1_SETUP (stateId=4 + fs<0.50) / PHASE_2_MARANGONI (stateId≥2 + V>0.70) / PHASE_3_TENUOUS (stateId=3) / PHASE_4_SNAP (stateId≤1) / NOMINAL. Feed-forward only. Phase 1 shadow bug fixed (reorder). Null guard on vector.V. BAU: qa_wo1384_fragility.mjs. 12/12 PASS. | YES | YES |
| 1705  | Signal Floor Kill Switch | COMPLETE — src/engine/causalos/index.js. applySignalFloor(telemetry). Composite gate: confidence≥0.72 AND fs≥0.50 AND fragilityPhase≤2. Short-circuits before L1–L4 compute. KILL_SWITCH_TRIGGERED envelope recorded in provenanceDAG on rejection. SIGNAL_FLOOR constants exported. Exclusions: latency spikes, dead zones — gate covers known-bad vectors only. | YES | YES |
| 1706  | Option Capital           | COMPLETE — src/components/analysis/optioncapital.jsx. Stock-ticker runway card: [14.6 mo ↑ +0.8]. Lime if ≥6mo, red if <3mo, neutral 3-6mo. Arrow + delta vs session-start baseline. Expanded: proof line ($capital / $burn/mo) + editable inputs. localStorage persistence (krylo_option_capital). 1500ms debounced save. Wired into analysisidlefield.jsx sidebar between header and intake body. capital prop from selectedFloor. NOTE: effectiveCap uses only capOverride (user-typed exact amount); selectedFloor is a placeholder hint only — not used in runway computation. Phase A limitation: delta baseline refreshes after 1.5s of inactivity; no 24h gate yet. | YES | YES |
| 1707  | Tensor Ontology Boundary — Phase A | COMPLETE — src/engine/querysynthesis.js. Removed tensor.floor (ordinal UI tier) from three scalar contamination sites: synthAuto rawDown (line 130), synthRealEstate price (line 219), synthRetirement annual (line 388). CASE A proven: tensor.floor is a pure UI ordinal (500/5000/50000/150000), no production path injects a real scalar capital through this field. Replacements: numbers[0]\|350000 (real estate), numbers.find(20k–500k, ≠savings)\|60000 (retirement), moneyNums[1]\|null (auto). Open: synthGeneral line 471 (display-only, lowest severity, deferred). Phase B (floor→uiTierFloor rename) deferred to separate WO. | YES | YES |
| 1714  | Horizon Mix & Structural Friction Architecture | COMPLETE — src/engine/structuralfriction.js: computeStructuralFriction(domain, bayResult). HorizonMix (8 domain profiles), Feasibility derivation (tier-indexed), StructuralFriction Euclidean score + directional vector + adaptive domain thresholds. States: ALIGNED/DRIFTING/HIGH_FRICTION. src/engine/analysisprojection.js: boundary gate — sole V+F convergence point, only file permitted to import both convergenceclassifier + structuralfriction. eslint.config.js: 3 forbidden import edges (V↛F, F↛V). qa_wo1714_invariants.mjs: 11/11 PASS. optioncapital.jsx: Horizon Mix read-only strip. actionmatrix.jsx: FrictionCard injected pre-hero on HIGH_FRICTION with directional shortfall routing. SHA: e00cb1b. | YES | YES |
| 1716  | Anti-Coupling: Revert Auto-Bay-Assign + Domain Clamp | COMPLETE — src/components/analysis/analysisidlefield.jsx: WO-1712 auto-assign block removed; useBayStore + assignToBay fully removed. src/components/analysis/targetpacket.jsx: ASSIGN TO BAY dropdown + CLAMP button added to OLP block (user-explicit, gated on qualified candidate, disabled on FRACTURE/BLOCKED). Regression gate: routing_tests/audit/WO-1716_AntiCoupling.mjs (6/6 PASS). SHA: 2c0d3e7. | YES | YES |
| WO-BAY-LOGIC-002 | Bay Transformation Layer | COMPLETE — src/engine/baylogic.js. transformIntentToConstraints(intentMagnitude, domain). 8 domains × 4 tiers, FEASIBILITY_GATE=0.60, adaptive descent. Returns resolvedThreshold + closestResolved + constraints + score. Wired into analysisidlefield.jsx (intentMagnitude state, bayResult useMemo). optioncapital.jsx: resolved output display + Horizon Mix strip. FloorHistogram slot removed; HORIZON/CONTEXT slots gate on activeSituation only. SHA: 4cb6775. | YES | YES |
| WO-INTAKE-STAT-003 | Signal Intake Architecture | SPEC LOCKED — A-B-A-A intake model. Situation-only execution. History read-only. Cascade delete. Post-execution adaptive refinement (1 cycle max). Chip chain built (WO-1718). Bay Logic layer = WO-BAY-LOGIC-002. | YES | NO |
| WO-1718 | Chip Query Builder | COMPLETE — src/components/analysis/analysisidlefield.jsx. Token-in-box search (selected chips → inline tokens). 4 progressive slots: Situation chips / Floor histogram / Horizon chips / Context text. Staggered pill chips (border-radius 999px, lime selected). canExecute = situation only. History pre-fill removed. | YES | YES |
| RTP-001 | Domain Isolation — Phase A | COMPLETE — src/engine/ingress.js: PROTECTED_ENTITY_REGISTRY + detectProtectedDomain(). src/engine/querysynthesis.js: protected gate fires first in detectDomain() (medical/disability entities lock to HEALTH unconditionally), REAL_ESTATE regex tightened (bare `home` removed — requires purchase/equity companion context), synthHealth() added (Medicaid HCBS waiver, PT/OT referral, adaptive DME, Title V CYSHCN, IEP), HEALTH→synthHealth wired in SYNTH_MAP. Regression corpus: routing_tests/health/ROUTE-00082.yaml + qa_route00082_routing.mjs (5/5 PASS, CI gate). Root cause closed: "home & community access" no longer fires REAL_ESTATE for medical queries. Phase B (Grafana metrics, retrieval masking, training sanitizer) not instantiated — spec only. Baseline: baseline_routing_guard_cac_roas. | YES | YES |
| 1703  | Health Domain Ingress Normalization | COMPLETE — src/engine/normalizer.js: HEALTH added to SUPPORTED_DOMAINS + DOMAIN_KEYWORDS (nonprofit/501c3/foundation/donation/grant/fundraising/disability/down syndrome/medicaid/therapy/adaptive/charitable/endowment) + nonprofit_signal added to SIGNAL_KEYWORD_MAP. src/engine/ingress.js: nonprofit/501c3/foundation/donation/grant/fundraising/charitable/endowment added to PROTECTED_ENTITY_REGISTRY.HEALTH. src/engine/fidelityscoring.js: HEALTH added to DOMAIN_FIELDS (org_status/cause_category/fundraising_target/nonprofit_capacity). Stage 1→2 routing inconsistency closed. BAU: qa_roleplay_nonprofit.mjs. 6/6 PASS. Fs 95.3% VALIDATED. SHA: ad052fa. | YES | YES |
| 1719  | FRED Capital Feed (Shared Pool) | COMPLETE — src/hooks/usefredsignals.js. Fetches BAMLH0A0HYM2 (HY credit spread) + T10Y2Y (yield curve) + M2V (money velocity) from FRED API. Normalizes to 0–100. Dispatches via surfaceRouter.dispatchBatch(). 5-min poll. Key: VITE_FRED_API_KEY (specs/fred.env). Wired in app.jsx. BAU: qa_wo1719_1720_feeds.mjs. 17/17 PASS. | YES | YES |
| 1720  | EDGAR Form D Feed (Shared Pool) | COMPLETE — src/hooks/useedgarsignals.js. Fetches SEC Form D private placement filings (last 7 days) from EDGAR full-text search. Volume → 0–100 pressure score. Dispatches OWNERSHIP + attenuated CAPITAL signal via surfaceRouter.dispatchBatch(). 15-min poll. No auth required. Wired in app.jsx. BAU: qa_wo1719_1720_feeds.mjs. 17/17 PASS. | YES | YES |
| 1721  | Kalshi Live Endpoint (Shared Pool) | COMPLETE — as-diff/engine.js /api/kalshi/signals. RSA auth, CATEGORY_DOMAIN map, buildEventDomainMap() → fetchKalshiMarkets(). src/hooks/usekalshisignals.js polls 60s, dispatchBatch(). | YES | YES |
| 1722  | Cross-Domain Synthesis Layer (Munger Protocol) | COMPLETE — src/engine/verdictsynthesis.js. synthesizeCrossDomain(domainStates) → {triggered, convergingDomains, domainCount, provenance, synthesis, mungerScore, ts}. Gate: ≥3 domains at BUILDING CONVERGENCE with Fs≥0.70 each. SYNTHESIS_MAP covers 12 domain combinations + fallback. attentionstack.jsx: ◈ CROSS-DOMAIN SYNTHESIS strip — synthesis text, domain pills, mungerScore. Domain state proxy: signal≥50=BUILDING CONVERGENCE, Fs=confidence/100. Build clean. SHA: abf8dfe. | YES | YES |
| 1723  | Global Macro Ingestion Layer (Dalio Protocol) | BACKLOG — Phase A: G7 sovereign yield series via FRED (same key, WO-1719 pattern). Phase B: cross-country domain pressure overlay. Phase C: debt supercycle classifier via temporal replay (WO-1003). Shared pool dispatch. Origin: Dalio role-play, Fit=8. Depends on WO-1719 (COMPLETE), WO-1003 (COMPLETE), WO-1722. | YES | NO |
| 1724  | Ingress Keyword Contamination — Ticker + Proper Noun Bleed | BACKLOG — normalizer.js: ticker/proper noun exclusion pass before keyword scoring. querysynthesis.js: LENS takes priority over entity names in synthesis routing. normalizer.js: athletics keyword audit (ARK substring match). Pass criteria: Cathie Wood Stage 1 → investment, Stage 3 → INVESTOR. Depends on WO-1703, WO-1702. | YES | NO |
| 1725  | Single-Entity Signal Injection Layer (Musk Protocol) | COMPLETE — src/engine/entityattribution.js. attributeEntityToSignals(). 12-entity registry, affinity × domainPressure. footprint≥2 AND fs≥0.70 qualified gate. attentionstack.jsx: entity input + footprint strip. SHA: 821f978. | YES | YES |
| 1726  | Weak Signal Detection Layer (Webb Protocol) | COMPLETE — src/engine/weaksignaldetector.js. detectWeakSignals(signals) → {weakSignals, emergingSignals, earlyConvergenceAlert}. WEAK_THRESHOLD=20, velocity ring buffer depth=3, EMERGING_SLOPE=1.5 pts/reading, Phase C = TECHNOLOGY + KNOWLEDGE both emerging simultaneously. attentionstack.jsx: weak signals section (opacity 0.55), slope readout (±pts/reading), ↗ EMERGING badge in lime, ◈ EARLY CONVERGENCE DETECTED banner on Phase C. resetWeakSignalHistory() for session reset. BAU: qa_wo1726_weaksignal.mjs. 25/25 PASS. SHA: 66bb09d. | YES | YES |
| 1727  | Startup Market Readiness Layer (YC Protocol) | BACKLOG — Phase A: labor dislocation signal — LABOR cone pressure spikes as proxy for founder pool formation, temporal replay maps prior cycles. Phase B: infrastructure maturity gate — TECHNOLOGY + KNOWLEDGE convergence > 60 triggers "market ready" classification surfaced as startup viability signal. Phase C: early-stage capital flow overlay — EDGAR Form D volume by sector mapped against TECHNOLOGY convergence state. Pass criteria: labor dislocation visible on LABOR cone, market ready fires on convergence > 60, EDGAR sector flow overlaid, Fs≥0.70. Origin: YCombinator role-play, Fit=8. Depends on WO-1720 (COMPLETE), WO-1003 (COMPLETE), WO-1126A (COMPLETE). | YES | NO |
| 1728  | Full-Field Portfolio Convergence Layer (Bezos Protocol) | COMPLETE — src/engine/portfolioconvergence.js. computePortfolioConvergence(signals): 6-domain aggregate score, domainScores, fullField flag, Fs mean. detectPlatformInflection(signals): ≥3 domains >50 with Fs≥0.70 → PLATFORM BET WINDOW. DOMAIN_INTERDEPENDENCIES: 8 causal edges (Phase B static map). attentionstack.jsx: PORTFOLIO FIELD strip + PLATFORM BET WINDOW alert. Build clean. SHA: 21883f7. | YES | YES |
| 1729  | Long-Duration Convergence Scoring (Page-Brin Protocol) | BACKLOG — Phase A: extended temporal window on convergence classifier — current classifier is days-to-weeks; add 6-month and 12-month convergence trend lines per domain. Phase B: moonshot viability gate — TECHNOLOGY + KNOWLEDGE convergence sustained above threshold for 90+ days triggers "platform bet viable" classification. Phase C: weak signal lead time scoring — how early before BUILDING CONVERGENCE does a sub-threshold signal first appear (feeds WO-1726). Pass criteria: 6mo/12mo trend lines visible per cone, moonshot gate fires at 90-day sustained convergence, lead time score calculated, Fs≥0.70. Origin: Page-Brin role-play, Fit=8. Depends on WO-1726 (Webb Protocol), WO-1003 (Temporal Replay — COMPLETE), WO-1126A (COMPLETE). | YES | NO |
| 1730  | Flexible Space Demand Signal (Neumann Protocol) | BACKLOG — Phase A: LABOR + OWNERSHIP convergence threshold — when remote/hybrid workforce pressure (LABOR) and real estate repositioning (OWNERSHIP) converge simultaneously above score 50, surface "flexible space demand" classification. Phase B: ESG headwind gate — MEDIA narrative pressure on real estate investment triggers attenuation flag on CAPITAL + OWNERSHIP convergence (prevents false positives on WeWork-style overexpansion). Phase C: cycle anchor — pin convergence signal to interest rate regime from FRED yield curve (WO-1719); flexible space demand only valid when rate pressure is stable or falling. Pass criteria: LABOR + OWNERSHIP convergence signal fires, ESG attenuation gate active, rate regime anchor wired, Fs≥0.70. Origin: Neumann role-play, Fit=8. Depends on WO-1719 (FRED — COMPLETE), WO-1720 (EDGAR — COMPLETE), WO-1126A (COMPLETE). | YES | NO |
| 1731  | Fintech Infrastructure Expansion Layer (Collison Protocol) | BACKLOG — Phase A: geography readiness signal — TECHNOLOGY + CAPITAL + OWNERSHIP convergence above score 60 in a domain triggers "infrastructure ready" classification; proxy for market entry readiness (new country/category for Stripe). Phase B: threat vector monitor — OWNERSHIP cone deal flow (EDGAR) filtered for fintech category; when a payment startup reaches Series B+ funding, surface as competitive signal with 90-day lead time. Phase C: regulatory convergence gate — KNOWLEDGE cone pressure on financial standards signals impending regulatory clarity; KNOWLEDGE > 55 = "window opening" for new payment infrastructure deployment. Pass criteria: geography readiness fires on triple convergence, threat vector surfaces with 90-day lead, regulatory gate triggers on KNOWLEDGE threshold, Fs≥0.70. Origin: Collison role-play, Fit=8. Depends on WO-1720 (EDGAR — COMPLETE), WO-1719 (FRED — COMPLETE), WO-1126A (COMPLETE), WO-1336 (COMPLETE). | YES | NO |
| 1732  | Forward Compute Demand Signal (Huang Protocol) | BACKLOG — Phase A: domain-level AI adoption leading indicator — when KNOWLEDGE + TECHNOLOGY convergence fires in a domain not yet represented in CAPITAL flow, surface as "forward compute demand" signal (GPU demand precursor 12–18 months out). Phase B: hyperscaler commitment tracker — OWNERSHIP cone EDGAR deal flow filtered for data center infrastructure; large commitments = production demand confirmation. Phase C: domain adoption sequence map — track order in which domains cross TECHNOLOGY + KNOWLEDGE convergence threshold over time; reveals GPU demand pipeline by vertical. Pass criteria: forward compute signal fires before CAPITAL confirms, hyperscaler tracker live, adoption sequence map renders across all 6 domains, Fs≥0.70. Origin: Jensen Huang role-play, Fit=8. Depends on WO-1720 (EDGAR — COMPLETE), WO-1726 (Webb Protocol), WO-1126A (COMPLETE). | YES | NO |
| 1733  | Attention Saturation Signal (Godin Protocol) | BACKLOG — Phase A: noise floor indicator — when MEDIA cone reaches TURBULENT CONVERGENCE state, surface "attention saturation" classification for that domain; signals the Purple Cow opportunity window (conventional message is lost, remarkable cuts through). Phase B: attention gap detector — cross-reference ATTENTION STACK domain volume against CAPITAL flow; domains with low attention but rising CAPITAL = the ignored market Godin targets. Phase C: permission signal — when MEDIA + KNOWLEDGE converge in a domain that was previously INSUFFICIENT SIGNAL, surface "narrative permission forming" = new category is becoming safe to enter. Pass criteria: saturation fires on TURBULENT CONVERGENCE, attention gap renders in ATTENTION STACK, permission signal fires on INSUFFICIENT→BUILDING transition, Fs≥0.50. Origin: Seth Godin role-play, Fit=8. Depends on WO-1126A (COMPLETE), WO-1336 (COMPLETE). | YES | NO |
| 1734  | Non-Consensus Signal Layer (Khosla Protocol) | COMPLETE — src/engine/nonconsensusdetector.js. analyzeNonConsensus(emergingSignals, signals) → NC-tagged output. Phase A: cross-domain correlation (re-homed WO-1726 Phase C); WEAK boundary gate blocks untagged/NC/META inputs. Phase B: consensusDelta=K-C, gapOpenMs conviction tracker (prior-state capture), populationAgreement. Phase C: DIVERGING(delta>30)/CONVERGING(0<delta<10)/AMBIGUOUS; consensusArriving on gap-close. NC→WEAK upward flow forbidden. attentionstack.jsx: NON-CONSENSUS WINDOW strip, CONSENSUS FORMING alert, CROSS-DOMAIN EMERGENCE indicator. BAU: qa_wo1734_nonconsensus.mjs. 35/35 PASS. SHA: 608de58. | YES | YES |
| 1735  | Platform Conviction Arc | COMPLETE — src/engine/platformconviction.js. classifyConviction(formation, signals, ncResult). ConvictionArcProtocol subscribes to PLATFORM_FORMATION only — validateProtocol() enforced at load (WO-1743 contract). Levels: EARLY_CONVICTION / CONFIRMED_CONVICTION / HYPERGROWTH_WINDOW. Gil condition: CAPITAL+LABOR+MEDIA all >55 → HYPERGROWTH. NC context: DIVERGING gap enriches conviction signal. Personas: Vishria/Leone/Mignot on CONFIRMED; +Gil on HYPERGROWTH. attentionstack.jsx: conviction strip, purple on HYPERGROWTH. Build clean. SHA: 4f9f6a0. | YES | YES |

| 1736  | Regulatory Convergence Window (Gass-Benecke Protocol) | COMPLETE — src/engine/regulatoryconvergence.js. detectRegulatoryWindow(signals). Phase A: KNOWLEDGE + MEDIA both > 50 → WINDOW_FORMING (6–18 MO lead). Phase B: MEDIA > 65 + TECHNOLOGY > 55 → MULTI_JURISDICTION (3–12 MO lead). Phase C: KNOWLEDGE > CAPITAL + 20 → ENFORCEMENT_AHEAD (1–6 MO lead). Priority: C > B > A. Fs = mean(K_conf, M_conf). attentionstack.jsx: lime strip (Phase A/B) / blue strip (Phase C — #007FFF TURBULENT per color semantics). BAU: qa_wo1736_regulatory.mjs. 41/41 PASS. Enforcement posture gate is the institutional signal: regulators outpacing capital markets. | YES | YES |
| 1737  | HNW Client Convergence Overlay (Cornerstone Protocol) | COMPLETE — src/engine/hnwconvergence.js. detectHNWConvergence(signals). Phase A: T+C+O all >55 → PORTFOLIO_TIMING (rebalance window). Phase B: O>60 + C<45 → LIQUIDITY_EVENT (deal-flow surge / IPO window). Phase C: T−C >15 → SECTOR_ROTATION (tech-peak, capital rotating). Priority: B>C>A. Fs = mean(T_conf, C_conf, O_conf)/3; fsQualified gate ≥0.70. attentionstack.jsx: lime strip (Phase A/B) / blue strip (Phase C). BAU: qa_wo1737_hnw.mjs. 44/44 PASS. | YES | YES |
| 1738  | Critical Materials Demand Signal (Lacaze Protocol) | COMPLETE — src/engine/criticalmaterials.js. detectCriticalMaterials(signals). Phase A: T+C+O >55 → SUPPLY_CHAIN_REPOSITIONING (12–24 mo, non-China sourcing window). Phase B: M+O >60 → GEOPOLITICAL_SUPPLY_RISK (3–12 mo, policy action imminent). Phase C: O >65 → DEMAND_PIPELINE (12–24 mo, EDGAR mining/materials flow). Priority: B>C>A. Fs = mean(T/C/O conf); fsQualified ≥0.70. attentionstack.jsx: lime strip Phase A/C, blue strip Phase B. BAU: qa_wo1738_materials.mjs. 47/47 PASS. | YES | YES |
| 1739  | AI Infrastructure Demand Signal (Khoo Protocol) | COMPLETE — src/engine/aiinfrastructure.js. detectAIInfrastructureDemand(signals). Reference implementation of WO-1745 evidence contract. Output: {protocol:'KHOO', evidence[], signals[], provenance[], triggered, fs, fsQualified, ts}. NO conclusions, NO leadTime, NO narratives. Evidence: COMPUTE_DEMAND_PRESSURE (T>65) / FINANCING_REGIME (C>50) / INFRASTRUCTURE_COMMITMENT_FLOW (O>60). Provenance: WO-1719→CAPITAL, WO-1720→OWNERSHIP, KALSHI→TECHNOLOGY. triggered = any evidence active. attentionstack.jsx: evidence-only display (domain scores + active flags, provenance source tags). BAU: qa_wo1739_khoo.mjs. 58/58 PASS. | YES | YES |

**META-SIGNAL DETECTION LAYER** — Reusable state recognizers. Persona protocols consume these; detection logic is never duplicated per-persona. Classification: DETECTION. Sits above persona protocols, below Synthesis (WO-1722). Architecture: Observation → Detection → Meta-Signals → Persona Protocols → Synthesis.

| 1740  | Disruption Alert Layer | BACKLOG — CLASS: META-SIGNAL / DETECTION. Identifies moments when established positions are becoming structurally vulnerable. Trigger: Convergence State = TURBULENT AND primary domain = TECHNOLOGY (v2 adds: friction rising AND volatility rising). Output: DISRUPTION_ALERT. Surface copy examples: "Technology turbulence accelerating. Incumbent advantage erosion likely." / "Structural instability detected in established category." Consumer protocols: Scott Anthony (dual transformation entry), Rita McGrath (transient advantage collapse), Shantanu Narayen (creative AI disruption), Garrett Camp (AV threat to Uber), Sean Parker (platform distribution shift). Fire once — all five personas consume the same event through their own lenses. No per-persona duplication. Depends on WO-1126A (COMPLETE), WO-1336 (COMPLETE). | YES | NO |
| 1741  | Platform Formation Signal | COMPLETE — src/engine/platformformation.js. detectPlatformFormation(signals) → {phase, triggered, technologyScore, capitalScore, velocityQualified, daysAbove, metaSignal, ts}. Phase A: TECHNOLOGY + CAPITAL both > 55 → FORMATION_DETECTED. Phase B: both sustained ≥14 days → FORMATION_CONFIRMED. Velocity tracker: firstAboveAt map per domain, reset on drop below threshold. Provenance ref to META_SIGNALS.PLATFORM_FORMATION. attentionstack.jsx: PLATFORM FORMATION strip — DETECTED/CONFIRMED state, TECH/CAP scores, days sustained, velocity gate countdown. Build clean. SHA: 243328b. | YES | YES |
| 1742  | Narrative Permission Signal | BACKLOG — CLASS: META-SIGNAL / DETECTION. Detects when cultural, regulatory, or informational momentum has accumulated sufficiently to support action. Distinct from WO-1733 (Godin/Attention Saturation — negative framing on TURBULENT); this WO is positive framing on BUILDING. Trigger: Convergence State = BUILDING AND MEDIA AND KNOWLEDGE simultaneously. Output: NARRATIVE_PERMISSION. Surface copy examples: "Narrative support increasing. Action resistance declining." / "Audience and knowledge systems entering alignment." Consumer protocols: Reed Hastings (content activation window), Kevin Systrom (AI curation category forming), Marian Lee (campaign timing), Dario Amodei (AI regulation window opening), Rand Fishkin (audience attention migration). Depends on WO-1126A (COMPLETE), WO-1336 (COMPLETE), WO-1733 (Godin Protocol — saturation counterpart). | YES | NO |
| 1743  | Meta-Signal Registry & Detection Contract | COMPLETE — SHA: 5ec21b3. BAU: qa_wo1743_metasignals.mjs. 28/28 PASS. PREREQUISITE: must land before any persona protocol (WO-1727–1742) receives a Go order. CLASS: INFRASTRUCTURE. Enforces the pub/sub contract: persona protocols may only subscribe to meta-signals; they may never implement trigger logic. Deliverables: (1) src/engine/metasignals.js — single source of truth exporting META_SIGNALS canonical registry ({PLATFORM_FORMATION, DISRUPTION_ALERT, NARRATIVE_PERMISSION} each with trigger definition + version) and validateProtocol(proto) — throws on any proto containing a .trigger key; (2) one Jest CI test that parses every *.protocol.js file and asserts no .trigger key present and all subscriptions values belong to META_SIGNALS enum. Scope is intentionally minimal: module + one CI test, no code generator, no build toolchain addition. Scale up when registry exceeds ~10 signals. RULE: Persona protocol loader calls validateProtocol() at startup — PROTOCOL_CONTRACT_VIOLATION fails registration. ACTUATION taxonomy slot: RESERVED, no code, no stub — document only until Phase B has a concrete actuator. Roadmap ranking (locked, three separate dimensions): BUILD ORDER = 1726→1734→1722; VALUE ORDER = 1722→1726→1734; DEPENDENCY ORDER = 1726→1734→1722; PREREQUISITE ORDER = 1743 first, then persona protocols. | YES | NO |
| 1744  | TEP System Hardening & Contract Enforcement | COMPLETE — src/engine/tep.js (core, domain-free) + src/engine/tepbindings.js (adapter layer, Option A) + src/schema/tepContext.ts (Context Schema v1) + KNOWN_LIMITATIONS.md. 5 patches: applyPatch() immutable ctx, read/write contract enforcement, TEPErrorType+TEPError typed system, trace[] log + getTrace(), enforceContract() gate. 3 nodes: WEAK_SIGNAL_DETECTOR/NON_CONSENSUS_ANALYZER/META_SIGNAL_REGISTRY. assertEdgeLegality() forward-compat stub. buildDefaultPipeline() exported. Build clean. | Tiered Execution Pipeline (TEP) v1 hardening. No structural changes. Additive only. 5 patches: (1) Patch-based state transitions — applyPatch(ctx, patch) centralized in TEP core; all adapters return { patch: {...} }, no direct ctx mutation allowed. (2) Read/write contracts per node — contract: { read: string[], write: string[] } declared per node; enforceReadContract() fires before each node execution; missing ctx fields fail fast. (3) Typed error system — TEPErrorType enum (STRUCTURE_VIOLATION/CONTRACT_VIOLATION/EXECUTION_FAILURE/COMPUTE_FAILURE); TEPError class replaces all generic throws; every error carries nodeId + type. (4) Execution trace logging — trace[] array appended per node (node id, duration, input, output); getTrace() export. (5) Contract enforcement gate — enforceContract() runs before every step. Architecture decision LOCKED: Option A — external tepbindings.js adapter layer; TEP core stays domain-free. tepContext.ts = Context Schema v1 (raw/weak/nonConsensus/meta slots). KNOWN_LIMITATIONS.md required (intra-tier order undefined, single accumulator, assertEdgeLegality is forward-compat only). Files: src/engine/tep.js (core), src/engine/tepbindings.js (adapter layer), src/schema/tepContext.ts. Depends on WO-1726 (COMPLETE), WO-1734 (COMPLETE), WO-1743 (COMPLETE). | YES | NO |
| 1745  | Protocol Registry & Evidence Contract | COMPLETE — src/engine/protocolregistry.js. evidenceItem()/signalItem()/provenanceItem() schemas. PROTOCOLS registry (GASS_BENECKE/CORNERSTONE/LACAZE/KHOO). validateOutputContract() runtime enforcement — throws PROTOCOL_CONTRACT_VIOLATION on leadTime/conclusion/narrative/recommendation/action/prediction keys. assertVersion() version enforcement. Retroactive cleanup: WO-1737 HNW_PHASE renamed PORTFOLIO_TIMING→TRIPLE_CONVERGENCE, LIQUIDITY_EVENT→OWNERSHIP_CAPITAL_DIVERGENCE, SECTOR_ROTATION→TECH_CAPITAL_SPREAD. WO-1738 MATERIALS_PHASE renamed SUPPLY_CHAIN_REPOSITIONING→T_C_O_CONVERGENCE, GEOPOLITICAL_SUPPLY_RISK→MEDIA_OWNERSHIP_CONVERGENCE, DEMAND_PIPELINE→OWNERSHIP_ELEVATION; leadTime field + MATERIALS_LEAD_TIME export removed. attentionstack.jsx updated for all renamed phases + leadTime display stripped. WO-1736 already compliant — no changes. Build clean. | YES | YES | Governance layer for all persona protocols (WO-1736–1739+). RULE LOCKED: Protocols produce evidence and signals only. Protocols do not produce conclusions. Conclusions belong to WEAK→NC→SYNTH. Scope: (1) src/engine/protocolregistry.js — ProtocolDefinition schema {id, name, owner, version, domain, signalTypes, evidenceTypes}; canonical registry of all active protocols; validateProtocol() throws on any protocol outputting conclusions/narratives/leadTime. (2) EvidenceItem schema — {type, domain, score, threshold, state, active}. (3) SignalItem schema — {domain, score, state, active}. (4) ProvenanceItem schema — {source, domain, ts}. (5) Retroactive cleanup — WO-1736/1737/1738: remove leadTime field, rename conclusion-labeled phases to observable state labels, strip narrative surface copy to SYNTH boundary. Version enforcement + deprecation handling. WO-1739 (Khoo) is the reference implementation of the correct contract. Depends on WO-1739 (reference impl — COMPLETE). | YES | NO |
| 1750  | EEG v2 — Dependency-Driven DAG Runtime | BACKLOG — Parked until WO-1722 output semantics stabilize. Upgrades TEP v1 (WO-1744) from stratified sequential reducer to true dependency-driven DAG engine. Scope: nodes optionally declare deps: NodeID[]; build adjacency list → topological sort execution order; per-node state isolation (keyed payload per node, merged by scheduler); tier tags retained as coarse linting layer only. Replaces tier-loop scheduler in tep.js with topo-sort scheduler. All WO adapters in tepbindings.js remain unchanged. Depends on WO-1744 (TEP v1 — PENDING). | YES | NO |
| 1751  | Consulting Intelligence Export Layer (Akeju Protocol) | COMPLETE (A+B) — Phase A: src/engine/consultingexport.js. buildExportPayload()/triggerDownload()/canExport(). Fs≥0.70 gate. state_type (provisional/analytical/decision_support) authority inflation guard. MODEL_VERSION WO chain string. JSON: meta/subject/intelligence/coas/threats/opportunities/provenance. Phase B: src/engine/consultingimport.js. validateImport()/reconstructSession()/reconstructAcquisition()/parseImportFile(). Bidirectional traceability: imported JSON reconstructs runtime session + pendingAcquisition exactly. Version mismatch + stale-days warnings. intelligencebrief.jsx: EXPORT BRIEF (lime, Fs-gated) + IMPORT BRIEF (blue, always active) buttons. Imported artifact banner (blue, state_type, frozen timestamp, staleness warning). Error banners on schema/Fs/parse failures. Build clean. | YES | NO |
| 1752  | Provenance Rehydration & State Reconstruction | COMPLETE — src/engine/csss.js (CSSS: 9 canonicalization rules, computeStateHash, canonicalEqual). src/engine/consultingexport.js: 6-state RUNTIME_STATE (LIVE/EXPORTED/REHYDRATED/REPLAYING/REPLAY_COMPATIBLE/REPLAY_VERIFIED), CSSS-based computeArtifactHash, runtimeFingerprint/signalSnapshot/evidenceGraph/domainState builders. src/engine/consultingimport.js: 6-stage pipeline (Stage 2 hash attestation before replay, Stage 3 REPLAY_COMPATIBLE branch, Stage 5 REPLAY_VERIFIED on full parity). intelligencebrief.jsx: useRef fix, frozen clock in REPLAYING mode, runtime state in telemetry bar, ✓ INTEGRITY VERIFIED badge. Round-trip: Export → Import → Export → identical artifact hash. Adversarial tamper aborts at Stage 2. Engine drift → REPLAY_COMPATIBLE without rejection. BAU: qa_wo1752_rehydration.mjs. 53/53 PASS (Tests A, A.5, B, C1, C2). Build clean. SHA: 40c3929. | YES | YES |
| 1754  | Lens-Specific Entry Vocabulary Layer | BACKLOG — specs/WO-1754-lens-vocabulary-layer.md. Ingress surface (chip chain labels, situation copy, section headers) adapts vocabulary per active lens. Engine, domain routing, convergence classifier untouched. 9 lens profiles: INVESTOR/REALTOR/LEGAL/HEALTH/SALES/ATHLETE/STUDENT/GENERAL + fallback. Origin: persona feedback synthesis 2026-06-15 — 10 professional archetypes described Krylo in their own language; none used platform-native terms. Depends on WO-1702/1718/1364 (all COMPLETE). | YES | NO |
| 1755  | Leverage Tier Classifier Correction | COMPLETE — src/engine/querysynthesis.js. classifyLeverageTier(deRatio) added (LOW<0.9 / MOD 0.9–1.1 / HIGH>1.1, mirrors leveragefield.jsx LOW/MOD/HIGH axis). Replaces 7 hardcoded tierLabel values (AUTO/REAL_ESTATE/CAREER/RETIREMENT/senior-benefits/low-context-fallback/HEALTH leverage entries) with computed classification. Fixes line-737 contradiction (deRatio:0.0 + tierLabel:'HIGH' → now correctly LOW) and typeY mismatch on the same entry (CODE was typeY:0, out of leveragefield.jsx TYPES range; corrected to typeY:1 matching TYPES.CODE=1). industryNorm values left unsourced — no real benchmark data available, known limitation, out of scope. Origin: Allianz Trade leverage-ratios article reviewed for engine insights — corporate D/E thresholds didn't transfer (different metric domain: personal-finance decision leverage vs corporate balance-sheet leverage) but the review surfaced this real classification bug. Verified via grep + node --check. | NO | YES |
| 1756  | Numeric Unit Collision in Extraction (BUG-001C) | COMPLETE — src/engine/querysynthesis.js. extractNumbers() had no concept of unit context: a 5th-repro 20-query batch found "18mo" matching the existing k/m currency-suffix check (`m` before `o` broke the match) → $18,000,000 from a duration; "P4" (deliverable-format label) had its digit grabbed positionally → $4. Fixed via 3 strip passes before the currency regex (same technique as existing age-guard): duration/rate suffixes (mo/month(s), wk(s)/week(s), yr(s)/year(s), day(s), bp(s)), bare %, and digits fused to a letter label. Verified against every repro in bugs/BUG-001-unit-contamination.md plus legitimate cases ($45k, $24,000/$176,000, $2M, bare 15000) — all correct. node --check clean. SCOPE NARROWED 2026-06-16: original ticket also covered domain-routing (20/20→GENERAL) and hardcoded-confidence findings from the same batch — those are NOT fixed by this patch and are split out to WO-1761/WO-1762. Typed-extraction (option 2, numbers[0] is still positional) deferred — not release-blocking. Related to WO-1724 (same bug class, different vector). Origin: live test runs 2026-06-16. | YES | YES |
| 1757  | Domain/Anchor Label Reconciliation | BACKLOG — bugs/BUG-002-domain-label-mismatch.md. SECOND INSTANCE CONFIRMED 2026-06-16: not RETIREMENT-specific — ingress.js LENS_BROKER_DOMAIN_MAP routes RETIREMENT, INVESTOR, and TRANSITION all to the same 'INVESTMENTS' broker domain, any of which can collide with whatever querysynthesis.js's keyword router independently picks. First instance: Anchor RETIREMENT/Domain INVESTMENTS header, REAL_ESTATE content. Second: Anchor INVESTOR/Domain INVESTMENTS header, brief's own text admits "Domain routing: GENERAL". Two independent domain systems, no reconciliation. Needs an architecture decision (single resolved domain vs. dual-labeled UI) before building — flag for Founder input. Origin: same test runs as WO-1756. | YES | NO |
| 1759  | Happy Path SCORE/DELTA Static Pattern | BACKLOG — bugs/BUG-004-static-happy-path-score.md. 4/4 test queries across 2 domains (REAL_ESTATE, GENERAL) showed identical `SCORE 60/100` and `DELTA ↑ 0 pts above next` on the Action Matrix Happy Path strip, while a separate badge number for the same lead action varied (92, 85, 85, 85) — the two numbers disagree and one never moves. Confirmed: SCORE/DELTA read from session.tensor.arbitration.topK (LEV-02 AIAE) at actionmatrix.jsx:254-255. Not confirmed: why topK[0]/topK[1] scores don't vary across unrelated queries — needs aiae.js candidate-generation trace before a fix can be scoped. STATUS: investigation needed, not Go-ready. Origin: same test runs as WO-1756/1757. | YES | NO |
| 1760  | Display Entity Truncation — Word Boundary | COMPLETE — src/utils/formatters.js. getDisplayEntity() did a hard substring(0,limit) cut with no word-boundary awareness, splitting mid-word ("...MORTGAG...", "...ADAPTIVE CO-L..."). Fixed: finds last space within the limit, cuts there instead. Single shared function — feeds Subject/MISSION/Primary-Signal/Action-Matrix-header display in targetpacket.jsx, intelligencebrief.jsx, actionmatrix.jsx. Verified via grep (3 callers, all consistent) + build clean. Origin: same test runs as WO-1756/1757/1759. | NO | YES |
| 1758  | Ungated Debug Capture for Session Output | BACKLOG — bugs/BUG-003-no-debug-capture.md. useAnalysisStore has no persistence (in-memory only); telemetry.js persists only lightweight metadata (query/timestamp), not generated content; Consulting Export (WO-1751/1752) is Fs≥0.70-gated, so exactly the low-quality outputs worth capturing for QA (this test ran Fs 0%) can't be exported. Proposed: lightweight ungated snapshot log riding telemetry.js's existing localStorage persistence pattern, separate cap, no Fs gate. Origin: discovered while trying to persist the WO-1756/1757 test run for later analysis. | YES | NO |
| EVIDENCE-001 | Signal Outcome Registry | COMPLETE — src/engine/evidenceregistry.js. emitPrediction() → resolvePrediction() → getRunningAccuracy(). OUTCOME states: PENDING/VALIDATED/INVALIDATED/EXPIRED. 5-dim accuracy: overallAccuracy + avgLeadTimeDays + byDomain + bySource + totalPredictions. localStorage persistence (500-entry cap, trim-half retry). checkExpiry() auto-expires past-horizon predictions. exportRegistry() for audited export. Valid sources: WO-1722/1726/1734/1735/1736/1741/MANUAL. BAU: qa_wo_evidence001_registry.mjs. 18/18 PASS. The audited record that proves "Know first. Act before consensus." — prerequisite for enterprise trust and institutional pricing. | YES | YES |
| 1761  | Domain Coverage Gap — Gig-Income / Alt-Asset (BUG-001A) | (a) BACKLOG — true coverage gaps (17/25 queries): taxonomy decision required, Founder input needed. (b) COMPLETE 2026-06-16 — \bcar\b + \bford\b in AUTO, \bira\b in RETIREMENT, \brent\b added to REAL_ESTATE, \bmarket\b in home context. 12/12 verification PASS. 300-query adversarial corpus validated. (c) BACKLOG — content-model mismatch on correct routing (reverse-mortgage "$-479,932" output): needs design pass. Spec: specs/WO-1761-domain-coverage-gap.md. | YES | (b) YES |
| 1762  | synthGeneral() Hardcoded Metrics Presented as Measured (BUG-001B) | BACKLOG — bugs/BUG-006-general-fallback-hardcoded-metrics.md. SPLIT FROM WO-1756. Confidence:0.71 and D/E:0.5×LOW are hardcoded literals in synthGeneral(), rendered with no visual distinction from a measured value — provenance problem, not a math problem. Proposed shape: tri-state (measured/estimated/unavailable) instead of a bare number for the GENERAL fallback path. Needs a call-site audit of every consumer of leverage.tierLabel/confidence before starting (same caution as WO-1707/1755). Not started. | YES | NO |
| 1764  | Proper Noun Bleed (querysynthesis.js) | BACKLOG — specs/WO-1764-proper-noun-bleed.md. Origin: batch IDs 161–180 (2026-06-16) — "Google" fires as domain trigger in all 20 queries. Company/brand names should be neutral to domain routing. Fix: PROPER_NOUN_EXCLUSIONS set in detectDomain() before keyword scoring. Same bug class as WO-1724 (normalizer.js) but in querysynthesis.js router. Depends on WO-1761(b). | YES | NO |
| 1765  | Live Cone Wiring (WO-1765) | COMPLETE — src/app.jsx. useFredSignals/useEdgarSignals/useKalshiSignals return values now captured and spread into mergedRecords. liveSignals mapper updated: score reads r.signal/100 for 0–100 normalized feeds (FRED/EDGAR/Kalshi) before falling back to r.fs/r.signal_score. domain mapper updated: r.cone_domain ?? r.domain ?? null. FRED/EDGAR/Kalshi signals now reach leaderboardState → cone pressure pipeline. 4 surgical edits, build clean. SHA: pending. | NO | YES |
| 1763  | VETERAN Domain | BACKLOG — specs/WO-1763-veteran-domain.md. Origin: batch IDs 101–120 (2026-06-16) — "veteran" fires in every query but has no matching synthesizer; falls to HEALTH or GENERAL, both wrong. Founder confirmed: needs own domain. Synthesizer shape: VA disability rating/compensation, GI Bill (Post-9/11 vs Montgomery), VA home loan, VHA enrollment (Priority Groups), TAP/employment transition, surviving spouse (DIC/SBP), veteran-owned business (SBA VBOC). Protected entity gate: add VETERAN to PROTECTED_ENTITY_REGISTRY in ingress.js. Depends on WO-1761(b) word-boundary fix (ship first to prevent `veteran` contamination). | YES | NO |

PAUSED COLORS — do not use until Founder confirms:
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