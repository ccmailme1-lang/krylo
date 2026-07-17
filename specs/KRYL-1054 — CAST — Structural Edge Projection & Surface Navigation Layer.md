KRYL-2100 — CAST: Structural Edge Projection & Surface Navigation Layer

Issue Type: Epic
Priority: High
Component: CAST / ConeMap / Surface Intelligence
Status: Proposed

KRYL-2100 — CAST: Structural Edge Projection & Surface Navigation Layer
Summary

Build the KRYLO CAST capability: a macro-level structural orientation layer that transforms approved intelligence topology outputs into an interactive cone-based surface map.

CAST enables users to move from:

Domain Awareness → Structural Edge Discovery → Focused Analysis

without introducing inference, scoring, prediction, or intelligence generation into the presentation layer.

Objective

Create a decoupled projection and navigation layer where:

User-defined profile anchors initiate a CAST session.
Approved topology signals are transformed into lightweight ConeNodeV1 objects.
Nodes are positioned on the ConeMap mesh based on supplied metadata.
Users can select nodes to transition into the Analysis workspace with pre-populated investigative context.
User observations can be preserved without contaminating intelligence authority.
Architectural Principle
Projection, Not Prediction

CAST does not:

calculate intelligence scores
determine causal relationships
infer outcomes
generate recommendations

CAST only:

receives approved topology
projects relationships
enables navigation

Authority remains:

CCE / Intelligence Sources
          |
          ↓
Cast Projection Adapter
          |
          ↓
ConeNodeV1
          |
          ↓
ConeMap Surface
          |
          ↓
Analysis Workspace
Scope
Included

✅ CAST Projection Adapter
✅ ConeNodeV1 schema contract
✅ Synthetic topology generator
✅ ConeMap renderer
✅ Node interaction model
✅ Analysis routing
✅ Return-to-Cast memory
✅ Observation queue integration
✅ Renderer integrity enforcement

Excluded

❌ CCE modifications
❌ Evidence scoring changes
❌ Causal inference logic
❌ Recommendation generation
❌ New intelligence models

Child Work Orders
KRYL-2100A — CAST Projection Adapter (CPA)

Issue Type: Story
Owner: Backend / Platform

Description

Create a translation boundary between intelligence engines and CAST.

The adapter converts source topology payloads into ConeNodeV1.

Supported sources:

CCE
Drift Monitor
External Feed Connectors
Acceptance Criteria
Interface
interface CastProjectionAdapter {

 sourceEngine:
 "CCE" |
 "DriftMonitor" |
 "ExtFeed" |
 string;

 transform(payload: unknown): ConeNodeV1[];

}
Requirements
Adapter packages isolated by source
No business logic permitted
Transformation only
Maximum transform implementation: 30 LOC
Jest coverage ≥90%
Deliverables
cast-adapter-base
cast-adapter-cce
Adapter test suite
KRYL-2101 — ConeNodeV1 Schema Contract

Issue Type: Story
Owner: Frontend Platform

Description

Define the immutable data contract between CAST services.

Schema Requirements
ConeNodeV1

must contain:

schema_version
node_id
timestamp
domain
type
label
metadata
normalized spatial coordinates
analysis routing context
Acceptance Criteria
TypeScript interface created
Schema validation implemented
Serialization/deserialization tests pass
Versioning enforced
KRYL-2102 — CAST Synthetic Topology Generator

Issue Type: Story
Owner: QA / Frontend Enablement

Description

Create deterministic mock topology generation for CAST development and visual testing.

Requirements

CLI:

cast-mock

Capabilities:

deterministic seed support
generate ≥500 nodes
output JSON
output QA dataset format

Example:

cast-mock --domain "AI Infrastructure" --seed 42
Acceptance Criteria
Generation completes <50ms
Production usage blocked
Package marked private
Supports visual regression testing
KRYL-2103 — ConeMap Renderer Package

Issue Type: Story
Owner: Frontend Visualization

Description

Build the interactive cone mesh visualization layer.

Renderer consumes:

ConeNodeV1[]

only.

Responsibilities

Renderer handles:

node placement
mesh rendering
animation
hover states
selection events
camera state
Forbidden

Renderer cannot import:

engine/*
models/*
scoring/*
inference/*
Acceptance Criteria
1,000 nodes at 60 FPS
GPU memory <30MB
Storybook demo created
CI renderer purity check passes
KRYL-2104 — CAST Analysis Router

Issue Type: Story
Owner: Frontend Application

Description

Create transition from selected ConeNode to Analysis workspace.

Flow
Node Selection
       |
       ↓
AnalysisContext
       |
       ↓
Analysis Page
Acceptance Criteria

Router creates:

{
 source:"CAST",
 domain:"",
 selected_edge:"",
 filters:[]
}

Requirements:

Client navigation ≤50ms
unresolved filters warn, do not fail
large payloads stored by session UUID
KRYL-2105 — Return-to-Cast Memory & Observation Queue

Issue Type: Story
Owner: Full Stack

Description

Allow users to preserve areas of interest discovered through CAST.

User Action
Node
 ↓
PIN
 ↓
CAST Memory
 ↓
Observation Queue
 ↓
CCE Review
Observation Object
{
 memory_id:"",
 user_id:"",
 node_id:"",
 ts:"",
 action:"PIN",
 reason:"user_interest",
 status:"PENDING_REVIEW"
}
Acceptance Criteria
Last CAST view restores
Pinned nodes persist
Observation queue functional
CCE promotion remains review-controlled
KRYL-2106 — CAST Surface Page Experience

Issue Type: Story

Description

Implement the user-facing CAST interaction model.

User Flow
Profile Anchor
       |
       ↓
CAST Button
       |
       ↓
Cone Surface
       |
       ↓
Node Selection
       |
       ↓
Analysis
Requirements
Idle

Minimal topology view.

Hover

Display:

node label
signal density
velocity
structural role
Selected

Transition directly to Analysis.

Definition of Done

CAST is complete when:

✅ User can initiate a CAST from profile anchors
✅ ConeMap displays generated topology
✅ Nodes are selectable
✅ Selection routes to Analysis
✅ Renderer contains zero intelligence logic
✅ User observations can be stored
✅ CCE remains the sole authority for canonical topology

Epic Outcome:

KRYLO gains a "map before microscope" capability — a human orientation layer that exposes structural landscapes before focused investigation begins.