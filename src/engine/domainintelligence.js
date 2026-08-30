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
// `signalDefs` holds the Founder-authored Class-E measures — all 12 authored
// 2026-08-29/30, all `dataState: 'CLASS_D'` (measure defined, no wired source →
// renders classified STRUCTURAL absence, never faked). The legacy `signals`
// field stays UNAUTHORED per domain (its candidate inventory is not authored as
// signal definitions); `sharpeningInputs` UNAUTHORED. Nothing here is
// subject-scoped; subject binding is WO-5B.

export const DI_VERSION = '0.2';

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
        missingData: 'insufficient holder coverage → no measure (absenceClass: structural); never an estimated concentration, never proxied from flow volume',
        maturity: 'AUTHORED',
        dataState: 'CLASS_D',   // SEC 13F / Form D / fund-filing class — not wired
      },
      capital_deployment_velocity: {
        concept: 'deployment velocity',
        measure: 'committed→deployed conversion rate per window',
        formula: 'deployed_in_window / committed_at_window_start × 100 (capped at 100, overflow flag)',
        unit: 'percent of committed base deployed per window (0–100)',
        polarity: 'direction-explicit: higher = faster deployment · lower = idle/withheld (not inherently constructive or fracture)',
        boundary: 'rate of state change (commitment → deployment) — NOT concentration, flow/reallocation magnitude, or amount deployed',
        missingData: 'no committed-base figure or no deployment-event series → no measure (absenceClass: structural); never estimated, never proxied from flow volume',
        maturity: 'AUTHORED',
        dataState: 'CLASS_D',   // committed-base + deployment-event series — not wired
      },
      capital_intensity_change: {
        concept: 'capital-intensity change',
        measure: 'signed % change in capital-employed / output ratio over the window',
        formula: '(CI_end − CI_start) / CI_start × 100 ; CI = capital_employed / output',
        unit: 'signed % change; magnitude = min(100, |value|), polarity = sign',
        polarity: 'direction-explicit: rising vs falling capital intensity (neither inherently constructive or fracture)',
        boundary: 'change in a ratio — NOT deployment velocity (§3.2) or concentration (§3.1)',
        missingData: 'CI unavailable at either endpoint → no measure (absenceClass: structural); never estimated, never single-point-extrapolated',
        maturity: 'AUTHORED',
        dataState: 'CLASS_D',   // two-point capital-employed / output series — not wired
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
        missingData: 'insufficient holder/control coverage → no measure (absenceClass: structural); never estimate, infer, zero-fill, or substitute capital share for control share',
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
    // Authored measures (Founder). See KNOWLEDGE.md §3.1.
    signalDefs: {
      knowledge_expertise_concentration: {
        concept: 'expertise concentration',
        measure: 'top-holder expertise share (CR-1)',
        formula: 'top_expertise_share = max(holder_expertise) / Σ(holder_expertise) × 100',
        unit: 'percent of expertise stock (0–100, identity normalization)',
        polarity: 'higher = expertise concentrated in few holders (fragility / capture) · lower = diffuse',
        boundary: 'expertise stock share — NOT publication activity, citation flow, or diffusion rate',
        missingData: 'insufficient holder coverage → no measure (absenceClass: structural); never proxied from publication or citation volume',
        maturity: 'AUTHORED',
        dataState: 'CLASS_D',   // holder-level expertise-share source — not wired
      },
      knowledge_diffusion_rate: {
        concept: 'diffusion rate',
        measure: 'newly reached adopters / reachable population, per window',
        formula: 'new_adopters_in_window / reachable_population × 100',
        unit: 'percent of reachable population newly reached per window (0–100)',
        polarity: 'direction-explicit: higher = fast diffusion (advantage erodes) · lower = contained',
        boundary: 'spread rate — NOT expertise concentration (§3.1, stock), publication activity, or raw citation count',
        missingData: 'no adopter series or no SOURCED reachable-population estimate → no measure (absenceClass: structural); the denominator is never assumed, rule-of-thumb, or proxied',
        maturity: 'AUTHORED',
        dataState: 'CLASS_D',   // no sourced reachable-population denominator — structural absence in nearly all real cases (accepted)
      },
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
    // Authored measures (Founder). See LABOR.md §3.1.
    signalDefs: {
      labor_geographic_concentration: {
        concept: 'workforce-geographic concentration',
        measure: 'top-location workforce share (CR-1)',
        formula: 'top_location_share = max(location_headcount) / Σ(location_headcount) × 100',
        unit: 'percent of workforce capacity (0–100, identity normalization)',
        polarity: 'higher = geographically concentrated (single-point exposure) · lower = distributed',
        boundary: 'static locational concentration — NOT geographic redistribution (change), skill-mix shift, or hiring/layoff rate',
        missingData: 'insufficient geographic coverage → no measure (absenceClass: structural); never proxied from posting or establishment volume',
        maturity: 'AUTHORED',
        dataState: 'CLASS_D',   // subject-scoped per-location headcount source — not wired
      },
      labor_geographic_redistribution: {
        concept: 'geographic redistribution',
        measure: 'shift in workforce location distribution over the window (dissimilarity-index form)',
        formula: 'Σ|share_end(loc) − share_start(loc)| / 2 × 100',
        unit: 'percent of the workforce (0–100, dissimilarity-index — naturally bounded)',
        polarity: 'magnitude only; concentrating vs dispersing is a secondary read from sign of Δ(§3.1)',
        boundary: 'the CHANGE in geographic distribution — NOT §3.1 static concentration, skill-mix shift, or hiring/layoff rate',
        missingData: 'location shares unavailable at either endpoint → no measure (absenceClass: structural); never single-point-extrapolated, never proxied from posting volume',
        maturity: 'AUTHORED',
        dataState: 'CLASS_D',   // two-point subject workforce-by-location series — not wired
      },
      labor_skill_mix_shift: {
        concept: 'skill-mix shift',
        measure: 'change in workforce skill/occupational composition over the window (dissimilarity-index form)',
        formula: 'Σ|share_end(skill) − share_start(skill)| / 2 × 100',
        unit: 'percent of the workforce (0–100, dissimilarity-index form)',
        polarity: 'magnitude only; no inherent direction',
        boundary: 'change in COMPOSITION — NOT geographic (§3.1/§3.2, a location axis), headcount growth, or hiring rate',
        missingData: 'skill-category shares unavailable at either endpoint → no measure (absenceClass: structural); never single-point-extrapolated, never proxied from posting volume',
        maturity: 'AUTHORED',
        dataState: 'CLASS_D',   // two-point subject workforce-by-skill series — not wired
      },
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
    // Authored measures (Founder). See MEDIA.md §3.1.
    signalDefs: {
      media_attention_concentration: {
        concept: 'attention concentration',
        measure: 'top-source attention share (CR-1)',
        formula: 'top_source_share = max(source_attention) / Σ(source_attention) × 100',
        unit: 'percent of measured attention (0–100, identity normalization)',
        polarity: 'higher = attention driven by a single source (narrow, capturable) · lower = broad-based',
        boundary: 'attention source-base concentration — NOT propagation velocity, narrative coherence, tone, or total attention volume',
        missingData: 'insufficient source coverage → no measure (absenceClass: structural); never proxied from total attention volume',
        maturity: 'AUTHORED',
        dataState: 'CLASS_D',   // per-source attention-share source — not wired
      },
      media_narrative_coherence: {
        concept: 'narrative coherence',
        measure: 'dominant-frame share across attention sources (CR-1 on frames)',
        formula: 'max(frame_share) / Σ(frame_share) × 100',
        unit: 'percent (0–100); 100 = one frame · 0 = maximal contestation',
        polarity: 'magnitude only — explicitly non-evaluative: high coherence is NOT "good", low is NOT "bad"',
        boundary: 'agreement of FRAMING across sources — NOT §3.1 attention concentration, tone/sentiment, propagation velocity, or any judgement of narrative correctness. Structural property only, never a truth signal',
        missingData: 'no per-source frame classification from a SOURCED method → no measure (absenceClass: structural); frame assignment is never inferred ad hoc, hand-labelled without a stated method, or proxied from tone',
        maturity: 'AUTHORED',
        dataState: 'CLASS_D',   // sourced per-source frame classification — not wired
      },
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
