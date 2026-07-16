// ontology.js — KRYL-1063 (Ontology Normalization Phase 1): the SINGLE source of domain
// semantics for KRYLO. Ratified KRYL-1061.
//
// §17 canonical domains are the ONLY authoritative domain model. Every other domain name in
// the app (cone pillars, OracleView, LeverageTowers, FeedsBay, CAST) is a DISPLAY ALIAS keyed
// to a canonical id — never an independent taxonomy. The ontology answers "what is this
// signal?"; the UI answers "how do I present it?". Those are separate concerns, defined once,
// here. No component may declare its own domain list — it aliases against this module.

export const ONTOLOGY_VERSION = 'v1';

// ── §17 — the authoritative domain model (frozen; defined ONCE, nowhere else) ──
export const CANONICAL_DOMAINS = Object.freeze([
  'technology', 'capital', 'knowledge', 'labor', 'media', 'ownership',
]);
const CANON_SET = new Set(CANONICAL_DOMAINS);

export function isCanonicalDomain(d) {
  return CANON_SET.has(String(d ?? '').toLowerCase());
}

// ── Alias layer — canonical id → per-surface display label ────────────────────
// A surface RENDERS the display label but RESOLVES to the canonical domain. Adding a surface
// (or migrating one, Phase 2) means adding aliases here, not a new domain list in the component.
// 'surface' is seeded from conemap.jsx DOMAIN_TO_PILLAR (WO-1717); other surfaces are populated
// as they migrate in KRYL-1064 (Phase 2).
// No active aliases — Founder ratified CANONICAL everywhere (KRYL-1064), so every surface displays
// the canonical §17 name. The alias infrastructure below remains for any FUTURE surface that gets an
// approved display alias; adding one means adding an entry here, never a new domain list in a component.
export const DOMAIN_ALIASES = Object.freeze({});

// displayLabel(canonicalDomain, surface) → alias string, or the canonical name (uppercased)
// when the surface has no alias for it. Never invents a domain — only relabels a canonical one.
export function displayLabel(domain, surface = 'surface') {
  const d = String(domain ?? '').toLowerCase();
  const map = DOMAIN_ALIASES[surface];
  return (map && map[d]) || d.toUpperCase();
}

// resolveCanonical(name, surface) → canonical id, or null (fail-closed) if the name is neither
// a canonical domain nor a known alias. Lets any surface label be traced back to the authority.
export function resolveCanonical(name, surface = 'surface') {
  const n = String(name ?? '').toLowerCase();
  if (CANON_SET.has(n)) return n;
  const map = DOMAIN_ALIASES[surface];
  if (map) {
    for (const [canon, alias] of Object.entries(map)) {
      if (String(alias).toLowerCase() === n) return canon;
    }
  }
  return null;
}

// ── DomainProjectionMap[] — the formal contract shape { source_domain, display_group, version }
// A flat, auditable projection of the alias layer. This is the published "KRYLO Ontology
// Contract v1" data — every display grouping traceable to its canonical source_domain.
export const DOMAIN_PROJECTION_MAP = Object.freeze(
  Object.entries(DOMAIN_ALIASES).flatMap(([surface, m]) =>
    Object.entries(m).map(([source_domain, display_group]) =>
      Object.freeze({ source_domain, display_group, surface, version: ONTOLOGY_VERSION })),
  ),
);
