# CLAUDE.md
## KRYLO — Agent Operating Procedures
### Version: 1.1 | Status: LOCKED | Last Updated: 2026-03-07

---

## 1. PURPOSE

This file is the single source of truth for all agents, developers, and AI models operating on the KRYLO codebase. It is read first. It is never skipped. No build begins without it.

---

## 2. THE SYSTEM

KRYLO is a Decentralized Truth Registry — a forensic-grade ecosystem for capturing, validating, and archiving reality.

**Components:**
- **Nooma** — Mobile field sensor. Captures Elevated Truth Records (ETR) with immutable telemetry.
- **Ablinq** — Desktop audit desk. Deep interrogation, forensic analysis, Complex Queries.
- **The Kinetic Spine** — Shared hardened backend. Validated data permanently archived.
- **The Perceptual Field** — The HUD trust surface. Renders system recognition as perception, not instruction.

---

## 3. ABSOLUTE RULES (NON-NEGOTIABLE)

These rules apply to every agent, every session, every WO. No exceptions.

```
1. NEVER build without explicit approval.
2. ALWAYS read all relevant files before writing code.
3. ALWAYS deliver full files — not snippets, not partials.
4. NEVER present a plan as clean while identifying breaking issues within it.
5. NEVER auto-compact or summarize session context.
6. ALWAYS confirm the plan and receive explicit "go" before writing code.
7. NEVER merge files partially — full file replacement only.
8. ALWAYS respect the WO numbering sequence. Next WO: WO-231.
```

---

## 4. FILE NAMING CONVENTION

```
STRICT: All component and source files use lowercase naming.
CORRECT:   lookingfunnel.jsx / oracleview.jsx / signalmap.jsx
INCORRECT: LookingFunnel.jsx / OracleView.jsx / SignalMap.jsx

Exception: PascalCase constants assigned at import for React rendering.
Example:   const LookingFunnel = lookingfunnel;
```

---

## 5. WORK ORDER PROTOCOL

Every build task is governed by a Work Order (WO).

```
FORMAT:    WO-[NUMBER]: [TITLE]
TRACKING:  Every WO from WO-211 onward is tracked in Jira.
SEQUENCE:  WO number must be confirmed before work begins.
RULE:      No code is written without a WO. No WO ships without Jira ticket.
```

**Active WO Registry:**
| WO | Title | Status |
|---|---|---|
| WO-210 | 3D Signal Map Component | Complete |
| WO-211 | Navigation Fix + Canvas Bleed | Complete |
| WO-212 | Kinetic Vortex Typography | Complete |
| WO-213 | Two-File Atomic Deploy | Complete |
| WO-214 | Shift-Shutter Component | Complete |
| WO-216 | Universal Kinetic Wrapper HOC | Complete |
| WO-220 | Hard-Coded Seed — Prototype Truth | Complete |
| WO-225 | Monorepo Integration Map | Complete |
| WO-226 | ETR Score-Weighted Entry Mechanics | Complete |
| WO-227 | Dead Zone Guard + Monorepo Scaffold | Complete |
| WO-228 | ETR Particle Layer Isolation | Complete |
| WO-229 | Truth Tap — Mock API & State Bridge | Complete |
| WO-230 | Ablinq Registry — Audit Desk Base | In Progress |

---

## 6. DEFINITION OF DONE

No ticket is Done until all three pass manually:

```
[ ] SIGNED    — Does the record contain a valid Secure Enclave signature?
[ ] UNIFIED   — Does the record appear correctly in both Nooma and Ablinq?
[ ] WEIGHTED  — Does the Fs score update in real-time during challenge simulation?
```

---

## 7. PRE-FLIGHT DEPENDENCY CHECK

Per SOP [2026-02-04]: No structural code is committed without this check passing.

**Required node_modules:**
```
date-fns              — Gauntlet timer sync
crypto-js             — Forensic metadata
exif-reader           — EXIF extraction
ethers.js / web3.js   — Escrow/Bounty
turf.js               — Geospatial GPS verification
D3.js                 — Forensic visualization
three                 — 3D spine
@react-three/fiber    — R3F wrapper
framer-motion         — Kinetic particle animation
xstate                — State machine
```

**Removed:**
```
relume-ui-react       — DEPRECATED. Package does not exist on npm.
                        Use local clean-room Tailwind components instead.
```

**Required environment:**
```
KRYLO_PUBLIC_KEY      — Must be present in .env
localhost:5173        — Must respond 200 OK with krylo.html header
localhost:3001        — Mock truth server must be running (/api/truth)
```

**Action:** If any dependency is missing — STALL build. Run `yarn add -W [package]`. Do not assume environment is ready.

---

## 8. TECH STACK

```
Frontend (Ablinq):     React + Vite + Tailwind CSS (clean-room components)
Frontend (Nooma):      React Native
State Management:      useTruthLens (custom hook) + React useState
Backend (Epistemic):   FastAPI (Python) — /state /inspect /audit
Backend (Application): Node.js + Express + PostgreSQL + IPFS
Backend (Mock):        Express mock server on :3001
Smart Contracts:       Solidity (EVM-compatible)
3D Engine:             Three.js R128 + @react-three/fiber
Animation:             Framer Motion + CSS keyframes
Deployment:            Render (auto-deploy from GitHub branch: site)
Monorepo:              Yarn Workspaces
```

---

## 9. ARCHITECTURE BOUNDARIES (HARD)

```
/state    — Perceptual Field only. Cannot import from /inspect or /audit.
/inspect  — Pull-only. No state mutation. No influence on perception.
/audit    — Expert-only. Header-gated. No summaries. No upward influence.
```

Violation of these boundaries is an architectural breach. Treat as a blocker.

---

## 10. PERCEPTUAL FIELD — INVIOLABLE CONSTRAINTS

The Perceptual Field is the critical path. It is the deal-breaker.

```
NEVER display numbers of any kind.
NEVER display text that asserts a claim.
NEVER remain visible when state == CALM.
NEVER increase influence when trend == FADING.
NEVER explain itself when wrong.
NEVER produce anything quotable.
```

Any feature proposal that violates these constraints is classified as:
**"Architectural Change — Trust Surface"**
Requires SAB review and formal approval before proceeding.

---

## 11. DEPLOYMENT PROTOCOL

```
1. One WO = one deploy
2. One commit = one file (full replacement only)
3. No hotfixes without a WO
4. Rollback plan identified before every deploy
5. Post-deploy verification required before ticket is closed
6. ATS (Agent Transition Summary) updated on every successful F2P deploy
```

---

## 12. MODEL ROSTER & SPECIALIZATION

Agent routing is managed by the PM. Models are assigned to WOs based on specialization.

| Role | Specialization | Assigned Model |
|---|---|---|
| Structural/Coding | Core architecture, pulse engine, void shell | [PLACEHOLDER] |
| Stream Efficiency | Data pipeline, zero-copy ingestion | [PLACEHOLDER] |
| Context Mastery | Large context unification, ecosystem coherence | [PLACEHOLDER] |
| Kinetic Artistry | Three.js, vertex math, 3D animation | [PLACEHOLDER] |
| Logic Gate | Reasoning, heuristic thresholds, accountability | [PLACEHOLDER] |

---

## 13. CRAWL_PHRASES — IMMUTABLE SEED (WO-220)

These 5 phrases are the only permitted data points for the kinetic layer in this phase.
Do not modify outside of a formal Work Order.

```javascript
export const CRAWL_PHRASES = [
  { text: "Imminent Layoffs",            score: 0.98, type: "signal", entryMode: "stamp" },
  { text: "Unresolved Conflict",         score: 0.91, type: "signal", entryMode: "spell" },
  { text: "Performance Issues?",         score: 0.88, type: "signal", entryMode: "drop"  },
  { text: "Marital Trouble?",            score: 0.93, type: "signal", entryMode: "drop"  },
  { text: "Unhealthy Workplace Culture", score: 0.89, type: "signal", entryMode: "slice" },
];
```

---

## 14. FORENSIC CONSTANTS — Fs FORMULA (LOCKED)

```
Fs = (M_checksum · 0.40) + (T_telemetry · 0.30) + (D_docs · 0.20) + (V_voice · 0.09) + (E_viral · 0.01)
```

**Field mapping:**
| Field | Weight | Description |
|---|---|---|
| m_checksum | 0.40 | Metadata integrity checksum |
| t_telemetry | 0.30 | Telemetry signal fidelity |
| d_docs | 0.20 | Document verification score |
| v_voice | 0.09 | Voice corroboration weight |
| e_viral | 0.01 | Viral signal exposure |

Do not modify weights without a formal WO and SAB notification.

---

## 15. SAB GOVERNANCE

The Strategic Advisory Board (SAB) governs all architectural decisions.

```
Fist of Five threshold for approval: 4.0 average minimum
Any decision scoring below 4.0 is rejected and returned for revision.
Architectural Change — Trust Surface decisions require SAB visibility.
No trust surface change merges without documented SAB approval.
```

---

*This document is living. Updates require a formal WO and SAB notification.*
*Silence in this document means the answer is NO.*