// src/engine/gate0policy.js
// The actual Gate-0 disposition table, both vocabularies, as ruled/found this session.
// Additive. Not wired into any live surface.
//
// RKM_GENEALOGY table: transcribed verbatim from specs/SPEC-rkm-genealogy-admission-policy.md §4
// (KRYL-1133's own locked table). Not re-derived, not altered.
//
// SRE_RELATIONCORE table: transcribed verbatim from specs/SPEC-gate0-sre-dispositions.md — all
// 14 types independently assessed this session, outcome: uniform Defer (enabled: false). Per that
// document's own finding, no type may inherit a disposition from the RKM table by name-analogy
// (vocabulary amendment §7) — every SRE entry below is `enabled: false` on its own, independent
// basis, not copied from the RKM_GENEALOGY table above.

export const GATE0_POLICY = Object.freeze({
  RKM_GENEALOGY: Object.freeze({
    derivedFrom: Object.freeze({ enabled: true,  allowedOrigins: Object.freeze(['OBSERVED']) }),
    dependsOn:   Object.freeze({ enabled: true,  allowedOrigins: Object.freeze(['OBSERVED', 'INFERRED']) }),
    causes:      Object.freeze({ enabled: false }),
    causedBy:    Object.freeze({ enabled: false }),
    enables:     Object.freeze({ enabled: false }),
  }),
  SRE_RELATIONCORE: Object.freeze({
    CAUSES:          Object.freeze({ enabled: false }),
    DEPENDS_ON:      Object.freeze({ enabled: false }),
    ENABLES:         Object.freeze({ enabled: false }),
    COMPOSITION:     Object.freeze({ enabled: false }),
    CONSTRAINS:      Object.freeze({ enabled: false }),
    INHIBITS:        Object.freeze({ enabled: false }),
    MEDIATES:        Object.freeze({ enabled: false }),
    COMPETES_WITH:   Object.freeze({ enabled: false }),
    SUBSTITUTES_FOR: Object.freeze({ enabled: false }),
    COUPLED_WITH:    Object.freeze({ enabled: false }),
    RESONATES_WITH:  Object.freeze({ enabled: false }),
    DIVERGES_FROM:   Object.freeze({ enabled: false }),
    PRECEDES:        Object.freeze({ enabled: false }),
    REVEALS:         Object.freeze({ enabled: false }),
  }),
});
