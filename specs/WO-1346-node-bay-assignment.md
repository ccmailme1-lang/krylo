# WO-1346 — Node → Bay Assignment

**STATUS:** BACKLOG  
**DATE:** 2026-05-30  
**DEPENDS ON:** WO-1345

## Purpose

Wire Surface Search results to bay assignment. Clicking a node presents a bay selector. The selected bay transitions from EMPTY → LOADED with the signal's identity.

## Interaction

1. User clicks a node in Surface Search results
2. System presents: `Assign To: [1] [2] [3] [4] [5] [6]`
3. User selects a bay number
4. That cone transitions to LOADED state with the signal's label, domain, confidence

## Alternative: Drag-and-drop
Node dragged onto a cone — drops into that bay directly.

## Data passed to bay on assignment
```
{ label, domain, confidence, signalId, source, timestamp }
```
