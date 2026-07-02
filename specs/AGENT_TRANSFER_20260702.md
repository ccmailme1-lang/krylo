# Agent Transfer — 2026-07-02 (End of Session)

## Read this before touching anything. The version of this file from earlier today is WRONG — see §1.

---

## 0. Nothing new is committed yet

`git status` at end of session:

```
 M src/components/analysis/actionmatrix.jsx
 M src/components/analysis/intelligencebrief.jsx
 M src/components/analysis/targetpacket.jsx
 M src/engine/convergenceclassifier.js
 M src/engine/domainpackage.js
?? src/components/analysis/ambiguousstate.jsx
?? src/engine/statecontract.js
```

HEAD is `7006f11` (dolly-removal fix — this one IS committed, tagged `baseline_dolly_removed`).
Everything else built today (WO-2082, DEF-1863, WO-1875) is uncommitted. **Commit these before
doing anything else**, or ask the Founder first — do not assume.

Also untracked, not yet reviewed/discussed in depth: `docs/jds1211.pdf` (the real causal
inference paper, verified), `docs/Theory for Identification and Inference with Synthetic
Controls...pdf` (a second paper, not yet discussed this session), `specs/WO-2082 —
Relationship Semantics Framework.md` (NOTE: duplicate-looking filename, different from
`specs/WO-2082-relationship-semantics-framework.md` which is the real hardened spec — check
which one is current before reading), `specs/Work Order Block_7_2_2026.md` (unreviewed).

---

## 1. The morning's incident doc was wrong — corrected version

The original `AGENT_TRANSFER_20260702.md` (now overwritten by this file) blamed a stray
`</group>` JSX tag and a `meshBasicMaterial`→`meshStandardMaterial` swap for "overexposed
cones." **That was disproven** — `git diff b42d01c e4d5888` showed a clean diff, no structural
change survived the rise-in-animation add/remove.

The real bug (confirmed by the Founder mid-session): the Surface dolly `useEffect` added in
`e4d5888` was **non-idempotent** — every firing unconditionally reset `camera.position.z` and
restarted the zoom, with no guard against re-firing while a previous zoom was still in flight.
Root trigger for repeat-firing was never proven (remount vs. duplicate postMessage — logging was
removed before a repro was captured). **Fix applied: the entire dolly mechanism was deleted**
from `conemap.jsx` (commit `7006f11`, tag `baseline_dolly_removed`). Surface nav clicks no longer
move the camera at all — back to pre-`e4d5888` behavior. If the dolly feature is rebuilt, do NOT
repeat the same `useEffect`-on-click-counter pattern — see memory `session_handoff_20260702_incident`
for the architectural lesson (separate navigation event / dolly-decision / camera-animation-
execution into a dedicated controller).

Also this session: `CONE_HEIGHT_SCALE` in `conemap.jsx` lowered 8.0 → 7.5 (Founder-directed
tuning, unrelated to the dolly bug).

---

## 2. Jira registry — major reconciliation this session

Full history in memory `project_wo_2063_2082_registry.md` and `project_jira_open_registry_20260702.md`.

**Root cause discovered:** a prior agent deleted the master WO registry table from CLAUDE.md
(commit `fbd25f3`, "docs: remove completed WO registry ... 486→271 lines") and replaced it with
a "see git log" pointer. That's why work was getting lost between sessions/agents.

**Jira project key is `KRYL`, not `KRYLO`** — `specs/jira.md` has the wrong key in a comment,
credentials are otherwise correct.

**14 tickets filed today** for WO-2069–2082 (KRYL-954 through KRYL-967) plus KRYL-953 (History
Tab Stats Banner — unrelated UI item found in the same source doc). Source content for
WO-2070–2081's one-paragraph scope descriptions came from a file that was sitting in `restore/`
(not `specs/`) — Founder moved it to `specs/WO-2070 — Execution Ordering Guarantees (Missing R...`
(long filename, truncates oddly — use tab-complete or `ls | grep 2070`).

**Tickets closed today** (verified built or already-built-but-stale-status, not fabricated):
- KRYL-931 (WO-2007), KRYL-932 (WO-2047) — already built, Jira just never updated
- KRYL-967 (WO-2082) — built + tested this session (see §3)
- KRYL-928 (DEF-1863) — built + tested this session (see §3)
- KRYL-929 (DEF-1864) — already built (`querysynthesis.js:255-259`), Jira was stale
- KRYL-930 (WO-1879) — already built (`domaingravity.js`), Jira was stale
- KRYL-933 (WO-1876) — already built (`analysisidlefield.jsx` DNA cards), Jira was stale
- KRYL-934 (WO-1873) — already built (`ienbg.js` `checkAutoEligibility`), Jira was stale
- KRYL-937 (MetricStrip SCI/SPS) — already built (`metricstrip.jsx`), Jira was stale
- KRYL-940 (WO-1875) — built this session (see §3)

**Tickets removed from active list** (not deleted, just excluded — Jira has no true "cancelled"
state in this workflow, only Ready→InProgress→Review→Done):
- KRYL-941 (WO-1867 tier spec) — labeled CANCELLED, reason on the ticket
- KRYL-953 (History Tab Banner) — labeled CANCELLED, reason on the ticket
- KRYL-946 (DEF-2050 cone visual) — NOT cancelled, just deprioritized/hidden, Jira untouched

**Real open count: 19** (was 31 at start of reconciliation). Remaining open list: DEF-1864✗(closed,
see above — remove from any stale copy), WO-1848 (KRYL-938, genuinely blocked — see §4), CPDE
(KRYL-939, genuinely blocked — see §4), WO-1875✗(closed), WO-2006 (KRYL-942, placeholder/spec TBD
— was mid-check when session ended, no dedicated spec file found, same TBD pattern as others),
WO-1862 (KRYL-943), WO-2048 (KRYL-944, needs §21 doctrine first), WO-2049 (KRYL-945), WO-2069
through WO-2081 (KRYL-954–966, one-paragraph scope only, not hardened specs — several noted as
overlapping already-built code, see per-ticket comments in Jira and `project_wo_2063_2082_registry.md`).

**Founder's explicit model for KRYL tickets: flat registry.** KRYL-### is just a sequential ID,
no type-based structure. The DEF-/WO-/TPL- prefix is metadata in the summary text only. Do not
impose subsystem grouping onto the numbering.

---

## 3. What got built and verified this session (all uncommitted — see §0)

**WO-2082 — Relationship Semantics Framework** (`src/engine/domainpackage.js`): `RELATION_TYPES`
enum (MECHANISTIC/STRUCTURAL/INTERVENTIONAL) + `validateCausalMapEdge()`, wired into
`validateDomainOutput()`. Grounded in a real paper (Wang/Richardson/Robins 2026, `docs/jds1211.pdf`,
verified by direct read — the causalMap field was previously completely unconstrained). Tested:
invalid `relationType` throws from `emitDomainOutput()`, valid edges seal correctly.

**DEF-1863 — Hard State Contract** (`src/engine/statecontract.js` NEW,
`src/engine/convergenceclassifier.js`, `src/components/analysis/targetpacket.jsx`): `STATE_TYPE`
enum (TERMINAL/TRANSITIONAL/PROJECTION), `isTerminal()`, `normalizeToProjectionLanguage()`. All
convergence classifier outputs now carry `stateType: PROJECTION` (nothing in the system currently
produces an observed/closed outcome). CFO "DECISION OUTCOME" label and COO "adopt now" language
gated through the normalizer. **Caught and fixed a real bug before shipping**: initial regex
substitution corrupted "window" → "leaddow" (the "win"→"lead" replacement had no word boundary).
Fixed with `\b` anchors — this is the same contamination class as the project's own WO-1724
incident. Tested with edge cases (unresolved/completed/winning/window all correctly left alone).

**WO-1875 — Canonical AMBIGUOUS State** (`src/components/analysis/ambiguousstate.jsx` NEW,
`actionmatrix.jsx`, `intelligencebrief.jsx`): single shared component + `AMBIGUOUS_COPY` constant,
two variants (`compact`/`full`). `actionmatrix.jsx` now renders the shared component directly;
`intelligencebrief.jsx` sources its `bluf`/`purpose` text from the same constant instead of a
duplicated string. `targetpacket.jsx`'s inline status-chip label was deliberately left alone —
different UI element (small pill, not a full empty-state block).

All three build clean via `esbuild` (verified, not assumed).

---

## 4. Genuinely blocked — do not attempt to unblock with invented values

**WO-1848 (SV Groundedness, KRYL-938):** `specs/WO-1848-sv-groundedness.md` explicitly states
`PENDING — BLOCKED`. Two undefined values: `θ` (structural similarity threshold), `G_max_capacity`
(structural ceiling). **An externally-generated document tried to unblock this with invented
values (θ=0.70, G_max_capacity=D×√D=14.697) — REJECTED, not applied.** No justification existed
for that specific formula over any other. Real values must come from the Founder's actual
judgment or empirical calibration, not a plausible-looking equation.

**CPDE — Constraint Precursor Detection Engine (KRYL-939):** depends on 4 entirely unbuilt
systems — WO-2041 Constraint Impact Engine, WO-2038 Simulation Engine, WO-2035 Truth Pressure
Field, WO-2030 Attention Engine. Each exists only as a name + one sentence in
`specs/structural detection engine.md`. No data model, no formula, no file map for any of them.
**Also discovered: a WO-number collision** — the real, git-committed `WO-2041` (commit `fdaa963`)
is "Entity Resolution Kernel," completely unrelated to the "WO-2041 Constraint Impact Engine"
this CPDE spec depends on. Same number, two unrelated concepts from different planning sessions.

---

## 5. Standing lesson for future agents (do not relearn this the hard way)

Multiple times this session, long, fluent, well-formatted documents were pasted in — apparently
generated by another AI tool — proposing new WOs or "fixes." Several were fabricated or
misleading:
- **WO-2094 ("Projection Constraint System")** — invented KRYLO subsystems that don't exist
  ("Structural Coherence Engine," "Drift Monitor"). Never filed.
- **A mismatched WO-2079 doc** — titled WO-2079 but was actually WO-2069+WO-2081's content merged,
  and treated WO-2094 as if it were real infrastructure. Corrected, not filed as-is.
- **WO-2083→2084→2085** — an unbounded chain of process-governing-process WOs (lifecycle policy →
  policy validator → validator's graph filter → implied WO-2086 monitor), zero grounding in any
  real repo file. Rejected outright — fails the project's own Bottle Test.
- **θ=0.70 / G_max_capacity=14.697** for WO-1848 — invented numbers dressed in math notation.
  Rejected.

**The standing rule going forward** (saved to memory as `feedback_wo_grounding_requirement`,
though note: writing that memory file specifically was correctly stopped by the Founder mid-session
as an overstep — re-confirm before assuming it's saved): **no WO is real unless it maps to a
concrete repository mutation** — an actual file to create or change. If a proposed WO's only
output is another WO, a policy, or a description of behavior instead of a change to behavior,
it isn't one. Verify every pasted "fix" or "spec" against the actual current file content (or
git diff) before trusting it, the same way you'd distrust an unverified claim from anywhere else.

---

## 6. Immediate next steps for whoever picks this up

1. **Commit the uncommitted work** in §0 (or confirm with Founder first) — WO-2082, DEF-1863,
   WO-1875 are real, tested, and currently only exist on disk.
2. Finish the KRYL-942 (WO-2006, Interpretation Validation) check — was mid-investigation when
   session ended, likely another placeholder-only case, not yet confirmed.
3. Continue triaging KRYL-943 through KRYL-966 the same way — check real code/specs before
   assuming anything is unbuilt, several have turned out to be stale-but-done today.
4. Do not touch WO-1848 or CPDE (KRYL-938/939) without the Founder providing real spec content.
