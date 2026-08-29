# Persona → Evidence Tap Map

Reduces the 11-profession persona table to the connector/tap work each cluster implies.
KRYLO detects the formation across the 6 domains; each "want added" is a domain-specific
evidence layer on top of that.

| persona cluster | "want added" reduces to | maps to |
|---|---|---|
| 6 physicians + orthodontist | clinical trials, FDA activity, procedure volumes, outcomes, reimbursement, hospital utilization | KNOWLEDGE + a health/clinical connector (FDA proxies exist; trials/outcomes don't) |
| Financial Manager | SEC filings, ownership changes, institutional holdings, debt | OWNERSHIP + CAPITAL — already have edgar / secownership connectors |
| Software Developer | GitHub activity, deps, releases, CVEs, hiring | TECHNOLOGY — already have github / npm proxies |
| Pilot | routes, fleet orders, pilot demand, contracts | LABOR + a domain connector (none) |
| CEO | internal company data, competitors, contracts, financials | different class — data integration, not a public-signal tap |

## Notes

- Not an architecture change — a connector prioritization map. The 6 domains are the
  substrate; every "added" item is a tap feeding one of them.
- Institutional (Financial Manager archetype) is the anchor: the taps are already closest
  to built (EDGAR, `secownershipconnector`, institutional holdings, debt schedules).
- The CEO row is a different capability class — private-data custody, not signal detection.
  Keep it separate from the connector work.
