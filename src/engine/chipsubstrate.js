// chipsubstrate.js — KRYL-1304, Structural Signal Chip Substrate Query Interface v1.0.
//
// Replaces trendingterms.js's deriveTrendingTerms() as the source for this chip row.
// That module derived real (non-fabricated) labels from dispatched connector signals, but
// (a) gated on raw seedQuery presence — a raw-query dependency the new interface forbids,
// (b) labeled by connector/source name (WORLDBANK -> 'GLOBAL ECONOMIC DATA', FEC -> 'CAMPAIGN
// FINANCE'), not by an AUTHORED observation class tied to a subject/field with evidence and
// provenance — a "most recent real signal" list, not a grounded-observation projection.
//
// Pure, query-text-free: {scope, domains} -> ChipSubstrateResult. No LLM, no ranking, no
// recommendation/forecast/risk/opportunity/action logic — this module only projects what
// adsubject.js's A(domain, scope) — the existing WO-5B/KRYL-1234 authority, already
// reconciled under DEF-1301 — already knows. No second observation taxonomy invented.
//
// AUDIT FINDING (documented per spec requirement #4, not papered over with an adapter):
// no authoritative source anywhere in this codebase computes the required 6-value
// structural-state vocabulary (CONVERGENCE/DIVERGENCE/CHANGE/PERSISTENCE/EMERGING/ABSENCE)
// with evidence+provenance. convergenceclassifier.js is a different, LOCKED 5-value
// vocabulary (CLAUDE.md §6: INSUFFICIENT SIGNAL/LOW SIGNAL YIELD/BUILDING/TURBULENT/HIGH
// CONVERGENCE) — not a match, not reused here. formationinference.js's Formation output
// carries temporal.{direction,trajectory,velocity} fields that could conceptually map to
// CONVERGENCE/DIVERGENCE/CHANGE, but they are unpopulated (null) in every live Formation
// trace observed this session — nothing to ground a chip in yet. Only ABSENCE is currently
// producible from a real, grounded source: adsubject.js's own absence:{absenceClass,reason}.
// The other five vocabulary values correctly, honestly produce zero candidates until a real
// grounded state-classification computation exists elsewhere in the codebase.

import { A, CANON_DOMAINS } from './adsubject.js';
import { domainIntelligence } from './domainintelligence.js';

export const STRUCTURAL_STATE_VOCAB = Object.freeze([
  'CONVERGENCE', 'DIVERGENCE', 'CHANGE', 'PERSISTENCE', 'EMERGING', 'ABSENCE',
]);

function authoredKeysFor(domain) {
  const di = domainIntelligence(domain);
  return Object.entries(di?.signalDefs ?? {})
    .filter(([, d]) => d?.maturity === 'AUTHORED')
    .map(([key, def]) => ({ key, concept: def.concept ?? key, unit: def.unit ?? null }));
}

/**
 * queryChipSubstrate({ scope, domains, temporalScope }) -> ChipSubstrateResult
 *
 * @param {object} params
 * @param {object} params.scope         subjectScope() result — ENTITY | GEO | DECISION_FRAME | UNRESOLVED.
 *                                       Determines FIELD vs SUBJECT scope per domain via adsubject.js's
 *                                       own `scoped` boolean — this module never re-derives that.
 * @param {string[]} [params.domains]   canonical domain subset (CANON_DOMAINS values). Defaults to all six.
 *                                       Selecting a subset changes which domains are queried, never the
 *                                       taxonomy those domains are drawn from (acceptance #2/#5/#6).
 * @param {string} [params.temporalScope]  'live' | 'historical' | 'forecast' — carried through as a label
 *                                       only; this module does not branch on it (no historical/forecast
 *                                       data source exists to query differently yet — same
 *                                       discover-broadly-not-invent discipline as the structural-state gap).
 * @returns {object} frozen ChipSubstrateResult
 */
export function queryChipSubstrate({ scope, domains, temporalScope = 'live' } = {}) {
  const activeDomains = (Array.isArray(domains) && domains.length) ? domains : CANON_DOMAINS;

  const observationCandidates = [];
  const structuralStateCandidates = [];
  const absenceReasons = [];

  for (const domain of activeDomains) {
    const ad = A(domain, scope);
    const scopeLabel = ad.scoped ? 'SUBJECT' : 'FIELD';

    // OBSERVATION candidates — AUTHORED observation class + grounded observation + evidence +
    // provenance, precisely: ad.measures[key] where status === 'FACET' IS exactly that shape
    // (resolveClassEMeasure()'s real, provenance-bearing resolution against a named AUTHORED
    // signalDef). Confirmed this session: every measure tested returns STRUCTURAL_ABSENCE
    // today (never FACET) for every real subject — so this list is honestly empty now, not
    // because this module withholds it, but because no AUTHORED measure has real source data
    // bound to it yet anywhere in the substrate.
    for (const { key, concept, unit } of authoredKeysFor(domain)) {
      const res = ad.measures?.[key];
      if (res?.status !== 'FACET') continue;
      observationCandidates.push(Object.freeze({
        id: `obs:${domain}:${key}`,
        domain,
        class: 'OBSERVATION',
        authoredClass: key,
        label: concept,
        value: res.value,
        unit,
        scope: scopeLabel,
        // KRYL-1306 §15 ANALYZABLE gate: an OBSERVATION candidate is, by construction, a named
        // AUTHORED measure with a grounded value + evidence + provenance already scope-bound to
        // this query's own resolved scope (AUTHORED+GROUNDED+SCOPE-BOUND+PROVENANCE all satisfied
        // above) -- it is exactly the kind of concrete, attachable analytical dimension §7.2
        // describes. No separate score computed; this reuses the class distinction the module
        // already makes, not an invented criterion.
        eligible: true,
        evidence: Object.freeze([{ source: res.provenance?.source ?? null }]),
        provenance: Object.freeze({ subject: ad.subject, domain, source: res.provenance?.source ?? null }),
      }));
    }

    // STRUCTURAL_STATE candidates — only ABSENCE is groundable today (see module header).
    // adsubject.js's own absence classification IS the grounded structural state; this module
    // does not compute a new one, it surfaces the existing one, with its own reason as the
    // "underlying observations" context (there are none — that is the absence itself).
    if (ad.absence) {
      structuralStateCandidates.push(Object.freeze({
        id: `state:${domain}:ABSENCE`,
        domain,
        class: 'STRUCTURAL_STATE',
        state: 'ABSENCE',
        scope: scopeLabel,
        // KRYL-1306 §7.1: a structural state characterizes a condition of the field (the module's
        // own CONVERGENCE example) -- it is not itself an attachable analytical dimension the way
        // a named OBSERVATION measure is. Display-only, never auto-selectable as a refinement.
        eligible: false,
        underlyingObservations: Object.freeze([]),
        evidence: Object.freeze([]),
        provenance: Object.freeze({ subject: ad.subject, domain }),
        reason: ad.absence.reason,
      }));
      absenceReasons.push({
        class: String(ad.absence.absenceClass ?? 'structural').toUpperCase(),
        reason: ad.absence.reason,
      });
    }
  }

  const result = {
    scope: Object.freeze({ kind: scope?.kind ?? 'UNRESOLVED', temporal: temporalScope }),
    domains: Object.freeze([...activeDomains]),
    observationCandidates: Object.freeze(observationCandidates),
    structuralStateCandidates: Object.freeze(structuralStateCandidates),
  };

  // Governed absence — only when there is truly nothing (acceptance #8). A domain-level
  // ABSENCE structural-state candidate is still a real, typed candidate (it says something:
  // "this domain was checked and found absent"), so it does NOT by itself trigger the
  // top-level absence state — only a substrate with zero candidates of either class does.
  if (observationCandidates.length === 0 && structuralStateCandidates.length === 0) {
    result.absence = Object.freeze({
      class: 'STRUCTURAL',
      reason: 'no eligible observation or structural-state candidate for the active scope/domains',
    });
  }

  return Object.freeze(result);
}

// toDisplayChips — renderer-facing projection of ChipSubstrateResult into the flat label
// list the chip row actually renders. Kept separate from queryChipSubstrate() itself so the
// substrate query stays faithful to the raw, complete truth (including per-domain ABSENCE
// candidates, which are real, typed, evidence-classified structural state) while this
// function makes the one display decision the spec leaves to the renderer: a row of six
// "ABSENCE" chips is not useful signal, so when there is no real OBSERVATION or non-ABSENCE
// STRUCTURAL_STATE candidate anywhere in the result, the row renders empty (the governed
// absence state), never padded with ABSENCE-only chips standing in for real content. Still no
// query text — this function only ever receives the already-computed ChipSubstrateResult.
export function toDisplayChips(result) {
  const informative = [
    ...result.observationCandidates,
    ...result.structuralStateCandidates.filter(c => c.state !== 'ABSENCE'),
  ];
  if (informative.length === 0) {
    return {
      chips: [],
      absence: result.absence ?? {
        class: 'STRUCTURAL',
        reason: 'no real observation or grounded structural state to show for the active scope/domains',
      },
    };
  }
  const chips = informative.map(c => ({
    id: c.id,
    label: c.class === 'OBSERVATION'
      ? `${c.domain}: ${c.label}${c.value != null ? ` ${Math.round(c.value)}${c.unit ? c.unit : ''}` : ''}`
      : `${c.domain}: ${c.state}`,
    domain: c.domain,
    class: c.class,
    scope: c.scope,
    eligible: c.eligible,
  }));
  return { chips, absence: null };
}
