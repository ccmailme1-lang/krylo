# Planning pass: benchmark, counterparty matching prerequisite, durable store, snapshot gate

Date: 2026-10-11 · Governed by `decision-record-structural-analysis-FINAL-20261011.md` (architecture closed; nothing here reopens it) · Status: benchmark section A FROZEN v1 on 2026-10-11 (approved by the Founder); other sections as marked · No implementation tickets are opened by this document. Basis labels: V = verified in the repository this week, D = from documentation or memory, not re-verified.

## A. Representative benchmark (one-pass approval)

### A1. Subjects (10; 8 industries; 5 registry-resolved, 5 admitted at runtime)

| # | Subject | Resolution | Industry |
|---|---|---|---|
| 1 | Sysco | registry | Food distribution |
| 2 | Oracle | registry | Enterprise software |
| 3 | Boeing | registry | Aerospace and defense |
| 4 | Verizon | registry | Telecommunications |
| 5 | Tesla | registry | Automotive and energy |
| 6 | Intel | runtime-admitted | Semiconductors |
| 7 | Broadcom | runtime-admitted | Semiconductors |
| 8 | Netflix | runtime-admitted | Media and entertainment |
| 9 | Boston Scientific | runtime-admitted | Medical devices |
| 10 | Costco | runtime-admitted | Retail |

Resolution status was read from the resolver this week (V). Domain coverage across all six domains is the design intent (labor from job postings, knowledge from research and patent sources, media from news and social sources); whether each subject has live signal in each domain is confirmed only by the baseline run, and a subject with no signal in a domain scores that on the evidence, not on intent. The set is frozen at approval.

### A2. Questions (12, fixed and versioned; `{S}` = the subject)

| Q | Question | Exercises |
|---|---|---|
| 1 | What structural relationships are forming around {S} across ownership, technology, and capital? | discovery, formation, synthesis (the standard question) |
| 2 | Which ownership relationships around {S} changed in the last 12 months, and what is the coverage behind that? | temporal, coverage honesty |
| 3 | What capital events involving named counterparties were reported for {S} in the last 12 months? | capital events, counterparties |
| 4 | How are the capital and ownership structures around {S} connected? | cross-domain synthesis |
| 5 | What technology relationships connect {S} to other participants? | technology coverage |
| 6 | What do labor and capital activity around {S} show, and what connects them? | labor, cross-domain |
| 7 | Which relationships around {S} dissolved or are indeterminate, and why? | temporal states, absence |
| 8 | What structure is forming across knowledge, technology and capital around {S}? | knowledge, cross-domain |
| 9 | What relationships exist between media attention and capital events around {S}? | media, cross-domain |
| 10 | What does the evidence not establish about the ownership and capital structure of {S}? | limits, unresolved |
| 11 | Across all six domains, what formation exists around {S}? | formation, six-domain coverage |
| 12 | Where do domains diverge around {S}, and on what evidence? | fracture polarity, contradiction |

### A3. Scored cases (35)

| Subject | Questions | Cases |
|---|---|---|
| Sysco | 1, 3, 7 | 3 |
| Oracle | 1, 5, 8, 11 | 4 |
| Boeing | 1, 3, 4, 12 | 4 |
| Verizon | 1, 2, 10 | 3 |
| Tesla | 1, 6, 9, 11 | 4 |
| Intel | 1, 3, 4 | 3 |
| Broadcom | 1, 2, 5, 12 | 4 |
| Netflix | 1, 8, 9 | 3 |
| Boston Scientific | 1, 3, 7, 10 | 4 |
| Costco | 1, 6, 10 | 3 |

Question 1 is asked of every subject (10); each other question is asked 2 to 4 times. Every question and every subject appears at least twice.

### A4. Scoring allocation (the decision record's rubric, section 5)

| Criterion | Points |
|---|---|
| Subject alignment | 0 to 2 |
| Relationship coverage and admission correctness | 0 to 2 |
| Formation integrity (admitted relationships only) | 0 to 1 |
| Structural depth and synthesis quality | 0 to 2 |
| Evidence attribution and traceability | 0 to 1 |
| Temporal correctness and coverage honesty | 0 to 1 |
| Consistency across Analysis, MAP and History | 0 to 1 |
| Total | 0 to 10, reported on the existing 1 to 10 scale (0 reports as 1) |

Baseline rule: the History half of the consistency criterion cannot be met before the History migration, so it scores 0 at baseline for every case; this is recorded, not adjusted.

### A5. Baseline workload

| Step | Work | Size |
|---|---|---|
| Capture | Run each case on the current system, once, and save the delivered analysis text, the snapshot id and the time to `specs/benchmark/baseline/` (automated, unattended) | 35 runs, roughly one hour of machine time |
| Score | One scorer applies the rubric to each captured analysis | 35 cases × 7 criteria = 245 judgments, one table |
| Calibration | A second, independent reviewer scores a sample | 8 cases (the 10 subjects' Question 1 pages are the natural sample) |
| Freeze | Scores are recorded and never altered | — |

Re-scoring after implementation happens at milestones only (Founder: keep the rubric light), not per ticket. Ownership of the benchmark: product.

### A6. FROZEN v1 (2026-10-11): exact case matrix, classifications and scoring rules

Approved by the Founder 2026-10-11. The 10 subjects, 12 questions and 35 cases below are the reference for measuring improvement. Later expansion is additive only; nothing here is edited or removed. Baseline scores, once recorded, are never altered.

**Classification check against the running environment (2026-10-11, V):** the five registry subjects resolve from the registry (Sysco CIK 0000096021, Oracle 0001341439, Boeing 0000012927, Verizon 0000732712, Tesla 0001318605). The five runtime subjects are not in the registry and were admitted by the SEC-filer path with outcome ADMITTED (Intel 0000050863, Broadcom 0001730168, Netflix 0001065280, Boston Scientific 0000885725, Costco 0000909832). Classifications confirmed.

**Case matrix (35 cases; ID = subject number, question number):**

| Case | Subject | Q | Case | Subject | Q | Case | Subject | Q |
|---|---|---|---|---|---|---|---|---|
| C01 | Sysco | 1 | C13 | Boeing | 1 | C25 | Broadcom | 1 |
| C02 | Sysco | 3 | C14 | Boeing | 3 | C26 | Broadcom | 2 |
| C03 | Sysco | 7 | C15 | Boeing | 4 | C27 | Broadcom | 5 |
| C04 | Oracle | 1 | C16 | Boeing | 12 | C28 | Broadcom | 12 |
| C05 | Oracle | 5 | C17 | Verizon | 1 | C29 | Netflix | 1 |
| C06 | Oracle | 8 | C18 | Verizon | 2 | C30 | Netflix | 8 |
| C07 | Oracle | 11 | C19 | Verizon | 10 | C31 | Netflix | 9 |
| C08 | Tesla | 1 | C20 | Intel | 1 | C32 | Boston Scientific | 1 |
| C09 | Tesla | 6 | C21 | Intel | 3 | C33 | Boston Scientific | 3 |
| C10 | Tesla | 9 | C22 | Intel | 4 | C34 | Boston Scientific | 7 |
| C11 | Tesla | 11 | C23 | Costco | 1 | C35 | Boston Scientific | 10 |
| C12 | Costco | 6 | C24 | Costco | 10 | | | |

Note: the table above is ordered for reading; each case's subject and question number are the reference (35 rows: Sysco 3, Oracle 4, Tesla 4, Costco 3, Boeing 4, Verizon 3, Intel 3, Broadcom 4, Netflix 3, Boston Scientific 4).

**Run rules (frozen):**
1. One run per case on the current system, from a fresh page load, using the question text in A2 with the subject name substituted; no refresh, no re-run, no edits.
2. For each run record: case id, build identifier, snapshot id, run start time, and the delivered analysis text (Analysis surface; the MAP brief text where present).
3. Cases are run in the order C01 to C35, one at a time, with the lookups allowed to settle (snapshot frozen) before capture.
4. A case that errors or shows no analysis is recorded as it appeared and scored on what was delivered; it is not re-run.

**Scoring rules (frozen):** the rubric in A4 applied to the delivered analysis only, as written. Raw total 0 to 10 maps to the 1 to 10 scale (0 reports as 1). The History half of the consistency criterion scores 0 for every case at baseline and is preserved, not retroactively rescored. One scorer scores all 35; a second, independent reviewer scores eight designated cases without seeing the first scorer's scores: C01, C04, C08, C13, C17, C20, C25 and C29 (the Question 1 case of each of eight subjects). Scorer and reviewer scores are both kept; disagreements of 2 or more points on a case are listed, not averaged away. Re-scoring after implementation happens at milestones only.

## B. CAPITAL_EVENT_INVOLVES: counterparty matching as an explicit prerequisite

The ratified criteria require a counterparty match of same entity confirmed, affiliation confirmed or transaction link confirmed. The present extractor returns names exactly as written in the filing, with no identifier (V). A name alone is at most a candidate match, and the criteria exclude it. The evidence standard is not lowered.

Therefore, before any admission of this type, a counterparty matching service is a prerequisite step in the sequence (after the benchmark and before step 3 of the decision record). What it must establish, per extracted name:

| Outcome | Requires |
|---|---|
| Same entity confirmed | A reliable shared identifier or authoritative documentation tying the name to an identified entity |
| Affiliation confirmed | A source that documents the parent, subsidiary or fund-manager relationship |
| Transaction link confirmed | The filing explicitly connects the capital event to that party |
| Candidate match / unresolved | Not admitted |

Authoritative sources to evaluate in the matching specification (not yet verified for this use): SEC entity identifiers for public filers, subsidiary lists filed as exhibits to annual reports for affiliation, and the filing text itself for the transaction link. Names with no identifier source (for example a broker-dealer subsidiary with no filer record) remain unresolved and are not admitted. Admission stays blocked until the service can return a confirmed outcome.

## C. Durable Canonical Relationship Store: recommendation

### C1. Recommendation

Use the existing engine database (PostgreSQL behind `as-diff/db.js`), as new append-only tables, with the existing file-fallback pattern for local development.

### C2. Options compared

| Criterion | Existing engine database | Server file store (the existing fallback) | New separate service or database | Browser storage |
|---|---|---|---|---|
| Durability across sessions and runtimes | Yes | Survives restart; not safe under concurrent writers or deploys | Yes | Per device only |
| Versioning | Append-only version rows with indexes | Append-only lines, manual compaction | Yes | Weak |
| Access patterns (by entity, by time, by relationship id, evidence expansion) | Indexed queries; JSONB for evidence | Full scan | Yes | Not shared |
| Snapshot consistency (a snapshot must reproduce the exact set it froze) | A snapshot stores (relationship id, version) pairs, written in one transaction | No transaction | Yes | No |
| Existing precedent in this codebase | `formation_state`, `guest_state` and `tester_telemetry` tables use the same engine database with the same file fallback (V, tables read) | Used as the fallback for those same stores (V) | None | Used today for guest convenience state only |
| New infrastructure | None | None | New service to operate | None |

### C3. Proposed shape (for the store's specification; not a design commitment beyond the storage location)

* A relationship table (one row per relationship identity: entity-scoped ids, type, current version pointer).
* An append-only version table (each admission or change is a new version: state, evidence references and provenance as JSONB, event and observation timestamps, admission outcome and criteria met).
* A snapshot table (snapshot id, query, generation time, subject scope, lookup states, the pinned temporal result, and the (relationship id, version) set it froze), written atomically.
* The legacy formation-history scrubber table (KRYL-1334) stays as it is and is replaced or migrated in the History step.

### C4. Consequences and open items

* A new server route is needed to read and write the store, and production would need its own web-server location block (D, from the infrastructure notes; a production step that requires the Founder's explicit go and is not part of this planning pass).
* Local development currently falls back to files when the database read fails (V, from the engine start-up behavior recorded this month): the file fallback must carry the same append-only version semantics so a local run and a database run behave identically.
* I did not read further into `db.js` for connection details: the repository's secret-exposure guard blocks inspection of that file, and none is needed to choose the location.
* In-memory canonical relationships (today's store) become a cache of the durable store, not a second source of truth (no parallel representation).

## D. Snapshot gate (Step 2)

KRYL-1398 is built, committed and in Review. Its on-screen review by the Founder is outstanding and is the gate before work proceeds past Step 2. The browser checks to run: hard-refresh, run one query, confirm the Checking state, the snapshot time and Refresh control, that figures do not change over time, that the By Domain panel equals the brief, and that Refresh swaps the whole analysis together.

## E. Sequence after this planning pass (unchanged except for the added prerequisite)

1. Approve this document (benchmark A, matching prerequisite B, store location C).
2. Capture and score the baseline (A5).
3. Founder on-screen review of KRYL-1398 (D).
4. Counterparty matching specification (B), then the CAPITAL_EVENT_INVOLVES admission path.
5. Durable store and temporal migration (C).
6. Formation on admitted relationships; synthesis; delivery alignment; History migration; milestone measurement, per the decision record.

No ticket is opened for a step whose dependencies are unmet.
