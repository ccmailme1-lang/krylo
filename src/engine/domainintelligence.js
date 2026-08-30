// domainintelligence.js — the six I_d primitives, as code.
//
// SINGLE SOURCE for `I_d` content. Transcribed from specs/domain-intelligence/*.md
// (Founder-ratified / SPEC II-LOCKED portions only). The Target Packet and the
// Surface both read THIS — they never re-define what a domain observes
// (integration-contract AC — Lens Primitive Reuse / Q8).
//
// Maturity per field: AUTHORED (ratified) | LOCKED (verbatim SPEC II §LOCKED) |
// UNAUTHORED (no ratified content — renders as classified absence, never faked).
//
// `signals` and `sharpeningInputs` are UNAUTHORED for every domain (WO-1 Class E —
// the measures are pending Founder authorship). Nothing here is subject-scoped;
// subject binding is WO-5B.

export const DI_VERSION = '0.1';

const SPEC_II = 'specs/SPEC-observable-substrate-revelation-contract.md';

// The 15 ratified cross-domain relationship types (CROSS-DOMAIN-CONSISTENCY.md §4a),
// keyed by the unordered pair. `F` admits only these.
export const CROSS_DOMAIN_RELATIONSHIPS = Object.freeze({
  'CAPITAL|OWNERSHIP':   'financing of control / control financed',
  'CAPITAL|TECHNOLOGY':  'capability funded / R&D capital intensity',
  'CAPITAL|KNOWLEDGE':   'research financed',
  'CAPITAL|LABOR':       'investment in / cost of capacity',
  'CAPITAL|MEDIA':       'sentiment-sensitive flow / attention to a capital event',
  'OWNERSHIP|TECHNOLOGY':'control of IP or platform',
  'KNOWLEDGE|OWNERSHIP': 'control of IP / expertise',
  'LABOR|OWNERSHIP':     'control of organizational capacity',
  'MEDIA|OWNERSHIP':     'propagation control / attention to a control change',
  'KNOWLEDGE|TECHNOLOGY':'knowledge amplifies capability / capability embodies expertise',
  'LABOR|TECHNOLOGY':    'substitution or complementarity (automation)',
  'MEDIA|TECHNOLOGY':    'attention to a capability',
  'KNOWLEDGE|LABOR':     'embodied-expertise movement / labor market depends on expertise',
  'KNOWLEDGE|MEDIA':     'attention to a discovery or controversy',
  'LABOR|MEDIA':         'attention to a workforce event / labor conflict',
});

const CANON = new Set(['CAPITAL', 'OWNERSHIP', 'TECHNOLOGY', 'KNOWLEDGE', 'LABOR', 'MEDIA']);

// WO-3 — the runtime closed-relationship-admission boundary.
// `F` admits a cross-domain relationship ONLY between two canonical domains, and
// its type-name is resolved from the ratified closed set — never invented,
// coerced, or defaulted. All 15 domain pairs are named; a non-canonical endpoint,
// a self-pair, or (defensively) an unlisted pair is REJECTED.
export function admitCrossDomainRelationship(a, b) {
  const A = String(a ?? '').toUpperCase();
  const B = String(b ?? '').toUpperCase();
  if (!CANON.has(A)) return { admitted: false, reason: `"${a}" is not a canonical domain` };
  if (!CANON.has(B)) return { admitted: false, reason: `"${b}" is not a canonical domain` };
  if (A === B)       return { admitted: false, reason: `self-pair ${A} is not a cross-domain relationship` };
  const key = [A, B].sort().join('|');
  const type = CROSS_DOMAIN_RELATIONSHIPS[key];
  if (!type)         return { admitted: false, reason: `pair ${key} not in the closed admission set` };
  return { admitted: true, pair: key, type };
}

export function relationshipsFor(domain) {
  const D = domain.toUpperCase();
  return Object.entries(CROSS_DOMAIN_RELATIONSHIPS)
    .filter(([pair]) => pair.split('|').includes(D))
    .map(([pair, type]) => {
      const other = pair.split('|').find(x => x !== D);
      return { other, type };
    });
}

const UNAUTHORED = Object.freeze({ maturity: 'UNAUTHORED', items: [] });

export const DOMAIN_INTELLIGENCE = Object.freeze({
  CAPITAL: {
    domain: 'CAPITAL',
    axis: 'Movement, allocation, financing, and deployment of capital.',
    axisSource: `${SPEC_II} §5 (LOCKED)`,
    observes: {
      maturity: 'LOCKED',
      items: ['sector/fund/ETF flows', 'financing rounds', 'debt issuances', 'capital calls',
              'buybacks', 'dividends', 'large-scale reallocations', 'changes in capital intensity',
              'deployment velocity changes'],
    },
    dimensions: {
      maturity: 'AUTHORED',
      items: ['concentration', 'flow', 'reallocation', 'deployment', 'financing pressure', 'liquidity'],
      unauthored: ['scarcity', 'constraint'],
    },
    // Authored measures (Founder). `dataState: 'CLASS_D'` = measure defined, no
    // wired source yet -> renders classified absence. See CAPITAL.md §3.1.
    signalDefs: {
      capital_concentration: {
        concept: 'capital concentration',
        measure: 'top-holder share',
        formula: 'max(holder_capital) / Σ(holder_capital) × 100',
        unit: 'percent (0–100, identity normalization)',
        polarity: '0 = diffuse · 100 = one holder',
        boundary: 'economic capital share — NOT voting/control concentration (OWNERSHIP)',
        missingData: 'insufficient holder coverage → no measure (absenceClass: structural)',
        maturity: 'AUTHORED',
        dataState: 'CLASS_D',   // SEC 13F / Form D / fund-filing class — not wired
      },
    },
    relevance: { maturity: 'PARTIAL',
      items: ['attributable to the subject / its immediate structural environment',
              'sufficient evidence to establish the CAPITAL attribution',
              'macro capital environment ≠ entity-specific capital condition'] },
    unresolved: { maturity: 'LOCKED',
      items: ['stated purpose vs actual deployment', 'secondary effects not yet visible',
              'incomplete disclosure', 'conflicting signals re sustainability'] },
    signals: UNAUTHORED,
    sharpen: UNAUTHORED,
  },
  OWNERSHIP: {
    domain: 'OWNERSHIP',
    axis: 'Control, possession, acquisition, disposition, and institutional boundaries.',
    axisSource: `${SPEC_II} §10 (LOCKED)`,
    observes: {
      maturity: 'LOCKED',
      items: ['acquisitions', 'divestitures', 'mergers', 'changes in control',
              'equity/asset transfers', 'institutional boundary shifts', 'new entities',
              'spin-outs', 'consolidations', 'changes in ownership concentration'],
    },
    dimensions: {
      maturity: 'PARTIAL',
      items: ['control concentration / diffusion', 'ownership stress',
              'institutional re-bounding', 'strategic repositioning of control'],
      unauthored: ['ultimate beneficial control'],
    },
    // Authored measures (Founder). See OWNERSHIP.md §3.1.
    signalDefs: {
      ownership_concentration_top_holder_share: {
        concept: 'ownership concentration',
        measure: 'top-holder control share',
        formula: 'max(holder_control) / Σ(holder_control) × 100',
        unit: 'percent of control (0–100, identity normalization)',
        polarity: 'higher = more concentrated control · lower = more distributed',
        boundary: 'control-rights share — NOT economic capital concentration (CAPITAL)',
        missingData: 'insufficient holder/control coverage → no measure (absenceClass: structural); never substitute capital share',
        maturity: 'AUTHORED',
        dataState: 'CLASS_D',   // compliant beneficial-ownership / voting-control source — not wired
      },
    },
    relevance: { maturity: 'PARTIAL',
      items: ['attributable to the subject / its immediate structural environment',
              'sufficient evidence to establish the OWNERSHIP attribution',
              'macro ownership environment ≠ entity-specific control structure',
              'internal control structure frequently undisclosed'] },
    unresolved: { maturity: 'LOCKED',
      items: ['ultimate beneficial control', 'secondary effects not yet visible',
              'regulatory outcomes', 'incomplete or conflicting disclosure'] },
    signals: UNAUTHORED,
    sharpen: UNAUTHORED,
  },
  TECHNOLOGY: {
    domain: 'TECHNOLOGY',
    axis: 'Technological capability, adoption, displacement, and infrastructure.',
    axisSource: `${SPEC_II} §6 (LOCKED)`,
    observes: {
      maturity: 'LOCKED',
      items: ['platform launches or retirements', 'adoption or displacement signals',
              'infrastructure build-outs or decommissionings', 'patent activity',
              'technical disclosures', 'shifts in technological intensity'],
    },
    dimensions: {
      maturity: 'PARTIAL',
      items: ['adoption momentum', 'displacement pressure', 'capability concentration',
              'infrastructure readiness / lag'],
      unauthored: ['claimed vs actual capability'],
      edgeProps: ['dependency (Technology ↔ adopters / ↔ enabling infrastructure)'],
    },
    // Authored measures (Founder). See TECHNOLOGY.md §3.1.
    signalDefs: {
      technology_capability_concentration: {
        concept: 'capability concentration',
        measure: 'top-capability-provider share',
        formula: 'top_capability_share = max(provider_capability_share)',
        unit: 'percent of capability supply/control (0–100, identity normalization)',
        polarity: 'higher concentration = greater structural dependency',
        boundary: 'capability-supply share — NOT adoption momentum, displacement pressure, generic tech activity, or usage volume',
        missingData: 'insufficient provider/capability-share coverage → no measure (absenceClass: structural); never proxied from activity',
        maturity: 'AUTHORED',
        dataState: 'CLASS_D',   // provider capability-share source — not wired
      },
    },
    relevance: { maturity: 'PARTIAL',
      items: ['attributable to the subject / its immediate structural environment',
              'sufficient evidence to establish the TECHNOLOGY attribution',
              'macro technological environment ≠ entity-specific capability position'] },
    unresolved: { maturity: 'LOCKED',
      items: ['claimed vs actual capability', 'adoption durability',
              'secondary displacement effects', 'proprietary infrastructure opacity'] },
    signals: UNAUTHORED,
    sharpen: UNAUTHORED,
  },
  KNOWLEDGE: {
    domain: 'KNOWLEDGE',
    axis: 'Creation, transfer, concentration, and dissemination of knowledge.',
    axisSource: `${SPEC_II} §7 (LOCKED)`,
    observes: {
      maturity: 'LOCKED',
      items: ['publication or patent events', 'collaboration or dissolution events',
              'knowledge-transfer agreements', 'talent movement carrying specialized knowledge',
              'open releases or withdrawals', 'concentration or diffusion of expertise'],
    },
    dimensions: {
      maturity: 'PARTIAL',
      items: ['knowledge concentration', 'diffusion rate', 'expertise scarcity / surplus',
              'institutional capture'],
      unauthored: ['tacit vs explicit knowledge'],
      edgeProps: ['transferFriction (Producers ↔ carriers ↔ institutional holders)'],
    },
    relevance: { maturity: 'PARTIAL',
      items: ['attributable to the subject / its immediate structural environment',
              'sufficient evidence to establish the KNOWLEDGE attribution',
              'macro knowledge environment ≠ entity-specific knowledge position'] },
    unresolved: { maturity: 'LOCKED',
      items: ['tacit vs explicit knowledge', 'actual transfer success',
              'durability of concentration', 'conflicting dissemination signals'] },
    signals: UNAUTHORED,
    sharpen: UNAUTHORED,
  },
  LABOR: {
    domain: 'LABOR',
    axis: 'People, skills, employment, and organizational capacity.',
    axisSource: `${SPEC_II} §8 (LOCKED)`,
    observes: {
      maturity: 'LOCKED',
      items: ['hiring or layoff events at scale', 'facility openings or closures',
              'occupational demand shifts', 'labor-action events', 'training-capacity changes',
              'headcount or skill-mix shifts', 'geographic workforce redistribution'],
    },
    dimensions: {
      maturity: 'PARTIAL',
      items: ['skill scarcity / surplus', 'organizational capacity expansion / contraction',
              'labor-market pressure', 'geographic concentration / dispersion'],
      unauthored: ['quality vs quantity of capacity'],
    },
    relevance: { maturity: 'PARTIAL',
      items: ['attributable to the subject / its immediate structural environment',
              'sufficient evidence to establish the LABOR attribution',
              'macro labor environment ≠ entity-specific workforce position',
              'internal headcount / skill mix frequently undisclosed'] },
    unresolved: { maturity: 'LOCKED',
      items: ['quality vs quantity of capacity', 'actual skill-transfer outcomes',
              'secondary effects', 'incomplete internal visibility'] },
    signals: UNAUTHORED,
    sharpen: UNAUTHORED,
  },
  MEDIA: {
    domain: 'MEDIA',
    axis: 'Public attention, narrative, communication, and information propagation.',
    axisSource: `${SPEC_II} §9 (LOCKED)`,
    observes: {
      maturity: 'LOCKED',
      items: ['measurable attention shifts', 'narrative launches or collapses',
              'propagation events', 'platform or ownership changes that alter propagation',
              'coordinated or emergent narrative formations'],
    },
    dimensions: {
      maturity: 'PARTIAL',
      items: ['attention concentration / diffusion', 'narrative coherence / contestation',
              'propagation velocity'],
      unauthored: ['intentional vs emergent narrative'],
      edgeProps: ['informationAsymmetry (Attention sources ↔ audiences)'],
      note: 'narrative coherence is a structural property only — never a truth signal.',
    },
    relevance: { maturity: 'PARTIAL',
      items: ['concerns the subject / its immediate structural environment',
              'sufficient evidence to establish the MEDIA attribution',
              'macro attention environment ≠ subject-specific narrative position'] },
    unresolved: { maturity: 'LOCKED',
      items: ['intentional vs emergent narrative', 'actual influence on other domains',
              'durability of attention', 'conflicting signals across channels'] },
    signals: UNAUTHORED,
    sharpen: UNAUTHORED,
  },
});

export function domainIntelligence(domain) {
  return DOMAIN_INTELLIGENCE[String(domain ?? '').toUpperCase()] ?? null;
}
