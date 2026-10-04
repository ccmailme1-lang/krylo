# Query run: 11 natural-language queries on localhost (dev), 2026-10-04

Method: headless Playwright against http://localhost:5173 (dev only, nothing sent to prod). Each query typed into the Analysis search box, submitted with Cmd+Enter, text read once the observation count stopped changing, then the MAP tab read. Raw page text per query is in the scratchpad (`q-<name>.txt`). UnitedHealth failed (search box not visible) and has not been rerun.

| Query | Convergence | Obs | Admitted cross-domain | Canonical rels | Timeline rows / markers |
|---|---|---|---|---|---|
| NVIDIA (ownership, technology, capital) | BUILDING | 55 | 0 | 4 | 4 / 4 |
| Microsoft (technology, ownership, labor) | LOW SIGNAL YIELD | 24 | 3 | 2 | 2 / 2 |
| Goldman Sachs (ownership, technology, capital) | INSUFFICIENT SIGNAL | 23 | 1 | 77 | 77 / 77 |
| BlackRock (ownership, capital, technology) | BUILDING | 55 | 0 | 0 | 0 / 0 |
| Amazon (technology, labor, ownership) | BUILDING | 68 | 3 | 5 | 5 / 5 |
| JPMorgan Chase (capital, ownership, technology) | INSUFFICIENT SIGNAL | 25 | 0 | 64 | 64 / 64 |
| Oracle (technology, ownership, capital) | BUILDING | 55 | 1 | 1 | 1 / 1 |
| Walmart (labor, technology, ownership) | LOW SIGNAL YIELD | 22 | 0 | 0 | 0 / 0 |
| Berkshire Hathaway (ownership, capital, media) | BUILDING | 55 | 0 | 0 | 0 / 0 |
| Meta (technology, ownership, media) | none ("No domain formation established") | 170 | 0 | 3 | 3 / 3 |
| UnitedHealth (ownership, capital, labor) | not run (failed) | - | - | - | - |

## Trends (observed in these runs)
1. Convergence label tracks observation count, not the entity: 55 obs -> BUILDING (NVIDIA, BlackRock, Oracle, Berkshire); 22-25 obs -> LOW/INSUFFICIENT (Microsoft, Goldman, JPMorgan, Walmart); 68 -> BUILDING.
2. The domain readings are largely identical across different entities (field scope): the 55-obs group shares KNOWLEDGE 27 (3), MEDIA 59 (2), TECHNOLOGY 59 (5), OWNERSHIP 28 (9). The page labels this "FIELD SCOPE - not [entity]'s answer".
3. Same query, different results over time: NVIDIA read 25 obs / INSUFFICIENT SIGNAL (first headless pass), then 55 obs / BUILDING (second pass), vs. the Founder's manual run 182 obs / HIGH CONVERGENCE.
4. Polarity: 60 of 60 domain readings (10 runs x 6 domains) were "constructive". No fracture polarity appeared (CLAUDE.md section 16 concern; cannot tell from this whether it is the data or a gap).
5. Evidence source: EDGAR_8K was the only source in every run that listed evidence.
6. Entity-specific signal is only the canonical rows and subject-bound observations.
7. Timeline: every run spans "Oct 4 -> Oct 4"; no interval labels appeared in any run.
8. Row explosion: Goldman (77 rows) and JPMorgan (64) each produce one row per formation_id (all single `NEW`). A 77-row test built a 2,519px block that sits 1,535px above the viewport top and covers the map.

## Caveats
- The co-presence list for Walmart and Berkshire in the raw results is a parser artifact (it picked up the domain-tab relationship types). Ignore it.
- Headless runs read live signals that vary with time; the numbers above are a single snapshot each.
