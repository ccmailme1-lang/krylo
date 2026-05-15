---
name: WO-1035 Signal Leverage Terminal — Tension Vector Matrix
description: Spec for the Leverage visualization component. Tension-based rendering, not a gauge. Physical deformation model showing anomaly strain on narrative mass.
type: project
---

# WO-1035: Signal Leverage Terminal — Tension Vector Matrix

**Status:** Pending — awaiting Go  
**Origin:** SAB Consensus audit (L1-IA), 2026-05-05  
**Logged by:** Mr. XS

## Concept

Leverage is not a static percentage — it is asymmetric strain. A minor anomaly exerting disproportionate force on a massive baseline narrative. The interface must visualize the tension **before the snap**.

## Architecture

- **The Fulcrum:** Horizontal axis = baseline state
- **The Mass:** Volume of the established narrative (engine-fed, not user-adjustable)
- **The Vector:** Incoming anomaly. As leverage grows, it physically warps the visual lattice

## Header Metrics
- `LEVERAGE COEFFICIENT` — e.g. 3.1623x
- `SYSTEM STRAIN` — e.g. 12.65%
- `STATUS` — STABLE / ELEVATED / CRITICAL

## Visual Behavior
- Baseline is a horizontal line spanning the full width
- Anomaly force vector creates a downward depression at its point of impact
- Depression deepens as leverage increases
- Status transitions: STABLE → ELEVATED → CRITICAL as warp deepens
- Color shift from neutral → red as leverage approaches snap point (colors TBD — require Founder approval)

## KRYLO Aesthetic Overrides (from SAB concept)
- Background: black void (#000000), not dark gray
- Grid: subtle, IBM Plex Mono labels
- Controls (Narrative Mass, Anomaly Velocity) are **engine-fed only** — no manual sliders
- Warp animation must be continuous/live, not static

## Dependencies
- Engine data: anomaly velocity + narrative mass from ingestion pipeline
- Extends WO-1034 (LEVERAGE) — PLI formula feeds the coefficient
- Route to Opus 4.7

## What it replaces
Decorative arcs and gauge paradigms. Functional data distortion only.
