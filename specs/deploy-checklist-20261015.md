# Deploy checklist, queued 2026-10-15 (NOT authorized: nothing here runs until the Founder says "deploy")

Build under review: tag `locked-20261015` = `26aae3d` (local; nothing pushed). Uncommitted and outside the build: `scripts/benchmark-capture.mjs`; untracked `specs/KRYLO Map Hub Dark.html`.

## 1. Tickets the build carries (verify each status live in Jira before deploy; only the Founder moves a ticket to Deploy to Prod)
KRYL-1411, 1416, 1417, 1418, 1419, 1420, 1421, 1422, 1423, 1424, 1425, 1426, 1427, 1428. Earlier Review tickets (1387 to 1415) are carried too: check their live status in the same pass.
Any change in the build with no Deploy-to-Prod ticket behind it blocks the deploy.

## 2. Production prerequisites (each needs its own explicit go; none done)
- nginx: a `location` block for each of `/api/patent-assignee`, `/api/gleif-entity`, `/api/media-observation`, `/api/issuer-page` (a new `/api/*` route without one falls to the :3001 catch-all).
- The USPTO granted-patent file (pvgpatdis) on the server; the engine reads it at boot (first-ever boot pays the scan, later boots read `assignee_index.json`).
- `db.js` is not copied by `deploy.sh`: manual `scp`, or migrations never run.
- Engine restart on the VPS (pm2 `krylo-api`) for the as-diff changes (identity, insider documents, holder admission). Engine edits need a full restart, not a reload.

## 3. Before deploying
- Targeted regression, about 10 cases (about 5 minutes), scored with scorer 1. No full 63-case run unless the Founder asks.
- Ask whether a real guest or tester is using production now; if so, say so in the deploy question.
- Inspect the payload before any transfer; exclude only documented non-production files, never a directory by name.

## 4. After deploying
- Verify the deployed commit (`/__build.json`, `html[data-krylo-build]`), the live instance healthy, then the target functionality in production (a Berkshire long query; Walmart; a Form D private issuer).
- Report PASS / FAIL / RUNNING for each gate with evidence.

## 5. Rollback
Name the exact target state with the Founder before deploying (previous production build: confirm at deploy time; not read from memory). A rollback never carries other fixes.

## Known open items that do not block this build
- `qa_kryl1201_entity_admission`: 1 failing check, failing identically before the 2026-10-15 changes (baseline defect, not yet investigated).
- Five stored records with the all-zero holder remain in the local store (DEF-1428).
- BlackRock is bound to CIK 0001364742 (now "BlackRock Finance, Inc."), not 0002012383 (BLK): needs a Founder ruling.
- Lila Sciences is unresolved (no exact legal-name entity in any supported source): identity class or curated alias is a Founder decision.
- Cold-query latency (media lookup holds the snapshot up to 8 s; first-time insider reads): freeze contract unchanged, pending a ruling.
