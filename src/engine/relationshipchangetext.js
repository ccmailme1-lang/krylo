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
  return { headline: `${r.holderName ?? 'holder'} · ${cls} — ${r.summary}`, lines, evidence, rules: r.rules };
}
