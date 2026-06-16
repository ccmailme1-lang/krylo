# BUG-003 — No durable capture of raw session output for QA/insight gathering

STATUS: OPEN
FILED: 2026-06-16
WO: WO-1758
RELATED: BUG-001, BUG-002 (discovered while trying to save this test run for later analysis)

## Problem

There is no way to durably capture what a session actually produced, which
makes bugs like BUG-001/BUG-002 undiscoverable after the fact:

- `useAnalysisStore` (full session output: synthesized brief, leverage
  panel, action matrix, etc.) is pure in-memory Zustand — no persistence,
  gone on refresh.
- `telemetry.js` persists to localStorage (capped 1000 events) but only
  logs lightweight metadata — `type`, `sessionId`, `source`, `query`,
  `timestamp`. It does not capture the generated content, so it can't tell
  you *what went wrong*, only that a query ran.
- The one export path that exists, Consulting Export (WO-1751/1752), is
  gated at `Fs >= 0.70`. This test run showed `Fs 0%` — exactly the kind of
  low-confidence/broken output you'd most want to capture for debugging —
  and the export button was disabled because of it. The audit-export gate
  and a QA-debug-capture need are different purposes wearing the same
  mechanism.

## Fix shape (not yet built — needs WO-1758 Go)

A lightweight, ungated capture path distinct from Consulting Export:
snapshot full session output (query, detected domain/anchor, synthesized
content, Fs/confidence values) to a persisted log on session
completion — no Fs gate, since the point is catching low-quality output,
not certifying high-quality output. Could ride on the existing
`telemetry.js` persistence pattern (same localStorage approach, separate
log/cap) rather than inventing new infrastructure.
