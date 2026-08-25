# SPEC I — KRYLO Six-Lens Perceptual Interface & Experience Foundation

Status: LOCKED — Engineering Review
Role: Perceptual and experiential foundation
Scope: End-to-end experience model, Lens behavior, perceptual hierarchy, and governing surface principles
Depends on: Existing KRYLO perceptual/observational capabilities
Precedes: Spec II and downstream surface/implementation specifications
Reference: KRYL-1209 (Engineering Review Package)

## 1. Purpose

Define the complete end-to-end design model for KRYLO's six-domain Lens experience.

This specification establishes:

- how the six domain cones become interactive perceptual Lenses;
- how a selected Lens transforms the environment;
- how information may ultimately be encoded directly onto the cone surface;
- how surrounding HUD elements expose evidence and relationships;
- how the user's perceptual position progresses from broad observation toward deeper resolution.

The objective is to establish the experience model before determining where individual existing capabilities should be mounted.

This is a design and experience specification, not an implementation specification.

## 2. Core Concept

KRYLO presents six observational domains as six cones within a shared environment.

Each cone is the entry point to a Lens.

A Lens is not a page, dashboard, or collection of widgets.

A Lens is a focused perceptual state of a domain in which the selected cone becomes the center of attention and the environment recomposes around it.

The cone remains part of the environment while becoming the user's focal object.

Selecting a cone therefore does not mean navigating away from the environment.

It means changing the user's perceptual position within the environment.

## 3. Two Complementary Progressions

Two progressions operate simultaneously.

**Experience progression**

SEE → INVESTIGATE → RESOLVE

This describes how the user's perceptual position changes.

**Revelation progression**

DOMAIN → OBSERVATION → QUESTION → CONDITION → RELATIONSHIP → FORMATION → EVIDENCE → UNRESOLVED

This describes what the Lens progressively makes knowable as the user moves closer.

The two progressions are complementary.

The experience progression governs movement through the perceptual experience.

The revelation progression governs the knowledge that becomes available during that movement.

Neither progression replaces the other.

## 4. Six Cones = Six Lenses

Each of the six cones represents a domain and provides entry into its corresponding Lens.

The six Lenses are not six independent screens.

They are six manifestations of a common interaction model.

Each Lens must ultimately be specified using:

- Purpose — what the user perceives
- Question — what the Lens answers
- Input — what brings the user into it
- Transformation — what changes from the preceding state
- Output — what the user now understands
- Transition — what causes movement to the next state
- Relationship to KRYLO's structural/perceptual capability
- Live vs. Designed — what exists today versus what remains to be designed
- Surface Encoding — what the Lens expresses directly through the selected cone's surface

These individual Lens definitions remain downstream of this foundation.

## 5. The Selected Cone as the Focal Object

When a Lens is selected:

- the selected cone becomes centered;
- the selected cone receives visual priority;
- the remaining five cones remain available as environmental context;
- the surrounding composition reorganizes around the selected cone;
- HUD elements become spatially associated with the selected cone.

The selected cone is therefore not simply highlighted.

It becomes the anchor from which the interface is generated.

## 6. Cone-Surface Encoding

### 6.1 Definition

Cone-Surface Encoding is a core KRYLO design primitive.

It uses the physical surface of a domain cone to directly encode its current state, conditions, and salient signals through spatial bands, markers, color, and captions.

The cone itself becomes an information surface.

It is not merely a visualization of a domain.

### 6.2 Surface Area Is Information

Surface bands must not be equal height by default.

Equal-height segmentation would imply equal importance.

Surface area is information.

Band dimensions must be capable of expressing relative significance.

A band's height or surface extent may represent factors such as:

- relative weight;
- magnitude;
- salience;
- persistence;
- concentration;
- structural importance.

Exact mathematical mappings remain Lens-specific and are downstream design decisions.

### 6.3 Surface Encoding Dimensions

| Surface property | Potential meaning |
|---|---|
| Band type | Condition / category |
| Color | Semantic state |
| Band height / surface extent | Relative weight or salience |
| Band position | Structural position |
| Caption | Human-readable interpretation |
| Marker | Specific signal or notable event |

These mappings must remain semantically governed rather than becoming decorative styling.

## 7. Cone Color and Status Indicators

The existing cone color system can establish domain identity while supporting coordinated status indicators.

Status bands should use a controlled color relationship with the underlying domain so that a status indicator feels as though it belongs to the cone rather than being an unrelated UI component.

Captions should provide semantic interpretation where color alone is insufficient.

Color is supportive of meaning, not the sole carrier of meaning.

## 8. The Halo

When a cone is selected, HUD elements form a spatial halo around it.

The halo is not a conventional dashboard.

It is an extension of the selected Lens.

The halo may expose:

- supporting evidence;
- relationships;
- contextual signals;
- relevant observations;
- interpretation;
- structural connections;
- explanatory material.

Exact composition is Lens-specific and remains downstream.

## 9. Cone + Halo Relationship

The fundamental composition is:

**CONE** — Domain identity, state, conditions, salient signals, surface encoding.

**HALO** — Evidence, relationships, context, interpretation, supporting information.

**ENVIRONMENT** — Other domains, comparative position, cross-domain relationships, broader structural context.

This establishes a hierarchy from the object itself outward.

## 10. Generated Composition Principle

The HUD is not arbitrarily overlaid on the screen.

Its placement, hierarchy, and content should be derived from the selected cone and its relationships.

Three rules follow:

**Placement is relational** — Where an element appears should be informed by its relationship to the selected cone and, where applicable, other entities.

**Hierarchy is evidentiary** — What receives visual prominence should reflect what the Lens establishes as significant.

**Content is contextual** — The Lens should surface information relevant to the selected cone rather than presenting a generic collection of widgets.

Therefore:

The selected object generates the interface through which it is understood.

## 11. The Lens Is a Transformation, Not a Container

A Lens should not be implemented conceptually as:

Cone + panel + widgets

The intended model is:

Environment → selected cone → recomposed environment → surface encoding → relational halo → deeper investigation

The Lens transforms the user's perception of the environment.

The interface changes because the user's object of attention has changed.

## 12. Spatial Continuity

Selecting a Lens should preserve environmental continuity.

The user should understand:

- where the selected domain came from;
- where the other domains remain;
- how the selected domain relates to them;
- what changed as a consequence of selection.

The experience should avoid unnecessary hard transitions that make the user feel as though they have left the environment.

The spatial environment is part of the user's mental model.

## 13. Progressive Disclosure

The Lens model follows progressive disclosure:

**First read** — The user sees the environment.

**Focused read** — The user selects a cone and receives its Lens.

**Structural read** — The Lens exposes relationships, evidence, and meaningful conditions.

**Resolution** — The user can reach deeper interpretation where the underlying capability warrants it.

Complexity should be revealed because the user has moved closer to the object, not because the system has placed more information on screen.

## 14. Relationship to KRYLO's Structural / Perceptual Capability

The Lens system exists to make KRYLO's underlying capability perceptible.

The visual layer must not merely decorate an analytical result.

It should expose:

- what is being observed;
- how conditions differ;
- what relationships matter;
- where evidence supports an interpretation;
- where evidence conflicts;
- what remains unresolved.

KRYL-1207 / convergenceclassifier.js demonstrates existing capability for resolving conflicting or unresolved narratives without silently choosing one.

The final presentation and placement of that capability remain downstream.

## 15. Current Implementation Reality

The design must distinguish capability from presentation.

**Live**
- ConeMap — six-domain environment, navMode='surface', established entry experience.
- Analysis — AnalysisDomainField, AnalysisIdleField, navMode='analysis', existing investigation capability.

**Built capability**
- KRYL-1207 / convergenceclassifier.js — classification, conflict/unresolved-narrative handling, Data Tap inventory, and downstream reasoning availability.

**Not yet determined**
- Final presentation and mounting point for Resolution capability.

Existing implementation must not dictate final six-Lens layout.

The layout comes first.

## 16. Observation / Resolution Data Consumption

Established principle:

Data generated by KRYLO's observation, classification, and resolution capabilities is retained as an available downstream information source.

The existing presentation structure used to expose that data is not part of the design contract.

The data may ultimately be consumed by any appropriate Lens surface, including:

- Cone-Surface Encoding;
- captions;
- halo elements;
- relationship representations;
- evidence presentation;
- formation representation;
- unresolved-state presentation;
- deeper Lens states.

The final presentation location is determined by the completed Lens design.

Preserve the intelligence. Do not preserve the presentation structure.

## 17. Glimpse Relationship

Glimpse provides a useful interaction reference, not an architectural template.

The relevant principle is progressive research movement:

orient → investigate → understand

KRYLO extends this interaction model with its own differentiated perceptual capability:

See → Investigate → Resolve

The differentiation is not the existence of a research workflow.

The differentiation is what becomes perceptible during that workflow.

## 18. Stakeholder View

Stakeholder View remains an independent product decision.

It represents the user's initial relationship with the environment and should provide immediate orientation without requiring analytical expertise.

The six-Lens model should support Stakeholder View rather than undermine it.

The initial experience should remain legible before deeper Lens interaction begins.

## 19. Six-Lens Design Worksheet

Each Lens must ultimately be completed using:

**Lens [Domain]**
- Purpose — What does the user perceive?
- Question — What question does this Lens answer?
- Input — What brings the user into this Lens?
- Transformation — What changes from the preceding state?
- Output — What does the user now understand?
- Transition — What causes movement deeper or onward?
- Structural / Perceptual Relationship — What KRYLO capability becomes perceptible here?
- Surface Encoding — What is encoded directly on the cone?
- Halo Composition — What appears around the cone, and why?
- Live vs. Designed — What exists today? What remains to be designed?

## 20. Design Principles — Normative

1. The cone is the focal object.
2. Each cone is an entry point into a Lens.
3. The Lens is a perceptual state, not a page.
4. The selected cone remains spatially connected to its environment.
5. The cone surface is an information surface.
6. Surface area is information.
7. Equal-height status bands are not the default.
8. Color must carry governed semantic meaning.
9. The halo is generated by the selected cone and its relationships.
10. HUD placement is relational, not arbitrary.
11. HUD hierarchy is evidentiary, not decorative.
12. Information becomes progressively disclosed as the user investigates.
13. The environment remains part of the user's mental model.
14. Existing capabilities inform the design but do not dictate the layout.
15. The complete six-Lens layout must be finalized before presentation surfaces are selected.
16. Observation / Resolution intelligence must be preserved independently of its current presentation structure.

## 21. Central Design Thesis

The selected object generates the interface through which it is understood.

The cone is the object.

The surface expresses its condition.

The halo exposes its relationships and evidence.

The surrounding environment provides context.

The Lens is the resulting perceptual state.

KRYLO therefore does not ask the user to leave the environment to understand what they have found.

The environment reorganizes itself around what the user chose to understand.

## 22. Foundation Boundary

Spec I establishes the perceptual and experiential contract.

It does not determine:

- individual Lens content;
- exact data sources;
- mathematical scoring;
- final surface encoding;
- exact halo composition;
- implementation architecture.

Those are downstream decisions.

Spec I is complete when the perceptual model is sufficiently stable to govern those downstream decisions.

**Spec I is LOCKED.**
