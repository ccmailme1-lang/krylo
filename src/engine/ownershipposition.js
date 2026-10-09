// ownershipposition.js -- KRYL-1386 (spec: specs/SPEC-kryl1386-source-dated-relationship-change-v1.0-REVIEW-20261009.md).
// Pure parsers for the position fields of Schedule 13G / 13D filings. No network, no state.
//   parseSchedule13GXml(xml)  -- new-format filings (SCHEDULE 13G, 13G/A, 13D, 13D/A), structured primary_doc.xml
//   parseLegacy13GText(html)  -- legacy SC 13G / SC 13G/A documents (HTML or plain text), anchored on the form's own row labels
// Values are returned AS REPORTED. A field that cannot be read is null (unknown), never 0 and never inferred.
// Verified against saved SEC filings in tests/fixtures/sec (Alphabet, 2024 to 2026).

const num = (s) => {
  if (s == null) return null;
  const n = Number(String(s).replace(/,/g, '').replace(/%/g, '').trim());
  return Number.isFinite(n) ? n : null;
};

const tag = (block, name) => {
  const m = block.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>', 'i'));
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : null;
};

// MM/DD/YYYY or "March 13, 2026" -> YYYY-MM-DD (UTC calendar date), null when not parseable.
export function toIsoDate(text) {
  if (!text) return null;
  const t = String(text).trim();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
  m = t.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const i = months.indexOf(m[1].slice(0, 3).toLowerCase());
    if (i >= 0) return `${m[3]}-${String(i + 1).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
  }
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

const releaseNumber = (comments) => {
  const m = comments ? comments.match(/Release No\.?\s*([0-9]{2}-[0-9]+)/i) : null;
  return m ? m[1] : null;
};

/** New-format structured filing. Returns null when the text is not a Schedule 13G/13D submission. */
export function parseSchedule13GXml(xml) {
  if (typeof xml !== 'string' || !/<edgarSubmission/i.test(xml)) return null;
  const submissionType = tag(xml, 'submissionType');
  const issuerBlock = (xml.match(/<issuerInfo>[\s\S]*?<\/issuerInfo>/i) ?? [''])[0];
  const personBlocks = [...xml.matchAll(/<coverPageHeaderReportingPersonDetails>[\s\S]*?<\/coverPageHeaderReportingPersonDetails>/gi)].map(m => m[0]);
  const persons = personBlocks.map((b) => {
    const comments = tag(b, 'comments');
    return {
      name: tag(b, 'reportingPersonName'),
      typeOfReportingPerson: tag(b, 'typeOfReportingPerson'),
      percent: num(tag(b, 'classPercent')),
      shares: num(tag(b, 'reportingPersonBeneficiallyOwnedAggregateNumberOfShares')),
      soleVote: num(tag(b, 'soleVotingPower')),
      sharedVote: num(tag(b, 'sharedVotingPower')),
      soleDisp: num(tag(b, 'soleDispositivePower')),
      sharedDisp: num(tag(b, 'sharedDispositivePower')),
      comments,
      releaseNumber: releaseNumber(comments),
    };
  });
  const item5 = (xml.match(/<item5>[\s\S]*?<\/item5>/i) ?? [''])[0];
  return {
    family: 'new',
    form: submissionType,
    filerCik: tag((xml.match(/<filerCredentials>[\s\S]*?<\/filerCredentials>/i) ?? [''])[0], 'cik'),
    amendmentNo: num(tag(xml, 'amendmentNo')),
    classTitle: tag(xml, 'securitiesClassTitle'),
    eventDate: toIsoDate(tag(xml, 'eventDateRequiresFilingThisStatement')),
    issuerCik: tag(issuerBlock, 'issuerCik'),
    issuerName: tag(issuerBlock, 'issuerName'),
    cusip: tag(issuerBlock, 'issuerCusipNumber') ?? tag(issuerBlock, 'issuerCusip') ?? tag(xml, 'issuerCusipNumber') ?? tag(xml, 'issuerCusip'), // schema variants (issuerCusipNumber, issuerCusip)
    persons,
    person: persons[0] ?? null,           // first reporting person (the filer in a single-person filing); see selectPerson for group filings
    below5Flag: /<classOwnership5PercentOrLess>\s*Y\s*</i.test(item5), // "5 percent or less": NOT a termination signal (spec section 5)
  };
}

const textOf = (html) => String(html ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;|&#xA0;|&#8194;|&#8195;|&#8201;|&ensp;|&emsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ');

/**
 * Legacy SC 13G / SC 13G/A (HTML or plain text). Anchored on the labels printed on the form itself.
 * Tested on 5 saved filings (percent 5 of 5, shares 3 of 5, CUSIP 3 of 5; spec section 10 / Appendix A2).
 * A missing field is null; callers treat a null percent as unusable (SOURCE_LIMIT).
 */
export function parseLegacy13GText(html) {
  const text = textOf(html);
  if (!/13G|13D/i.test(text)) return null;
  const grab = (re) => { const m = text.match(re); return m ? m[1] : null; };
  const percent = num(grab(/Percent of Class Represented by Amount in Row\s*\(?\s*9\s*\)?\s*[:.]?\s*([0-9]+(?:\.[0-9]+)?)\s*%?/i));
  const shares = num(grab(/Aggregate Amount Beneficially Owned by Each Reporting Person\s*[:.]?\s*([0-9][0-9,]*)/i));
  const cusip = grab(/CUSIP\s*(?:No\.?|Number)?\s*[:.]?\s*([0-9][0-9A-Z]{8})\b/i);
  const eventDate = toIsoDate(grab(/Date of Event Which Requires Filing of this Statement\s*[:.]?\s*\(?\s*([A-Za-z]+\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i));
  const issuerName = grab(/Name of Issuer\s*[:.]?\s*(.{3,80}?)\s+(?:\(b\)|Item\s*1\s*\(b\)|Address of Issuer)/i);
  const comments = null;
  return {
    family: 'legacy',
    form: grab(/\b(SC\s*13[GD](?:\/A)?)\b/i),
    classTitle: grab(/Title of Class of Securities\s*[:.]?\s*(.{3,60}?)\s+(?:\(e\)|Item|CUSIP)/i),
    eventDate,
    issuerName: issuerName ? issuerName.trim() : null,
    cusip,
    person: { name: null, percent, shares, soleVote: null, sharedVote: null, soleDisp: null, sharedDisp: null, comments, releaseNumber: null },
    persons: [],
    below5Flag: false,
  };
}

// A group filing lists several reporting persons (Schmidt 2025-08-14 lists nine). The position that belongs to the
// holder under analysis is the person whose name matches the filer's display name; with no match the first person
// is used and the result is flagged (matched: false) so callers can treat it as less certain.
export function selectPerson(parsed, holderName) {
  const persons = parsed?.persons ?? [];
  if (persons.length <= 1) return { person: persons[0] ?? parsed?.person ?? null, matched: true };
  const norm = (x) => String(x ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  const want = new Set(norm(holderName));
  let best = null, bestScore = 0;
  for (const p of persons) {
    const toks = norm(p.name); if (!toks.length) continue;
    const score = toks.filter(t => want.has(t)).length / toks.length;
    if (score > bestScore) { best = p; bestScore = score; }
  }
  return best && bestScore >= 0.5 ? { person: best, matched: true } : { person: persons[0], matched: false };
}
