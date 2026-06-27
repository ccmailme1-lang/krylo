// WO-2005A — Signal Epistemic Taxonomy (Governance Layer)
// Immutable descriptor map for every evidence class.
// CONTAINS NO SCORING LOGIC. No numeric values except booleans.
// Calibrated properties (anchorStrength, independencePrior) live in structuralconfirmation.js.
//
// Constitutional invariants:
//   Admission Invariant:      descriptors SHALL NOT influence ingestion, routing, or cone pressure.
//   Interpretation Invariant: descriptors MAY influence identity + corroboration after admission.
//   "Parity governs admission. Epistemics governs interpretation."

export const EPISTEMIC_CLASS = {
  STRUCTURAL:  'STRUCTURAL',   // physically costly or impossible to fabricate at scale
  OPERATIONAL: 'OPERATIONAL',  // costly to fake at organizational scale
  FINANCIAL:   'FINANCIAL',    // constrained by legal liability
  NARRATIVE:   'NARRATIVE',    // manageable and retractable
  SPECULATIVE: 'SPECULATIVE',  // trivially manufactured
};

export const CANONICAL_ROLE = {
  LONG_TERM_BASELINE: 'LONG_TERM_BASELINE', // updates expected operating envelope; doesn't create events alone
  STATE_TRANSITION:   'STATE_TRANSITION',   // creates or strengthens an existing CanonicalEvent
  CAUSAL_PRECURSOR:   'CAUSAL_PRECURSOR',   // precedes public narrative; high Happy Path discovery weight
  ENTITY_LINKED:      'ENTITY_LINKED',      // strengthens attribution to a specific company/facility/region
  ANOMALY_DETECTOR:   'ANOMALY_DETECTOR',   // does not create identity alone — requests corroboration
};

export const PERSISTENCE = {
  INSTANT:   'INSTANT',    // hours
  SHORT:     'SHORT',      // days
  MEDIUM:    'MEDIUM',     // weeks–months
  LONG:      'LONG',       // months–years
  VERY_LONG: 'VERY_LONG',  // years
};

export const PREDICTIVE_HORIZON = {
  HOURS:  'HOURS',
  DAYS:   'DAYS',
  WEEKS:  'WEEKS',
  MONTHS: 'MONTHS',
  YEARS:  'YEARS',
};

export const DECAY_MODEL = {
  NONE:        'NONE',
  LINEAR:      'LINEAR',
  EXPONENTIAL: 'EXPONENTIAL',
};

// EVIDENCE_DESCRIPTORS — intrinsic properties only.
// Never add anchorStrength, independencePrior, or any numeric tunable here.
//
// entityBound: true  → independence is CONDITIONAL on entity attribution quality.
//              false → ambient physical/aggregate signal; independence is intrinsic.
// Structural confirmation discount for unverified entity-bound signals: see structuralconfirmation.js.
export const EVIDENCE_DESCRIPTORS = {
  // ── Structural (T1) ────────────────────────────────────────────────────────
  POWER_CONSUMPTION: {
    epistemicClass:           EPISTEMIC_CLASS.STRUCTURAL,
    persistence:              PERSISTENCE.LONG,
    predictiveHorizon:        PREDICTIVE_HORIZON.MONTHS,
    decayModel:               DECAY_MODEL.LINEAR,
    canonicalRole:            CANONICAL_ROLE.LONG_TERM_BASELINE,
    entityBound:              false,   // grid-level aggregate; no attribution required
    canCreateCanonicalEvent:  false,
    canStrengthenCanonicalEvent: true,
    canSplitCanonicalEvent:   false,
  },
  POWER_LOAD: {
    epistemicClass:           EPISTEMIC_CLASS.STRUCTURAL,
    persistence:              PERSISTENCE.SHORT,
    predictiveHorizon:        PREDICTIVE_HORIZON.DAYS,
    decayModel:               DECAY_MODEL.EXPONENTIAL,
    canonicalRole:            CANONICAL_ROLE.STATE_TRANSITION,
    entityBound:              false,   // regional grid signal
    canCreateCanonicalEvent:  true,
    canStrengthenCanonicalEvent: true,
    canSplitCanonicalEvent:   false,
  },
  POWER_INFRA: {
    epistemicClass:           EPISTEMIC_CLASS.STRUCTURAL,
    persistence:              PERSISTENCE.VERY_LONG,
    predictiveHorizon:        PREDICTIVE_HORIZON.YEARS,
    decayModel:               DECAY_MODEL.NONE,
    canonicalRole:            CANONICAL_ROLE.CAUSAL_PRECURSOR,
    entityBound:              false,   // regional infrastructure; entity tag is optional enrichment
    canCreateCanonicalEvent:  true,
    canStrengthenCanonicalEvent: true,
    canSplitCanonicalEvent:   true,
  },
  POWER_DATACENTER_DEMAND: {
    epistemicClass:           EPISTEMIC_CLASS.STRUCTURAL,
    persistence:              PERSISTENCE.MEDIUM,
    predictiveHorizon:        PREDICTIVE_HORIZON.MONTHS,
    decayModel:               DECAY_MODEL.LINEAR,
    canonicalRole:            CANONICAL_ROLE.ENTITY_LINKED,
    entityBound:              true,    // demand attributed to specific facility/operator
    canCreateCanonicalEvent:  true,
    canStrengthenCanonicalEvent: true,
    canSplitCanonicalEvent:   false,
  },
  POWER_DISCONTINUITY: {
    epistemicClass:           EPISTEMIC_CLASS.STRUCTURAL,
    persistence:              PERSISTENCE.INSTANT,
    predictiveHorizon:        PREDICTIVE_HORIZON.DAYS,
    decayModel:               DECAY_MODEL.EXPONENTIAL,
    canonicalRole:            CANONICAL_ROLE.ANOMALY_DETECTOR,
    entityBound:              false,   // grid event; not entity-attributed by nature
    canCreateCanonicalEvent:  false,
    canStrengthenCanonicalEvent: true,
    canSplitCanonicalEvent:   false,
  },
  WATER_USAGE: {
    epistemicClass:           EPISTEMIC_CLASS.STRUCTURAL,
    persistence:              PERSISTENCE.LONG,
    predictiveHorizon:        PREDICTIVE_HORIZON.MONTHS,
    decayModel:               DECAY_MODEL.LINEAR,
    canonicalRole:            CANONICAL_ROLE.LONG_TERM_BASELINE,
    entityBound:              false,   // municipal/watershed aggregate
    canCreateCanonicalEvent:  false,
    canStrengthenCanonicalEvent: true,
    canSplitCanonicalEvent:   false,
  },
  NETWORK_TRAFFIC: {
    epistemicClass:           EPISTEMIC_CLASS.STRUCTURAL,
    persistence:              PERSISTENCE.SHORT,
    predictiveHorizon:        PREDICTIVE_HORIZON.DAYS,
    decayModel:               DECAY_MODEL.EXPONENTIAL,
    canonicalRole:            CANONICAL_ROLE.STATE_TRANSITION,
    entityBound:              false,   // internet backbone aggregate
    canCreateCanonicalEvent:  true,
    canStrengthenCanonicalEvent: true,
    canSplitCanonicalEvent:   false,
  },
  FREIGHT_LOGISTICS: {
    epistemicClass:           EPISTEMIC_CLASS.STRUCTURAL,
    persistence:              PERSISTENCE.MEDIUM,
    predictiveHorizon:        PREDICTIVE_HORIZON.MONTHS,
    decayModel:               DECAY_MODEL.LINEAR,
    canonicalRole:            CANONICAL_ROLE.CAUSAL_PRECURSOR,
    entityBound:              false,   // port/lane-level aggregate; not entity-specific by default
    canCreateCanonicalEvent:  true,
    canStrengthenCanonicalEvent: true,
    canSplitCanonicalEvent:   false,
  },
  CONSTRUCTION_PERMITS: {
    epistemicClass:           EPISTEMIC_CLASS.STRUCTURAL,
    persistence:              PERSISTENCE.VERY_LONG,
    predictiveHorizon:        PREDICTIVE_HORIZON.YEARS,
    decayModel:               DECAY_MODEL.NONE,
    canonicalRole:            CANONICAL_ROLE.CAUSAL_PRECURSOR,
    entityBound:              true,    // tied to specific applicant + parcel; unverified → discount
    canCreateCanonicalEvent:  true,
    canStrengthenCanonicalEvent: true,
    canSplitCanonicalEvent:   true,
  },
  COMPUTE_CAPACITY: {
    epistemicClass:           EPISTEMIC_CLASS.STRUCTURAL,
    persistence:              PERSISTENCE.MEDIUM,
    predictiveHorizon:        PREDICTIVE_HORIZON.MONTHS,
    decayModel:               DECAY_MODEL.LINEAR,
    canonicalRole:            CANONICAL_ROLE.ENTITY_LINKED,
    entityBound:              true,    // attributed to specific provider/facility
    canCreateCanonicalEvent:  true,
    canStrengthenCanonicalEvent: true,
    canSplitCanonicalEvent:   false,
  },

  // ── Financial (T3) ─────────────────────────────────────────────────────────
  SEC_FILING: {
    epistemicClass:           EPISTEMIC_CLASS.FINANCIAL,
    persistence:              PERSISTENCE.LONG,
    predictiveHorizon:        PREDICTIVE_HORIZON.MONTHS,
    decayModel:               DECAY_MODEL.LINEAR,
    canonicalRole:            CANONICAL_ROLE.ENTITY_LINKED,
    entityBound:              true,    // specific filer; CIK-verifiable
    canCreateCanonicalEvent:  true,
    canStrengthenCanonicalEvent: true,
    canSplitCanonicalEvent:   false,
  },
  EARNINGS_CALL: {
    epistemicClass:           EPISTEMIC_CLASS.FINANCIAL,
    persistence:              PERSISTENCE.MEDIUM,
    predictiveHorizon:        PREDICTIVE_HORIZON.MONTHS,
    decayModel:               DECAY_MODEL.LINEAR,
    canonicalRole:            CANONICAL_ROLE.ENTITY_LINKED,
    entityBound:              true,    // specific company; ticker-verifiable
    canCreateCanonicalEvent:  true,
    canStrengthenCanonicalEvent: true,
    canSplitCanonicalEvent:   false,
  },

  // ── Narrative (T4) ─────────────────────────────────────────────────────────
  ANALYST_REPORT: {
    epistemicClass:           EPISTEMIC_CLASS.NARRATIVE,
    persistence:              PERSISTENCE.SHORT,
    predictiveHorizon:        PREDICTIVE_HORIZON.WEEKS,
    decayModel:               DECAY_MODEL.EXPONENTIAL,
    canonicalRole:            CANONICAL_ROLE.STATE_TRANSITION,
    entityBound:              true,    // subject entity must be verified for attribution
    canCreateCanonicalEvent:  false,
    canStrengthenCanonicalEvent: true,
    canSplitCanonicalEvent:   false,
  },
  NEWS_ARTICLE: {
    epistemicClass:           EPISTEMIC_CLASS.NARRATIVE,
    persistence:              PERSISTENCE.SHORT,
    predictiveHorizon:        PREDICTIVE_HORIZON.DAYS,
    decayModel:               DECAY_MODEL.EXPONENTIAL,
    canonicalRole:            CANONICAL_ROLE.STATE_TRANSITION,
    entityBound:              true,    // entity-specific coverage; unverified → discount
    canCreateCanonicalEvent:  false,
    canStrengthenCanonicalEvent: true,
    canSplitCanonicalEvent:   false,
  },
  PRESS_RELEASE: {
    epistemicClass:           EPISTEMIC_CLASS.NARRATIVE,
    persistence:              PERSISTENCE.SHORT,
    predictiveHorizon:        PREDICTIVE_HORIZON.DAYS,
    decayModel:               DECAY_MODEL.EXPONENTIAL,
    canonicalRole:            CANONICAL_ROLE.STATE_TRANSITION,
    entityBound:              true,    // issuer must be verified
    canCreateCanonicalEvent:  false,
    canStrengthenCanonicalEvent: true,
    canSplitCanonicalEvent:   false,
  },

  // ── Speculative (T5) ───────────────────────────────────────────────────────
  SOCIAL_MEDIA: {
    epistemicClass:           EPISTEMIC_CLASS.SPECULATIVE,
    persistence:              PERSISTENCE.INSTANT,
    predictiveHorizon:        PREDICTIVE_HORIZON.HOURS,
    decayModel:               DECAY_MODEL.EXPONENTIAL,
    canonicalRole:            CANONICAL_ROLE.ANOMALY_DETECTOR,
    entityBound:              false,   // ambient sentiment aggregate; entity tag optional
    canCreateCanonicalEvent:  false,
    canStrengthenCanonicalEvent: false,
    canSplitCanonicalEvent:   false,
  },
};

// getDescriptor — returns the intrinsic descriptor for a given evidenceType, or null.
export function getDescriptor(evidenceType) {
  return EVIDENCE_DESCRIPTORS[evidenceType] ?? null;
}

// listByClass — returns all evidenceTypes belonging to a given epistemic class.
export function listByClass(epistemicClass) {
  return Object.entries(EVIDENCE_DESCRIPTORS)
    .filter(([, d]) => d.epistemicClass === epistemicClass)
    .map(([type]) => type);
}
