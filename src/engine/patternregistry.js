// patternregistry.js — KRYL-1009 Pattern Registry (reusable structural detectors).
// The home for composed ObservationDefinitions (observationbuilder.js). prismRegistry.js was audited
// (§4) and is NOT a registry — it only exports refract(); so this is a dedicated store, not a
// duplicate. Registering validates the definition; evaluate() runs a stored detector against a signal
// context. Ships with one seeded detector as the canonical example.
import { validateDefinition, evaluateObservation } from './observationbuilder.js';

const _patterns = new Map();

export function registerPattern(def) {
  const v = validateDefinition(def);
  if (!v.valid) { const e = new Error(`pattern rejected: ${v.errors.join('; ')}`); e.code = 'E_INVALID_PATTERN'; e.errors = v.errors; throw e; }
  _patterns.set(def.id, Object.freeze({ ...def, operands: def.operands.map(o => ({ ...o })) }));
  return _patterns.get(def.id);
}

export function getPattern(id)  { return _patterns.get(id) ?? null; }
export function listPatterns()  { return [..._patterns.values()]; }
export function resetPatterns() { _patterns.clear(); seedPatterns(); }

// Run a stored detector by id against a signal context. Unknown id → null (never a fabricated result).
export function evaluatePattern(id, context, opts) {
  const def = _patterns.get(id);
  return def ? evaluateObservation(def, context, opts) : null;
}

// Canonical seed — the ticket's own example: an emergent theme from four co-observed structural signals.
export const SEED_PATTERNS = [
  {
    id:    'ai-infra-expansion',
    name:  'AI Infrastructure Expansion',
    gate:  'AND',
    theme: 'TECHNOLOGY',
    operands: [
      { signalKey: 'power_permits', comparator: '>=', threshold: 1 },
      { signalKey: 'fiber',         comparator: '>=', threshold: 1 },
      { signalKey: 'hiring',        comparator: '>=', threshold: 1 },
      { signalKey: 'water',         comparator: '>=', threshold: 1 },
    ],
  },
];

function seedPatterns() { for (const p of SEED_PATTERNS) registerPattern(p); }
seedPatterns();
