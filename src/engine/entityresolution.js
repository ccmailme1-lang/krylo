// WO-2041 — Entity Resolution Kernel (ERK)
// Single responsibility: given a raw name string, return a canonical entity card.
// No signal dispatch. No graph traversal. No surfacerouter import.
// Phase A — name normalization + registry lookup only.
// Phase B (WO-2046) will add cross-source identifier joins (FEC↔UEI↔EDGAR).

import REGISTRY from '../data/entityregistry.json';
import { nodeId } from './entitytopologyregistry.js';

// Corporate suffix strip list — remove before matching
const SUFFIX_RE = /\b(INCORPORATED|CORPORATION|INTERNATIONAL|TECHNOLOGIES|TECHNOLOGY|ENTERPRISES|ENTERPRISE|INDUSTRIES|INDUSTRY|SOLUTIONS|SOLUTION|HOLDINGS|HOLDING|SERVICES|SERVICE|SYSTEMS|SYSTEM|GLOBAL|GROUP|COMPANY|ASSOCIATES|PARTNERS|NETWORKS|NETWORK|INC|LLC|CORP|LTD|LP|LLP|PLC|CO|AG|SA|NV|BV|GMBH)\b\.?/g;

// Normalize: uppercase → strip punctuation → strip suffixes → collapse whitespace
export function normalize(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s&]/g, ' ')
    .replace(/&/g, ' AND ')
    .replace(SUFFIX_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Stable slug from normalized name — used as canonicalId
export function buildCanonicalId(name) {
  return normalize(name).toLowerCase().replace(/\s+/g, '-');
}

// Jaccard similarity on token sets
function jaccard(a, b) {
  const ta = new Set(a.split(' ').filter(Boolean));
  const tb = new Set(b.split(' ').filter(Boolean));
  const intersection = [...ta].filter(t => tb.has(t)).length;
  const union = new Set([...ta, ...tb]).size;
  return union === 0 ? 0 : intersection / union;
}

// Build a flat normalized index from the registry (built once at module load)
const INDEX = REGISTRY.flatMap(entity => {
  const entries = [entity.canonicalName, ...entity.aliases].map(name => ({
    norm: normalize(name),
    entity,
  }));
  return entries;
});

/**
 * resolve(name) → entity card | null
 *
 * Returns:
 *   { canonicalId, canonicalName, aliases, identifiers, domainTags, confidence }
 *   or null if no match meets the threshold (WITHHOLD beats fabricate)
 *
 * confidence:
 *   1.0  = exact match
 *   0.85–0.99 = fuzzy match above threshold
 *   null = no result returned
 */
export function resolve(name) {
  if (!name || typeof name !== 'string') return null;
  const norm = normalize(name);
  if (!norm) return null;

  // Pass 1 — exact match
  for (const { norm: candidateNorm, entity } of INDEX) {
    if (candidateNorm === norm) {
      return { ...entity, confidence: 1.0 };
    }
  }

  // Pass 2 — fuzzy match (Jaccard ≥ 0.85)
  let best = null;
  let bestScore = 0;
  for (const { norm: candidateNorm, entity } of INDEX) {
    const score = jaccard(norm, candidateNorm);
    if (score > bestScore) {
      bestScore = score;
      best = entity;
    }
  }

  if (best && bestScore >= 0.85) {
    return { ...best, confidence: bestScore };
  }

  return null;
}

/**
 * resolveAll(names) → Map<string, entity|null>
 * Batch resolve. Input names are the map keys.
 */
export function resolveAll(names) {
  const result = new Map();
  for (const name of names) {
    result.set(name, resolve(name));
  }
  return result;
}

/**
 * resolveByIdentifier(source, id) → entity | null
 * Look up by known source ID (edgar CIK, fec committee ID, UEI).
 * source: 'edgar' | 'fec' | 'uei'
 */
export function resolveByIdentifier(source, id) {
  if (!source || !id) return null;
  const normalizedId = String(id).replace(/^0+/, ''); // strip leading zeros for EDGAR CIKs
  for (const entity of REGISTRY) {
    const entityId = entity.identifiers?.[source];
    if (!entityId) continue;
    if (String(entityId).replace(/^0+/, '') === normalizedId) {
      return { ...entity, confidence: 1.0 };
    }
  }
  return null;
}

/**
 * resolveAny(ref) → entity | null
 * KRYL-1007 — single type-sniffing entry point for consumers that don't know the
 * ref kind (CRE anchors, connector payloads). Routing:
 *   all-digits           → EDGAR CIK  (identifier match, authoritative)
 *   1-5 uppercase letters → ticker     (falls back to name if not a known ticker)
 *   otherwise            → fuzzy name resolve
 * Identifier matches beat name matches (a CIK/ticker is exact truth; a name is fuzzy).
 */
export function resolveAny(ref) {
  if (!ref || typeof ref !== 'string') return null;
  const s = ref.trim();
  if (!s) return null;

  // CIK — all digits (EDGAR CIKs are ≤ 10, often zero-padded)
  if (/^\d{1,10}$/.test(s)) return resolveByIdentifier('edgar', s);

  // Ticker — 1-5 uppercase letters, optional dotted share class (e.g. BRK.B)
  if (/^[A-Z]{1,5}(\.[A-Z])?$/.test(s)) {
    const byTicker = resolveByIdentifier('ticker', s);
    if (byTicker) return byTicker;
    // not a known ticker — fall through to name resolution
  }

  return resolve(s);
}

/**
 * toTopologyNodeId(ref) → string
 * KRYL-1011 — resolve a raw subject to the node id the topology graph is keyed by,
 * so the Causal Impact Map can take "GOOGLE" instead of a pre-normalized id. Reuses
 * the registry's OWN nodeId() so a resolved subject keys EXACTLY like registered
 * edges (CIK-first for stable identity, else canonical name). An unresolved ref
 * falls back to a best-effort nodeId of the raw string — callers can detect this by
 * comparing against resolveAny(ref) being null (unresolved -> no grounded identity).
 */
export function toTopologyNodeId(ref) {
  const card = resolveAny(ref);
  return nodeId(card?.identifiers?.edgar, card?.canonicalName ?? ref);
}

/**
 * listByDomain(domain) → entity[]
 * Return all registry entities tagged for a given KRYLO domain.
 */
export function listByDomain(domain) {
  return REGISTRY.filter(e => e.domainTags.includes(domain));
}
