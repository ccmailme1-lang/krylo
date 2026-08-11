// WO-2041 — Entity Resolution Kernel (ERK)
// Single responsibility: given a raw name string, return a canonical entity card.
// No signal dispatch. No graph traversal. No surfacerouter import.
// Phase A — name normalization + registry lookup only.
// Phase B (WO-2046) will add cross-source identifier joins (FEC↔UEI↔EDGAR).

import REGISTRY from '../data/entityregistry.json' with { type: 'json' };
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

// ── O extension (additive, KRYL-Lean-Ontology) — runtime entity lifecycle ──────────
// The static REGISTRY (entityregistry.json, 56 hand-curated entries) is a build-time
// import — immutable at runtime, cannot be written to. This adds a SEPARATE in-memory
// runtime registry for entities created/updated after the app is running, without
// touching the static registry or its existing read path (resolve/resolveAll above are
// extended, not replaced — every existing caller's behavior for the 56 static entities
// is unchanged).
//
// Static entities are immutable (matches audit 003's finding: "no mutation functions,
// hand-curated, 56-entry file" — that's a deliberate curation boundary, not a bug to
// paper over). upsertEntity/mergeEntity therefore only operate on runtime-created
// entities; attempting either on a static canonicalId returns null rather than silently
// no-op'ing or throwing.
const RUNTIME_REGISTRY = new Map(); // canonicalId -> entity
const RUNTIME_INDEX = [];           // same shape as INDEX above, kept in sync

function isStaticId(canonicalId) {
  return REGISTRY.some(e => e.canonicalId === canonicalId);
}

function reindexRuntimeEntity(entity) {
  // Remove any stale index entries for this entity, then rebuild from current aliases.
  for (let i = RUNTIME_INDEX.length - 1; i >= 0; i--) {
    if (RUNTIME_INDEX[i].entity.canonicalId === entity.canonicalId) RUNTIME_INDEX.splice(i, 1);
  }
  for (const name of [entity.canonicalName, ...entity.aliases]) {
    RUNTIME_INDEX.push({ norm: normalize(name), entity });
  }
}

/**
 * createEntity({canonicalName, aliases, identifiers, domainTags}) → entity card
 *
 * Idempotent creation (rc3 O requirement): if an entity already resolves confidently
 * (via the existing resolve() path, static or runtime) for canonicalName, that existing
 * entity is returned unchanged rather than creating a duplicate — matches WO-2004's
 * "id uniqueness" discipline applied to O instead of E.
 */
export function createEntity({ canonicalName, aliases = [], identifiers = {}, domainTags = [] } = {}) {
  if (!canonicalName || typeof canonicalName !== 'string') return null;

  const existing = resolve(canonicalName);
  if (existing && existing.confidence === 1.0) return existing;

  const canonicalId = buildCanonicalId(canonicalName);
  if (isStaticId(canonicalId) || RUNTIME_REGISTRY.has(canonicalId)) {
    // Slug collision without an exact-name resolve hit — different name, same slug.
    // Do not silently overwrite; caller must resolve the collision explicitly.
    return null;
  }

  const now = new Date().toISOString();
  const entity = {
    canonicalId,
    canonicalName,
    aliases: [...aliases],
    identifiers: { edgar: null, fec: null, uei: null, ...identifiers },
    domainTags: [...domainTags],
    createdAt: now,
    updatedAt: now,
    mergedInto: null, // set by mergeEntity when this entity is superseded
  };
  RUNTIME_REGISTRY.set(canonicalId, entity);
  reindexRuntimeEntity(entity);
  return { ...entity, confidence: 1.0 };
}

/**
 * upsertEntity(canonicalId, patch) → updated entity card, or null
 * Only operates on runtime-created entities — static entities are immutable (see header
 * note). patch may update aliases/identifiers/domainTags; canonicalId/canonicalName/
 * createdAt are immutable provenance fields and are never overwritten by a patch.
 */
export function upsertEntity(canonicalId, patch = {}) {
  if (isStaticId(canonicalId)) return null;
  const current = RUNTIME_REGISTRY.get(canonicalId);
  if (!current) return null;

  const updated = {
    ...current,
    aliases:     patch.aliases     ?? current.aliases,
    identifiers: patch.identifiers ? { ...current.identifiers, ...patch.identifiers } : current.identifiers,
    domainTags:  patch.domainTags  ?? current.domainTags,
    updatedAt:   new Date().toISOString(),
  };
  RUNTIME_REGISTRY.set(canonicalId, updated);
  reindexRuntimeEntity(updated);
  return { ...updated, confidence: 1.0 };
}

/**
 * mergeEntity(survivorId, mergedId) → survivor entity card, or null
 * Only operates on runtime-created entities. The merged entity is NOT deleted (matches
 * WO-2004's immutable/no-deletion discipline, identitykernel.js's FRAGMENTED status
 * pattern) — it stays in RUNTIME_REGISTRY with mergedInto set, so any code already
 * holding its canonicalId can still look it up and be redirected, and its history is
 * never silently erased.
 */
export function mergeEntity(survivorId, mergedId) {
  if (isStaticId(survivorId) || isStaticId(mergedId)) return null;
  const survivor = RUNTIME_REGISTRY.get(survivorId);
  const merged   = RUNTIME_REGISTRY.get(mergedId);
  if (!survivor || !merged) return null;

  const mergedAliases = [...new Set([...survivor.aliases, merged.canonicalName, ...merged.aliases])];
  const mergedIdentifiers = { ...merged.identifiers, ...survivor.identifiers }; // survivor's own values win on conflict
  const updatedSurvivor = {
    ...survivor,
    aliases:     mergedAliases,
    identifiers: mergedIdentifiers,
    domainTags:  [...new Set([...survivor.domainTags, ...merged.domainTags])],
    updatedAt:   new Date().toISOString(),
  };
  RUNTIME_REGISTRY.set(survivorId, updatedSurvivor);
  RUNTIME_REGISTRY.set(mergedId, { ...merged, mergedInto: survivorId, updatedAt: new Date().toISOString() });
  reindexRuntimeEntity(updatedSurvivor);
  // Merged entity's own aliases now also resolve to the survivor.
  for (let i = RUNTIME_INDEX.length - 1; i >= 0; i--) {
    if (RUNTIME_INDEX[i].entity.canonicalId === mergedId) RUNTIME_INDEX[i] = { ...RUNTIME_INDEX[i], entity: updatedSurvivor };
  }
  return { ...updatedSurvivor, confidence: 1.0 };
}

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

  // Static index first, runtime-created entities second — preserves the exact existing
  // match order/behavior for all 56 curated entities; runtime entities are additive.
  const searchIndex = RUNTIME_INDEX.length ? [...INDEX, ...RUNTIME_INDEX] : INDEX;

  // Pass 1 — exact match
  for (const { norm: candidateNorm, entity } of searchIndex) {
    if (candidateNorm === norm) {
      return { ...entity, confidence: 1.0 };
    }
  }

  // Pass 2 — fuzzy match (Jaccard ≥ 0.85)
  let best = null;
  let bestScore = 0;
  for (const { norm: candidateNorm, entity } of searchIndex) {
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

/**
 * validateRegistry(registry) → { valid, errors[] }
 * KRYL-1007 — the registry is the single source of entity truth, so its integrity is load-bearing.
 * A duplicate identifier or an alias that resolves to two entities is SILENT corruption: a lookup
 * returns the wrong entity and every downstream join inherits it (§23 orthogonality — one alias must
 * map to exactly one identity). This is a data-integrity gate, callable from CI. Checks:
 *   1. no duplicate CIK (edgar) or ticker across entities
 *   2. no normalized alias/name colliding across entities
 *   3. every entity has a canonicalId + at least one domainTag
 */
export function validateRegistry(registry = REGISTRY) {
  const errors = [];
  const seenId = {};        // `${source}:${id}` → canonicalId
  const aliasOwner = {};    // normalized alias → canonicalId

  for (const e of registry) {
    if (!e.canonicalId) errors.push(`entity "${e.canonicalName ?? '?'}" missing canonicalId`);
    if (!e.domainTags?.length) errors.push(`${e.canonicalId}: no domainTags`);

    for (const source of ['edgar', 'ticker', 'fec', 'uei', 'lei']) {
      const raw = e.identifiers?.[source];
      if (raw == null) continue;
      const norm = source === 'edgar' ? String(raw).replace(/^0+/, '') : String(raw).toUpperCase();
      const k = `${source}:${norm}`;
      if (seenId[k] && seenId[k] !== e.canonicalId) {
        errors.push(`duplicate ${source} ${raw}: ${seenId[k]} and ${e.canonicalId}`);
      }
      seenId[k] = e.canonicalId;
    }

    for (const a of [e.canonicalName, ...(e.aliases ?? [])]) {
      const na = normalize(a);
      if (!na) continue;
      if (aliasOwner[na] && aliasOwner[na] !== e.canonicalId) {
        errors.push(`alias "${a}" collides: ${aliasOwner[na]} and ${e.canonicalId}`);
      }
      aliasOwner[na] = e.canonicalId;
    }
  }
  return { valid: errors.length === 0, errors };
}
