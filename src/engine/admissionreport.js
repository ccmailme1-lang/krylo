// admissionreport.js -- the last capital-event admission report per subject (what was admitted, what was not and why, how many mentions were deferred).
// Written by the counterparty lookup (topicconnectors.js), read at the analytical snapshot's freeze so the synthesis can state what is unresolved.
const _reports = new Map();
export const setAdmissionReport = (canonicalId, report) => { if (canonicalId) _reports.set(canonicalId, { admitted: report.admitted?.length ?? 0, rejected: (report.rejected ?? []).map(x => ({ kind: x.kind ?? 'CAPITAL_EVENT', accession: x.accession, counterparty: x.counterparty, outcome: x.outcome, reason: x.reason })), matched: report.matched ?? 0, deferred: report.deferred ?? 0, acquisitionAmbiguous: report.acquisitionAmbiguous ?? [], at: Date.now() }); };
export const getAdmissionReport = (canonicalId) => _reports.get(canonicalId) ?? null;
export const _clearAdmissionReports = () => _reports.clear();
