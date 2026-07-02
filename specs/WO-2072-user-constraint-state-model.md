# WO-2072 — User Constraint State Model (UCSM Schema)
## STATUS: PROPOSED — bound-type table needs Founder confirm (§ below). Bottle Test PASS pending that.

WO-2068's Availability Filter (`src/engine/availabilityfilter.js`) is fully built — `CONSTRAINT_CATEGORIES`,
`makeConstraintModel()`, `registerConstraintEvaluator()`, `applyAvailabilityFilter()` all exist and work.
But nothing in the codebase ever calls `registerConstraintEvaluator()` or builds a real `constraintModel`.
The mechanism has no plugs. WO-2072 is those plugs: a concrete, typed value shape per category.

## 1. SINGLE RESPONSIBILITY
**Job:** Give each of the 7 existing `CONSTRAINT_CATEGORIES` a concrete bound type, so a real
`constraintModel` object can be constructed from user input and fed to `applyAvailabilityFilter()`.
**Output:** typed bound shape per category + one evaluator function per category.

## 2. BOUNDARY DECLARATION
**Input contract:** raw user-declared or inferred values (form input, profile data, session state).
**Output contract:** a `constraintModel` object conforming to `makeConstraintModel()`'s shape —
`{ [category]: { bound, operator, enforced } | null }` — passable directly to `filterCandidateSet()`.
**Explicit exclusions:** does NOT rank, score, or weight candidates (that's Decision Invariants /
Metric Adapter). Does NOT decide when constraints update over time (that's WO-2073, drift, separate).
Does NOT touch `applyAvailabilityFilter` or `filterCandidateSet` logic — those are already correct
and untouched.

## 3. ZERO DRIFT CONFIRMATION
- [x] Detection layer touched → N/A, this is user-state, not signal detection
- [x] Scoring layer touched → output is NOT a recommendation — confirmed, hard filter only
- [x] Inference layer touched → N/A
- [x] UI layer touched → N/A — this WO defines the data shape a future UI would populate, not the UI itself

## 4. STRATEGIC LEVERAGE STATEMENT
Without a real UCSM, Availability Gating is permanently theoretical — it filters nothing because
`constraintModel` is never populated. This closes that gap so §16/§20-grade filtering can actually run.

## 5. OUTPUT GRAVITY
**"The single thing this WO produces that matters most is a typed bound-value contract per constraint category."**

## 6. FORMULA / CONTRACT — PROPOSED BOUND TYPES (needs one-line confirm, not invented silently)

| Category | Proposed bound type | operator | Rationale |
|---|---|---|---|
| CAPITAL_ACCESS | `number` (USD, user's max deployable capital) | MAX | Direct dollar ceiling — matches existing MAX operator |
| LEGAL_ELIGIBILITY | `string[]` (licenses/accreditations held, e.g. `['ACCREDITED_INVESTOR']`) | BOOLEAN (membership test) | Eligibility is a held-credential check, not a scalar |
| GEOGRAPHY | `string[]` (ISO jurisdiction codes user operates in) | EXACT (membership) | Matches candidate's required jurisdiction against user's set |
| TIME_WINDOW | `number` (days user has available before decision must close) | MIN | Candidate's required window must be ≤ user's available days |
| EXECUTION_CAPABILITY | `number` (0–100, operational capacity score — hours/week or team size normalized) | MIN | Keeps 0–100 scale per §16, avoids a new enum vocabulary |
| RISK_TOLERANCE | `number` (0–100, user-declared or inferred) | MAX | Candidate's implied risk must be ≤ user's tolerance |
| INFORMATIONAL_ACCESS | `boolean` (does user have/can obtain required information) | BOOLEAN | Binary access, no partial credit |

**Normalization:** EXECUTION_CAPABILITY and RISK_TOLERANCE conform to the 0–100 signal scale (§16).
CAPITAL_ACCESS and TIME_WINDOW are real-world units (USD, days) by design — they gate against
real-world candidate requirements, not signal magnitude, so §16 does not apply to them.

> If this table is wrong for any category, say which — everything else in this WO is unaffected;
> categories are independent plug-ins per `registerConstraintEvaluator()`.

## 7. FILE MAP
| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/ucsm.js` (NEW) | 7 evaluator functions (one per category) + `buildConstraintModel(userProfile)` that maps raw profile fields → `makeConstraintModel()` shape, registers all 7 evaluators on import | — |
| `src/engine/availabilityfilter.js` | none | `CONSTRAINT_CATEGORIES`, `makeConstraintModel`, `registerConstraintEvaluator`, `applyAvailabilityFilter`, `filterCandidateSet` all untouched |

## 8. BOTTLE TEST
| Question | Answer |
|---|---|
| Does this reduce ambiguity in the system? | YES — turns a no-op filter into a real one |
| Does this have a single dominant output? | YES — typed constraintModel + registered evaluators |
| Are all boundaries explicitly defined? | YES, pending bound-type table confirm above |
| Can this be built without touching an undefined dependency? | YES — `availabilityfilter.js` mechanism already exists and is stable |
| Does this avoid increasing expressive flexibility in the core? | YES — fills an existing contract, adds no new categories or mechanism |

**Verdict:** PASS (pending bound-type confirm)

## 9. DEFINITION OF DONE
`grep -n "registerConstraintEvaluator" src/engine/ucsm.js` shows 7 calls (one per category).
`buildConstraintModel()` called with a sample profile produces a `constraintModel` where
`filterCandidateSet()` actually eliminates at least one synthetic candidate in a test case
(proves the plug-in is live, not just typed).
