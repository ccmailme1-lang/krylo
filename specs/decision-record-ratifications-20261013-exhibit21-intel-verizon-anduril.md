# Decision record: ratifications of 2026-10-13 (Exhibit 21, Intel, Verizon, Anduril)

Founder ratified, in this order. The 63-case frozen acceptance set and the scoring rubric are unchanged.

## 0. Exhibit 21 subsidiary rule (KRYL-1416 addendum)
A granted patent whose assignee equals, by exact legal name, a subsidiary named in the company's own latest Form 10-K Exhibit 21 is admitted as ASSIGNEE_OF_GRANTED_PATENT with the exhibit cited (accession, filing date, filer CIK). Wording: "X, a subsidiary listed in Y's 10-K Exhibit 21, is the assignee of granted patent ...". The exhibit is as of its filing date; it does not state that the subsidiary held the patent when granted or the ownership share. Identity key carries `heldBy`. Code: as-diff/exhibit21.js, connectors/patentassignee.js, patentassigneeadmission.js, ratifiedrelationshiptypes.js. Tests: qa_patent_assignee.mjs (48).

## 1. Intel: patents as KNOWLEDGE (narrow)
Admitted granted-patent relationships also count toward the KNOWLEDGE domain's coverage, identified in the report as patent-derived knowledge evidence only. They form no cross-domain link (admittedformation.js `linkDomains`), so no link wording can imply research impact, author affiliation or publications. A synthesis statement says so. Tests: qa_patent_assignee.mjs.

## 2. Verizon: GDELT MEDIA observation (KRYL-1418)
A dated MEDIA observation per article (newest 5) that GDELT DOC 2.0 returns for the exact phrase of the company's SEC registered name (legal form set aside, e.g. "Verizon Communications"): title, domain, URL and first-seen date quoted as GDELT states them. Never a relationship; no event or relationship connection is inferred; the article text is not read; polarity ABSENT. A GDELT failure (including its rate limit) is a failure, never "no articles". Applies to every company resolved by an SEC CIK (registry or listed class). Code: as-diff/mediaobservation.js, connectors/gdeltmediaobservation.js, adsubject.js, domaingravity.js. Tests: qa_media_observation.mjs (17).
Scoring note: the frozen rubric credits a named domain only when an ADMITTED RELATIONSHIP covers it; an observation does not.

## 3. Anduril: GLEIF identity class (KRYL-1417)
Identity only, for the patent producer. The registry entity ANDURIL INDUSTRIES carries the curated LEI 254900CIXLZUXXNYQW57 (GLEIF: ANDURIL INDUSTRIES, INC.; ACTIVE; ISSUED; US-DE; registered as 6386483). At query time the patent producer runs only if the live GLEIF record for that LEI confirms the entity (ACTIVE, ISSUED, legal name equal); the patents are matched to the GLEIF legal name exactly. A name no SEC source or registry holds can be admitted under the GLEIF class (one ACTIVE, ISSUED record with the exact legal name; a curated alias must carry its recorded LEI). No SEC registrant bears the name; the 22 SEC registrants containing "Anduril" are investment vehicles (different legal entities) and are not bound. A GLEIF record is not evidence of financing, officers or any other relationship. Code: as-diff/gleif.js, gleifidentity.js, secfileradmission.js, produceridentifiers.js. Tests: qa_gleif_identity.mjs (36).
