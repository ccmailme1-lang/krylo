# Security: rotate the four active access codes exposed in a session transcript (2026-09-26)

Type: Task. Project KRYL. Filed as the separate credential-rotation change agreed on 2026-09-26. No code values appear in this ticket and none may be added to it, to chat, or to logs.

## The six required fields (CLAUDE.md section 10)

### 1. Original intent
On 2026-09-26 an engineering search of src/store/useprofilestore.js printed 19 of its 41 access-code entries (the Founder's `xs` plus Participants 01-18, with their active flags) into a Claude Code transcript and its local session log. Four entries are active: `xs` and Participants 01-03. Treat those four as compromised credentials: replace them with newly generated codes, written to the file without being printed or surfaced in chat or logs, and distributed to their holders out of band.

### 2. Acceptance criteria
- New codes exist for the four active entries; the previous four values are no longer accepted by the production gate after the deploy.
- The new codes are never printed, logged or quoted (generation and writing happen without echoing values; the Founder reads them from the file on their own terminal).
- The inactive entries are unchanged unless the Founder rules otherwise.
- Every e2e spec and helper that sets `xs` as the active tester is updated so the suite still passes (tests/e2e: ac07-formation-placement, cf-gate3-latency, cf-gate3-live-window, kryl1253-chrome-cutover, question-assistance-pre-submit).
- Verification uses only aggregate or boolean results (for example, a functional check that a previously issued value is rejected, run without printing it).
- Deployed through the normal gate: this ticket in Deploy to Prod, an explicit "deploy", a live check.

### 3. Current implementation state
Not started. Facts (counts only, no values): src/store/useprofilestore.js holds 41 profile entries, 4 active; the ids ARE the access codes and are compared client-side (exact match), so they also ship in the built bundle; the file has been tracked in git since 2026-07-16 and the codes were last changed 2026-09-21 (sequential to random 8-character). The exposed values also remain in git history and in the currently deployed bundle; rotation cannot remove them from either until its own build ships. The incident and a guard note (never read or print this file) are recorded in memory.

### 4. Dependencies
Its own build and deploy (it cannot ride along with other tickets). The holders of the three participant codes must receive new codes out of band. Telemetry filed under the old profile ids stays under the old ids. The Founder must decide whether the inactive entries also rotate. Possible overlap with the "security wave" work (client-side gate replaced by server-side validation, guestgate.jsx exists and is unwired) — UNDETERMINED; this ticket is only the immediate credential replacement.

### 5. Superseded by a newer ticket?
None known. Overlap with the security-wave item above is undetermined and is not resolved here.

### 6. Still maps to the current KRYLO product model?
Yes. It protects the integrity of the guest validation pilot's access (Founder rule: no secret exposure; treat exposed credentials as rotation candidates). It does not touch the detection product surface.
