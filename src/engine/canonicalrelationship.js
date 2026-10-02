// canonicalrelationship.js — KRYL-1339: canonical relationship primitive
// ρ = (id, part, type, φ_class, ν), per specs/SPEC-relational-substrate-stage1-formalization.md
// and the three ratified Founder rulings in specs/stage1-founder-rulings-ontology-resolution-20261001.md.
//
// Pure mechanism only. This file does not ratify any relationship type itself -- that is a
// Founder decision (formalization §7), recorded by calling registerRelationshipType() with a
// type definition. Until a type is registered, admitRelationship() honestly rejects every
// assertion naming it. It never fabricates a type definition to make a producer's call
// "succeed" -- that would be exactly the silent ontology invention this whole process exists
// to prevent.
//
// eta/phi0/structuralSupport (RelationCore's legacy fields) do not appear anywhere in this
// module's shapes, by design (Founder Ruling 2).

export const PhiClass = Object.freeze({ SEMANTIC: 'Semantic', STATISTICAL: 'Statistical' });

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `rho-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---- type registry (formalization §7) -----------------------------------------------------
// typeName -> { phiClass, admissionRule, nuIdKeys, nuStateKeys, classifyChange }.
// Empty until the Founder ratifies specific types -- this module stays correct and inert
// until that happens, rather than guessing.
const TYPE_REGISTRY = new Map();

export function registerRelationshipType(typeName, definition) {
  const required = ['phiClass', 'admissionRule', 'nuIdKeys', 'nuStateKeys', 'classifyChange'];
  for (const k of required) {
    if (!(k in definition)) {
      throw new Error(`registerRelationshipType(${typeName}): missing required field "${k}" (formalization §7)`);
    }
  }
  if (definition.phiClass !== PhiClass.SEMANTIC && definition.phiClass !== PhiClass.STATISTICAL) {
    throw new Error(`registerRelationshipType(${typeName}): phiClass must be Semantic or Statistical, not "${definition.phiClass}"`);
  }
  TYPE_REGISTRY.set(typeName, Object.freeze({ ...definition }));
}

export function getRegisteredType(typeName) {
  return TYPE_REGISTRY.get(typeName) ?? null;
}

export function registeredTypeNames() {
  return [...TYPE_REGISTRY.keys()];
}

// ---- same-ness (formalization §2) ---------------------------------------------------------
function partKey(part) {
  // part is an ordered pair or a finite participant set -- sorted so comparison is independent
  // of input order, matching the formalization's "ordered pair or explicitly permitted
  // participant set" (identity doesn't depend on which endpoint was named first).
  return [...part].sort().join('|');
}

function nuIdKey(nuId) {
  return Object.keys(nuId ?? {}).sort().map(k => `${k}=${JSON.stringify(nuId[k])}`).join('|');
}

export function sameRelationship(a, b) {
  return partKey(a.part) === partKey(b.part)
    && a.type === b.type
    && a.phiClass === b.phiClass
    && nuIdKey(a.nuId) === nuIdKey(b.nuId);
}

// ---- admission (formalization §4) ---------------------------------------------------------
// assertion = { part, type, nuId, nuState, evidence: { provenance, ts? } }.
// existingRelationships: iterable of already-admitted ρ, for the same-ness search (caller owns
// persistence/retrieval -- this module is pure and holds no store of its own).
export function admitRelationship(assertion, existingRelationships = []) {
  const def = getRegisteredType(assertion.type);
  if (!def) {
    return {
      admitted: false,
      reason: `relationship type "${assertion.type}" is not ratified -- no type definition is ` +
        `registered. This is not a rejection of the evidence; it is an honest statement that ` +
        `KRYLO has not yet ratified what "${assertion.type}" means under the Stage 1 ontology.`,
    };
  }
  if (!assertion.evidence?.provenance) {
    return { admitted: false, reason: 'no provenance on assertion.evidence -- formalization §4/§10 requires every assertion to carry evidence provenance' };
  }

  const admission = def.admissionRule(assertion);
  if (!admission?.admitted) {
    return { admitted: false, reason: admission?.reason ?? `type "${assertion.type}"'s admission rule rejected this assertion` };
  }

  const candidate = { part: assertion.part, type: assertion.type, phiClass: def.phiClass, nuId: assertion.nuId ?? {} };
  const existing = [...existingRelationships].find(rho => sameRelationship(rho, candidate));

  const historyEntry = Object.freeze({
    provenance: assertion.evidence.provenance,
    nuState: Object.freeze({ ...(assertion.nuState ?? {}) }),
    ts: assertion.evidence.ts ?? Date.now(),
  });

  if (!existing) {
    return {
      admitted: true,
      predicate: 'NEW',
      relationship: Object.freeze({
        id: generateId(),
        part: assertion.part,
        type: assertion.type,
        phiClass: def.phiClass,
        nuId: Object.freeze({ ...(assertion.nuId ?? {}) }),
        nuState: Object.freeze({ ...(assertion.nuState ?? {}) }),
      }),
      historyEntry,
    };
  }

  // Same-ness holds -- id is retained (formalization §2/§4), never reassigned.
  const predicate = def.classifyChange({ prior: existing, incoming: assertion });
  const stateChanged = predicate === 'STRENGTHENING' || predicate === 'WEAKENING' || predicate === 'RECONFIGURED';

  return {
    admitted: true,
    predicate,
    relationship: stateChanged
      ? Object.freeze({ ...existing, nuState: Object.freeze({ ...existing.nuState, ...(assertion.nuState ?? {}) }) })
      : existing,
    historyEntry,
  };
}
