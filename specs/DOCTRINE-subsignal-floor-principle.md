# DRAFT DOCTRINE — SUBSIGNAL FLOOR PRINCIPLE
Status: DRAFT — proposed new CLAUDE.md section (§25). Not locked. Founder review required
before it goes into CLAUDE.md as binding doctrine, per the existing pattern (§17–§24 are all
Founder-directive-dated).
Date: 2026-08-01
Author: drafted by agent at Founder's explicit request ("spec both now while it's fresh")

---

## WHY THIS IS A FORMALIZATION, NOT A NEW INVENTION

Checked against the actual codebase before writing this — same discipline §21's own text
uses ("this is not a new invention... this section makes the discipline explicit"):

- §16 (Signal Ingestion Architecture) already requires every connector to normalize to 0–100
  and dispatch as `{ source, domain, signal, confidence, ts }` before it touches anything else.
  That tuple already *is* the subsignal — the codebase just has never named it.
- §21 (Route-Don't-Aggregate) already forbids collapsing signals into a composite before
  routing — the same reasoning the "subsignal is not evidence" distinction rests on.
- §22 (Absence-is-Signal) already treats absence as a classified state, not a null — that's a
  subsignal-layer concept (a perceptual delta), stated at a level above where it belongs.

What's genuinely new here is naming the floor explicitly and drawing the layer boundary in one
place, so future WOs stop treating "subsignal" and "signal" as interchangeable. This section
does **not** require any code change by itself — see the separate WO
(`WO-subsignal-fanout-substrate.md`) for the one real architectural implication (fan-out reads),
which is scoped and gated separately.

---

## PROPOSED SECTION TEXT

### 25. SUBSIGNAL FLOOR PRINCIPLE (PROPOSED — NOT YET LOCKED)

A **subsignal** is the system's lowest perceptual primitive: a single measurable
perturbation from background, produced by one connector, at one point in time. It is the
`{ source, domain, signal, confidence, ts }` tuple every connector already emits under §16.

A subsignal is **not evidence**. It is an observation contributing to a possible formation.
It says only: *"something is measurably different from background."* It never says:
*"I know what it means."*

**FLOOR, NOT A STAGE.** A subsignal is not step one of a pipeline that transforms it into a
signal, which transforms into a formation, which transforms into a claim. It is a substrate
multiple independent structures may be derived from — the same subsignal field can feed
signal detection, anomaly detection, trend detection, absence detection, and formation
detection without any of those consuming or mutating it. Analogy already in use elsewhere in
this doctrine (the ampullae framing from the KRYLO product story): the receptor does not
detect "prey" — it samples a field of electrical deltas; interpretation happens above the
sensing layer, never inside it.

**THE LAYER BOUNDARY (do not collapse):**

```
Observation  →  Subsignal Floor  →  Signal  →  Formation  →  Claim / Interpretation
                 (§16 tuple,          (RKM/       (IB          (Decision /
                  no meaning           RBCS        collapse,    Export,
                  claimed)             scored)     stabilized)  human-facing)
```

**FAILURE MODE THIS GUARDS AGAINST:** skipping layers and asserting meaning a subsignal
cannot support on its own.

- Subsignal: *"Three accounts changed wording."*
- WRONG (collapses two layers): *"They are coordinating."*
- CORRECT: *"A linguistic-alignment subsignal has emerged."* — stays at the floor until
  enough independent subsignals cohere into a Signal, and enough Signals stabilize into a
  Formation, per the existing pipeline (CI-F → CI-R → RBCS → LFOS → IB).

**RELATIONSHIP TO EXISTING DOCTRINE:** this does not change §16, §21, or §22 — it names the
floor those sections already assume exists. §21's routing discipline is what keeps a
subsignal from being aggregated before it's allowed to be. §22's absence categories are
subsignal-floor states, not signal-level ones.

**ENFORCEMENT (honest boundary, same pattern as §22):** this is naming/vocabulary only as of
2026-08-01. Nothing in the codebase currently *reads* the subsignal floor as a shared,
multi-consumer substrate — today it is consumed exactly once, by the CI-F→RBCS→LFOS→IB
chain. Making the floor actually fan-out-capable is a separate, scoped WO (see
`WO-subsignal-fanout-substrate.md`), not implied by this doctrine's existence.

---

## OPEN QUESTION FOR FOUNDER

Section number: this draft assumes §25 (next after §24 Secret Exposure Guardrail). If other
doctrine has been locked since 2026-07-31 that isn't reflected in this session's copy of
CLAUDE.md, renumber before merging.
