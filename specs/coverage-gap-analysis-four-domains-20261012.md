# Coverage-gap analysis: TECHNOLOGY, KNOWLEDGE, LABOR, MEDIA (evidence-led, 2026-10-12)

Method (repeatable): for each domain, inventory the sources already connected in the repo and the candidate public sources; for each, state what it observes, how it ties to a company (the identifier), the relationship it could establish, evidence quality, licence, and a measured sample. A type may be proposed only if both parties are identified by a source-grounded identifier or the exact-legal-name rule already used for counterparties (one registrant, never a candidate or ambiguous match). Measured 2026-10-12 against the live sources, for Oracle, Boston Scientific and Netflix. Facts are measured; ranking is judgment.

## Already connected, and why it is not coverage today
The eight topic connectors (GitHub, arXiv, npm, PubMed, OpenAlex, USAJobs, GDELT, Reddit) are called with the query text only (`topicconnectors.js`): field-level observations with no company identifier. The only ratified, non-producing types are SHARED_PATENT_ASSIGNMENT (needs the PatentsView key; cross-company ties only) and ACQUIRED (now produced, CAPITAL and OWNERSHIP).

## Candidates measured

| Domain | Candidate relationship | Source (licence) | Company identity | Measured sample | Evidence quality | Limits |
|---|---|---|---|---|---|---|
| LABOR | an officer or director of the company | SEC Forms 3, 4, 5 (public domain) | both parties carry SEC CIKs (company and person), and the form itself states director, officer and title | last 12 months, hits and distinct reporting persons: Oracle 51 and 19, Boston Scientific 59 and 17, Netflix 100 (search cap) and 17; sample persons returned with CIKs | the filing states the role itself; dated | role and title are in the form XML (not in the search hit): one document read per person; "left the role" is not stated by Forms 4 (existence ends INDETERMINATE, never inferred) |
| KNOWLEDGE | the company sponsors a clinical trial | ClinicalTrials.gov API v2 (public) | lead sponsor name only: exact-legal-name match to one SEC registrant | Boston Scientific: 851 studies with that lead sponsor | NCT id, dates and status stated | healthcare and life sciences only; name-only, so ambiguous names stay unresolved |
| KNOWLEDGE | published research affiliated with the company | OpenAlex (CC0) | company institution records with ROR ids (Boston Scientific US 3,260 works; Oracle US 2,834); linking a ROR record to a registrant is a name match (exact-name, unique) | measured | counts of works per affiliation | affiliation is the author's own statement; no CIK |
| TECHNOLOGY | the company holds a device or drug authorization | openFDA PMA and 510(k) (public) | applicant name only: exact-legal-name match | PMA records for Boston Scientific: 6,790 (510(k) query returned an error on the first call, to be rechecked) | approval id and dates stated | medical products only |
| TECHNOLOGY | shared patent assignment (ratified) | PatentsView (free key) | assignee name to a registrant, plus inventor migration between whitelisted companies | local proxy returns 503 (no key); the direct API call without a key failed | inventor records | cross-company ties only; seven CPC clusters; no key provisioned |
| MEDIA | named in coverage | GDELT (open), Reddit (API terms) | text only | GDELT returned HTTP 429 (rate limited) on the first call | none that states a relationship | co-mention is not a relationship; recommend observation-only |

## Ranking (judgment, by reach across the ten benchmark subjects, identity strength, evidence quality, feasibility)
1. **LABOR from SEC Forms 3, 4, 5**: strongest identity (SEC CIK on both sides), the filing states the relationship, applies to every listed company, free, no key. Reaches all ten subjects.
2. KNOWLEDGE from ClinicalTrials.gov sponsorship: good evidence, name-only identity, reaches healthcare subjects only (Boston Scientific among the ten).
3. TECHNOLOGY from openFDA authorizations: same reach limit as 2.
4. KNOWLEDGE from OpenAlex: broad reach, weakest identity link.
5. TECHNOLOGY patents: blocked on the key; cross-company ties only.
6. MEDIA: no defensible relationship source found; stays observation-only.

## What can proceed under existing decisions, and what needs ratification
- Under existing decisions (no new type): provisioning the PatentsView key (Founder) for the already ratified SHARED_PATENT_ASSIGNMENT; Items 7.01 and 8.01 and the look-back for ACQUIRED (the open decision recorded in KRYL-1409).
- Needs the Founder's ratification (a new relationship type under Decision Record section 3), in this order: (1) LABOR officer-or-director from Forms 3, 4, 5; (2) KNOWLEDGE clinical-trial sponsorship; (3) TECHNOLOGY FDA authorization. For each, the ask is: type name and meaning, the admission rule (both parties identified by the stated identifier; the filing is cited; no magnitude), temporal semantics, and the failure behaviour, as drafted for the existing types in `ratifiedrelationshiptypes.js`.
- Not recommended for admission: MEDIA co-mention, OpenAlex affiliation until a stronger identity link exists.

## What this means for the 8 out of 10 target (stated plainly)
LABOR coverage for all ten subjects is achievable from one free, source-identified feed. KNOWLEDGE and TECHNOLOGY can be covered only for healthcare and life-science subjects with the sources above; for Oracle, Tesla, Netflix and similar subjects no source with a defensible company identity was found. MEDIA has none. Queries that ask about a domain with no defensible source cannot reach 8 without fabricating a relationship, which is forbidden; they are reported unmet, with this cause, in the acceptance evaluation.
