// relationshipchangetext.js -- KRYL-1386. Pure presentation text for one source-dated change record: every line states
// what was compared, from which filings and dates, with the reported values and the rule that decided it. It states
// evidenced change only; it never asserts a cause (CLAUDE.md section 21).
const pct = (v) => (v == null ? 'not recovered' : `${v}%`);
const ev = (e) => (e ? `${pct(e.percent)} in ${e.form ?? 'filing'} ${e.accession} (${e.dateBasis === 'filing' ? 'filing date' : 'event date'} ${e.eventDate})` : 'no filing');
const ORDER = ['DISSOLVED', 'RECONFIGURED', 'NEW', 'PERSISTING · STRENGTHENING', 'PERSISTING · WEAKENING', 'PERSISTING · NO MATERIAL CHANGE', 'PERSISTING', 'INDETERMINATE'];

export function orderRelationships(list) {
  const rank = (r) => { const i = ORDER.indexOf(r.summary); return i < 0 ? ORDER.length : i; };
  return [...list].sort((a, b) => rank(a) - rank(b) || String(a.holderName).localeCompare(String(b.holderName)) || String(a.cusip).localeCompare(String(b.cusip)));
}

export function describeChange(r) {
  const cls = r.cusip ? `class CUSIP ${r.cusip}` : 'share class not recovered';
  const e = r.existence, m = r.magnitude, c = r.configuration;
  const lines = [];
  lines.push(`Existence: ${e.state}${e.reason ? ` (${e.reason}: ${e.note ?? 'insufficient evidence'}; absence class ${e.absenceClass})` : e.basis ? ` (${e.basis})` : ''}`);
  if (e.state === 'DISSOLVED') lines.push('Reading: the reporting person now reports zero ownership of this class. That ends this filer\'s own reporting; it does not show the shares were sold, and a related filer may report them.');
  if (m.state !== 'NOT_ASSESSED') {
    const d = m.deltaPoints != null ? ` ${m.deltaPoints > 0 ? '+' : ''}${m.deltaPoints} points${m.from != null ? ` (${m.from}% to ${m.to}%)` : ''}` : '';
    lines.push(`Magnitude: ${m.state}${d}${m.reason ? ` (${m.reason}: ${m.note ?? ''}; absence class ${m.absenceClass})` : ''}`);
  } else lines.push('Magnitude: not assessed (no comparable pair of filings)');
  if (c.state !== 'NOT_ASSESSED') {
    const sub = c.subtypes?.length ? ` (${c.subtypes.join(' and ')})` : '';
    const why = c.participants ? `: ${c.participants.basis}` : c.rights?.length ? `: ${c.rights.map(f => `${f.label} ${f.from} to ${f.to}`).join('; ')}` : c.reason ? ` (${c.reason}: ${c.note ?? ''}; absence class ${c.absenceClass})` : '';
    lines.push(`Configuration: ${c.state}${sub}${why}`);
  }
  const evidence = [];
  evidence.push(`as of ${r.periods.E0}: ${ev(r.evidence.asOfE0)}`);
  if (r.evidence.inP1.length) evidence.push(`in the current period: ${r.evidence.inP1.map(ev).join('; ')}`);
  else evidence.push('in the current period: no filing');
  if (r.evidence.conflicts?.length) evidence.push(`conflicting filings: ${r.evidence.conflicts.map(x => `${x.eventDate} ${x.accessions.join(' vs ')}`).join('; ')}`);
  return { headline: `${r.holderName ?? 'Holder not identified in the filing index'} · ${cls} — ${r.summary}`, lines, evidence, rules: r.rules };
}

// DEF-1397: the retrieval basis behind a NEW or DISSOLVED classification, built only from the stored record of the run that
// produced it (relationshipchangeservice.js: retrieval = { excluded, coverage, observationCount }). Pure; no rule or threshold
// of KRYL-1386 is touched. A completed search and an incomplete or capped search read differently. Returns [] for any other
// existence state, and a stated absence when the run left no record.
export function describeRetrievalBasis(retrieval, record) {
  const st = record?.existence?.state;
  if (st !== 'NEW' && st !== 'DISSOLVED') return [];
  const cov = retrieval?.coverage;
  if (!cov || !Array.isArray(cov.windows)) return ['Retrieval basis: no retrieval record is available for this run, so the extent of the search is not shown.'];
  const win = cov.windows;
  const from = win.map(w => w.from).sort()[0], to = win.map(w => w.to).sort().slice(-1)[0];
  const answered = win.filter(w => w.status === 'ok').length;
  const returned = win.reduce((n, w) => n + (w.status === 'ok' ? (w.count ?? 0) : 0), 0);
  const failedWin = cov.failedWindows ?? [], failedDocs = cov.failedDocs ?? [];
  const capped = failedWin.filter(w => w.reason === 'AT_CAP').length, notAnswered = failedWin.length - capped;
  const complete = cov.complete === true;
  const lines = [];
  lines.push(`Retrieval basis (this browser run): ${complete ? 'search complete' : 'SEARCH INCOMPLETE'} · SEC filings dated ${from} to ${to} · form families: SCHEDULE 13D/13G (filed from December 2024) and SC 13D/13G (earlier).`);
  const ss = retrieval.store;
  if (ss) {
    if (ss.storeError) lines.push(`The durable store was not reachable (${ss.storeError}); this comparison used only what was retrieved in this run.`);
    else if (ss.incremental) lines.push(`History from the durable store: ${ss.storedFilings} filing observation${ss.storedFilings !== 1 ? 's' : ''} (searched completely through ${ss.previousThrough}); this run searched SEC only for filings dated ${ss.searchedFrom} to ${ss.searchedTo} and found ${ss.newFilings} new.`);
    else lines.push(`No stored history was used (first retrieval for this issuer, or the stored retrieval was incomplete); ${ss.newFilings} filing observation${ss.newFilings !== 1 ? 's were' : ' was'} retrieved and stored.`);
  }
  lines.push(`Search windows answered ${answered} of ${win.length} · filings returned ${returned} · observations built ${retrieval.observationCount ?? 'not recorded'} · set aside ${(retrieval.excluded ?? []).length} · requests ${cov.requests?.search ?? 0} search, ${cov.requests?.doc ?? 0} document.`);
  if (!failedWin.length && !failedDocs.length && !(cov.reasons ?? []).length) lines.push('Not obtained: 0 search windows, 0 documents.');
  else lines.push(`Not obtained: ${notAnswered} search window(s), ${capped} window(s) at the 100-result cap, ${failedDocs.length} document(s)${(cov.reasons ?? []).length ? ` (${cov.reasons.join('; ')})` : ''}.`);
  if (complete) {
    if (st === 'NEW') lines.push(`No filing by this holder for this class was returned dated on or before ${record.periods?.E0}.`);
    lines.push('Completeness applies to this name-narrowed SEC search; it is not proof that no other filing exists.');
  } else lines.push('Retrieval was incomplete, so the absence of a filing is not established by this search.');
  return lines;
}
