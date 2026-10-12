// canonicalrelationshiptext.js -- the words for an admitted canonical relationship, shared by every surface that shows one (the brief, the MAP list, the
// History analyses view) so the same relationship reads the same everywhere. Pure. Moved out of structuralbrief.jsx, which re-exports these unchanged.

// DEF-1391: the direction of a canonical relationship in words, the same sentences the MAP panel uses
// (structure-field.html relationshipSentence): for HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE the parts are
// [issuer, filer], so the filer is the holder; the subject may be either, and the wording says which.
// DEF-1396: the filing behind an admitted relationship, from its admission evidence. Null fields stay out of the line;
// no evidence at all is a stated absence, never a default.
export function canonicalProvenanceLine(ev) {
  const p = ev?.provenance;
  if (!p || (!p.accession && !p.filingDate)) return 'filing not recorded for this admission';
  return [p.form, p.filingDate ? `filed ${p.filingDate}` : null, p.accession ? `accession ${p.accession}` : null].filter(Boolean).join(' · ');
}

// DEF-1396: when this query's ownership lookup has not reported, relationships already in rho are named for what they are:
// admitted in this page session from the cited filings, not confirmed by a lookup that reported for this query.
export function ownershipFailureNotice(reason, admittedCount) {
  return admittedCount > 0
    ? `Ownership lookup for this query: ${reason}. The ${admittedCount} canonical relationship${admittedCount !== 1 ? 's' : ''} listed ${admittedCount !== 1 ? 'were' : 'was'} admitted in this page session from the filings cited with ${admittedCount !== 1 ? 'them' : 'it'}; no lookup that reported confirms ${admittedCount !== 1 ? 'them' : 'it'} for this query, and others may exist — their absence is not evidence that none exist.`
    : `Ownership observation failed (${reason}) — canonical relationships could not be checked this time, so their absence here is not evidence that none exist.`;
}

// KRYL-1401: what the filing states about a capital-event relationship, as lines under it. The matching outcome is shown exactly as returned;
// an unnamed affiliate is never described as the named entity.
export function canonicalDetailLines(ev) {
  const p = ev?.provenance;
  if (p?.source === 'CLINICALTRIALS_GOV') {                  // KRYL-1414: what the registry states about the study
    return [`lead sponsor (industry) as ClinicalTrials.gov states it · ${p.nctId}${p.overallStatus ? ` · status ${p.overallStatus}` : ''}${p.phase ? ` · phase ${p.phase}` : ''} · registry record updated ${p.lastUpdated ?? 'date not stated'}; the status is as of that update`,
      `the sponsor name "${p.leadSponsorName}" equals the resolved entity's legal name; the registry did not create the identity${p.title ? ` · title: ${String(p.title).length > 120 ? String(p.title).slice(0, 117) + '…' : p.title}` : ''}`];
  }
  if (p?.source === 'SEC_FORM_D') {                          // KRYL-1413: the role as the issuer's own Form D states it; the person's identity is the name in that filing only
    return [`${p.role === 'DIRECTOR' ? 'director' : 'executive officer'}${p.clarification ? ` · clarification as written: ${p.clarification}` : ''} · stated in ${p.form}, filed ${String(p.filingDate).slice(0, 10)} · as of that filing; no end of the role is stated or inferred`,
      `identity: the name as the issuer's Form D states it, scoped to this issuer (issuer SEC CIK ${p.issuerCik}); the person has no SEC CIK and is not matched to any other person or entity`];
  }
  if (p?.source === 'SEC_FORM_3_4_5') {                    // KRYL-1411: the role as the filing states it, and as of which filing
    const lines = [`${p.role === 'DIRECTOR' ? 'director' : 'officer'}${p.officerTitle ? ` · title as written: ${p.officerTitle}` : ''} · stated in ${p.form}, period of report ${p.periodOfReport} · disclosed as of ${String(p.filingDate).slice(0, 10)}; no end of the role is stated or inferred`];
    lines.push(`both parties identified by SEC CIK: issuer ${p.issuerCik}, person ${p.personCik}${p.jointFiling ? ' (a joint filing; this person\'s own role flag is the evidence)' : ''}`);
    return lines;
  }
  if (p?.source === 'SEC_8K_ACQUISITION') {                // KRYL-1409: what the filing states about an acquisition, with the matching outcome as returned
    const m = p.counterpartyMatch ?? {};
    const out = [`${p.agreement ?? 'agreement'} · Item ${p.item} · deal status as the filing states it: ${p.dealStatus}${p.filerRole === 'TARGET' ? ' · the filer is the target' : ''}`,
      `other party: ${m.outcome} · SEC CIK ${m.identifier?.value} (${m.canonicalName})`];
    if (p.passage) out.push(`"${String(p.passage).length > 190 ? String(p.passage).slice(0, 187).trimEnd() + '…' : p.passage}"`);
    return out;
  }
  if (!p || p.source !== 'SEC_8K_CAPITAL_EVENT') return [];
  const m = p.counterpartyMatch ?? {};
  const lines = [];
  if (p.instrument) lines.push(`instrument: ${p.instrument}${p.amounts?.length ? ` · ${p.amounts.slice(0, 2).map(a => `${a.raw}${a.wording ? ` (${a.wording})` : ''}`).join(' · ')} as stated; no magnitude is derived (INDETERMINATE)` : ''}`);
  lines.push(m.outcome === 'AFFILIATION_CONFIRMED' && m.partyIsNamed === false
    ? `counterparty: the filing names "an affiliate of ${p.counterpartyName}"; the party itself is not named (affiliation documented in the filing; ${m.canonicalName} SEC CIK ${m.identifier?.value})`
    : `counterparty: ${m.outcome} · SEC CIK ${m.identifier?.value} (${m.canonicalName})${p.counterpartyRole ? ` · ${p.counterpartyRole}` : ''}`);
  if (p.passage) lines.push(`"${String(p.passage).length > 190 ? String(p.passage).slice(0, 187).trimEnd() + '…' : p.passage}"`);
  return lines;
}

export function canonicalRelationshipSentence(type, a, b, nuId = null, dealStatus = null) {
  if (type === 'CAPITAL_EVENT_INVOLVES') return `${a} reported a capital event involving ${nuId?.partyQualifier === 'UNNAMED_AFFILIATE_OF' ? 'an unnamed affiliate of ' : ''}${b}`;
  if (type === 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE') return `${b} has disclosed beneficial ownership in ${a}`;
  if (type === 'LEAD_SPONSOR_OF_CLINICAL_TRIAL') return `${a} is the lead sponsor of clinical trial ${b}`;
  if (type === 'HAS_FORM_D_OFFICER_OR_DIRECTOR_DISCLOSURE') return `${b} is stated as ${nuId?.role === 'DIRECTOR' ? 'a director' : 'an executive officer'} of ${a} in its Form D`;
  if (type === 'HAS_OFFICER_OR_DIRECTOR_DISCLOSURE') return `${b} is disclosed as ${nuId?.role === 'DIRECTOR' ? 'a director' : 'an officer'} of ${a}`;
  if (type === 'ACQUIRED') return dealStatus === 'PENDING' ? `${a} entered an agreement to acquire ${b} (pending)` : (dealStatus === 'CLOSED' ? `${a} completed its acquisition of ${b}` : (dealStatus === 'TERMINATED' ? `${a}'s agreement to acquire ${b} was terminated` : `${a} acquired ${b}`));
  if (type === 'SHARED_PATENT_ASSIGNMENT') return `${a} and ${b} share a patent assignment`;
  return `${a} ↔ ${b}`;
}

