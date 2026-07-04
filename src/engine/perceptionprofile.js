// KRYL-981 — Perception-as-a-Service: Domain Profile Projection
// Service-layer abstraction only. Sells access to structural fingerprints (KRYL-976)
// and historical-frequency data (KRYL-978), never a decision. No modification of
// CI-R gating, RBCS aggregation logic, or core model architecture.
//
// Enforcement: every DomainProfile write goes through
// calibrationengine.verifyDomainProfile() first — see that file for the
// RBCS-immutability guard. This module never re-implements that check; it calls it.
//
// Calibration tiers (renamed from ML-training-suggestive FFT/PFT/LFT/NFT to avoid
// implying internal model tuning — none of these touch core inference, embeddings,
// or gradient paths; they only control how many DomainProfile fields are non-default):
//   FP — Full Profile:      maximal conditioning sensitivity (all 5 floors + all
//                            presentation knobs may be non-default)
//   PP — Partial Profile:   constrained feature sensitivity (floors only, no
//                            presentation adjustments)
//   LP — Linear Profile:    scalar output adjustment only (a single floor may be
//                            non-default)
//   RP — Retrieval Profile: similarity-only projection — matches KRYL-978's
//                            Stage-1 retrieval-only baseline, zero non-default fields

import { verifyDomainProfile, CALIBRATABLE_LEVERS, getCalibrated } from './calibrationengine.js';

export const INTERPRETATION_TIERS = ['FP', 'PP', 'LP', 'RP'];

const TIER_MAX_NON_DEFAULT_FLOORS = { FP: 5, PP: 5, LP: 1, RP: 0 };
const TIER_ALLOWS_PRESENTATION    = { FP: true, PP: false, LP: false, RP: false };

const _domainProfiles = new Map(); // domain_id -> DomainProfile

/**
 * registerDomainProfile — validate and store a DomainProfile.
 * FM1: invalid domain profile -> defaults to RP (the least invasive, most
 * conservative mode) rather than rejecting outright.
 */
export function registerDomainProfile(profile) {
  try {
    verifyDomainProfile(profile);
  } catch (e) {
    // FM1: invalid profile -> default to RP mode, zero floor overrides
    _domainProfiles.set(profile?.domain_id ?? 'unknown', {
      domain_id: profile?.domain_id ?? 'unknown',
      interpretation_tier: 'RP',
      floors: {},
      presentation: {},
      fallback_reason: e.code ?? 'E_UNKNOWN',
    });
    return { ok: false, fallback: 'RP', reason: e.code ?? 'E_UNKNOWN' };
  }

  const tier = INTERPRETATION_TIERS.includes(profile.interpretation_tier)
    ? profile.interpretation_tier
    : 'RP';

  const floors = {};
  for (const lever of CALIBRATABLE_LEVERS) {
    if (profile[lever] !== undefined) floors[lever] = profile[lever];
  }
  const nonDefaultCount = Object.keys(floors).length;

  // FM2: calibration mismatch (tier's non-default budget exceeded) -> fallback to
  // last stable profile if one exists, else RP.
  if (nonDefaultCount > TIER_MAX_NON_DEFAULT_FLOORS[tier]) {
    const stable = _domainProfiles.get(profile.domain_id);
    if (stable) return { ok: false, fallback: 'LAST_STABLE', profile: stable };
    _domainProfiles.set(profile.domain_id, {
      domain_id: profile.domain_id, interpretation_tier: 'RP', floors: {}, presentation: {},
      fallback_reason: 'TIER_BUDGET_EXCEEDED',
    });
    return { ok: false, fallback: 'RP', reason: 'TIER_BUDGET_EXCEEDED' };
  }

  const presentation = TIER_ALLOWS_PRESENTATION[tier]
    ? {
        additive_explain_boost: profile.additive_explain_boost ?? 0,
        summary_length_target:  profile.summary_length_target ?? null,
      }
    : {};

  const record = { domain_id: profile.domain_id, interpretation_tier: tier, floors, presentation };
  _domainProfiles.set(profile.domain_id, record);
  return { ok: true, profile: record };
}

export function getDomainProfile(domain_id) {
  return _domainProfiles.get(domain_id) ?? null;
}

export function resetDomainProfiles() {
  _domainProfiles.clear();
}

/**
 * Project — stateless mapping from a core output to a domain-specific presentation.
 * Does NOT modify Output_core. Generates a presentation-layer projection only.
 * FM3: output instability (non-finite result) -> revert to core uncalibrated output.
 */
export function Project(outputCore, domainProfile) {
  if (!domainProfile) return { ...outputCore, _projection: 'NONE' };

  const { presentation = {} } = domainProfile;
  const explainBoost = presentation.additive_explain_boost ?? 0;

  const projected = {
    ...outputCore,
    _projection: {
      domain_id: domainProfile.domain_id,
      interpretation_tier: domainProfile.interpretation_tier,
      explain_boost_applied: explainBoost,
    },
  };

  // FM3: guard against a non-finite result ever leaking into the response —
  // revert to the untouched core output if projection produced something unusable.
  if (typeof outputCore?.score === 'number' && !Number.isFinite(outputCore.score + explainBoost)) {
    return { ...outputCore, _projection: 'REVERTED_UNSTABLE' };
  }

  return projected;
}

/**
 * runPerception — top-level entry point: resolve a domain's calibrated floors
 * (via calibrationengine.getCalibrated, respecting whatever the global calibration
 * loop has already tuned) and produce a PerceptionResponse for a given core output.
 *
 * Output = Output_core (unchanged) — PerceptionResponse = Project(Output, DomainProfile).
 */
export function runPerception(domain_id, outputCore) {
  const profile = getDomainProfile(domain_id);
  const perceptionResponse = Project(outputCore, profile);

  return {
    output: outputCore,                 // core output, untouched
    calibration_mode: profile?.interpretation_tier ?? 'RP',
    confidence: outputCore?.score ?? null,
    perceptionResponse,
  };
}
