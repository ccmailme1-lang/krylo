// src/engine/entityattribution.js — WO-1725 Phase A: Single-Entity Signal Injection
//
// Entity pressure attribution — tag signals by named entity at ingestion,
// weight entity contribution per domain.
//
// Phase A: static entity registry (mock affinities). Phase B: live entity API.
// Pass criteria: entity assigned to ≥2 domains, footprint ≥2, Fs≥0.70.

const ENTITY_REGISTRY = {
  'elon musk':       { CAPITAL: 0.90, TECHNOLOGY: 0.90, MEDIA: 0.95, OWNERSHIP: 0.80 },
  'sam altman':      { TECHNOLOGY: 0.95, CAPITAL: 0.85, KNOWLEDGE: 0.80 },
  'apple':           { TECHNOLOGY: 0.95, CAPITAL: 0.90, MEDIA: 0.70, OWNERSHIP: 0.60 },
  'nvidia':          { TECHNOLOGY: 0.95, CAPITAL: 0.90, OWNERSHIP: 0.50 },
  'federal reserve': { CAPITAL: 0.95, OWNERSHIP: 0.70, LABOR: 0.60 },
  'openai':          { TECHNOLOGY: 0.95, KNOWLEDGE: 0.90, CAPITAL: 0.80, MEDIA: 0.70 },
  'meta':            { MEDIA: 0.95, TECHNOLOGY: 0.85, CAPITAL: 0.80, OWNERSHIP: 0.60 },
  'google':          { TECHNOLOGY: 0.90, MEDIA: 0.80, CAPITAL: 0.85, KNOWLEDGE: 0.75 },
  'microsoft':       { TECHNOLOGY: 0.90, CAPITAL: 0.85, KNOWLEDGE: 0.70, OWNERSHIP: 0.55 },
  'amazon':          { CAPITAL: 0.90, TECHNOLOGY: 0.85, LABOR: 0.80, OWNERSHIP: 0.70 },
  'blackrock':       { CAPITAL: 0.95, OWNERSHIP: 0.90, MEDIA: 0.55 },
  'jp morgan':       { CAPITAL: 0.95, OWNERSHIP: 0.75, MEDIA: 0.60 },
};

const ATTRIBUTION_GATE = 0.30;
const FS_GATE          = 0.70;

function _normalize(name) {
  return (name ?? '').toLowerCase().trim();
}

// attributeEntityToSignals(entityName, signals)
//
// signals: [{ domain, signal, confidence }]
//
// Returns:
// {
//   entity:            string
//   known:             boolean
//   domainAttribution: [{ domain, affinity, domainPressure, attributedPressure, confidence }]
//   contributing:      domainAttribution filtered to attributedPressure >= ATTRIBUTION_GATE
//   footprint:         number  — contributing domain count
//   fs:                number  — mean confidence of contributing domains
//   qualified:         boolean — footprint >= 2 AND fs >= FS_GATE
// }
export function attributeEntityToSignals(entityName, signals) {
  const key        = _normalize(entityName);
  const affinities = ENTITY_REGISTRY[key] ?? null;
  const known      = affinities !== null;

  if (!known || !Array.isArray(signals) || signals.length === 0) {
    return { entity: entityName, known, domainAttribution: [], contributing: [], footprint: 0, fs: 0, qualified: false };
  }

  const domainAttribution = signals
    .filter(s => affinities[s.domain] !== undefined)
    .map(s => ({
      domain:             s.domain,
      affinity:           affinities[s.domain],
      domainPressure:     parseFloat(((s.signal ?? 0) / 100).toFixed(3)),
      attributedPressure: parseFloat((affinities[s.domain] * ((s.signal ?? 0) / 100)).toFixed(3)),
      confidence:         parseFloat(((s.confidence ?? 0) / 100).toFixed(3)),
    }));

  const contributing = domainAttribution.filter(d => d.attributedPressure >= ATTRIBUTION_GATE);
  const footprint    = contributing.length;
  const fs           = footprint > 0
    ? parseFloat((contributing.reduce((acc, d) => acc + d.confidence, 0) / footprint).toFixed(3))
    : 0;

  return {
    entity: entityName,
    known,
    domainAttribution,
    contributing,
    footprint,
    fs,
    qualified: footprint >= 2 && fs >= FS_GATE,
  };
}

export { ENTITY_REGISTRY, ATTRIBUTION_GATE, FS_GATE };
