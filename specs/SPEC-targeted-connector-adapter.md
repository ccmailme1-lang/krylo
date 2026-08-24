# SPEC — Targeted Connector Invocation Adapter

**Status:** DRAFT — NEEDS-SPEC / NOT BUILD-READY. Identified 2026-08-23 while decomposing the
KRYL-1202 build surface. Requires Founder ratification before implementation (CLAUDE.md §10/§11).

## PROBLEM

KRYL-1202 (Formation-Driven Closed-Loop Perception) generates an Observation Request carrying
`target_entities/target_domains/target_relationships/target_sources/target_time_window`. Every
existing KRYLO connector (`src/engine/connectors/*.js`) is a zero-argument scheduled sync job —
confirmed by inspection of `edgar8kconnector.js`/`edgar8ksignal.js` and their call sites in
`app.jsx` (all fired via `setInterval`, no parameters). Nothing today translates a targeted request
into a real connector invocation.

## SOLUTION

A thin adapter layer, per targetable connector, that accepts a subset of an Observation Request's
target fields and maps them to that connector's real invocation parameters (e.g. a target entity's
CIK for an EDGAR-family connector). Output is the connector's own existing return shape — the
adapter does not reshape or reinterpret evidence, only invokes.

**Non-goals:** does not replace the existing scheduled sync jobs (those continue for broad
polling); does not implement EAG (KRYL-1203, separate); does not implement Formation revision
(uses the existing `dispatchBatch()` -> `subsignalbuffer.js` -> `domaingravity` pool ->
`inferFormation()` path, verified 2026-08-23 to need no new state mechanism).

## COMPONENTS

- One adapter function per connector KRYL-1202 is authorized to target (start with the smallest
  real set — e.g. the EDGAR family already used elsewhere in this session's investigation — not
  all ~25+ connectors at once).
- Exact per-connector target-field-to-parameter mapping — NOT yet defined here; this is the real
  spec work still needed before build-ready.

## DEPENDENCIES

- KRYL-1202 (consumer — defines the Observation Request shape this adapts).
- KRYL-1203 / EAG (the adapter's output must still pass through EAG before admission).
- Existing connector functions (`src/engine/connectors/*.js`) — reused, not modified.

## VALIDATION

- Founder confirms the initial connector set in scope (recommend narrow: 1-2 connectors for v1,
  not the full fleet).
- Founder ratifies the exact target-field-to-parameter mapping per connector.
- Bottle Test passes before a build ticket opens.

## ROLLBACK

Spec-only at filing time — nothing to roll back.

## GUIDELINES

Detection-time targeting only — the adapter selects *what already-defined connector to call and
with what real parameters*, never predicts what the connector will return.
