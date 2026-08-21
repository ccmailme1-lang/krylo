# KRYLO — Kinetic Interrogation Standard

Session handoffs and evolving learnings live in auto memory
(`~/.claude/projects/.../memory/MEMORY.md`), not here.

**Work orders / tickets:** tracked exclusively in Jira, project KRYL —
https://krylo.atlassian.net/browse/KRYL — and git log. No WO registry is maintained in this file.
Credentials live in `specs/jira.md` (gitignored, source it, never print it) — see Founder for the
key.

## 1. Grounding & Evidence (was §22, §25, §27, §28, §29 — merged)

**Empirical grounding.** All outputs, suggestions, and directives must be strictly grounded in
verifiable, contemporaneous evidence. No probabilistic speculation, extrapolation, or unverified
assertions presented as fact. Output touching financial, legal, medical, or operational decisions
(Target Packet, Action Plan, Happy Path, executive briefs) is informational — never self-executing
or actionable without explicit, documented validation by a qualified human expert.

**Precedent required.** "Grounded" means a cited precedent, not an assertion of confidence. Any
default value, threshold, animation, or design choice not dictated by existing code or an explicit
Founder decision must point to one of: a comparable already in this codebase, a named industry
convention, or a specific external reference — stated plainly, not implied. If no precedent exists,
the correct answer is "no evidence found," not a plausible-sounding guess. *Incident: `DEFAULT_T =
0.68` (structure-field.html) animated the scrubber to an arbitrary resting point on every load with
no comment, spec, or precedent behind the number — found and removed 2026-08-21 only because it was
directly challenged.*

**Three-Question Grounding Protocol** — every BUILT/NOT-BUILT or architecture-exists verdict
answers three questions before a verdict is stated:
1. Lexical — does the exact term/name exist? (grep)
2. Concept — does the capability exist under a different name/implementation? (a zero on #1 is
   evidence only that the search term is absent, never that the capability is)
3. Behavioral — is it actually wired into a live call path, not just present on disk?
A verdict of BUILT requires all three YES; NOT BUILT requires all three NO. Anything in between is
UNCONFIRMED — never rounded up or down for narrative convenience.
*Incident: 2026-08-03, agent declared a real subsystem "NOT BUILT" in a committed IP-meeting spec
after a lexical-only search found no match under the searched name.*

**Evidence Classification Matrix** — every architectural claim states two axes, never collapsed
into a bare "COMPLETE":
- Maturity: A (production, wired live) / B (primitive exists, composed capability doesn't) /
  C (spec only) / D (vision only)
- Verification: L (lexical) / C (conceptual) / R (runtime-traced) / B (behaviorally observed
  correct)
Pre-existing "COMPLETE" labels anywhere are unclassified until re-audited — do not cite them to an
external audience as proof of Runtime/Behavioral status.

**Evidence is not authority.** A WO number, a function's name, an existing implementation, a
passing build, or an existing consumer are each evidence toward a decision — none of them, alone
or combined, IS the decision. When a spec and an implementation disagree, the spec stays
authoritative until a deliberate, recorded decision changes it — silence or the passage of time
does not transfer authority to the implementation.

**Work classification before editing anything reconciled against a spec:**
- Class A (wiring defect) — authoritative logic exists, just not connected. Fix: connect only.
- Class B (contract migration) — semantics are right, shape is wrong. Fix: reshape only, after
  confirming semantics genuinely match.
- Class C (spec/implementation divergence) — runs, but implements something materially different
  from the spec. Not a migration. Requires an explicit Founder ruling on which artifact governs
  before any change.
Investigated → classified → decision → authorized → edited → validated → committed. Never skip
straight from investigated to edited.

**Absence-Is-Signal.** Absence of an expected signal is a classified state (structural / temporal
/ anomalous / filtered), never a null/zero/undefined default — treating it as null produces false
neutrality and inflates convergence scores. *Not yet enforced across SCI/RBCS/availability
filtering as of 2026-07-03 — don't overclaim it is.*

## 2. Shared Data / Function Change Gate (was §26 + §27, merged)

Before modifying any field, function, adapter, resolver, or state property that could be read or
written from more than one place — presumed shared until proven otherwise:

1. **Lexical trace** — grep the whole repo for the exact symbol: assignments, reads, exports,
   fallback operators, API payloads, persistence.
2. **Concept trace** — search for the same capability under a different name (renamed field,
   parallel adapter, prior ticket name). A zero on stage 1 is not evidence of absence.
3. **Behavioral trace** — follow one real execution path input -> state -> transform ->
   authoritative source -> consumer. Imported does not mean invoked. Defined does not mean active.
   Available does not mean authoritative.
4. **Classify then edit** — A (authoritative, no change) / B (duplicate/shadow — remove only after
   every consumer confirmed) / C (fabrication — replace with real source or honest absence) /
   D (broken transition — repair only that transition) / E (actual gap — stop, spec first,
   don't invent one during "cleanup") / F (unknown — keep investigating, don't edit).

**Hard stop:** don't edit while any of — a shared field hasn't been searched repo-wide, a
function's consumers are unidentified, an apparently-dead function hasn't been checked for
runtime invocation, a fix would create a second state store or parallel representation. "I didn't
find a consumer" is not "there is no consumer" until all three stages ran. "Small," "just a
fallback," "only UI" is not an exemption.

**Before the first edit on a shared target, state:** target, authoritative source, known
writers/consumers, runtime path verified (yes/no + how), the defect (A-F above), the minimal
change, non-goals, and the acceptance test. Only then implement.

## 3. Layer Order (LOCKED by Mr. XS — do not deviate)

Journey: Layer 1 (Hero) -> submit -> Layer 1N (Signal Map) -> node click -> Layer 2 (Oracle) ->
ETR select -> Layer 3 (Ground Level). Page 1 is the universal entry point.

Layer to file map (non-obvious names, not derivable by directory structure alone):
- Layer 0/1 — `public/krylo2-feed.html`
- Layer 2 (10K / Audit Desk) — `src/components/oracleview.jsx`
- Layer 3 (Ground Level) — `src/components/tenkvault.jsx`
- Layer 4 (Signal Map) — `src/components/spine/spinemap.jsx`
Everything else — grep for it; the codebase is the source of truth for file layout.

## 4. Forensic Guardrails (Anti-Drift)

- **Asset-first audit**: before building, grep `/public` and root for an existing `.html`/`.js`
  asset that already covers the surface.
- **Ghost-kill**: if a new React component would overlap an existing HTML asset, refuse the build.
  *Incident (WO-282/284b): built `TheMoat.jsx` duplicating existing `krylo2-feed.html`, causing a
  layer collision.*
- **Architecture-first audit**: before writing code for an existing component, read the file and
  identify its rendering architecture (InstancedMesh vs. individual components, shader vs.
  declarative). A change to that architecture is a REPLACEMENT, not an addition, and must be
  declared as one. If the architecture can't be identified from the file, stop and ask.
  *Incident (WO-295): an architectural replacement (InstancedMesh -> individual components) was
  built as an additive feature without reading the existing architecture — the working map was
  destroyed.*

## 5. Design Sovereignty (Founder authority — no exceptions)

No color value — hex, named, or descriptive — outside what's in §6 without explicit Founder
approval. **Banned forever: Amber, any shade/hex/name.** Design and creative decisions belong to
the Founder; engineering judgment does not extend to visual/creative choices.

## 6. Color Specifications (LOCKED)

```
--moat-bg:        #000000   Layer 0/1 background
--oracle-bg:      #F5F5F7   Layer 2 background
--signal-lime:    #66FF00   primary accent
--text-dark:      #1A1A1A   primary text on light bg
--unicorn-purple: #8A2BE2   Diamond/Unicorn formation, Layer 4
--signal-blue:    #007FFF   TURBULENT convergence state

Layer 0 intro: Deep Forest Green #1a4a2e/#1e4d30 . Mid Green #2d6b42 . Lime #66FF00 . Light Gray #e0e0dc

Convergence state color + motion:
  INSUFFICIENT SIGNAL   #3a3d4a  nearly static
  LOW SIGNAL YIELD       #1a1a1a  slow drift
  BUILDING CONVERGENCE   #66FF00  coherent pulse, soft bloom
  TURBULENT CONVERGENCE  #007FFF  irregular jitter, NO bloom/glow
  HIGH CONVERGENCE       #8A2BE2  gravitational compression, restrained bloom
  Only lime and purple reach high emissive dominance. Blue stays mid-luminance. Purple stays rare.
```

## 7. Font/Text Contract — report surfaces (LOCKED)

Exactly three text sizes on every report-style surface (banner narratives, macro/domain reports,
brief/packet bodies). Does not govern HUD micro-labels, tabular data, or buttons. Reference:
`analysisfield.jsx:897-910`.

- **Large** — headline/title. Georgia/Times New Roman serif, 28px, line-height 1.15.
- **Medium** — state/classification label. IBM Plex Mono, 15px, letter-spacing 0.04em.
- **Small** — descriptive body copy. IBM Plex Mono, 11.5px, line-height 1.6.

A font-size on report text matching none of the three is a contract violation — flag it.

## 8. 3D-HUD / Report-Overlay Boundary Contract (LOCKED)

Any `<Html>`-portaled element in `conemap.jsx`'s `ConeScene` that is pure background/orientation
chrome (not the active view's content) must gate to `viewportLens === 'NAV_SURFACE'`. Do not rely
on z-index against portaled `Html` — it doesn't reliably win; gate at the lens level. Default new
HUD chrome to NAV_SURFACE-only; extend to OBSERVE only as a deliberate, direct companion to
ObserveStoryBanner's narrative, never as a default.
*Incident: ThresholdBands and FlowArc confirmed bleeding through AnalysisField's 2D report overlays
because the Canvas stays mounted underneath every report and z-index doesn't beat a sibling-stacked
portal.*

## 9. Absolute File Rules

- Lowercase filenames only (e.g. `oracleview.jsx`). No CamelCase.
- Deprecated dependency: `relume-ui-react` — never import.

## 10. Work Order Protocol

`WO-[NUMBER]: [TITLE]` (or `KRYL-####` — Jira is the sole numbering authority, no more "WO-"
prefix on new tickets). No code without an open WO/ticket and explicit "go." Every WO passes the
Bottle Test before build (template: `specs/WO-HARDENING-TEMPLATE.md`) — all 5 must be YES:
reduces ambiguity, single dominant output, all boundaries defined, no undefined dependencies, does
not increase expressive flexibility in core. A TBD in File Map or Formula = BLOCKED, do not build.

**Positioning (locked):** "We don't predict. We detect." Any WO that predicts, recommends, or
generalizes instead of detecting structural asymmetry doesn't advance the mission — flag before
building.

**Validation execution:** run validation against each code chunk immediately after writing it; fix
and revalidate failures immediately, no reporting mid-stream; "Build Complete" is never sent until
100% of checks pass across all chunks. Partial completion is never reported as success.

**Definition of Done:** BAU (works as expected against current baseline) + BASELINE (verified
against the currently-tagged baseline commit, not a hardcoded name) + VOICED (report-surface text
follows §7, no size/style overlap).

## 11. Agent Behavioral Constraints

**Explicit go required.** State what will change and what won't; wait for explicit "go" before
writing code on a new WO.

**Rollbacks.** "Go back"/"revert" — ask which exact state before touching anything; never assume
it means the last commit. Name the exact target state and wait for confirmation before reverting.
A rollback is not an opportunity to also fix other things noticed along the way.

**Data preservation (no exceptions):**
- A file isn't saved until it's in a git commit — existing on disk isn't saved.
- Before any destructive git operation (reset, rebase, checkout, clean), commit all open work
  first, no exceptions.
- Before a hard reset: list every uncommitted file that will be wiped, warn explicitly that this
  permanently deletes those changes, offer a stash as an alternative, get explicit confirmation
  after the warning.
- A WO is never marked Complete until grep confirms the exact change is present in the file.
*Incident (2026-03-29): a hard reset run without a pre-commit or warning wiped 25 test ETRs and
several component files permanently — only partial recovery via dangling git blobs.*

## 12. Signal Ingestion Architecture (LOCKED)

Every external feed (FRED, EDGAR, Kalshi, future sources) must: normalize to 0-100 before dispatch;
dispatch via `dispatchBatch()` into `surfacerouter.js`, never direct-to-cone; tag with
`{source, domain, signal, confidence, ts}`; honor parity (no single source dominates).

**Backpressure activation rule:** before wiring any new source into a live `dispatchBatch()` path,
verify `surfaceRouter`'s backpressure (`setBackpressure()`) is actually triggered by a real runtime
load signal. Code that exists but is never invoked is not a contract satisfied — it's a contract
claimed. If it's not wired, wiring the trigger is part of the same WO, not a follow-up.
*Incident (2026-08-15): a fully-built 200-item priority queue and 3-state backpressure system had
zero callers to its own activation function anywhere but its own definition — ~30 connectors
stayed safe only by accident (independently staggered polling), not because the router protected
anything.*

## 13. Role-Play Protocol (LOCKED)

On a role-play request, respond in exactly this format, no preamble or summary after:

```
LENS: [assigned lens — INVESTOR/REALTOR/ATHLETE/SALES/STUDENT/LEGAL/PROCUREMENT/HEALTH/GENERAL]
**What [Subject] Needs**
**What Krylo Delivers**   — only features that exist in the current codebase, filtered by LENS
**The Gap**                — honest, no spin
**Fit for Krylo:** [1-10] — one line why
```

The 6 domains are locked: TECHNOLOGY . CAPITAL . KNOWLEDGE . LABOR . MEDIA . OWNERSHIP — never
reference a domain outside this list. Score >= 8 -> file a ticket immediately; the gap becomes the
spec.

## 14. Metrics Truth Engine (LOCKED)

Six hero metrics: Signal . Validity . Convergence . CAC . ROAS . LTV. Detection trio is measured/
on-mission; economics trio is generalized/modeled and must be labeled as such. Every metric =
Realized (observed) + Projected (assumed) — Realized is bold/primary, Projected is smaller/labeled.

**Groundedness %** = Realized weight / Total weight x 100. Green >70, amber 40-70, red <40.

**Persona guardrail:** persona tunes assumptions and thresholds only — never the groundedness
computation. "78% grounded" means the same thing for every persona, or the number is corrupted.

**Wiring contract:** metrics computed only in `metricsengine.js`'s `computeMetrics()`, attached
only at `synthesizeQuery` return as `synthesis.metrics`, rendered only via the shared
`<MetricStrip>`. Components never recompute a metric.

**Decision Emission Score:** multiplicative only — Signal x Validity x Convergence x
AvgGroundedness. Weighted-average/additive variants are forbidden (a weak leg must crater the
score, never get averaged away). Components stay visible alongside any composite.

**Banned:** the single-scalar "confidence" costume for CAC/ROAS.

## 15. Closed-Loop Leverage Principle

**Canonical mission:** "Finding advantageous positions before they become obvious." Every
subsystem (Happy Path, Convergence, Fractures, Assemblance, HP Qualification, domain routing,
signal ingestion) sits under this one sentence, not as a separate invention.

A decision is complete when its outcome is observed, attributed, and incorporated into path
memory — not when it's emitted. Never imply the whole system is "incomplete" because most
decisions never get a reported outcome — Path Memory is built from the captured-outcome subset,
learn from what closes, watch for survivorship bias.

**Attribution is the highest-risk layer.** No route-leverage claim without N + attribution rigor —
coincidence is not causation. Withhold beats fabricate.

**Route ranking weights for earliness/non-consensus**, not just historical realized leverage —
ranking purely by past leverage surfaces roads already crowded, which is the opposite of the
mission.

## 16. Direction Honesty Principle

"Not showing it is showing reality. Suppressing a fracture signal is fabrication by omission."
Structural fracture (negative convergence, downside positioning, credit stress) is a first-class
signal with the same authority as constructive convergence — never a warning label, never
suppressed state.

**Polarity rule (load-bearing):** every domain pressure signal carries magnitude (0-100) AND
polarity (constructive | fracture). A signal without polarity is directionally blind, which is
fabrication by omission.

## 17. Route-Don't-Aggregate Principle

Routing decisions operate on atomic signals or minimally-normalized inputs — never precomputed
aggregates. Aggregation is permitted only after routing. A component that combines signals before
classification, or computes composite metrics prior to routing, is a routing violation unless
explicitly exempted. Exceptions: post-route summarization, visualization-only aggregation,
non-decisioning dashboards.

## 18. Orthogonal Axis Integrity Principle

All scoring axes must be orthogonal unless explicitly declared dependent. Violation: Axis A
expressible as a function of Axis B, or two axes responding to the same latent variable under
different names. Audit format per pair: Dependency (Independent/Partially/Fully Dependent) — Risk
(Low/Med/High) — Action (Merge/Reweight/Separate/Retire).

## 19. Secret Exposure Guardrail (NO EXCEPTIONS)

Never run any command whose output could contain the literal value of a secret, credential, API
key, token, password, or connection string — local, remote, or in any config file — regardless of
how legitimate the goal is.

Never run: cat/less/head/tail/Read on a file containing secrets; grep (any form, even a "targeted"
grep for one key name) over a file/dump containing secrets; pm2 env, printenv, env, export -p, or
any full environment dump; shell expansion or interpolation of a secret variable into output;
heredocs/printf that reconstruct file contents containing secrets into the transcript.

Only permitted check pattern — existence/boolean, never value: confirm a key line is present with
a pattern-match that reports only "present" or "MISSING" (grep -q on the key name, never printing
the matched line), or confirm a variable is non-empty via a boolean test that reports only "set" or
"unset" without ever printing the variable's contents.

To verify a value is correct (not just present), ask the user to check it on their own terminal,
or prove the fix with a functional endpoint test that never touches the secret.

If a secret is ever printed anyway (e.g. an error message echoing a connection string): stop
immediately, state plainly what was exposed, treat it as a rotation candidate — never minimize or
bury it.
Incident (2026-07-31): three separate secret-exposure events in one session — an API key via grep,
a full config dump via cat, and a targeted grep that still printed a database URL with password —
the third happening after the first two were already flagged as the problem.
