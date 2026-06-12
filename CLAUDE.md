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

MASTER WO REGISTRY — SINGLE SOURCE OF TRUTH (updated 2026-05-25)
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
| 1009  | Gold-Standard UI                 | BLOCKED — color approval required. #D4AF37 banned                      | NO   | NO         |
| 1010  | Lattice Tasking                  | STRUCK — no code on disk. Phantom entry. Closed 2026-05-26.            | NO   | NO         |
| 1011  | Claims Traceability              | STRUCK — no code on disk. Phantom entry. Closed 2026-05-26.            | NO   | NO         |
| 1012  | Viewport Hydration               | STRUCK — no code on disk. Phantom entry. Closed 2026-05-26.            | NO   | NO         |
| 1013  | Trajectory Vectoring             | STRUCK — no code on disk. Phantom entry. Closed 2026-05-26.            | NO   | NO         |
| 1014  | Mechanical Shutter               | STRUCK — no code on disk. Phantom entry. Closed 2026-05-26.            | NO   | NO         |
| 1016  | State Filter                     | BACKLOG — unvetted. node.origin unverified                             | NO   | NO         |
| 1017  | Ignorance Shadow                 | BACKLOG — unvetted. Hard dep: WO-1015 (undefined)                     | NO   | NO         |
| 1018  | Chromodynamic Mapping            | BACKLOG — unvetted. Hard dep: WO-1015 (undefined)                     | NO   | NO         |
| 1019  | Kelvin Histograms                | BACKLOG — unvetted. Hard dep: WO-1015 (undefined)                     | NO   | NO         |
| 1020  | Terminus Hold                    | BACKLOG — unvetted. Location TBD                                       | NO   | NO         |
| 1021  | Decorative Effects Purge         | BACKLOG — unvetted. Shatter is load-bearing — regression audit req'd  | NO   | NO         |
| 1022  | Anisotropic Tensor               | COMPLETE — src/math/tensors.js. Float32Array(9), D/V/A axes, off-diagonal ≤0.4, identity init. createTensor/updateTensor/applyTensor/validateTensor. BAU harness: qa_wo1022_tensor.mjs. 4/4 PASS. 3 open items for Founder (see spec). | YES  | YES        |
| 1023  | Hysteresis Buffer                | COMPLETE — src/engine/memory.js. Ring buffer depth=3 (PERSISTENCE_REQUIRED), Float32Array slots, writeFrame/readFrame/flushBuffer/isDesynced. Desync threshold=5 frames. BAU harness: qa_wo1023_hysteresis.mjs. 6/6 PASS. 3 open items for Founder (see spec). | YES  | YES        |
| 1024  | Pre-Tremor Refraction            | STRUCK — no code on disk. Phantom entry. Closed 2026-05-26.            | NO   | NO         |
| 1025  | L2 Spatial Paywall               | COMPLETE — signalmesh.jsx + src/shaders/signalField.vert/.frag. CPU/GPU delegation (N≤10 CPU, N>10 GPU uniforms). Build clean. 2026-05-10. | YES  | YES        |
| 1026  | Character-Level Traceability     | PHASE A COMPLETE — oraclesignal.js traceability[] pass-through. auditworkspace.jsx TraceabilityChain section (span source_doc_id + char offsets + confidence). oracleview.jsx span count indicator. Phase B (NEL tagging on live ingest) blocked on pipeline. | YES  | NO         |
| 1027  | Feedback Rituals Infrastructure  | PENDING — 90-5-5 incident rule. Extends WO-808/806                    | YES  | NO         |
| 1028  | Golden Path Guardrails           | PENDING — conviction routing, agentic sandbox                         | YES  | NO         |
| 1029  | Signal Foresight Layer           | PHASE B IN PROGRESS — calculateTemporalCoherence() in foresight_pipeline.js. Cs=1.0-0.4V, clamped [0.60,1.00]. ForesightPanel live in tenkvault.jsx. Live precursor ingestion still blocked. | YES  | NO         |
| 1030  | No-Code Signal Rules Engine      | COMPLETE — signalrulesengine.jsx. Tier/weight/step editor, live rule list, STRIKE action. | YES  | NO         |
| 1031  | Revenue Signal Bridge            | PHASE A COMPLETE — revenuesignal.jsx. Rams 3.0x ADV (#66FF00), Unicorn U≥25 (#8A2BE2), mock LTV/CAC/sources wired via LeverageEngine. CAC + ROAS rows added to Intelligence Brief section 00 (intelligencebrief.jsx) — signal-derived, ESTIMATED label, directional pressure display. Phase B blocked (live CRM/ad-platform connector). | YES  | NO         |
| 1032  | Foresight Engine                 | PHASE A COMPLETE — foresight_pipeline.js. Phase B blocked (live APIs) | NO   | NO         |
| 1033  | ADVANTAGE Layer                  | COMPLETE — adv-lit wired, 7-ETR registry, PLI×7 lenses, sidebar panel | —    | —          |
| 1034  | PLI Engine                       | PHASE A COMPLETE — pliengine.js. Phase B blocked (live APIs)          | NO   | NO         |
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
| 1102  | ETR Stream Handshake             | PHASE A COMPLETE — usesignalstream.js upgraded: DEFAULT_SIGNAL, exponential backoff reconnect (max 5). Backend WS handler in as-diff/engine.js pending live endpoints. | NO   | NO         |
| 1106-A | Zustand Install + useAnalysisStore | COMPLETE — src/store/useanalysisstore.js. Sessions, activeSessionId, createSession(), appendSignal(). | YES  | YES        |
| 1106-B | useUIStore                       | COMPLETE — src/store/useuistore.js. swipeIndex (0=Search,1=Oracle,2=Lens,3=Action), expandedNodes, activeHoverContext. | YES  | YES        |
| 1106-C | useRenderStore                   | COMPLETE — src/store/userenderstore.js. Spatial Commit architecture: stagedNodes → commitSpatialFrame() → activeSpatialFrame. DOM/WebGL decoupled. SpatialFrame: frameId, timestamp, nodes, cameraTarget, globalTensionSpike. | YES  | YES        |
| 1106-D | AnalysisContinuum Shell          | COMPLETE — src/components/analysis/analysiscontinuum.jsx. Continuous mount P1–P4. GPU translateX track. PaginationController. Sync barrier rAF+720ms. | YES  | YES        |
| 1120  | Lattice-to-Timeline Scene        | COMPLETE — uslattice_transition.js wired into spinemap.jsx Scene. useLatticeTransition(meshRef, isTimelineMode, 0.8, priority=1). | NO   | YES        |
| 1121  | Normalizer                       | COMPLETE — src/engine/normalizer.js. buildNormalizedPayload(), normalizeForRenderer(). Domain detection, signal extraction, schema validation, confidence scoring. | YES  | NO         |
| 1122  | Conversational Host Layer (CHL)  | COMPLETE — src/engine/chl.js. processHostInput(), signRendererState(). All 5 guardrails enforced. HMAC via KRYLO_INTERNAL_SECRET. Spec LOCKED r2. | YES  | NO         |
| 1125  | Signal Positioning Engine        | PHASE A COMPLETE — src/engine/positioningengine.js. computePositionVector(): D=log-normalized dependency density, V=volatility-normalized instability, A=log-normalized reach, T=heuristic from V+acceleration+persistence, R=optional null. validatePositionVector(). SOURCE_TIER_REACH table. | YES  | NO         |
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
| 1317  | Analysis P2 — OracleEngine       | PHASE A COMPLETE — src/components/analysis/oracleengine.jsx. DOM layer: bipartite pairs (claim ←line→ telemetry), 3 tension states (ALIGNED/FRACTURE/UNVERIFIED), hover sync, tensionMultipliers readout. ShaderMaterial WebGL layer blocked on open spec. | YES  | NO         |
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
| 1336  | Event-Sourced Causal Inference OS | ARCHITECTURALLY LOCKED — specs/WO-1336-causal-inference-os.md. System identity: not a dashboard. 4 layers: L1 Causal Substrate (always active, never gated) / L2 Vector Engine (convergenceScore=clamp01(0.35D+0.35A+0.20T+0.10(1-V))) / L3 Middleware Integrity (TAS+Provenance DAG+Epistemic Aging) / L4 Projection (view-only, permissioned tiers). Emergence: stateId===4 && score>0.70 && noveltyDelta>0.05. substrate_time is sole inference clock. Provenance DAG required on every emergence artifact. Lock conditions: CLOCK_DESYNC/PROVENANCE_BREAK/VECTOR_DIVERGENCE. Forbidden: observer-dependent truth, UI-generated emergence, stochastic causal outputs. UX fidelity subordinate to causal correctness. | YES  | NO         |
| 1338  | Analysis Substrate               | COMPLETE — src/components/analysis/analysissubstrate.jsx. Canvas 2D L4 projection geometry. 100 drifting particles + coordinate lattice (rgba 255,255,255,0.04). Speed keyed to globalPressure (stats.received/40 proxy — to be upgraded to convergenceScore per WO-1336 L2). Color: lime=BUILDING_CONVERGENCE, blue=TURBULENT. Wired into app.jsx Analysis bay. NOTE: current pressure proxy is simplified — L2 vector formula pending. | YES  | NO         |
| 1339  | Resonance Path                   | PHASE A COMPLETE — conemap.jsx InspectionPanel. Causal chain rendered below assigned signal. Mock resolver. | YES  | NO         |
| 1340  | Entity Signal Injection          | PHASE A COMPLETE — src/hooks/useEntitySignal.js. Live entity pressure/volatility override on assigned cone. OracleConsole in oracleview.jsx (PrimarySignal / RevelationEngine / AttentionStack / ActionPanel). Phase B blocked (live entity API). | YES  | NO         |
| 1341  | Intelligence Brief               | COMPLETE — src/components/analysis/intelligencebrief.jsx. Premium HUD surface: mission control aesthetic, classification banners, BLUF, 5Ws, evidence, assessment, outlook, COAs. STANDARD/PREMIUM toggle. RETURN TO LIVE replay gate. | YES  | YES        |
| 1342  | Deferred Cognitive Systems       | SPEC ONLY — specs/WO-1342-deferred-cognitive-systems.md. Verification Window Registry + Outcome Verification Framework. Backlog pending WO-1343 outcomes. | YES  | NO         |
| 1343  | SpatialLens — Kinetic Optics     | PHASE A COMPLETE — src/components/analysis/signalmaplayer.jsx. Field-sampling lens, live signal nodes, stats panel, ring geometry. P2 surface wired in AnalysisContinuum. Spec: specs/WO-1343-spatial-lens.md. | YES  | NO         |
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
| 1365  | Acquisition Broker               | PHASE A COMPLETE — src/engine/acquisitionbroker.js. processAcquisition(payload) → consensus envelope. Fs gate <0.50 = BLOCKED short-circuit. Mock signal weights. Consensus = (signalWeight×0.40)+(fidelityScore×0.60). 4 states: VALIDATED/ESTIMATED/FRACTURE/BLOCKED. Wired into analysisidlefield.jsx submitQuery + useAnalysisStore pendingAcquisition. OLP block surfaces in TargetPacket. Phase B: live signal engine. | YES  | NO         |
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
| 1716  | Anti-Coupling: Revert Auto-Bay-Assign + Domain Clamp | COMPLETE — src/components/analysis/analysisidlefield.jsx: WO-1712 auto-assign block removed; useBayStore + assignToBay fully removed. src/components/analysis/targetpacket.jsx: ASSIGN TO BAY dropdown + CLAMP button added to OLP block (user-explicit, gated on qualified candidate, disabled on FRACTURE/BLOCKED). Regression gate: routing_tests/audit/WO-1716_AntiCoupling.mjs (6/6 PASS). SHA: 2c0d3e7. | YES | YES |
| WO-BAY-LOGIC-002 | Bay Transformation Layer | BACKLOG — Blocked on WO-UI-SLIDER-001 (COMPLETE). Transforms intentMagnitude × domain → concrete search constraints. Owns: intent→constraint mapping, Bay-specific transformation functions, feasibility thresholds, adaptive threshold descent (find max T where results exist), result scoring. Engine returns resolvedThreshold + closestResolved to UI display hook. UI must never run search logic — engine is authoritative. Spec: WO-INTAKE-STAT-003 §Layer B. | NO | NO |
| WO-INTAKE-STAT-003 | Signal Intake Architecture | SPEC LOCKED — A-B-A-A intake model. Situation-only execution. History read-only. Cascade delete. Post-execution adaptive refinement (1 cycle max). Chip chain built (WO-1718). Bay Logic layer = WO-BAY-LOGIC-002. | YES | NO |
| WO-1718 | Chip Query Builder | COMPLETE — src/components/analysis/analysisidlefield.jsx. Token-in-box search (selected chips → inline tokens). 4 progressive slots: Situation chips / Floor histogram / Horizon chips / Context text. Staggered pill chips (border-radius 999px, lime selected). canExecute = situation only. History pre-fill removed. | YES | YES |
| RTP-001 | Domain Isolation — Phase A | COMPLETE — src/engine/ingress.js: PROTECTED_ENTITY_REGISTRY + detectProtectedDomain(). src/engine/querysynthesis.js: protected gate fires first in detectDomain() (medical/disability entities lock to HEALTH unconditionally), REAL_ESTATE regex tightened (bare `home` removed — requires purchase/equity companion context), synthHealth() added (Medicaid HCBS waiver, PT/OT referral, adaptive DME, Title V CYSHCN, IEP), HEALTH→synthHealth wired in SYNTH_MAP. Regression corpus: routing_tests/health/ROUTE-00082.yaml + qa_route00082_routing.mjs (5/5 PASS, CI gate). Root cause closed: "home & community access" no longer fires REAL_ESTATE for medical queries. Phase B (Grafana metrics, retrieval masking, training sanitizer) not instantiated — spec only. Baseline: baseline_routing_guard_cac_roas. | YES | YES |

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