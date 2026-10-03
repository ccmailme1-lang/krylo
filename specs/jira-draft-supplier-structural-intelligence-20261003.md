# Jira draft — External Supplier Structural Intelligence tickets

Not yet filed. Blocked on Jira API token rotation (previous token exposed 2026-10-03, see
incident note in session). File these via the standard script pattern (specs/jira.md,
execFileSync with credentials in a file, never a literal arg) once a fresh token is in
specs/jira.md.

Spec reference: `specs/SPEC-external-supplier-structural-intelligence.md`

---

## Ticket 1

**Summary:** Repair EDGAR beneficial-ownership connector (form-code bug) — default live source for Supplier Structural Intelligence

**1. Original intent**
Repair the confirmed-broken HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE production path so it can serve
as the live external observation connector required by
specs/SPEC-external-supplier-structural-intelligence.md Section 17. secownershipconnector.js:53
sends EDGAR the wrong root-form code ('SC 13D,SC 13G') instead of EDGAR's real value
('SCHEDULE 13D,SCHEDULE 13G') — confirmed live against efts.sec.gov on 2026-10-03: the correct
code returns 954 real hits in a single month, the current code returns 0 regardless of date
window or entity.

**2. Acceptance criteria**
forms param corrected in secownershipconnector.js (both runSecOwnershipSync and
runTargetedOwnershipObservation share the same searchOwnershipFilings() helper, so one fix covers
both). A real targeted observation against a real CIK returns at least one real admitted
HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE relationship via admitAndProject(), verified live against the
real EDGAR endpoint — not unit-test only, per the Reachability Gate SOP (CLAUDE.md Section 10).
Existing unit tests/QA updated to assert against the corrected form code.

**3. Current implementation state**
Bug confirmed live 2026-10-03, not yet fixed. Fix is a one-line literal-string change plus live
verification against the real EDGAR search-index endpoint.

**4. Dependencies**
None — self-contained bug fix in an existing connector. Is itself the named default prerequisite
for specs/SPEC-external-supplier-structural-intelligence.md Section 17's first-proof path (the
lower-cost alternative to building a new ACQUIRED/M&A connector from scratch).

**5. Superseded by a newer ticket?**
No — net new finding, 2026-10-03.

**6. Maps to current KRYLO product model?**
Yes — restores a ratified relationship type (KRYL-1339/1340) to actual production function, and
directly unblocks the cheapest path to Supplier Structural Intelligence's exit criterion.

---

## Ticket 2

**Summary:** Procurement vendor -> canonical entity resolution layer (Supplier Structural Intelligence Section 4)

**1. Original intent**
Build the procurement-vendor -> canonical-entity resolution layer specified in
specs/SPEC-external-supplier-structural-intelligence.md Section 4 — the spec names this "the
critical missing bridge" in Section 8; Section 4 is the identity-resolution step that Section 8's
join depends on.

**2. Acceptance criteria**
Per spec Section 4: resolves a procurement vendor to a canonical entity with disposition RESOLVED
/ MULTIPLE_MATCHES / NO_MATCH / UNRESOLVED. Retains full resolution provenance on every resolution
(source, source record, observed name, resolved canonical ID when resolved, resolution method,
observation timestamp, disposition). No silent substitution. A vendor never enters canonical
relationship evaluation merely because its name resembles a public company — no name-only
relationship admission.

**3. Current implementation state**
Missing entirely — confirmed via spec Section 16 status table ("Government vendor -> canonical
entity bridge: Missing"). Existing entityresolution.js (resolveAny()/toTopologyNodeId()) resolves
already-known entities by identifier (CIK); it does not disambiguate raw vendor names against
multiple candidates — a different problem than this ticket.

**4. Dependencies**
A real vendor/award input source is needed to test against end-to-end — KRYL-1352 (SAM.gov Entity
Management API, direction locked, not yet implemented) is the spec's intended real source
(Section 3). This ticket can be built and tested against a small, bounded, manually-supplied
vendor list per spec Section 9's scale constraint without waiting on KRYL-1352. Full Gate change
under CLAUDE.md Section 10 (new admission path / identity-resolution layer) — the 9-question
reachability gate is required before closure, not just the acceptance criteria above.

**5. Superseded by a newer ticket?**
No.

**6. Maps to current KRYLO product model?**
Yes — directly the foundational layer named in specs/SPEC-external-supplier-structural-intelligence.md.

---

## Ticket 3

**Summary:** Supplier -> ρ portfolio join, bounded batch evaluation, and portfolio UI (Supplier Structural Intelligence Section 8/9/14 — exit criterion)

**1. Original intent**
Build the supplier<->relationship join (spec Section 8), bounded portfolio evaluation (spec
Section 9), and portfolio structural UI (spec Sections 14/15) — the integration that proves
specs/SPEC-external-supplier-structural-intelligence.md Section 17's single bounded end-to-end
path: real vendor -> entity resolution -> external observation -> canonical ρ -> supplier join ->
portfolio view.

**2. Acceptance criteria**
Per spec Section 15 (Portfolio + UI): a real vendor list is evaluated in batch; each vendor
receives an evidence-backed disposition (RESOLVED/NO_MATCH/UNRESOLVED/MULTIPLE_MATCHES, plus
NO_EVIDENCE when resolved but unsupported); every admitted relationship is traceable to both
canonical entities and original source evidence; UI supports the traversal Vendor -> canonical
entity -> evidenced relationship -> source evidence -> structural state with no identity leakage
and no unsupported inference. Batching, rate-limit handling, and failure/retry behavior for every
external source used are documented per spec Section 9 — no one-request-per-vendor assumption
without verifying the source's real limits.

**3. Current implementation state**
Missing entirely — no supplier-to-ρ join, no batch vendor evaluation, no portfolio UI exist today
(spec Section 16 status table).

**4. Dependencies**
Blocks on both: the vendor -> canonical-entity resolution layer (Ticket 2 above) and at least one
live external observation connector (Ticket 1 above — EDGAR repair is the spec's named default
first-proof connector per Section 17). Full Gate change under CLAUDE.md Section 10 — the
9-question reachability gate is required before closure.

**5. Superseded by a newer ticket?**
No.

**6. Maps to current KRYLO product model?**
Yes — this is the literal exit criterion of specs/SPEC-external-supplier-structural-intelligence.md
Section 17.
