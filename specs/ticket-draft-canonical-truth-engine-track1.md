# Analysis Packet: immediate UX containment (Track 1 of the Canonical Truth Engine spec)

Label on filing: needs-spec. Type: Task. Project KRYL.
Full architecture reference: specs/SPEC-canonical-truth-engine-mvc.md (SAB quorum 7/7 CONCUR + Founder review, 2026-09-27). This ticket is Track 1 only — the independently shippable guest-experience fixes. Track 2 (the canonical result / MVC rearchitecture) is a separate ticket (KRYL ticket, Track 2) and is a dependency for nothing in this one.

## 1. Original intent
Three guest-facing failures, each reproduced live on 2026-09-27 against the query "vendor platform + technology / architecture changes and amazon" (an unresolved-subject query): (a) an unresolved query is presented as if a successful subject-bound analysis occurred, with 176 ambient-field observations shown before any clear result-state signal; (b) internal identifiers (KRYL-####, WO-####, DEF-####, SPEC ... §...) leak into guest-facing narrative, READ block, and Brief text; (c) the Export Brief fully renders (four sections, several empty) even when SUBJECT: NO SUBJECT RESOLVED and DECISION VERDICT NOT PRODUCED. Fix all three without waiting on the larger canonical-result rearchitecture.

## 2. Acceptance criteria
- An unresolved-subject query leads with QUESTION / INTERPRETATION / RESULT STATE before any ambient field data; a semantic boundary makes explicit that the field observation is not about the guest's named subject (an unresolved query must never be presented as a subject-bound analysis).
- No KRYL-####, WO-####, DEF-####, or SPEC ... § string appears in any guest-facing render of the Target Packet, narrative, READ block, or Export Brief (verified by string search across the rendered output for the test query).
- When the result is unresolved/unbound, the Export Brief renders a single-page "Unresolved Query" summary, not the full four-section shape with empty PRECURSORS/ASSUMPTIONS/RISKS/OPPORTUNITIES rows.
- Exact copy and layout for the state-before-volume boundary and the Unresolved Query summary are Founder/SAB design authority (CLAUDE.md §5) — not decided by this ticket; the spec's illustrative shape is a reference, not a frozen design.

## 3. Current implementation state — Maturity B/C (primitives exist; the described guest-facing behavior does not); verification R (all three failures reproduced live, 2026-09-27)
Not started. Traced touch points: src/components/analysis/targetpacket.jsx (renders the narrative, READ block, and the ambient-field fallback for an unresolved subject); src/components/analysis/intelligencebrief.jsx (Export Brief; currently generates the full four-section shape regardless of resolution state, ~line 473 onward); src/engine/analysisintent.js buildInterpretationLedger (~line 264, the existing ledger read by both consumers). Internal-identifier strings are authored directly in querysynthesis.js's canned narrative/measure text (confirmed present in guest-rendered output during the 2026-09-27 live trace) and in the Formation/Attention sections of targetpacket.jsx.

## 4. Dependencies
None on Track 2 (this ticket does not require the canonical-result rearchitecture). Touches src/components/analysis/targetpacket.jsx and src/components/analysis/intelligencebrief.jsx, both shared surfaces — the Shared Data/Function Change Gate (CLAUDE.md §2) applies before editing any function both consume. Relates to (does not depend on) KRYL-1324 (Semantic Integrity Boundary) and the RECONN payload work (KRYL-1311).

## 5. Superseded by a newer ticket?
No. This is the immediate-fix half of specs/SPEC-canonical-truth-engine-mvc.md; the canonical-architecture half is filed separately (Track 2).

## 6. Still maps to the current KRYLO product model?
Yes. Enforces CLAUDE.md §21 (FORMATION IS NOT A VERDICT — presenting structure honestly) and §1 (Absence-Is-Signal — a stated absence, not a manufactured one) by making the existing "not carried" / "no subject resolved" facts legible before volume, rather than changing what is observed or withheld.
