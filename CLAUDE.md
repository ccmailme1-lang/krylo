CLAUDE.md — KRYLO Agent Operating Procedures
Version: 1.6 | Status: LOCKED | Last Updated: 2026-03-23

1. PURPOSE

This document is the absolute source of truth for all agents. It defines the Kinetic Interrogation standard. Read first. No build begins without verifying these constraints.

2. THE SYSTEM: THE LOOKING FUNNEL

KRYLO is a specialized ecosystem for the extraction and synthesis of reality. It operates on a tiered access model where visual clarity is earned through the "funnel."

LAYER ORDER IS LOCKED BY MR. XS. DO NOT DEVIATE.

    Layer 0: The Intro (Sell / Pitch)
        Aesthetic: Black Void (#000000). Intro palette: deep forest green (#1a4a2e / #2d6b42), chartreuse (#caff00), white, light gray (#e0e0dc).
        Implementation: Exclusively public/krylo-feed.html.

    Layer 1: Search (Looking Funnel)
        Aesthetic: Black Void (#000000). High-latency feedback.
        State: Static, cold, and unverified.
        Implementation: Exclusively public/krylo-feed.html (search state).

    Layer 2: 10K (Audit Desk — Forensic Refraction)
        Aesthetic: Warm White (#F5F5F7). High-contrast clarity.
        State: Synthesized truth.
        Implementation: src/components/oracleview.jsx

    Layer 3: Ground Level (Metadata, Stats, Charts, Graphs)
        Aesthetic: Hybrid. Grayscale technical grids.
        State: Interrogation of specific data points.
        Implementation: src/components/tenkvault.jsx

    Layer 4: Signal Map (Signal Funnel — Ecosystem)
        Aesthetic: Black Void. Ambient signal visualization.
        State: The ecosystem layer.
        Implementation: src/components/spine/spinemap.jsx

3. THE HANDSHAKE: MOTION & CADENCE

Layer transitions are physical shifts, not animations. Current spec (post-2026-03-22):

    Layer 0 → Layer 2: Instant. No delay, no fade. postMessage fires immediately on submit.
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

6. COLOR SPECIFICATIONS (LOCKED)

    --moat-bg:     #000000   (Layer 0, Layer 1 background)
    --oracle-bg:   #F5F5F7   (Layer 2 background)
    --signal-lime: #CCFF00   (primary accent)
    --text-dark:   #1A1A1A   (primary text on light bg)

    Layer 0 Intro Palette:
        Deep Forest Green: #1a4a2e / #1e4d30
        Mid Green:         #2d6b42
        Chartreuse:        #caff00
        Light Gray:        #e0e0dc

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

Active WO Registry:
| WO  | Title                                      | Status                                      |
|-----|--------------------------------------------|---------------------------------------------|
| 264 | Prism Registry + Ground Level              | Complete                                    |
| 265 | Health Check                               | Deferred — last in sequence                 |
| 266a| Refraction Pipeline                        | Complete                                    |
| 266b| AuditDesk                                  | Complete                                    |
| 266c| Ledger Persistence                         | Deferred — backend unspecced                |
| 267 | PrismContext + useForensicFunnel           | Complete                                    |
| 268 | Categorical Anchor                         | Complete                                    |
| 283 | TenKView                                   | Needs reassessment — built for old layer mapping |
| 284 | OracleFrame / Navigation                   | Needs reassessment — built against old architecture |
| 285 | MoatPills                                  | Invalid — TheMoat dependency removed        |
| 289 | Truth Engine Bridge                        | Needs revalidation post-TheMoat removal     |
| 293 | THE PURGE: Delete TheMoat.jsx & References | Complete                                    |
| 294 | THE BRIDGE: Connect krylo-feed.html        | Complete — postMessage listener in app.jsx  |

12. DEFINITION OF DONE

A ticket is marked Done when the following are verified:

    BAU: Standard functional check — the current baseline build works as expected.
    BASELINE: Verified against the current locked baseline (baseline_22).
    VOICED: The Serif Synthesis and the Mono Data never overlap in style.

13. AGENT BEHAVIORAL CONSTRAINTS (NON-NEGOTIABLE)

SECTION 1 — BEFORE ANY ACTION
1. Read the instruction exactly as written. Do not interpret, infer, or assume meaning beyond the literal words.
2. If any term, element, or reference is ambiguous — STOP and ask. Do not guess.
3. State exactly what you will change and what you will leave untouched. Wait for explicit "go."
4. "Only that" means only that. Nothing more. Nothing adjacent. Nothing assumed to be related.
5. If the instruction has multiple parts, list them back numbered exactly and wait for confirmation before executing any of them.
6. If you are unsure which component, file, or element the user is referring to — ask. Do not pick the most likely one.
7. Never execute a deletion without naming exactly what will be deleted and receiving explicit confirmation.
8. Do not treat frustration or anger as a "go." Wait for a clear directive.
9. A screenshot is evidence, not an instruction. Ask what the screenshot is telling you to do before acting.
10. A mockup is a layout reference only. Do not copy colors, fonts, or spacing unless explicitly told to.

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

SECTION 3 — LANGUAGE AND COMMUNICATION
20. Never rename or redefine the user's terms. Use their exact words back to them.
21. Never describe what you did using your own words for the user's terms. If the user said "marquee," say "marquee."
22. Do not summarize, paraphrase, or editorialize after completing a task. State only what was done, using the user's words.
23. Never repeat back a paraphrase of an instruction as if it is confirmation. Quote it exactly.
24. Do not add qualifiers like "I think you mean" or "I interpreted this as." Ask instead.
25. Never volunteer opinions, recommendations, or alternatives unless explicitly asked.
26. Do not explain your reasoning after making a mistake. Acknowledge it and ask for the correct direction.

SECTION 4 — REVERSALS AND ROLLBACKS
27. If the user says "go back" or "revert" — ask to which exact state before touching anything.
28. Never assume "go back" means the last commit. Ask what version they mean.
29. Before any rollback, name the exact state you are reverting to and wait for confirmation.
30. Never restore more than what was explicitly requested in a rollback.
31. A rollback is not an opportunity to fix other things noticed along the way.

SECTION 5 — SCOPE AND BOUNDARIES
32. Never build a component that overlaps with an existing HTML asset. (GHOST-KILL rule — §4)
33. Never write code into the wrong component. State the mapping and get explicit yes first.
34. The spec is the only source of truth. Existing code is evidence of past drift, not a guide.
35. Never design for hypothetical future requirements. Build only what is asked, now.
36. Never add error handling, fallbacks, comments, or abstractions that were not requested.
37. Never commit, push, or deploy without explicit instruction to do so.
38. Never assume that approving one action approves the same action in a different context.
39. If a term appears in the user's vocabulary that you have not heard before — ask what it means before using it in code or conversation.
40. Every new card, component, or artifact must be named by the user before it is built.
41. When in doubt: stop, quote the instruction back word for word, ask one precise question. Do not proceed.
42. The layer order is locked by Mr. XS: Layer 0 → Layer 1 → Layer 2 → Layer 3 → Layer 4. Never deviate without explicit instruction from Mr. XS.

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
