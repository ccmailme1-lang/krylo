# WO HARDENING — EDGAR 8-K Event Connector
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-2047 — EDGAR 8-K Event Connector**
Date: 2026-06-30
Author: Mr. XS + Agent
Target file(s): src/engine/connectors/edgar8kconnector.js (NEW)

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Poll SEC EDGAR full-text search for 8-K filings, resolve entities, classify events, compute groundedness + materiality, and produce RealityObjects via rkmstore.js.

**One question answered:** "What objectively happened?" — structured corporate disclosures as first-class grounded events.

---

## 2. BOUNDARY DECLARATION

**Input contract:**
- EDGAR full-text search API via `/api/edgar` proxy — same proxy as WO-1720
- `entityresolution.js` — `resolve()` read-only
- `rkmstore.js` — `createObject()` write consumer

**Output contract:**
- `RealityObject[]` from `runEdgar8KSync()` — one per new unique filing
- `getProcessedEvents()` — flat log for WO-2051 to consume and dispatch
- `getDeadLetter()` — failed events isolated from pipeline

**Explicit exclusions:**
- NO `surfacerouter` — no `dispatchBatch()` (WO-2051 owns that boundary)
- NO `metricsengine` — no metric computation
- NO UI — no JSX, no React
- NO inference — no synthesis, no scoring beyond groundedness/materiality
- NO EDGAR Form D — that is WO-1720 / `useedgarsignals.js`
- NO deletion from dedup store — idempotency is permanent

---

## 3. ZERO DRIFT CONFIRMATION

- [x] No inference performed inside the connector — eventClass derived deterministically from item number map only
- [x] Groundedness is a fixed formula (0.98 for resolved entity, 0.85 for unresolved), not a model output
- [x] Materiality formula uses item number floors + count bonus — no ML, no narrative analysis
- [x] Pipeline failures route to dead-letter queue — never halt the connector

**Drift notes:** This connector is a transform layer, not an intelligence layer. Raw EDGAR payload never leaves the connector.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** Grounds every downstream signal in verifiable, signed legal disclosures — making EDGAR 8-K the highest-confidence event source in the platform (groundedness 0.98) and anchoring Happy Path convergence to objectively real corporate actions.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a RealityObject per 8-K filing — a deterministic, provenance-complete, epistemically-verified knowledge primitive with zero inference contamination."**

---

## 6. FORMULA / CONTRACT

### Item → Event Class map (locked)
| Item | Event Class |
|------|-------------|
| 1.01 | MATERIAL_CONTRACT |
| 1.02 | CONTRACT_TERMINATION |
| 1.03 | BANKRUPTCY |
| 2.01 | ACQUISITION |
| 2.02 | EARNINGS_ANNOUNCEMENT |
| 2.03 | DEBT_ISSUANCE |
| 2.04 | BANKRUPTCY_TRIGGER |
| 2.05 | OPERATIONAL_SHUTDOWN |
| 3.01 | DELISTING_NOTICE |
| 3.02 | EQUITY_OFFERING |
| 4.01 | AUDITOR_CHANGE |
| 4.02 | FINANCIAL_RESTATEMENT |
| 5.01 | CHANGE_IN_CONTROL |
| 5.02 | EXECUTIVE_CHANGE |
| 7.01 | REGULATORY_ACTION |
| 8.01 | UNKNOWN_MATERIAL_EVENT |
| 9.01 | null (exhibit — skip) |
| unknown | UNKNOWN_MATERIAL_EVENT |

### Groundedness formula (locked)
```
groundedness = entity resolved ? 0.98 : 0.85
```
8-K = signed legal disclosure under Reg FD. Maximum groundedness class. Only downgraded if entity could not be resolved.

### Materiality formula (locked)
```
base = HIGH_MATERIALITY_ITEM ? 70 : 40
bonus = min(20, (itemCount - 1) × 5)
materiality = min(100, base + bonus)
```
High-materiality items: 1.03, 2.01, 2.03, 2.04, 3.01, 4.01, 5.01, 5.02, 4.02

### Dedup key (locked)
```
key = CIK.padStart(10, '0') + '::' + accessionNumber
```
Same filing always produces same key. Never re-processed.

### Epistemic weight
All 8-K evidence → `STRUCTURAL` (1.0) — legal disclosure is the highest-confidence class.

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/connectors/edgar8kconnector.js` | NEW — runEdgar8KSync / processHit / getProcessedEvents / getDeadLetter | — |
| `src/engine/rkmstore.js` | READ + WRITE — createObject() consumer | No structural change |
| `src/engine/entityresolution.js` | READ-ONLY — resolve() consumer | No structural change |
| `src/engine/evidencetiers.js` | READ-ONLY — EPISTEMIC_CLASS.STRUCTURAL | No structural change |

No other files touched.

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — EDGAR 8-K becomes first-class grounded event, not a narrative signal |
| Does this have a single dominant output? | YES — RealityObject per filing |
| Are all boundaries explicitly defined? | YES — no surfacerouter, no metricsengine, no Form D, no inference |
| Can this be built without touching an undefined dependency? | YES — entityresolution, rkmstore, evidencetiers all exist |
| Does this avoid increasing expressive flexibility in core? | YES — deterministic transform only; item→eventClass map is locked |

**Verdict: PASS**

---

## 9. DEFINITION OF DONE

1. `grep -n "dispatchBatch\|surfacerouter\|metricsengine" src/engine/connectors/edgar8kconnector.js` → zero results
2. `runEdgar8KSync()` with same mock hit called twice → second call returns `{ new: 0, skipped: 1 }` (dedup works)
3. Hit with item "5.02" → RealityObject with `metadata.eventClass === 'EXECUTIVE_CHANGE'`
4. Hit with no matching item → `metadata.eventClass === 'UNKNOWN_MATERIAL_EVENT'`
5. Malformed hit → added to dead-letter queue; `runEdgar8KSync()` still returns without throw
6. `getProcessedEvents()` returns array including the processed filing's entry
