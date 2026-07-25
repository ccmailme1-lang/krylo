// src/engine/formationprospectusproducer.js
// KRYL-1117 — live wrapper. Runs the full chain end to end and returns the frozen prospectus the surface
// renders:  Signal Pool → Perception Producer → Inference Core → Prospectus Assembly.
//
// Pure composition — no new logic, no visual decisions. The one place the live pool is read for the
// prospectus. Injectable `source` (via opts) so it stays testable; live pool by default.

import { buildPerceptionField } from './perceptionread.js';
import { inferFormation } from './formationinference.js';
import { buildFormationProspectus } from './formationprospectus.js';

/**
 * buildLiveProspectus — the live Structural Intelligence Prospectus for the current field.
 * @param {{ windowMs?, now?, source?, drift?, floor?, coPresenceFloor? }} opts
 * @returns frozen prospectus (withheld/INSUFFICIENT when no formation clears the floor)
 */
export function buildLiveProspectus(opts = {}) {
  const field = buildPerceptionField(opts);                    // pool → uncollapsed particles (§21)
  const formation = inferFormation(field.particles, opts);     // Formation | null
  return buildFormationProspectus(formation, { ...opts, windowMs: field.windowMs });
}
