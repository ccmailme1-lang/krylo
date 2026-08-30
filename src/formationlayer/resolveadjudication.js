// KRYL-1207 — Salience Adjudication, extracted from observestoryview.jsx (2026-08-26).
// specs/SPEC-adjudication-contract.md (full path ratified + explicit implementation go, 2026-08-23).
//
// Extraction rationale (closes final Bottle Test exception: live RESOLVE boundary): this logic
// was defined at module scope inside observestoryview.jsx, a .jsx file that also imports React
// for its component (ObserveStoryBanner, defined further down that file) — making it
// unimportable outside a JSX-transforming bundler, even though adjudicate()/buildCandidates()
// themselves never used React. This file is a verbatim move, not a rewrite: same functions, same
// logic, same comments, only relocated so KRYL-1202's Observation Affordance Engine (a plain
// engine module) can import real adjudication output directly. observestoryview.jsx now imports
// these back from here — its rendered behavior is unchanged.

function listWithAnd(names) {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function domainByFormationId(domains, id) {
  return domains.find(d => d.formationId === id)?.label ?? id;
}

// Same formula as conemap.jsx's Cone component -- reused exactly so this text's percentages
// never diverge from what the cones themselves show.
function rawVelocity(pressure) {
  return (pressure - 50) * 0.3;
}
function velocityText(pressure) {
  const v = rawVelocity(pressure);
  const sign = v > 0 ? '+' : '';
  return `${sign}${Math.round(v)}%`;
}

// KRYL-1207 — stateHash removed entirely (specs/SPEC-adjudication-contract.md §2, Option A
// explicitly rejected: relabeling this and keeping it as a fallback would knowingly ship the
// defective selector KRYL-1205 proved invalid). Determinism (same admissible evidence -> same
// adjudication result) now comes from adjudicate()/classifyPair() being pure functions over the
// candidate list, not from a hash. See git history for the removed implementation if needed.

// Builds every candidate headline the CURRENT real data actually supports -- relationship
// dynamics (CONVERGING/WEAKENING/DIVERGING, real fields from formationrelationship.js, not
// previously surfaced here), volatility standouts, opposite-direction pairs, and an emerging
// domain closing in on a confirmed one -- on top of the original aggregate/leader read. Each
// candidate has its own real precondition; nothing is invented to pad the list (§22).
//
// KRYL-1206 (ratified) -- every candidate now also carries an `evidence` block: the same number
// already computed to decide eligibility, preserved instead of discarded. evidence.sourceInputs
// is the only provenance this function has access to (see KRYL-1206's Provenance Boundary --
// deeper evidenceRef-level provenance belongs to the separate inferFormation() pipeline this
// function does not consume, per KRYL-1205 §6/§6a; not fabricated here). evidence.threshold/
// .margin are null for categorical gates (stable-group/solo, relationship state) since those
// aren't numeric comparisons. Representation only -- selection logic below is unchanged.
export function buildCandidates(domains, relationships) {
  const stable = domains.filter(d => d.formationState === 'STABLE');
  const emerging = domains.filter(d => d.formationState === 'EMERGING');
  const active = domains.filter(d => d.formationState);
  const topRel = relationships[0] ?? null;
  const candidates = [];

  if (stable.length >= 2) {
    const names = listWithAnd(stable.map(d => d.label));
    const deltas = listWithAnd(stable.map(d => velocityText(d.magnitude)));
    const leader = stable.reduce((max, d) => Math.abs(d.magnitude - 50) > Math.abs(max.magnitude - 50) ? d : max, stable[0]);
    const leaderDelta = velocityText(leader.magnitude);
    const leaderDeviationFrom50 = Math.abs(leader.magnitude - 50);
    const groupParagraph = `${names} all moved by similar amounts this cycle (${deltas}) — that's not ${stable.length} coincidences, it's one pattern. ${leader.label} led at ${leaderDelta} — that's the one to look at first.`;

    candidates.push({
      headlinePre: `${stable.length} domains are moving`, emphasis: 'together',
      headlinePost: topRel ? ' — and two of them are quietly connected.' : '.',
      paragraph: groupParagraph,
      evidence: {
        type: 'STABLE_GROUP', sourceInputs: stable.map(d => d.label),
        derivedMetric: 'leaderDeviationFrom50', measuredValue: leaderDeviationFrom50,
        threshold: null, margin: null,
      },
    });
    candidates.push({
      headlinePre: `${leader.label} moved the`, emphasis: 'most',
      headlinePost: ` of ${stable.length} domains this cycle.`,
      paragraph: groupParagraph,
      evidence: {
        type: 'STABLE_LEADER', sourceInputs: [leader.label],
        derivedMetric: 'leaderDeviationFrom50', measuredValue: leaderDeviationFrom50,
        threshold: null, margin: null,
      },
    });
  } else if (stable.length === 1) {
    candidates.push({
      headlinePre: `${stable[0].label} is the`, emphasis: 'one domain',
      headlinePost: ' in a confirmed pattern right now.',
      paragraph: emerging.length > 0
        ? `${listWithAnd(emerging.map(d => d.label))} ${emerging.length === 1 ? 'is' : 'are'} also moving, just not confirmed yet.`
        : `Nothing else in the field has confirmed a pattern this cycle.`,
      evidence: {
        type: 'STABLE_SOLO', sourceInputs: [stable[0].label],
        derivedMetric: 'leaderDeviationFrom50', measuredValue: Math.abs(stable[0].magnitude - 50),
        threshold: null, margin: null,
      },
    });
  }

  // Relationship state -- real field from formationrelationship.js's deriveState(), never
  // surfaced in the narrative before this pass.
  if (topRel) {
    const a = domainByFormationId(domains, topRel.sourceFormationId);
    const b = domainByFormationId(domains, topRel.targetFormationId);
    const relParagraph = `${a} and ${b} specifically are linked — see the connecting line below.`;
    const relEvidence = {
      type: 'RELATIONSHIP_STATE', sourceInputs: [a, b],
      derivedMetric: 'relationshipState', measuredValue: topRel.state,
      threshold: null, margin: null,
    };
    if (topRel.state === 'CONVERGING') {
      candidates.push({ headlinePre: `${a} and ${b} are`, emphasis: 'pulling into alignment', headlinePost: ' — the link is strengthening this cycle.', paragraph: relParagraph, evidence: relEvidence });
    } else if (topRel.state === 'WEAKENING') {
      candidates.push({ headlinePre: `${a} and ${b} were linked —`, emphasis: 'now pulling apart', headlinePost: '.', paragraph: relParagraph, evidence: relEvidence });
    } else if (topRel.state === 'DIVERGING') {
      candidates.push({ headlinePre: `${a} and ${b} have`, emphasis: 'broken from', headlinePost: ' each other this cycle — a real split, not noise.', paragraph: relParagraph, evidence: relEvidence });
    } else {
      candidates.push({ headlinePre: `${a} and ${b} are`, emphasis: 'the clearest link', headlinePost: ' this cycle.', paragraph: relParagraph, evidence: relEvidence });
    }
  }

  // Volatility standout -- only when one domain is genuinely out ahead of the field average,
  // not just nominally highest.
  if (active.length >= 2) {
    const avgVol = active.reduce((s, d) => s + d.volatility, 0) / active.length;
    const mostVolatile = active.reduce((max, d) => (d.volatility > max.volatility ? d : max), active[0]);
    const volatilityMarginOverAverage = mostVolatile.volatility - avgVol;
    if (volatilityMarginOverAverage > 0.15) {
      candidates.push({
        headlinePre: `${mostVolatile.label} is the`, emphasis: 'least stable',
        headlinePost: ' domain in the field right now.',
        paragraph: `${mostVolatile.label} is swinging more than the rest of the field (${Math.round(mostVolatile.volatility * 100)}% volatility vs. a ${Math.round(avgVol * 100)}% average) — that instability is itself the signal worth watching.`,
        evidence: {
          type: 'VOLATILITY_STANDOUT', sourceInputs: [mostVolatile.label],
          derivedMetric: 'volatilityMarginOverAverage', measuredValue: volatilityMarginOverAverage,
          threshold: 0.15, margin: volatilityMarginOverAverage - 0.15,
        },
      });
    }
  }

  // Opposite-direction pair -- two real domains moving against each other, not the same
  // pattern read two ways.
  if (active.length >= 2) {
    let bestPair = null, bestSpread = 6;
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const vi = rawVelocity(active[i].magnitude), vj = rawVelocity(active[j].magnitude);
        if (Math.sign(vi) !== 0 && Math.sign(vj) !== 0 && Math.sign(vi) !== Math.sign(vj)) {
          const spread = Math.abs(vi - vj);
          if (spread > bestSpread) { bestSpread = spread; bestPair = [active[i], active[j]]; }
        }
      }
    }
    if (bestPair) {
      const [d1, d2] = bestPair;
      candidates.push({
        headlinePre: `${d1.label} and ${d2.label} are moving`, emphasis: 'in opposite directions',
        headlinePost: ' this cycle.',
        paragraph: `${d1.label} is at ${velocityText(d1.magnitude)} while ${d2.label} is at ${velocityText(d2.magnitude)} — a real split, not the same pattern read two ways.`,
        evidence: {
          type: 'OPPOSITE_DIRECTION', sourceInputs: [d1.label, d2.label],
          derivedMetric: 'oppositeVelocitySpread', measuredValue: bestSpread,
          threshold: 6, margin: bestSpread - 6,
        },
      });
    }
  }

  // Emerging domain closing the gap on a confirmed one -- a real transition signal, not a guess
  // about whether it will confirm.
  if (emerging.length > 0 && stable.length > 0) {
    let closest = null, closestGap = 8;
    for (const e of emerging) {
      for (const s of stable) {
        const gap = Math.abs(e.magnitude - s.magnitude);
        if (gap < closestGap) { closestGap = gap; closest = [e, s]; }
      }
    }
    if (closest) {
      const [e, s] = closest;
      candidates.push({
        headlinePre: `${e.label} is closing in on`, emphasis: `${s.label}'s territory`,
        headlinePost: ' — worth watching if it holds.',
        paragraph: `${e.label} hasn't confirmed a pattern yet, but it's within ${Math.round(closestGap)} points of ${s.label}, which has. If that gap closes, it's a second confirmed domain, not a coincidence.`,
        // KRYL-1206 sign convention (flagged open in the spec, resolved here): threshold 8 is the
        // gate the RAW gap must stay under, so margin is inverted (threshold - measuredValue) to
        // keep "positive margin = more qualifying" consistent with the other candidate types.
        evidence: {
          type: 'EMERGING_CLOSING_GAP', sourceInputs: [e.label, s.label],
          derivedMetric: 'magnitudeGapToConfirmed', measuredValue: closestGap,
          threshold: 8, margin: 8 - closestGap,
        },
      });
    }
  }

  return { candidates, stable, emerging };
}

// ── KRYL-1207 — Salience Adjudication ───────────────────────────────────────────────────────────
// specs/SPEC-adjudication-contract.md (full path ratified + explicit implementation go, 2026-08-23).
// The 6-entry ratified opposition table (𝒪) -- specs/SPEC-candidate-vocabulary-compatibility-
// inquiry.md §8.3. Do not add entries without the same controlled-computation verification used
// for these six. `valueA`/`valueB: null` means "match on type alone" (types like STABLE_GROUP,
// OPPOSITE_DIRECTION have no meaningful discriminating value -- their mere presence is the claim).
const OPPOSITION_TABLE = Object.freeze([
  { typeA: 'RELATIONSHIP_STATE', valueA: 'CONVERGING', typeB: 'OPPOSITE_DIRECTION',   valueB: null },
  { typeA: 'RELATIONSHIP_STATE', valueA: 'DIVERGING',  typeB: 'EMERGING_CLOSING_GAP', valueB: null },
  { typeA: 'RELATIONSHIP_STATE', valueA: 'WEAKENING',  typeB: 'EMERGING_CLOSING_GAP', valueB: null },
  { typeA: 'STABLE_GROUP', valueA: null, typeB: 'RELATIONSHIP_STATE', valueB: 'DIVERGING' },
  { typeA: 'STABLE_GROUP', valueA: null, typeB: 'RELATIONSHIP_STATE', valueB: 'WEAKENING' },
  { typeA: 'STABLE_GROUP', valueA: null, typeB: 'OPPOSITE_DIRECTION', valueB: null },
]);

function overlaps(a, b) {
  return a.sourceInputs.some(s => b.sourceInputs.includes(s));
}

function valueMatches(candidateValue, ruleValue) {
  return ruleValue === null || candidateValue === ruleValue;
}

function ruleMatches(a, b, rule) {
  return a.type === rule.typeA && valueMatches(a.measuredValue, rule.valueA)
      && b.type === rule.typeB && valueMatches(b.measuredValue, rule.valueB);
}

function findOpposingRule(a, b) {
  for (const rule of OPPOSITION_TABLE) {
    if (ruleMatches(a, b, rule) || ruleMatches(b, a, rule)) return rule;
  }
  return null;
}

// κ (kappa) -- specs/SPEC-candidate-vocabulary-compatibility-inquiry.md §8.4. Only Conflict is
// ever positively established (authored 𝒪 match on overlapping substrate). Everything else is
// Insufficient -- there is no authored claim-compat table, and per §22 Absence-Is-Signal, absence
// of a rule is never treated as evidence of comparability. 'Comparable' is therefore never emitted
// by this implementation: emitting it would assert a positive finding this codebase doesn't have.
export function classifyPair(a, b) {
  if (!overlaps(a.evidence, b.evidence)) {
    return { classification: 'Insufficient', ruleInvoked: null, reason: 'no shared substrate (sourceInputs do not overlap)' };
  }
  const rule = findOpposingRule(a.evidence, b.evidence);
  if (rule) {
    return { classification: 'Conflict', ruleInvoked: rule, reason: 'authored opposition rule (𝒪) matched on overlapping substrate' };
  }
  return { classification: 'Insufficient', ruleInvoked: null, reason: 'shared substrate, but no authored comparability basis exists (specs/SPEC-normalization-discovery.md: negative result, no legitimate cross-type ranking)' };
}

// Full adjudication over the candidate set -- specs/SPEC-adjudication-contract.md §3. Every branch
// returns the complete Data Tap inventory (§6 of that spec), not just display text -- computing
// this and discarding all but a headline string is exactly the partial-build failure the exit
// criterion exists to prevent.
export function adjudicate(candidates) {
  const candidateTaps = candidates.map(c => ({
    type: c.evidence.type,
    value: c.evidence.measuredValue,
    sourceInputs: c.evidence.sourceInputs,
    derivedMetric: c.evidence.derivedMetric,
    measuredValue: c.evidence.measuredValue,
    threshold: c.evidence.threshold,
    margin: c.evidence.margin,
    evidence: c.evidence,
  }));
  const topologyPrimitives = 'NOT PRODUCED BY THIS PATH -- topological choke-point discovery is a separate, distinct thread (not folded into KRYL-1207).';
  // Always null: specs/SPEC-normalization-discovery.md found no legitimate cross-type ranking
  // exists (negative result). Surfaced explicitly per the Data Tap checklist rather than omitted
  // silently -- "not applicable" is itself the finding, not an absence to leave unstated.
  const normalizationEvidence = null;

  if (candidates.length === 0) {
    return { outcome: 'NONE', selected: null, conflict: null, pairwise: [], candidateTaps, basis: 'no eligible candidates', topologyPrimitives, normalizationEvidence };
  }
  if (candidates.length === 1) {
    return { outcome: 'SINGLE', selected: candidates[0], conflict: null, pairwise: [], candidateTaps, basis: 'only one eligible candidate, no adjudication needed', topologyPrimitives, normalizationEvidence };
  }

  const pairwise = [];
  let conflict = null;
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i], b = candidates[j];
      const result = classifyPair(a, b);
      pairwise.push({ a: a.evidence.type, b: b.evidence.type, ...result });
      if (result.classification === 'Conflict' && !conflict) conflict = { a, b, ruleInvoked: result.ruleInvoked };
    }
  }

  if (conflict) {
    return {
      outcome: 'CONFLICT', selected: null, conflict, pairwise, candidateTaps,
      basis: `authored opposition rule matched between ${conflict.a.evidence.type} and ${conflict.b.evidence.type}`,
      topologyPrimitives, normalizationEvidence,
    };
  }

  // No conflict. Per specs/SPEC-normalization-discovery.md (closed, negative result): no
  // legitimate cross-type ranking exists for the candidate types that actually co-occur. This is
  // the permanent, correct outcome, not a placeholder -- never fall back to stateHash or any other
  // silent pick (specs/SPEC-adjudication-contract.md §3 step 3, §2 rejects Option A explicitly).
  return {
    outcome: 'UNRESOLVED_NO_RANKING', selected: null, conflict: null, pairwise, candidateTaps,
    basis: 'multiple valid, non-conflicting candidates exist; no legitimate cross-type ranking mechanism exists (specs/SPEC-normalization-discovery.md) -- selection is not asserted',
    topologyPrimitives, normalizationEvidence,
  };
}

// Module-level Data Tap accessor -- KRYL-1207 exit criterion (specs/SPEC-adjudication-contract.md
// §6). Every primitive computed by adjudicate() is inspectable here, not just the display text
// buildNarrative() extracts from it. Updated every render via observestoryview.jsx's
// buildNarrative(); read with getLastAdjudication() from devtools, tests, or a future debug
// surface -- this is the "surfaced as a Data Tap" requirement, deliberately NOT rendered as new
// UI (that would be Option B, already explicitly rejected as a workaround).
let _lastAdjudication = null;
export function getLastAdjudication() {
  return _lastAdjudication;
}
export function setLastAdjudication(result) {
  _lastAdjudication = result;
  return result;
}
