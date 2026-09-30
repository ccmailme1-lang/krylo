// relationalchange.js — KRYL-1334 Part 2, Relational Change diff.
//
// PURE. Two persisted formation_state snapshots in, a classified change list out. Never
// infers, never fabricates a transition from anything but two real, comparable rows. Reuses
// structuralentitysynthesis.js's SUPPORTED/NO_EVIDENCE vocabulary as the ground truth for
// "was this relationship established at this timestamp" -- no new admission logic (per the
// spec's own invariant: "Persistence captures state; it does not manufacture state").
//
// Comparison granularity (Founder-ruled, LOCKED, specs/SPEC-relational-change-temporal-axis.md
// GUIDELINES #4): exact match on formation_id only. formation_id itself already encodes
// subject + field scope + formation scope + entity pair + relationship type (tonight's
// correction) -- two rows with the same formation_id are, by construction, the same scope.
// Cross-formation_id comparison is never attempted here; the caller is responsible for only
// ever diffing rows that share a formation_id (see diffFormationHistory below, which enforces
// this by grouping first).

export const RELATIONAL_CHANGE_STATE = Object.freeze({
  NEW:             'NEW',
  STRENGTHENING:   'STRENGTHENING',
  WEAKENING:       'WEAKENING',
  STABLE:          'STABLE',           // derived only -- never written as a formation_state row
  RECONFIGURATION: 'RECONFIGURATION',
  DISSOLUTION:     'DISSOLUTION',
});

/**
 * classifyTransition — two formation_state rows for the SAME formation_id, ordered by time.
 * @param {object|null} prev — earlier row, or null if this is the first-ever observation.
 * @param {object} next — later row. Must share prev.formation_id when prev is non-null.
 * @returns {{ formationId, state, from: object|null, to: object }}
 */
export function classifyTransition(prev, next) {
  if (!next) throw new Error('classifyTransition: next is required');
  if (prev && prev.formation_id !== next.formation_id) {
    throw new Error(`classifyTransition: formation_id mismatch (${prev.formation_id} vs ${next.formation_id}) -- cross-scope comparison is forbidden`);
  }

  if (!prev) {
    return { formationId: next.formation_id, state: RELATIONAL_CHANGE_STATE.NEW, from: null, to: next };
  }

  // Same formation_id, same recorded `state` value on both rows -> nothing changed between
  // samples. This is the STABLE case -- never written by the capture layer, only derived here,
  // per tonight's correction ("a stable segment... should not require a new STABLE event
  // glyph"). A persistence-layer row's `state` field records what kind of transition PRODUCED
  // it (NEW/STRENGTHENING/WEAKENING/RECONFIGURATION/DISSOLUTION) -- two consecutive rows with
  // identical relationship_type/entity_a/entity_b and no material difference in evidence_ref
  // means the underlying relationship didn't change, regardless of what each row's own
  // `state` label says about ITS OWN admission.
  if (prev.evidence_ref === next.evidence_ref && prev.relationship_type === next.relationship_type) {
    return { formationId: next.formation_id, state: RELATIONAL_CHANGE_STATE.STABLE, from: prev, to: next };
  }

  if (next.state === RELATIONAL_CHANGE_STATE.DISSOLUTION) {
    return { formationId: next.formation_id, state: RELATIONAL_CHANGE_STATE.DISSOLUTION, from: prev, to: next };
  }

  // A real, different evidence_ref with the same relationship_type -> the relationship persists
  // but its support changed -- classified by the capture layer's own STRENGTHENING/WEAKENING
  // label (it has access to the real evidence comparison at write time; this diff function
  // does not re-derive strength from evidence text, it only trusts a real recorded state).
  if (next.state === RELATIONAL_CHANGE_STATE.STRENGTHENING || next.state === RELATIONAL_CHANGE_STATE.WEAKENING) {
    return { formationId: next.formation_id, state: next.state, from: prev, to: next };
  }

  // relationship_type itself changed, or evidence changed without a clean strengthen/weaken
  // label -- composition changed without a single clean new/dissolved edge.
  return { formationId: next.formation_id, state: RELATIONAL_CHANGE_STATE.RECONFIGURATION, from: prev, to: next };
}

/**
 * diffFormationHistory — groups rows by formation_id, orders each group by captured_at, and
 * classifies every consecutive pair. False-positive guard: identical consecutive rows always
 * classify STABLE, never a change, regardless of how many rows exist between real changes.
 * @param {object[]} rows — formation_state rows, any order, any mix of formation_ids.
 * @returns {Array<{formationId, state, from, to}>}
 */
export function diffFormationHistory(rows) {
  const byFormation = new Map();
  for (const r of rows ?? []) {
    if (!byFormation.has(r.formation_id)) byFormation.set(r.formation_id, []);
    byFormation.get(r.formation_id).push(r);
  }

  const transitions = [];
  for (const group of byFormation.values()) {
    group.sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at));
    for (let i = 0; i < group.length; i++) {
      transitions.push(classifyTransition(group[i - 1] ?? null, group[i]));
    }
  }
  return transitions;
}
