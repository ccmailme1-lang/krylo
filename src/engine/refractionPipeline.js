/* src/engine/refractionPipeline.js */
/* WO-266a — Refraction pipeline: scores artifact pillars */

import { refract as registrySync } from './prismRegistry.js';

const ZERO_POINT_FALLBACK = {
  uuid:        null,
  timestamp:   null,
  status:      'ZERO_POINT',
  isRefracted: false,
  pillars: {
    trust:      0,
    accuracy:   0,
    gap:        0,
    velocity:   0,
    expiration: 0,
    strength:   0,
    alignment:  0,
  },
};

function clamp(n) {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function score(artifact) {
  const text   = (artifact?.text ?? artifact?.truth_statement ?? '');
  const words  = text.trim().split(/\s+/).filter(Boolean);
  const len    = words.length;
  const fs     = artifact?.fs ?? artifact?.fidelity_score ?? 0;
  const source = (artifact?.source_type ?? artifact?.source ?? '').toLowerCase();

  // Derive raw pillar scores from available signal data
  const trust      = fs * 100;
  const accuracy   = artifact?.fidelity_components?.m_checksum  != null
    ? artifact.fidelity_components.m_checksum  * 100
    : trust * 0.9;
  const gap        = artifact?.fidelity_components?.e_viral     != null
    ? (1 - artifact.fidelity_components.e_viral) * 100
    : 50;
  const velocity   = artifact?.fidelity_components?.t_telemetry != null
    ? artifact.fidelity_components.t_telemetry * 100
    : Math.min(100, len * 4);
  const expiration = artifact?.expiration_score != null
    ? artifact.expiration_score * 100
    : Math.max(0, 80 - len * 1.5);
  const strength   = Math.min(100, len * 3 + (fs * 40));
  const alignment  = source.includes('hn') || source.includes('hackernews')
    ? 70
    : source.includes('spine') ? 50 : 60;

  return {
    trust:      clamp(trust),
    accuracy:   clamp(accuracy),
    gap:        clamp(gap),
    velocity:   clamp(velocity),
    expiration: clamp(expiration),
    strength:   clamp(strength),
    alignment:  clamp(alignment),
  };
}

/**
 * refract(artifact)
 * Scores one artifact against 7 pillars.
 * Returns ZERO_POINT_FALLBACK if raw text < 3 words.
 * Calls prismRegistry.refract() on completion.
 */
export function refract(artifact) {
  const text  = (artifact?.text ?? artifact?.truth_statement ?? '').trim();
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length < 1) return { ...ZERO_POINT_FALLBACK };

  const pillars   = score(artifact);
  const uuid      = artifact?.id ?? crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const result = {
    uuid,
    timestamp,
    status:      'REFRACTED',
    isRefracted: true,
    pillars,
  };

  registrySync(pillars);

  return result;
}
