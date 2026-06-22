**Locked.** WO-1839 refinements accepted with your consolidations. Excellent tightening on the meta-lens and secondary framing — that preserves taxonomy hygiene and UI discipline.

### Updated Elements (finalized)

**Meta-Lens: EXECUTIVE SYNTHESIS MODE**  
Trigger: ≥2 active lenses OR cross-lens tension OR board cadence alignment.  
Output: Single prioritized Decision Frame that surfaces the dominant STAKE/MOVE/WINDOW while ranking secondaries. No new synthesis — just resolution of already-derived signals.

**Conviction Gate + Multi-Lens**  
- Exactly one primary Decision Frame (highest conviction lens).  
- Secondaries explicitly under **SECONDARY DECISION SPACES** (collapsed, labeled as non-active execution surfaces).  
This kills optionality theater.

**Phase A Implementation Contract**  
Your JSON shape, templates, and JSX structure are approved as the frozen target. This gives WO-1828 a clear downstream contract and keeps everything deterministic.

Here is the **refined static template map** (Phase A) with tighter, more lens-native phrasing while staying fully static and non-generative:


ts
const DECISION_TEMPLATES = {
  CAPITAL_ALLOCATOR: {
    stake: "Capital at risk or opportunity cost in allocation decisions",
    move: "Allocate / hold / exit / adjust position",
    window: "0–8 weeks before capital commitment or review window closes"
  },

  RISK_MANAGER: {
    stake: "Exposure in operating/financial model assumptions or risk surface",
    move: "Hedge / cover / monitor / rerun stress test",
    window: "Next reporting cycle or risk review"
  },

  OPERATOR: {
    stake: "Impact on cost baseline, capacity, or execution constraints",
    move: "Absorb / redirect / accelerate / defer operations",
    window: "Current operational cycle"
  },

  GROWTH_SEEKER: {
    stake: "Market timing or competitive entry opportunity",
    move: "Enter / wait / partner / scale initiative",
    window: "Market inflection window per signal velocity"
  },

  DEFENDER: {
    stake: "Competitive threat vector or market share erosion risk",
    move: "Fortify / respond / acquire / reposition",
    window: "Pre-competitor action or churn threshold"
  },

  // Meta-lens (computed client or backend side)
  EXECUTIVE_SYNTHESIS: {
    stake: "Enterprise mandate alignment across active lenses",
    move: "Prioritize / escalate / reallocate resources",
    window: "Board or executive cadence window"
  }
}


These stay as pure re-expressions. No new inference, no causality, no confidence inflation.

**JSX structure**  
Approved verbatim. The <DecisionFrameCard> placement (after Finding, before Action Plan) and visual hierarchy are correct.

### Architectural Guardrail (enforced)
Decision Frame = **structural re-expression only**.  
It must never:
- Add signal
- Raise conviction
- Imply recommendation
- Generate language

If any template or future dynamic logic violates this, it fails review. This keeps us clean.

### Immediate Next Actions (execution velocity)
1. **Freeze this contract** in code (templates + JSON shape + JSX skeleton).  
2. Implement the static Phase A path in parallel with final WO-1828 work (so Lens Routing has a live target to hit).  
3. Once Phase A ships and is visually stable, update the master spec doc to reflect the *implemented* reality.  

This sequence eliminates the exact risk you flagged: implementation ambiguity.

---

**WO-1839 Status: READY FOR PHASE A BUILD** (blocked only on 1828 for full integration, but static templates can start immediately).

This layer is going to be the moment the product crosses from "insight tool" to "executive decision surface." The discipline in the framing is what will make it land.

Ready when you are — either hand this off to engineering or want me to sketch the backend service stub / test cases for the templates?

This is now in a very strong state—specifically because you’ve eliminated the last category of architectural ambiguity: what the layer is allowed to do.

At this point, there’s no meaningful design disagreement left. The remaining work is purely execution hardening.

I’ll do two things to close this cleanly:

sanity-check the final spec (one subtle correction)
define the correct next build artifact (so engineering doesn’t overthink it)
1. Final Spec Check (one important tightening)

Your template set is correct, but there’s a hidden asymmetry that will matter later:

⚠️ EXECUTIVE_SYNTHESIS is currently defined as a “lens”

But in your architecture, lenses are inputs from WO-1828, not native members of WO-1839.

So EXECUTIVE_SYNTHESIS should not live in the same construct as:

CAPITAL_ALLOCATOR
RISK_MANAGER
etc.
Why this matters

If it stays there, you’ll eventually get:

dual-source lens resolution (1828 vs 1839)
ambiguity in primary-frame selection
“meta-lens overriding lens” conflicts
✔️ Correct placement

Treat EXECUTIVE_SYNTHESIS as:

a frame resolution policy, not a template

So instead of:

DECISION_TEMPLATES.EXECUTIVE_SYNTHESIS

it becomes:

FRAME_RESOLUTION_POLICY = META_LENS_HANDLER

Behavior:

consumes multiple lens outputs
selects primary frame
optionally emits collapsed secondaries

But it is not a frame itself.

This preserves your taxonomy purity.

2. What you should build next (not docs, not spec)

You are past spec-writing.

The next artifact is:

🧱 Phase A Execution Harness

Not backend logic.
Not UI polish.
Not orchestration.

A deterministic contract test rig.

Why this is the correct next step

Because WO-1839 now has:

frozen templates
deterministic JSON shape
fixed UI placement
gating rules
lens dependency (1828)

So the only remaining risk is:

implementation drift between lens output → frame rendering

You don’t want to discover that in UI.

3. Minimal Execution Harness (what engineering should build first)
Input fixture
{
  "signal": "labor volatility in manufacturing due to contract renewals",
  "lens": "CAPITAL_ALLOCATOR",
  "hp": 82
}
Expected output snapshot
{
  "primary_frame": {
    "stake": "...",
    "move": "...",
    "window": "..."
  },
  "secondary_frames": []
}
Test cases (critical)
Case 1 — HP below threshold

Expected:

NO FRAME RENDERED
Case 2 — single lens

Expected:

one deterministic frame
exact template mapping
no inference expansion
Case 3 — multi-lens

Expected:

one primary frame only
secondary frames collapsed
meta-lens resolves selection
Case 4 — identical signal, different lens

Expected:

materially different STAKE/MOVE/WINDOW
no shared phrasing leakage between templates
This is the real “go/no-go” gate

Not docs.
Not spec refinement.
Not UI alignment.

If this harness passes, WO-1839 is real.

If it fails, everything upstream (1828 included) is suspect.

4. The actual architectural state you’ve reached

To make this explicit:

You now have a clean separation of concerns:

WO-1828

Defines who is interpreting reality

WO-1839

Defines how interpreted reality becomes decision space

Conviction Gate

Defines whether interpretation is allowed to surface

That is a complete executive cognition pipeline.

Nothing is missing structurally anymore.

5. Final recommendation (strict sequencing)

Do not touch spec docs next.

Do this instead:

Build Phase A template implementation (fast, static)
Build harness tests (non-UI, deterministic)
Validate lens divergence behavior
Only then sync documentation to implementation reality
Bottom line

This is no longer an architecture design problem.

It’s now a systems integrity problem under implementation pressure.

And the correct move is exactly what you’re converging on:

lock behavior → test determinism → then document reality

If you want next step help, the only valuable thing left to spec is the lens-output contract from WO-1828 so 1839 can bind to it cleanly without ambiguity at the JSON boundary.

**Locked.** All refinements accepted. Taxonomy purity is preserved.

### Final Adjustments
**EXECUTIVE_SYNTHESIS** is now strictly a **FRAME_RESOLUTION_POLICY** (meta-handler), not a member of DECISION_TEMPLATES. It operates exclusively on outputs from WO-1828.

Updated static templates (Phase A):


ts
const DECISION_TEMPLATES = {
  CAPITAL_ALLOCATOR: {
    stake: "Capital at risk or opportunity cost in allocation decisions",
    move: "Allocate / hold / exit / adjust position",
    window: "0–8 weeks before capital commitment or review window closes"
  },

  RISK_MANAGER: {
    stake: "Exposure in operating/financial model assumptions or risk surface",
    move: "Hedge / cover / monitor / rerun stress test",
    window: "Next reporting cycle or risk review"
  },

  OPERATOR: {
    stake: "Impact on cost baseline, capacity, or execution constraints",
    move: "Absorb / redirect / accelerate / defer operations",
    window: "Current operational cycle"
  },

  GROWTH_SEEKER: {
    stake: "Market timing or competitive entry opportunity",
    move: "Enter / wait / partner / scale initiative",
    window: "Market inflection window per signal velocity"
  },

  DEFENDER: {
    stake: "Competitive threat vector or market share erosion risk",
    move: "Fortify / respond / acquire / reposition",
    window: "Pre-competitor action or churn threshold"
  }
}


**FRAME_RESOLUTION_POLICY (META_LENS_HANDLER)**  
- Triggered when ≥2 lenses active or tension detected.  
- Selects primary frame (highest conviction lens).  
- Collapses others into **SECONDARY DECISION SPACES** (explicitly non-active).  
- Pure resolution logic — no new signal generation, no confidence inflation.

This separation is now clean and future-proof.

### Phase A Execution Harness
This is the correct next artifact. Here's the minimal, deterministic harness specification ready for engineering:

#### Input Schema (from WO-1828 + Oracle)

json
{
  "findingId": "string",
  "signalSummary": "string",
  "lenses": ["CAPITAL_ALLOCATOR", "RISK_MANAGER"],  // array from WO-1828
  "hpScore": 82,
  "signalVelocity": number,  // for WINDOW hints (static Phase A)
  "cadenceContext": "string" // optional, e.g. "Q3 board review"
}


#### Output Schema

json
{
  "primaryFrame": {
    "lens": "CAPITAL_ALLOCATOR",
    "stake": "string",
    "move": "string",
    "window": "string"
  },
  "secondaryFrames": [
    {
      "lens": "RISK_MANAGER",
      "stake": "string",
      "move": "string",
      "window": "string"
    }
  ],
  "meta": {
    "hpEligible": true,
    "resolutionPolicyApplied": boolean
  }
}


#### Core Test Cases (must all pass)
1. **Below HP Threshold** (hpScore: 68):  
   → primaryFrame: null, secondaryFrames: [], no frame emitted.

2. **Single Lens** (lenses: ["OPERATOR"], HP ≥75):  
   → Exact template match, no phrasing deviation, no added inference.

3. **Multi-Lens** (lenses: ["CAPITAL_ALLOCATOR", "DEFENDER"]):  
   → One primary (highest conviction), secondaries collapsed under label, meta flag set.

4. **Lens Divergence** (same signal, different single lenses):  
   → Visibly distinct STAKE/MOVE/WINDOW across all 5 templates. No shared language bleed.

5. **Edge: Empty lenses or invalid lens** → Graceful fallback to no frame.

These are snapshot-style contract tests. Run them in CI before any UI wiring.

**Guardrails in Harness**:
- Templates are read-only constants.
- All output text must be verbatim from DECISION_TEMPLATES (no string interpolation beyond basic velocity/cadence placeholders in Phase A).
- Zero LLM calls.

### Lens-Output Contract Sketch (WO-1828 → WO-1839 boundary)
To eliminate JSON boundary risk, here's the minimal clean handoff:


ts
interface LensProfile {
  lensId: string;           // e.g. "CAPITAL_ALLOCATOR"
  conviction: number;       // 0-100, used for primary selection
  anchors: {                // optional hints for Phase B
    stakeKeywords: string[],
    moveVerbs: string[]
  };
}


WO-1828 must guarantee at least lensId + conviction per active lens. Everything else in WO-1839 stays downstream.

### Status & Sequencing
**WO-1839: PHASE A EXECUTION READY**

Correct order:
1. Implement static templates + resolution policy.
2. Build and green the Execution Harness (this is the real go/no-go).
3. Validate divergence + gate behavior.
4. Wire minimal JSX skeleton (DecisionFrameCard).
5. Only then sync spec doc to implemented reality.

The executive cognition pipeline (1828 → Conviction Gate → 1839) is now structurally complete.

This is no longer design. It’s disciplined implementation.

Ready for you to hand off to engineering, or want me to draft the full harness test file boilerplate (Jest/Vitest style) next?

This is now fully in “implementation-grade architecture”—not because it’s complex, but because it’s internally constraint-complete. There are no unresolved semantics left in WO-1839.

At this point, the only valuable next artifact is exactly what you’re implicitly converging toward:

a deterministic harness that proves the system cannot drift.

So I’ll answer directly: yes—next step is the harness, and it should be written as if it is the only thing preventing future regressions.

1. One final tightening (very small, but important)

Your contract is correct, but there is a subtle consistency improvement worth locking now:

🔧 “primary selection rule” is currently implicit

You say:

selects primary frame (highest conviction lens)

But you don’t define tie-breaking or determinism constraints.

You want this to be explicit in the harness spec:

Primary Lens Selection Rule:
1. highest conviction wins
2. if tie → deterministic order by lens priority index
3. if still unresolved → CAPITAL_ALLOCATOR default (fallback anchor lens)

Why this matters:

prevents nondeterministic CI flakiness
prevents UI jitter in multi-lens edge cases
ensures reproducible decision surfaces

This is the kind of rule that only becomes painful after deployment unless locked now.

2. Yes — the next artifact is the harness (not docs, not UI)

But I would sharpen your framing slightly:

This is not a “test file”

It is a contract validator for decision cognition stability.

That distinction matters because:

unit tests verify functions
this verifies behavioral invariants across semantic transformation layers
3. What the harness should actually look like (structure, not just schema)

If I were handing this to engineering, I would structure it like this:

📁 /wo1839/harness/decisionFrame.spec.ts
Core structure:
describe("WO-1839 Decision Frame Engine", () => {

  describe("HP Gate", () => {
    it("suppresses all frames below threshold", () => {})
  })

  describe("Single Lens Determinism", () => {
    it("maps CAPITAL_ALLOCATOR exactly to template", () => {})
    it("maps RISK_MANAGER exactly to template", () => {})
    it("maps OPERATOR exactly to template", () => {})
  })

  describe("Multi-Lens Resolution", () => {
    it("selects primary by conviction", () => {})
    it("collapses others into secondary block", () => {})
    it("applies meta-lens handler when tension exists", () => {})
  })

  describe("Lens Divergence Guarantee", () => {
    it("ensures semantic separation across templates", () => {})
  })

  describe("Invalid Input Safety", () => {
    it("handles empty lens array", () => {})
    it("handles unknown lens id", () => {})
  })

})
4. Critical addition: snapshot testing (this is where robustness comes from)

This system should not rely only on assertions.

You want golden output snapshots per lens:

/__snapshots__/decisionFrames.capitalAllocator.json
/__snapshots__/decisionFrames.riskManager.json

Why this matters:

prevents accidental wording drift (“allocate capital” → “deploy capital”)
enforces strict semantic immutability
guarantees UX consistency across refactors

This is the real enforcement layer, not the unit tests.

5. One missing test you absolutely should include

This is subtle but important:

🔥 “No generative leakage test”

You explicitly stated:

no inference, no causality, no confidence inflation

So you need a guard:

it("does not introduce tokens outside template set", () => {
  // fail if output contains:
  // - new verbs
  // - synonyms not in template
  // - causal phrases ("drives", "leads to", "suggests")
})

This is what keeps WO-1839 from slowly becoming “smart summarization again.”

6. What this harness actually is in the system

Once implemented, this becomes:

The invariant boundary between cognition and UI

Not exaggeration.

Because:

WO-1828 decides interpretation
WO-1839 decides structure of action visibility
the harness ensures neither drifts over time

That is effectively your executive cognition firewall

7. Final answer to your question

Yes:

build the harness first
treat it as a semantic contract validator, not a test suite
make snapshot drift the primary failure mode, not assertion failure
Bottom line

At this stage:

architecture = complete
taxonomy = stable
risk = implementation drift only

So the highest-leverage next artifact is exactly what you proposed:

a deterministic execution harness that locks WO-1839 behavior into reproducible output invariants

If you want the next step after this, it’s not more spec work—it’s:

wiring WO-1828 → WO-1839 integration contract and defining the lens output emulator for CI

That’s the bridge that makes the whole system testable end-to-end