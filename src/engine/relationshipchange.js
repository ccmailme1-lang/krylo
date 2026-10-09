// relationshipchange.js -- KRYL-1386 (spec: specs/SPEC-kryl1386-source-dated-relationship-change-v1.0-REVIEW-20261009.md, v1.1).
// Pure comparison of source-dated ownership observations across two adjacent 12-month periods.
// No network, no clock (T is passed in), no state. Three independent dimensions per relationship unit:
//   existence      NEW | PERSISTING | DISSOLVED | INDETERMINATE
//   magnitude      STRENGTHENING | WEAKENING | NO MATERIAL CHANGE | NOT_ASSESSED | INDETERMINATE
//   configuration  RECONFIGURED (subtypes rights / participants) | NO MATERIAL CHANGE | INDETERMINATE
// INDETERMINATE always carries one reason code and an absence class. Nothing is inferred from missing history,
// failed retrieval or a filing's absence; observed change never asserts causation (CLAUDE.md section 21).
//
// Observation (built by ownershiphistory.js from ownershipposition.js parses):
//   { accession, form, family:'new'|'legacy', filingDate, eventDate, dateBasis:'event'|'filing',
//     issuerCik, holderCik, holderName, cusip|null, classTitle, percent|null, shares|null,
//     soleVote, sharedVote, soleDisp, sharedDisp, below5Flag, comments, releaseNumber, source }

export const MATERIAL_POINTS = 1.0;          // settled: ownership magnitude threshold, percentage points, inclusive
export const AS_OF_LOOKBACK_MONTHS = 24;     // L (spec section 3)
export const PERIOD_MONTHS = 12;

export const REASON = Object.freeze({
  NO_PRIOR_OBSERVATION: { code: 'NO_PRIOR_OBSERVATION', absenceClass: 'a or c' },
  NO_CURRENT_OBSERVATION: { code: 'NO_CURRENT_OBSERVATION', absenceClass: 'a or b' },
  COVERAGE_INCOMPLETE: { code: 'COVERAGE_INCOMPLETE', absenceClass: 'b' },
  INCOMPATIBLE_OBSERVATIONS: { code: 'INCOMPATIBLE_OBSERVATIONS', absenceClass: 'c' },
  SOURCE_LIMIT: { code: 'SOURCE_LIMIT', absenceClass: 'b or d' },
  NO_COMPARABLE_MEASURE: { code: 'NO_COMPARABLE_MEASURE', absenceClass: 'd' },
  PARTICIPANT_CHANGE_UNVERIFIED: { code: 'PARTICIPANT_CHANGE_UNVERIFIED', absenceClass: 'c' },
});

// ── dates (calendar dates, UTC, inclusive bounds) ─────────────────────────────────────────────
const toDay = (iso) => { const m = String(iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; };
const fromDay = (ms) => new Date(ms).toISOString().slice(0, 10);
export function addMonths(iso, n) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const y = +m[1], mo = +m[2] - 1, d = +m[3];
  const t = Date.UTC(y, mo + n, 1);
  const last = new Date(Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth() + 1, 0)).getUTCDate();
  return fromDay(Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth(), Math.min(d, last)));
}
export function periods(T) {
  const E1 = String(T).slice(0, 10);
  const E0 = addMonths(E1, -PERIOD_MONTHS);
  const S0 = addMonths(E1, -2 * PERIOD_MONTHS);
  return { E1, E0, P1: { from: E0, to: E1, fromExclusive: true }, P0: { from: S0, to: E0, fromExclusive: true } };
}
const inRange = (iso, from, to, fromExclusive) => { const d = toDay(iso), a = toDay(from), b = toDay(to); return d != null && (fromExclusive ? d > a : d >= a) && d <= b; };

const cmpObs = (a, b) => (toDay(a.eventDate) - toDay(b.eventDate)) || String(a.filingDate).localeCompare(String(b.filingDate)) || String(a.accession).localeCompare(String(b.accession));

const unitKey = (o) => `${o.issuerCik}|${o.holderCik}|${o.cusip ?? '?'}`;
const rd2 = (x) => Math.round(x * 100) / 100;

// Amendments supersede; same event date with different accessions: latest filing wins, a value difference is a conflict.
function resolveDuplicates(list) {
  const byDate = new Map();
  for (const o of list) { const k = `${o.eventDate}|${o.unclassed ? 'unclassed' : 'classed'}`; (byDate.get(k) ?? byDate.set(k, []).get(k)).push(o); }
  const out = [], conflicts = [];
  for (const [date, group] of byDate) {
    group.sort(cmpObs);
    const last = group[group.length - 1]; const date = last.eventDate;
    const differs = group.some(g => g !== last && (g.percent !== last.percent || g.shares !== last.shares));
    if (differs) conflicts.push({ eventDate: date, accessions: group.map(g => g.accession) });
    out.push({ ...last, supersedes: group.slice(0, -1).map(g => g.accession) });
  }
  return { observations: out.sort(cmpObs), conflicts };
}

const heldAsOf = (obs, E, L = AS_OF_LOOKBACK_MONTHS) => {
  const floor = addMonths(E, -L);
  const c = obs.filter(o => toDay(o.eventDate) <= toDay(E) && toDay(o.eventDate) >= toDay(floor));
  return c.length ? c[c.length - 1] : null;
};

const evid = (o) => o ? ({
  accession: o.accession, form: o.form, filingDate: o.filingDate, eventDate: o.eventDate, dateBasis: o.dateBasis,
  percent: o.percent, shares: o.shares, cusip: o.cusip, soleVote: o.soleVote, sharedVote: o.sharedVote, soleDisp: o.soleDisp, sharedDisp: o.sharedDisp,
  below5Flag: !!o.below5Flag, source: o.source ?? null, family: o.family,
}) : null;

const ind = (reason, note) => ({ state: 'INDETERMINATE', reason: reason.code, absenceClass: reason.absenceClass, note: note ?? null });

// category flip in the voting / dispositive fields between two observations (spec section 7)
function rightsChange(a, b) {
  const cats = [['soleVote', 'sole voting power'], ['sharedVote', 'shared voting power'], ['soleDisp', 'sole dispositive power'], ['sharedDisp', 'shared dispositive power']];
  const fieldsPresent = cats.every(([k]) => a[k] != null && b[k] != null);
  if (!fieldsPresent) return { present: false, flips: [] };
  const flips = cats.filter(([k]) => (a[k] > 0) !== (b[k] > 0)).map(([k, label]) => ({ field: k, label, from: a[k], to: b[k] }));
  return { present: true, flips };
}

/**
 * Documented participant change (spec section 7): the terminated filing's own comments state a realignment or
 * disaggregated reporting, and the successor filing cites the same SEC release. A name change on one CIK is never a change.
 */
export function participantsDocumented(terminated, successor) {
  const a = terminated?.comments ?? '', b = successor?.comments ?? '';
  const ra = terminated?.releaseNumber, rb = successor?.releaseNumber;
  const statesRealignment = /realignment|report(?:s|ed)? beneficial ownership separately|disaggregat/i.test(a);
  return !!(statesRealignment && ra && rb && ra === rb);
}

/**
 * @param observations  all observations for ONE issuer (the subject), any holders/classes
 * @param T             analysis time (snapshot generation), 'YYYY-MM-DD...'
 * @param coverage      { complete: boolean, reasons?: string[] }  retrieval coverage for the whole window (section 4)
 * @returns { periods, relationships: [record], notes }
 */
export function classifyOwnershipChange({ observations, T, coverage = { complete: true }, issuerName = null }) {
  const per = periods(T);
  const covComplete = coverage?.complete === true;
  const groups = new Map();
  const valid = (observations ?? []).filter(o => o?.eventDate);
  for (const o of valid.filter(x => x.cusip != null)) { (groups.get(unitKey(o)) ?? groups.set(unitKey(o), []).get(unitKey(o))).push(o); }
  // A filing whose share class (CUSIP) could not be recovered cannot be matched to a class (spec section 10). It still
  // evidences that the holder filed, so it supports existence for each of that holder's classified units; it is marked
  // `unclassed`, and magnitude and configuration against it are SOURCE_LIMIT. A holder with only such filings is its own unit.
  for (const o of valid.filter(x => x.cusip == null)) {
    const mine = [...groups.entries()].filter(([k]) => k.startsWith(`${o.issuerCik}|${o.holderCik}|`) && !k.endsWith('|?'));
    if (mine.length) for (const [, list] of mine) list.push({ ...o, unclassed: true });
    else (groups.get(unitKey(o)) ?? groups.set(unitKey(o), []).get(unitKey(o))).push({ ...o, unclassed: true });
  }

  const records = [];
  for (const [key, list] of groups) {
    const { observations: obs, conflicts } = resolveDuplicates(list);
    const first = obs[obs.length - 1];
    const keyCusip = key.split('|')[2] === '?' ? null : key.split('|')[2];
    const cusipKnown = keyCusip != null;
    const h0 = heldAsOf(obs, per.E0);
    const inP1 = obs.filter(o => inRange(o.eventDate, per.P1.from, per.P1.to, true));
    const lastP1 = inP1.length ? inP1[inP1.length - 1] : null;
    const h0Held = !!h0 && h0.percent != null && h0.percent > 0;
    const termination = lastP1 && lastP1.percent === 0 ? lastP1 : null;       // classPercent = 0 (positive evidence); the 5-percent-or-less flag alone is not termination
    const o1 = lastP1 && lastP1.percent != null && lastP1.percent > 0 ? lastP1 : null;
    const rec = {
      unit: key, issuerCik: first.issuerCik, issuerName, holderCik: first.holderCik, holderName: first.holderName, cusip: keyCusip, classTitle: (obs.filter(o => !o.unclassed).slice(-1)[0] ?? first).classTitle,
      periods: { E0: per.E0, E1: per.E1, P0: per.P0, P1: per.P1 },
      existence: null, magnitude: { state: 'NOT_ASSESSED' }, configuration: { state: 'NOT_ASSESSED', subtypes: [] },
      evidence: { asOfE0: evid(h0), inP1: inP1.map(evid), termination: evid(termination), conflicts },
      rules: [], basis: 'source-dated-12m', computedAt: per.E1,
    };

    // ── Existence (spec section 5)
    const conflictInScope = conflicts.length > 0 && conflicts.some(c => c.eventDate === (lastP1 ?? h0)?.eventDate);
    if (conflictInScope) { rec.existence = ind(REASON.INCOMPATIBLE_OBSERVATIONS, 'two filings share the event date with different values'); rec.rules.push('EXIST:conflicting-same-date-filings'); }
    else if (h0Held && termination) { rec.existence = { state: 'DISSOLVED', basis: 'reported zero percent in P1' }; rec.rules.push('EXIST-DISSOLVED:zero-percent-in-P1'); }
    else if (h0Held && o1) { rec.existence = { state: 'PERSISTING', basis: 'held as of E0 and reported in P1' }; rec.rules.push('EXIST-PERSISTING:held-E0-and-observed-P1'); }
    else if (h0 && h0.percent == null && lastP1) { rec.existence = ind(REASON.SOURCE_LIMIT, 'a filing held as of E0 exists but its percent of class was not recovered'); rec.rules.push('EXIST:e0-filing-unreadable'); }
    else if (!h0Held && o1) {
      if (covComplete) { rec.existence = { state: 'NEW', basis: 'observed in P1, not held as of E0, coverage complete' }; rec.rules.push('EXIST-NEW:observed-P1-not-held-E0-coverage-complete'); }
      else { rec.existence = ind(REASON.COVERAGE_INCOMPLETE, 'not held as of E0 in the retrieved data, but retrieval was incomplete'); rec.rules.push('EXIST:new-blocked-by-incomplete-coverage'); }
    }
    else if (h0Held && !lastP1) { rec.existence = ind(REASON.NO_CURRENT_OBSERVATION, 'held as of E0; no filing in P1 and no termination evidence'); rec.rules.push('EXIST:no-current-observation'); }
    else if (lastP1 && lastP1.percent == null) { rec.existence = ind(REASON.SOURCE_LIMIT, 'a P1 filing exists but its percent of class was not recovered'); rec.rules.push('EXIST:p1-filing-unreadable'); }
    else { continue; } // not a relationship in scope for this comparison (no held position, nothing in P1)

    // ── Magnitude (spec section 6): ownership only, existence PERSISTING, distinct same-unit filings
    if (rec.existence.state === 'PERSISTING') {
      if (h0.accession === o1.accession) rec.magnitude = ind(REASON.NO_PRIOR_OBSERVATION, 'E0 and P1 resolve to the same filing');
      else if (!cusipKnown || h0.unclassed || o1.unclassed || h0.cusip == null || o1.cusip == null) rec.magnitude = ind(REASON.SOURCE_LIMIT, 'share class (CUSIP) not recovered for one of the filings; classes cannot be matched');
      else if (h0.cusip !== o1.cusip) rec.magnitude = ind(REASON.INCOMPATIBLE_OBSERVATIONS, 'different share classes');
      else if (h0.percent == null || o1.percent == null) rec.magnitude = ind(REASON.SOURCE_LIMIT, 'percent of class not recovered from a filing');
      else {
        const delta = rd2(o1.percent - h0.percent);
        if (delta >= MATERIAL_POINTS) { rec.magnitude = { state: 'STRENGTHENING', deltaPoints: delta, from: h0.percent, to: o1.percent }; rec.rules.push('MAG-STRENGTHENING:delta>=+1.0'); }
        else if (delta <= -MATERIAL_POINTS) { rec.magnitude = { state: 'WEAKENING', deltaPoints: delta, from: h0.percent, to: o1.percent }; rec.rules.push('MAG-WEAKENING:delta<=-1.0'); }
        else if (covComplete) { rec.magnitude = { state: 'NO MATERIAL CHANGE', deltaPoints: delta, from: h0.percent, to: o1.percent }; rec.rules.push('MAG-NO-MATERIAL-CHANGE:|delta|<1.0-with-sufficient-evidence'); }
        else rec.magnitude = { ...ind(REASON.COVERAGE_INCOMPLETE, 'below the threshold but retrieval was incomplete'), deltaPoints: delta };
      }
    }

    // ── Configuration (spec section 7): rights flips; participants handled across units below
    if (rec.existence.state === 'PERSISTING') {
      if (h0.accession === o1.accession) rec.configuration = { ...ind(REASON.NO_PRIOR_OBSERVATION, 'E0 and P1 resolve to the same filing'), subtypes: [] };
      else if (!cusipKnown || h0.unclassed || o1.unclassed || h0.cusip == null || o1.cusip == null) rec.configuration = { ...ind(REASON.SOURCE_LIMIT, 'share class (CUSIP) not recovered for one of the filings'), subtypes: [] };
      else {
        const rc = rightsChange(h0, o1);
        if (!rc.present) rec.configuration = { ...ind(REASON.SOURCE_LIMIT, 'voting or dispositive fields not recovered'), subtypes: [] };
        else if (rc.flips.length) { rec.configuration = { state: 'RECONFIGURED', subtypes: ['rights'], rights: rc.flips }; rec.rules.push('CONF-RECONFIGURED-RIGHTS:category-flip'); }
        else if (covComplete) { rec.configuration = { state: 'NO MATERIAL CHANGE', subtypes: [] }; rec.rules.push('CONF-NO-MATERIAL-CHANGE:no-category-flip-with-sufficient-evidence'); }
        else rec.configuration = { ...ind(REASON.COVERAGE_INCOMPLETE, 'no rights change seen but retrieval was incomplete'), subtypes: [] };
      }
    }
    rec._obs = { h0, o1, termination };
    records.push(rec);
  }

  // ── Participants across units (same issuer, same CUSIP): a DISSOLVED unit and a NEW unit are a candidate pair.
  const dissolved = records.filter(r => r.existence.state === 'DISSOLVED');
  const fresh = records.filter(r => r.existence.state === 'NEW');
  for (const d of dissolved) {
    for (const n of fresh) {
      if (d.issuerCik !== n.issuerCik || d.cusip !== n.cusip || d.holderCik === n.holderCik) continue;
      const terminated = d._obs.termination, successor = n._obs.o1;
      if (participantsDocumented(terminated, successor)) {
        const link = { from: d.holderName, to: n.holderName, basis: `terminated filing ${terminated.accession} states a realignment and both filings cite SEC Release No. ${terminated.releaseNumber}` };
        for (const r of [d, n]) { r.configuration = { state: 'RECONFIGURED', subtypes: [...(r.configuration.subtypes ?? []).filter(x => x !== 'participants'), 'participants'], participants: link }; r.rules.push('CONF-RECONFIGURED-PARTICIPANTS:documented-realignment'); }
      } else {
        for (const r of [d, n]) if (r.configuration.state !== 'RECONFIGURED') r.configuration = { ...ind(REASON.PARTICIPANT_CHANGE_UNVERIFIED, `candidate: ${d.holderName} ended, ${n.holderName} began, no documented affiliation`), subtypes: [], candidate: { from: d.holderName, to: n.holderName } };
      }
    }
  }
  for (const r of records) delete r._obs;

  for (const r of records) r.summary = summarize(r);
  records.sort((a, b) => String(a.holderName).localeCompare(String(b.holderName)) || String(a.cusip).localeCompare(String(b.cusip)));
  return { periods: per, relationships: records, coverage: { complete: covComplete, reasons: coverage?.reasons ?? [] } };
}

// One label for display; the three dimensions stay the record of truth.
export function summarize(r) {
  if (r.existence.state === 'DISSOLVED') return 'DISSOLVED';
  if (r.configuration.state === 'RECONFIGURED') return 'RECONFIGURED';
  if (r.existence.state === 'NEW') return 'NEW';
  if (r.existence.state === 'PERSISTING') {
    if (r.magnitude.state === 'STRENGTHENING') return 'PERSISTING · STRENGTHENING';
    if (r.magnitude.state === 'WEAKENING') return 'PERSISTING · WEAKENING';
    if (r.magnitude.state === 'NO MATERIAL CHANGE') return 'PERSISTING · NO MATERIAL CHANGE';
    return 'PERSISTING';
  }
  return 'INDETERMINATE';
}

/**
 * Capital events (settled: magnitude is INDETERMINATE in version one). An event is a dated occurrence, not a standing
 * position: existence compares the same event type with the same counterparty identifier across the two periods.
 * events: [{ type, counterpartyId|null, counterpartyName?, eventDate, accession, source }]
 */
export function classifyCapitalEvents({ events, T, coverage = { complete: true } }) {
  const per = periods(T);
  const covComplete = coverage?.complete === true;
  const keyOf = (e) => `${e.type}|${e.counterpartyId ?? '-'}`;
  const m = new Map();
  for (const e of events ?? []) {
    if (!e?.eventDate) continue;
    const k = keyOf(e);
    const row = m.get(k) ?? { key: k, type: e.type, counterpartyId: e.counterpartyId ?? null, counterpartyName: e.counterpartyName ?? null, p0: [], p1: [] };
    if (inRange(e.eventDate, per.P0.from, per.P0.to, true)) row.p0.push(e);
    else if (inRange(e.eventDate, per.P1.from, per.P1.to, true)) row.p1.push(e);
    m.set(k, row);
  }
  const rows = [];
  for (const row of m.values()) {
    let existence;
    if (row.p0.length && row.p1.length) existence = { state: 'PERSISTING', basis: 'same event type and counterparty in both periods' };
    else if (row.p1.length && !row.p0.length) existence = covComplete ? { state: 'NEW', basis: 'in P1, not in P0, coverage complete' } : ind(REASON.COVERAGE_INCOMPLETE, 'retrieval was incomplete');
    else existence = ind(REASON.NO_CURRENT_OBSERVATION, 'seen in P0 only; an event does not terminate, so absence in P1 is not a change');
    rows.push({ ...row, existence, magnitude: ind(REASON.NO_COMPARABLE_MEASURE, 'capital-event magnitude is not defined in version one'), configuration: { state: 'NOT_ASSESSED', subtypes: [] }, basis: 'source-dated-12m' });
  }
  return { periods: per, events: rows };
}
