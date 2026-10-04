# Analysis Packet: Canonical Truth Engine / MVC architecture (Track 2 of the Canonical Truth Engine spec)

Label on filing: needs-spec. Type: Task. Project KRYL.
Full architecture reference: specs/SPEC-canonical-truth-engine-mvc.md (SAB quorum 7/7 CONCUR + Founder review, 2026-09-27). BLOCKED per CLAUDE.md §10 (a TBD in the File Map/Formula = BLOCKED): the per-section field set and the definitive Result State enumeration are explicitly not frozen in the spec and must be authored/ratified before this leaves needs-spec.

## 1. Original intent
Governing principle (verbatim from the ratified spec): "KRYLO has one truth. The interface does not create truth. It renders truth." Establish one canonical analytical result per analysis execution, computed once and immutable for that execution, with Result State as a property of that result (not a separate processing stage). Every view (ANALYSIS | MAP | RECON | IMPACT) becomes a read-only renderer of that single result; the Export Brief becomes a derived transformation of the same result. No view may create, reinterpret, establish, or manufacture an analytical fact, relationship, formation, evidence status, or absence.

## 2. Acceptance criteria
- MAP, RECON, and IMPACT render from one shared canonical result per execution — verified by diffing the data each tab actually consumes, not by inspecting rendered output alone.
- Result State exists as a property of the canonical result (values TBD — see Dependencies) and conditions the behavior of every downstream surface, including whether the Export Brief generates its full shape or the Track-1 Unresolved Query summary.
- No view creates, reinterprets, establishes, or manufactures analytical facts, relationships, formations, evidence status, or absences (Model -> View boundary in the spec); views only select, order, filter, or visualize.
- The Controller layer (System Status, Intent, Horizon, Structural Field, Signal Scope) stays UI/session state only and never analysis output.
- Every section's field set is validated against real outputs before being frozen, confirming no field requires a view to reinterpret it.

## 3. Current implementation state — Maturity B (primitives exist; composed capability does not); verification L/C/R (per file, see below)
Not started. Existing first steps toward this, traced and reused, not rebuilt: src/engine/reconnpayload.js assembleReconnPayload (~185) and ratifyIntent (~43); src/engine/narrativeassembly.js assembleNarrative (~243), questionStage (~33), contextStage (~39); src/engine/analysisintent.js buildAnalysisIntent and buildInterpretationLedger (~264, the 00 QUESTION & INTERPRETATION contract). The defect this ticket fixes: src/engine/querysynthesis.js synthesizeQuery is currently invoked independently by 5+ surfaces (src/components/analysis/targetpacket.jsx ~283, intelligencebrief.jsx ~473, recondashboard.jsx ~30, actionmatrix.jsx ~174, analysisidlefield.jsx), each with independent authority to assemble its own output rather than reading one shared result. src/engine/domaingravity.js (getQueryDomainPressure, getAllDomainPressures, getDomainSignals) is the ambient pool several of those surfaces read directly; whether/how it feeds the canonical result is an explicitly open question in the spec, not decided here.

## 4. Dependencies
BLOCKING, must be authored/ratified before implementation starts (CLAUDE.md §10 TBD = BLOCKED): (a) the definitive Result State enumeration (spec's SUBJECT-BOUND / FIELD-BOUND / PARTIALLY-BOUND / UNRESOLVED / NO OBSERVATION values are explicitly illustrative, not final); (b) the per-section field set inside 01 OBSERVATION through 05 STRUCTURAL LIMITS (OBSERVES / SIGNAL / RELATIONSHIP / RELEVANCE etc. must be validated against real outputs, not assumed). Shared Data/Function Change Gate (CLAUDE.md §2) applies to every call site of synthesizeQuery() and every domaingravity.js consumer before any is touched. No dependency on Track 1 (the immediate UX fixes ship independently and first).

## 5. Superseded by a newer ticket?
No. This is the architectural half of specs/SPEC-canonical-truth-engine-mvc.md; the immediate-fix half is filed separately (Track 1).

## 6. Still maps to the current KRYLO product model?
Yes. Directly implements the closed-loop/route-don't-aggregate discipline already in CLAUDE.md §17 (routing operates on atomic signals, aggregation only after routing) and §18 (orthogonal axis integrity) at the level of an entire analysis execution rather than a single metric.
