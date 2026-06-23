# WO HARDENING TEMPLATE
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-1841 — Market Context Vector Primitive**
Date: 2026-06-23
Author: Mr. XS / Claude
Target file(s): src/engine/mcvresolver.js (NEW)

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Create the MCV primitive — a new engine file that accepts query + session and returns a normalized 6-field structural regime vector derived from intent-space features only. No geography. No lookup. No market data.

**Output:** `src/engine/mcvresolver.js` exporting `resolveMCV(query, session)` → MCV object.

---

## 2. BOUNDARY DECLARATION

**Input contract:**
- `query` — raw user query string
- `session.lens` — persona key (used for transaction class override where lens = REALTOR → REAL_ESTATE)

**Output contract:**
```js
{
  price_regime:       Number,  // 0–100
  inventory_pressure: Number,  // 0–100
  credit_tightness:   Number,  // 0–100
  demand_intensity:   Number,  // 0–100
  liquidity_flow:     Number,  // 0–100
  policy_sensitivity: Number,  // 0–100
  _meta: {
    transactionClass: String,  // REAL_ESTATE | AUTO | CAREER | RETIREMENT | GENERAL
    budgetBand:       String,  // LUXURY | HIGH | MID | ENTRY | NONE
    urgency:          String,  // HIGH | MEDIUM | LOW | NONE
    leverageIntent:   String,  // NECESSITY | OPPORTUNISTIC | NEUTRAL
    phase:            'A',
  }
}
```

**Explicit exclusions:**
- Does NOT import from querysynthesis.js, pliengine.js, or any existing engine
- Does NOT read geographic terms — strips them silently
- Does NOT write to any store or session — pure function, no side effects
- Does NOT use fetch, async, or external data
- `_meta` is audit-only — never enters any scoring path

---

## 3. ZERO DRIFT CONFIRMATION

- [x] New file only — zero changes to existing files
- [x] No imports from existing engine — standalone primitive
- [x] No side effects — pure input → output function

**Drift notes:** WO-1842 wires this into querysynthesis. This WO only creates the resolver.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** MCV is the grounding function of the entire system. Every downstream metric (D, E, ASSEMBLANCE, WINDOW) that WO-1842 and WO-1843 reform depends on this primitive being deterministic, geography-free, and fully testable in isolation.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a deterministic, geography-free structural regime vector that any downstream module can consume without knowing anything about the query's location."**

---

## 6. FORMULA / CONTRACT

### Signal Extraction

**Transaction Class** (from query + lens):
```
if session.lens === 'REALTOR' → REAL_ESTATE
else detect from query:
  REAL_ESTATE:  /\bhouse\b|\bhome\b.*\b(buy|purchase|mortgage)\b|\bproperty\b|\bcondo\b|\bapartment\b|\breal estate\b|\blisting\b|\bmortgage\b/i
  AUTO:         /\bcar\b|\bvehicle\b|\bauto\b|\btruck\b|\bsuv\b|\blease\b.*\bcar\b/i
  CAREER:       /\bsalary\b|\bjob\b|\bhire\b|\bnegotiat\b|\boffer\b.*\b(accept|counter)\b|\bcompensation\b/i
  RETIREMENT:   /\bretire\b|\b401k\b|\bpension\b|\bsocial security\b|\brmds?\b/i
  GENERAL:      fallback
```

**Budget Band** (from query):
```
LUXURY:  /\$\s*[1-9]\d{6,}|\b[1-9]\d*\.?\d*\s*m(illion)?\b/i         (> $1M)
HIGH:    /\$\s*[6-9]\d{5}|\b[6-9]\d{2}\s*k\b/i                         ($600k–$1M)
MID:     /\$\s*[2-5]\d{5}|\b[2-5]\d{2}\s*k\b/i                         ($200k–$600k)
ENTRY:   /\$\s*\d{1,5}(?!\d)|\b[1-9]\d?\s*k\b|\bafford\b|\bentry\b/i  (< $200k)
NONE:    no match
```

**Urgency**:
```
HIGH:   /\bneed to\b|\bhave to\b|\bmust\b|\bnow\b|\burgent\b|\bdeadline\b|\bclosing\b|\bimmediately\b/i
MEDIUM: /\bwant to\b|\blooking to\b|\bplanning\b|\bconsidering\b/i
LOW:    /\bthinking about\b|\bexploring\b|\bcurious\b|\beventually\b|\bsomeday\b/i
NONE:   no match → treated as MEDIUM in delta computation
```

**Leverage Intent**:
```
NECESSITY:     /\bhave to move\b|\bforced\b|\brelocation\b|\bdivorce\b|\bcan't afford\b|\bno choice\b/i
OPPORTUNISTIC: /\bgood time\b|\bmarket dip\b|\bdeal\b|\bopportunity\b|\binvestment\b|\btiming\b/i
NEUTRAL:       no match
```

### Anchor Values (per transaction class)

| Field              | REAL_ESTATE | AUTO | CAREER | RETIREMENT | GENERAL |
|--------------------|-------------|------|--------|------------|---------|
| price_regime       | 60          | 50   | 55     | 45         | 50      |
| inventory_pressure | 65          | 45   | 50     | 30         | 50      |
| credit_tightness   | 60          | 45   | 20     | 35         | 40      |
| demand_intensity   | 50          | 50   | 50     | 50         | 50      |
| liquidity_flow     | 50          | 60   | 70     | 40         | 55      |
| policy_sensitivity | 65          | 35   | 30     | 70         | 40      |

### Delta Rules

**price_regime** ← budget band:
```
LUXURY +20 | HIGH +10 | MID ±0 | ENTRY -15 | NONE ±0
```

**inventory_pressure** ← urgency:
```
HIGH +10 | MEDIUM ±0 | LOW -10 | NONE ±0
```

**credit_tightness** ← budget band:
```
LUXURY +10 | HIGH +5 | MID ±0 | ENTRY +5 | NONE ±0
```

**demand_intensity** ← urgency + leverage intent (additive):
```
urgency:         HIGH +20 | MEDIUM +5 | LOW -15 | NONE ±0
leverage intent: NECESSITY +15 | OPPORTUNISTIC +5 | NEUTRAL ±0
```

**liquidity_flow** ← budget band + leverage intent (additive):
```
budget:          LUXURY +10 | MID ±0 | ENTRY -10 | NONE ±0
leverage intent: NECESSITY -10 | OPPORTUNISTIC +5 | NEUTRAL ±0
```

**policy_sensitivity**: structural only — no deltas.

**Clamp**: all fields → `Math.max(0, Math.min(100, anchor + deltas))`

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| src/engine/mcvresolver.js | CREATE — full resolver | — |

Zero existing files touched.

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — geographic identity replaced with deterministic structural vector |
| Does this have a single dominant output? | YES — one exported function, one output contract |
| Are all boundaries explicitly defined? | YES — pure function, no side effects, no external reads |
| Can this be built without touching an undefined dependency? | YES — standalone |
| Does this avoid increasing expressive flexibility in the core? | YES — deterministic anchors + deltas, no inference |

**Verdict:** PASS

---

## 9. DEFINITION OF DONE

```
node -e "
  const { resolveMCV } = require('./src/engine/mcvresolver.js');
  const r = resolveMCV('i want to buy a home in long island', { lens: 'GENERAL' });
  console.log(r);
  console.assert(r.price_regime >= 0 && r.price_regime <= 100);
  console.assert(r._meta.transactionClass === 'REAL_ESTATE');
  console.assert(r._meta.phase === 'A');
  console.log('PASS');
"
```

Must return a valid MCV object with `_meta.transactionClass === 'REAL_ESTATE'`, all 6 fields in [0,100], and no geographic identifiers in any field.
