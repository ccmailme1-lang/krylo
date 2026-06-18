# WO-1763 — VETERAN Domain

STATUS: BACKLOG — scoped, not built.
ORIGIN: Batch IDs 101–120 (2026-06-16). "Veteran" keyword fires in every
query but has no matching synthesizer — falls to HEALTH or GENERAL, both wrong.
Founder confirmed: needs its own domain.

## Problem

Veteran queries have a distinct synthesizer shape with no overlap with
existing domains:

- HEALTH covers Medicaid waivers, PT/OT, adaptive equipment, pediatric programs
- GENERAL covers fallback / low-signal queries
- Neither covers VA benefits, GI Bill, disability ratings, VA home loans,
  TAP employment transition, veteran-owned business loans (SBA VBOC),
  PTSD/mental health (VHA), or surviving spouse benefits (DIC/SBP)

Currently "veteran" + "VA" + "military" queries route to HEALTH (if the
protected entity registry catches them) or GENERAL. Both produce wrong output.

## Domain shape

**Keyword triggers (proposed):**
`veteran`, `VA`, `GI bill`, `military`, `service-connected`, `disability rating`,
`VBA`, `VHA`, `TAP`, `DD-214`, `vet center`, `tricare`, `PTSD`, `honorable discharge`,
`combat`, `deployment`, `active duty`, `reserve`, `national guard`

**Synthesizer needs (proposed — `synthVeteran()`):**
- VA disability rating + compensation (C&P exam, 10–100% scale)
- GI Bill education benefits (Post-9/11 vs Montgomery, BAH entitlement)
- VA home loan (no down payment, funding fee, entitlement/COE)
- VHA healthcare enrollment (Priority Groups 1–8, copay tiers)
- TAP / employment transition (VSO referral, SkillBridge, federal hiring preference)
- Surviving spouse: DIC + SBP + dependency and indemnity compensation
- Veteran-owned business: SBA VBOC, SDVOSB set-aside contracts

**Protected entity registry:** Add to `PROTECTED_ENTITY_REGISTRY.VETERAN` in
`src/engine/ingress.js` — same pattern as HEALTH. Queries containing veteran
identifiers must lock to VETERAN domain unconditionally before keyword router runs.

## Dependencies

- WO-1703 (HEALTH domain ingress normalization — same pattern to follow)
- WO-RTP-001 (domain isolation Phase A — same protected entity gate)
- WO-1761(b) fix should ship first — word-boundary guards will prevent
  `veteran` from being contaminated by other substring tokens

## Pass criteria

- "What VA benefits am I eligible for after 8 years active duty?" → VETERAN
- "How does my disability rating affect my VA home loan entitlement?" → VETERAN
- "GI Bill BAH rate for a dependent student in Austin TX" → VETERAN
- "Veteran" keyword in a non-veteran query (e.g. "veteran car dealer") → does NOT
  lock to VETERAN — protected entity gate must require veteran-context companion signals
- Fs ≥ 0.70 on a full veteran query with known benefit fields populated

## Not started

No code written. Spec only.
