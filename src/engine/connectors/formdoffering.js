// formdoffering.js -- KRYL-1415 (D6, Founder ratified 2026-10-12). A Form D offering as a dated, issuer-bound CAPITAL OBSERVATION (never a relationship).
// The issuer's own Form D states the offering: date of first sale, total offering amount, amount sold, amount remaining, investors already invested, security types, exemption. They are
// QUOTED AS STATED; nothing is computed from them, no magnitude is derived, no counterparty is inferred (a Form D names no investors) and the offering alone is not presented as proof of a
// financing relationship. The observation is bound to the subject by its canonical id (the issuer was resolved by its SEC CIK), dated by the filing, and carries the accession.
// The signal value follows the existing precedent for the same economic event (an unregistered equity sale, 8-K Item 3.02 / EQUITY_OFFERING): the deterministic item-based materiality in
// edgar8kconnector.js, not the amount. One CAPITAL packet only (no ownership fan-out).
import { POLARITY, DECAY } from '../signalconstants.js';
import { computeMateriality, computeGroundedness } from './edgar8kconnector.js';

const EXEMPT = { '04': 'Rule 504', '04b': 'Rule 504(b)(1)', '06b': 'Rule 506(b)', '06c': 'Rule 506(c)', '3C': 'Section 3(c)', '4a5': 'Section 4(a)(5)' };
const usd = (v) => (v == null ? null : (/^\d+$/.test(String(v)) ? Number(v).toLocaleString('en-US') : String(v)));

/** The offering as the lines the page shows (observationDetailLines reads capitalEvent.facts), each a quotation of a stated field. */
export function offeringFacts(o) {
  if (!o) return [];
  const f = [];
  if (o.dateOfFirstSale) f.push(`date of first sale: ${o.dateOfFirstSale} (as the Form D states it)`);
  if (o.totalOfferingAmount != null) f.push(`total offering amount: ${usd(o.totalOfferingAmount)} · amount sold: ${usd(o.totalAmountSold) ?? 'not stated'} · remaining: ${usd(o.totalRemaining) ?? 'not stated'} (US dollars as the Form D states them; nothing is computed from them)`);
  if (o.securityTypes?.length) f.push(`securities offered: ${o.securityTypes.join(' · ')}`);
  if (o.investorsAlreadyInvested != null) f.push(`investors already invested: ${o.investorsAlreadyInvested} (the Form D names none of them)`);
  if (o.exemptions?.length) f.push(`exemption claimed: ${o.exemptions.map(e => EXEMPT[e] ?? `item ${e}`).join(' · ')}`);
  if (o.amountClarification) f.push(`issuer's clarification: "${String(o.amountClarification).length > 160 ? String(o.amountClarification).slice(0, 157) + '…' : o.amountClarification}"`);
  return f;
}

/** @returns {object|null} one surfacerouter packet, or null when the filing states no offering data */
export function buildFormDOfferingSignal({ canonicalId, issuerName, filing, offering, now = Date.now() }) {
  if (!canonicalId || !filing?.accession || !offering) return null;
  const items = ['3.02'];                                                         // precedent: the same economic event as 8-K Item 3.02 (unregistered equity sale)
  const raw = computeMateriality(items, 'EQUITY_OFFERING'), conf = computeGroundedness(true) * 100;
  const facts = offeringFacts(offering);
  return {
    id: `formd-${filing.accession}-capital`, source: 'SEC_FORM_D', domain: 'capital', signal: raw, confidence: conf, originId: `formd-${filing.accession}`, fanout: 1, fanoutIndex: 0,
    fs: parseFloat((raw / 100).toFixed(3)), decay: DECAY.DAILY, ts: now, eventClass: 'PRIVATE_OFFERING', entityName: issuerName ?? null,
    meta: {
      canonicalId, eventDate: filing.filingDate ?? null, accession: filing.accession,
      capitalEvent: {
        attempted: true, status: 'EXTRACTED', accession: filing.accession, items: ['Form D'], facts,
        amounts: offering.totalOfferingAmount != null ? [{ raw: `${usd(offering.totalOfferingAmount)} (total offering amount)`, currency: 'USD', wording: offering.totalAmountSold != null ? `amount sold ${usd(offering.totalAmountSold)}` : null, passage: facts.find(l => l.startsWith('total offering amount')) ?? '' }] : [],
        instruments: offering.securityTypes?.length ? [{ text: offering.securityTypes.join(' · '), passage: `securities offered: ${offering.securityTypes.join(' · ')}` }] : [],
        counterparties: [], absent: [{ field: 'counterparty', state: 'ABSENT', absenceClass: 'c', reason: 'a Form D names no investors' }],
      },
    },
  };
}
