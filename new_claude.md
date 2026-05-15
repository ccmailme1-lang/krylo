## CLAUDE.md — KRYLO Agent Operating Procedures
### Version: 1.4 | Status: LOCKED | Last Updated: 2026-03-22

## 1. PURPOSE
This document is the absolute source of truth for all agents. It defines the **Kinetic Interrogation** standard. Read first. No build begins without verifying these constraints against your next actions

## 2. THE SYSTEM: KRYLO
KRYLO is a specialized ecosystem for the extraction and synthesis of "Truth" reality. It operates on a tiered access model where visual clarity is earned through the "Signal Funnel"

                                                                               
* * Level 0: The Intro (Ambient Sensing).                                         
  - Aesthetic: Deep Forest Green (#1a4a2e / #1e4d30), Mid Green (#2d6b42),
  Bright Chartreuse (#caff00), White, Light Gray (#e0e0dc). High-latency        
  feedback.
  - State: Static, cold, and unverified. 
* * Level 1: 10K Lens.                                                            
  - Aesthetic: Warm White (#F5F5F7). High-contrast clarity.                     
  - State: Synthesized truth. The "Oracle" voice dominates. 
* **Level 2: Audit Desk (Forensic Refraction).**
    * **Aesthetic:** Hybrid. Grayscale technical grids.
    * **State:** Interrogation of specific data points.
* **Level 3: Ground Level (The Truth Ledger).**
    * **Aesthetic:** Raw data rows. Pure monochrome.
    * **State:** The atomic evidence layer.

## 4. TYPOGRAPHY: THE DUAL VOICE
Text must never be treated as a single style. It is partitioned by authority.

* **The Oracle Voice (Synthesis):**
    * **Font:** High-Contrast Serif (Charter, Georgia, or Playfair Display).
    * **Placement:** Centered, hero-scale (approx. 4vw).
    * **Usage:** Used for the "Result" or the "Synthesis Quote."
* **The Forensic Voice (Evidence):**
    * **Font:** IBM Plex Mono.
    * **Placement:** Perimeter-aligned or row-based.
    * **Usage:** IDs, timestamps, status tags (ALIGNED/MIXED), and telemetry data.


    . THE HANDSHAKE: MOTION & CADENCE

Transitions in KRYLO are not "animations"; they are "physical shifts."

    The 2.5 Inhale (Staging): Every major layer shift requires a 2500ms staging delay. During this window, the system is in THINKING status. This simulates the engine "processing" the request before the reveal.

    The Binary Shutter Snap: The background color shift (Black to Warm White) must be near-instant (0.1s). It should feel like a physical shutter opening.

    The Hydraulic Zoom-Through: The incoming layer enters with a heavy, deliberate velocity.

        Scale: 0.95 → 1.0.

        Y-Offset: 10px drift upward.

        Easing: cubic-bezier(0.25, 0.1, 0.25, 1).

    The Waterfall Ledger: Rows of data must stagger their entry.

        Delay: 100ms per row index.

        Opacity: 0 to 1 over 300ms.

4. FORENSIC GUARDRAILS (ANTI-DRIFT)

Hard-coded protocols to prevent "Ghost Architecture" hallucinations and project drift.

    ASSET-FIRST AUDIT: Before any build, the agent MUST grep for existing .html or .js assets in /public or /root.

    THE GHOST-KILL: If an agent attempts to build a React component that overlaps with an existing HTML asset (e.g., building themoat.jsx when krylo-feed.html exists), the agent MUST REFUSE the build.

    THE BRIDGE RULE: Communication between Level 0 (krylo-feed.html) and the React Engine happens exclusively via postMessage to the PrismContext listener.

    INCIDENT RECORD (WO-282/284b): Failure to recognize krylo-feed.html led to the creation of a redundant ghost component (TheMoat.jsx), causing a layer collision. Never repeat this. All SOPs must reference this failure as a high-fidelity warning.


6. ABSOLUTE RULES (NON-NEGOTIABLE)

    LOWERCASE ONLY: All filenames must be lowercase (e.g., oracleframe.jsx). No CamelCase.

    PERIPHERAL BLUR: Layer 1+ must utilize a Radial Mask. The center must be crystal clear; the edges (outer 20%) must utilize backdrop-filter: blur(4px).

    FULL FILE REPLACEMENT: Never ship snippets or partial code. Deliver the full file to maintain context and prevent merge conflicts.

    NO SNAPPING HUD: UI elements like the Navigation Pill must fade and float in separately from the main content to create a sense of depth (Layering).

7. FILE NAMING CONVENTION

STRICT: All component and source files use lowercase naming.
CORRECT:   lookingfunnel.jsx / oracleview.jsx / signalmap.jsx
INCORRECT: LookingFunnel.jsx / OracleView.jsx / SignalMap.jsx

8. PRE-FLIGHT DEPENDENCY CHECK

Required node_modules (SOP 2026-02-04):

    framer-motion: For Z-Axis and Hydraulic transitions.

    lucide-react: For HUD icons.

    clsx & tailwind-merge: For binary aesthetic toggles.

    ibm-plex-mono: Primary technical typeface.

DEPRECATED: relume-ui-react. Do not import. Use local Tailwind clean-room patterns.
9. WORK ORDER PROTOCOL

Every build task is governed by a Work Order (WO).

FORMAT:   WO-[NUMBER]: [TITLE]
SEQUENCE: Numbering must follow the Active Registry.
RULE:     No code is written without a WO and explicit "Go."

Active WO Registry:
| WO | Title | Status |
|---|---|---|
| WO-290 | CLAUDE.md Architecture Refresh | Complete |
| WO-293 | THE PURGE: Delete TheMoat.jsx & References | IN PROGRESS |
| WO-294 | THE BRIDGE: Connect krylo-feed.html to PrismContext | IN PROGRESS |
10. DEFINITION OF DONE

No ticket is marked "Done" until the following three visual benchmarks are verified against the 8:49 AM recording:

    INVERTED: Background snaps to #F5F5F7 exactly on Layer 1 activation.

    HYDRAULIC: The transition feels weighted and deliberate, not "bouncy."

    VOICED: The Serif Synthesis and the Mono Data never overlap in style.

Silence in this document means the answer is NO.

11. AGENT BEHAVIORAL CONSTRAINTS (NON-NEGOTIABLE)

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

SECTION 3 — LANGUAGE AND COMMUNICATION
19. Never rename or redefine the user's terms. Use their exact words back to them.
20. Never describe what you did using your own words for the user's terms. If the user said "marquee," say "marquee."
21. Do not summarize, paraphrase, or editorialize after completing a task. State only what was done, using the user's words.
22. Never repeat back a paraphrase of an instruction as if it is confirmation. Quote it exactly.
23. Do not add qualifiers like "I think you mean" or "I interpreted this as." Ask instead.
24. Never volunteer opinions, recommendations, or alternatives unless explicitly asked.
25. Do not explain your reasoning after making a mistake. Acknowledge it and ask for the correct direction.

SECTION 4 — REVERSALS AND ROLLBACKS
26. If the user says "go back" or "revert" — ask to which exact state before touching anything.
27. Never assume "go back" means the last commit. Ask what version they mean.
28. Before any rollback, name the exact state you are reverting to and wait for confirmation.
29. Never restore more than what was explicitly requested in a rollback.
30. A rollback is not an opportunity to fix other things noticed along the way.

SECTION 5 — SCOPE AND BOUNDARIES
31. Never build a component that overlaps with an existing HTML asset. (GHOST-KILL rule — §4)
32. Never write code into the wrong component. State the mapping and get explicit yes first.
33. The spec is the only source of truth. Existing code is evidence of past drift, not a guide.
34. Never design for hypothetical future requirements. Build only what is asked, now.
35. Never add error handling, fallbacks, comments, or abstractions that were not requested.
36. Never commit, push, or deploy without explicit instruction to do so.
37. Never assume that approving one action approves the same action in a different context.
38. If a term appears in the user's vocabulary that you have not heard before — ask what it means before using it in code or conversation.
39. Every new card, component, or artifact must be named by the user before it is built.
40. When in doubt: stop, quote the instruction back word for word, ask one precise question. Do not proceed.