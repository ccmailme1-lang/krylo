CF-002 — Core Processor & Remote Processor Capability Contract

Status: DRAFT
Version: 0.1
Parent: CF-001 Cognitive Fabric Architecture & Processing Model
Purpose: Define the machine-testable boundary between the nine Core Processors and arbitrarily scalable Remote Processors.

1. Purpose

CF-002 establishes the contracts that make the central proposition of CF-001 implementable:

Core Processors provide cognitive capability. Remote Processors provide distributed reach.

The contracts SHALL permit the two classes of processors to evolve independently.

2. Architectural Principle

The system SHALL NOT model the architecture as:

9 agents + N agents

It SHALL model it as:

             COGNITIVE CAPABILITIES
              ┌────┬────┬────┬────┐
              │ C1 │ C2 │ C3 │... │ C9
              └────┴────┴────┴────┘
                       ▲
                       │
                  COGNITIVE FABRIC
                       │
        ┌──────────────┼──────────────┐
        │              │              │
       RP-1           RP-2           RP-N
        │              │              │
      reach           reach          reach

The Remote Processor population is therefore orthogonal to the Core Processor population.

3. Processor Identity

Every processor SHALL have a unique identity.

ProcessorIdentity

processor_id
processor_class
capability_ids[]
status
version
instance_id

processor_class SHALL be one of:

CORE
REMOTE

A processor identity SHALL remain stable for the lifetime of its logical processor capability.

An individual runtime instance MAY change.

4. Core Processor Contract

Each Core Processor SHALL expose:

CoreProcessorContract

processor_id
capability_id
capability_version

accepted_signal_types[]
required_context[]
optional_context[]

input_schema
output_schema

processing_operations[]
routing_requirements[]

uncertainty_model
provenance_requirements

resource_profile
health_state

The contract defines what the processor can do, not where it resides.

5. Core Capability

A capability SHALL be independently addressable.

For example:

CAPABILITY
    │
    ├── capability_id
    ├── input requirements
    ├── signal compatibility
    ├── processing operation
    └── output contract

The Fabric SHALL be able to ask:

Which Core Processors are capable of processing this signal?

rather than:

Which processor owns this signal?

That distinction is mandatory.

6. Core Processing Contract

A Core Processor SHALL receive a structured processing envelope.

Conceptually:

ProcessingEnvelope

signal
context
provenance
pathway
objective
formation_context
uncertainty
routing_context

The processor SHALL return:

ProcessingResult

observations[]
relationships[]
derived_signals[]
formation_candidates[]
uncertainty
provenance_delta
routing_directives[]

Not every processing operation needs to populate every field.

Empty output is valid.

7. Core Processor MUST NOT

A Core Processor SHALL NOT:

assume exclusive ownership of a signal;
erase originating provenance;
silently transform an observation into a fact;
manufacture a relationship without satisfying the applicable relationship contract;
manufacture a formation without satisfying Formation Admission;
require a specific Remote Processor implementation;
require the entire system to synchronously execute before returning a result.

These restrictions preserve the separation between processing and governance/admission.

8. Remote Processor Contract

The Remote Processor contract is deliberately smaller.

RemoteProcessorContract

processor_id
processor_class = REMOTE

observation_capabilities[]
mapping_capabilities[]
signal_types[]

input_schema
output_schema

local_processing_operations[]

transmission_contract

provenance_requirements
health_state

A Remote Processor SHALL NOT expose the same contract surface as a Core Processor merely for architectural symmetry.

The asymmetry is intentional.

9. Remote Processor Responsibilities

A Remote Processor MAY:

OBSERVE
CAPTURE
NORMALIZE
MAP
CORRELATE LOCALLY
PACKAGE
TRANSMIT

It SHALL NOT be required to:

DETERMINE GLOBAL SIGNIFICANCE
ADMIT FORMATIONS
OWN COGNITIVE CAPABILITY

This gives the Remote Processor its proper architectural role:

local mapper/transmitter

10. Remote Observation Contract

A Remote Processor SHALL emit an observation envelope containing at minimum:

ObservationEnvelope

observation_id
source
observed_at

signal_type
payload

local_context

relationships[]
provenance

remote_processor_id
remote_processor_version

uncertainty

The Remote Processor MAY attach locally discovered relationships.

Those relationships SHALL remain subject to the applicable admission contract.

11. Capability-Based Routing Contract

The Fabric SHALL maintain a capability registry:

Capability Registry

CAPABILITY A → Core 01
CAPABILITY B → Core 02, Core 06
CAPABILITY C → Core 03, Core 07, Core 09
...

When a signal enters the Fabric:

SIGNAL
  │
  ▼
CHARACTERIZE
  │
  ▼
MATCH CAPABILITIES
  │
  ├──► C2
  ├──► C6
  └──► C9

The Fabric SHALL NOT require a single destination.

12. Routing Decision

Every routing decision SHALL produce a routing event:

RoutingEvent

routing_event_id

signal_id

source_processor
destination_processor[]

capability_match[]

routing_basis

timestamp

routing_policy_version

This makes routing itself observable.

That matters because eventually KRYLO needs to answer:

Why did this signal travel this pathway?

13. Dynamic Processor Selection

The Fabric SHALL support processor selection based on:

signal type;
signal attributes;
contextual requirements;
processor capability;
processor availability;
current resource state;
routing policy.

Processor selection SHALL NOT be permanently encoded into the signal source.

14. Multi-Processor Processing

A signal MAY be processed by multiple Core Processors.

Example:

                 SIGNAL
                    │
             ┌──────┼──────┐
             ▼      ▼      ▼
            C2     C5     C8
             │      │      │
             └──────┼──────┘
                    ▼
                 FABRIC

Each result SHALL retain its own processing provenance.

The Fabric MAY subsequently synthesize the resulting observations.

15. Re-Entry Contract

This is one of the most important requirements.

A processing result SHALL be capable of re-entering the Fabric as a new signal.

CORE
 │
 ▼
PROCESSING RESULT
 │
 ▼
NEW SIGNAL
 │
 ▼
FABRIC
 │
 ├──► CORE
 ├──► CORE
 └──► REMOTE

Therefore:

Processing is not necessarily terminal.

The Fabric constitutes a recursive processing substrate.

16. Remote-to-Remote Communication

Remote Processors SHALL NOT require unrestricted peer-to-peer communication.

The normative default SHALL be:

REMOTE
   ↓
FABRIC
   ↓
REMOTE

rather than:

REMOTE ←→ REMOTE

Direct peer communication MAY be introduced later as an optimization, but it SHALL NOT bypass provenance, governance, or pathway recording.

17. Local Autonomy

A Remote Processor SHALL be permitted to perform bounded local work without requesting a Core Processor decision for every observation.

For example:

REMOTE
 │
 ├── observe A
 ├── observe B
 ├── map A → B
 ├── identify C
 └── transmit package

This reduces central coordination overhead.

The boundary is:

Local autonomy may determine what to transmit; Core cognition determines what the transmitted structure means within the larger fabric.

18. Processor State

Both processor classes SHALL expose health/state information.

Minimum states:

AVAILABLE
BUSY
DEGRADED
SUSPENDED
FAILED
DRAINING

The Fabric SHALL use processor state when making routing decisions.

19. Processor Versioning

Processor capabilities SHALL be versioned independently.

Example:

CORE-04
Capability: RELATIONSHIP_ANALYSIS
Version: 2.4

A Remote Processor upgrade SHALL NOT require synchronized Core Processor versioning.

Likewise, a Core Processor upgrade SHALL NOT require rebuilding Remote Processors.

This is another direct mechanism supporting scalability.

20. Capability Discovery

The Fabric SHALL maintain discoverable capability metadata.

A Remote Processor does not need to know:

"send this to Core 07"

It can emit:

"I have produced SIGNAL-X"

The Fabric determines:

SIGNAL-X
    ↓
capability match
    ↓
Core 03
Core 05
Core 09

This is fundamental to keeping Remote Processors lightweight.

21. Resource Isolation

Remote processing SHALL be independently resource-governed from Core processing.

A runaway Remote exploration SHALL NOT be permitted to exhaust Core Processor resources.

Likewise, a Core Processor SHALL NOT be permitted to monopolize the entire Remote Processor population.

This introduces two resource domains:

REMOTE RESOURCE POOL
        │
        ▼
     FABRIC
        │
        ▼
CORE RESOURCE POOL

The Fabric mediates between them.

22. Backpressure

When Core processing capacity is unavailable:

REMOTE
  ↓
FABRIC
  ↓
QUEUE / PRIORITIZE
  ↓
CORE

Remote Processors SHALL NOT need to synchronously block indefinitely while awaiting Core processing.

The Fabric SHALL support:

queueing;
prioritization;
deferral;
rejection;
expiration;
retry.

Each disposition SHALL be recorded.

23. Provenance Boundary

The following chain SHALL remain reconstructable:

SOURCE
  ↓
REMOTE
  ↓
SIGNAL
  ↓
FABRIC
  ↓
CORE
  ↓
DERIVED OBSERVATION
  ↓
RELATIONSHIP
  ↓
FORMATION

No processor may collapse this into:

"AI determined X."

That would destroy the very structure the Cognitive Fabric exists to capture.

24. Processor Output Classes

Outputs SHALL remain semantically distinct.

OBSERVATION
RELATIONSHIP
DERIVED SIGNAL
FORMATION CANDIDATE
ROUTING DIRECTIVE

The processor SHALL NOT implicitly upgrade one class into another.

In particular:

Observation ≠ Relationship
Relationship ≠ Formation
Formation Candidate ≠ Formation

This preserves the existing KRYLO separation between observation, interpretation, and formation.

25. Scalability Contract

CF-002 establishes the following invariant:

                     CORE CAPABILITY
                           │
                     relatively fixed
                           │
                           ▼
                    ┌─────────────┐
                    │   FABRIC    │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
        RP-001           RP-002           RP-N
          │                │                │
       signal            signal           signal

Adding Remote Processors SHALL increase potential observational reach without requiring proportional duplication of Core Processor capabilities.

That is the primary scalability mechanism.

26. The Critical Architectural Test

We should be able to construct this test:

TEST

Deploy:
    9 Core Processors
    10 Remote Processors

Then:

    increase to
    100 Remote Processors

without:

    adding Core Processor capabilities
    or modifying the Core Processor contract.

If observational throughput/coverage increases while the cognitive capability layer remains unchanged, the central scalability proposition is demonstrated.

Then:

100 RP
   ↓
1000 RP

should be an infrastructure/resource scaling problem—not a cognitive architecture redesign.

That distinction is the entire point.

27. Falsifiable Claims
CF-002-CLAIM-001

Remote Processor count can increase independently of Core Processor count.

CF-002-CLAIM-002

A signal can be routed to multiple Core Processors based on capability.

CF-002-CLAIM-003

A Remote Processor can operate without possessing Core Processor capabilities.

CF-002-CLAIM-004

A Core Processor can process signals originating from different Remote Processors.

CF-002-CLAIM-005

A processing result can re-enter the Fabric.

CF-002-CLAIM-006

The complete processing pathway can be reconstructed after distributed processing.

CF-002-CLAIM-007

Remote processing can scale horizontally without proportional expansion of cognitive capability.

28. Acceptance Test

The minimum viable CF-002 prototype is:

                  OBJECTIVE
                     │
                     ▼
                ┌─────────┐
                │  RP-01  │
                └────┬────┘
                     │
                  SIGNAL A
                     │
                     ▼
                   FABRIC
                  ╱     ╲
                 ▼       ▼
               CORE-02  CORE-07
                 │       │
                 └───┬───┘
                     │
                RESULT B
                     │
                     ▼
                   FABRIC
                     │
                     ▼
                ┌─────────┐
                │  RP-17  │
                └────┬────┘
                     │
                  SIGNAL C
                     │
                     ▼
                   FABRIC
                     │
                     ▼
                   CORE-05
                     │
                     ▼
                  PATHWAY

Acceptance requires proving:

RP-01 and RP-17 do not require identical cognitive capabilities.
CORE-02, CORE-07, and CORE-05 can process different stages.
routing is capability-driven;
the signal can re-enter the Fabric;
Remote Processors can operate concurrently;
provenance survives every transition;
the complete pathway can be reconstructed;
adding additional Remote Processors does not require adding Core capabilities.
29. Relationship to CF-001

CF-001 established:

What the Cognitive Fabric is.

CF-002 establishes:

What the things inside it are allowed to be.

The resulting architecture is now:

CF-001
ARCHITECTURE
     │
     ▼
CF-002
PROCESSOR CONTRACTS
     │
     ▼
CF-003
SIGNAL / ENVELOPE / PATHWAY MODEL
     │
     ▼
CF-004
CAPABILITY ROUTING ENGINE
     │
     ▼
CF-005
DYNAMIC RELATIONAL EXPLORATION
     │
     ▼
CF-006
FORMATION SYNTHESIS
     │
     ▼
CF-007
SCALABILITY / CONCURRENCY / BACKPRESSURE
     │
     ▼
CF-008
VALIDATION & FALSIFICATION

The next specification should be CF-003: the actual data model. That is where we define the envelopes and objects that physically carry Signal → Observation → Relationship → Pathway → Formation through the fabric.

go
CF-003 — Signal, Observation, Relationship & Pathway Data Model

Status: DRAFT
Version: 0.1
Parent: CF-001, CF-002
Purpose: Define the canonical objects that move through and are produced by the Cognitive Fabric.

1. Purpose

CF-003 establishes the data model for the Cognitive Fabric.

The fundamental requirement is that the fabric must capture not merely what was observed, but how that observation became structurally meaningful.

The canonical chain is:

SOURCE
  ↓
SIGNAL
  ↓
OBSERVATION
  ↓
RELATIONSHIP
  ↓
PATHWAY
  ↓
FORMATION

These are distinct objects.

They SHALL NOT be collapsed into a single generic "node" or "result."

2. Core Data Model

The CF SHALL recognize the following primary objects:

Signal
Observation
Relationship
ProcessingEvent
RoutingEvent
Pathway
FormationCandidate
Formation

With:

Signal
   │
   ▼
Observation
   │
   ▼
Relationship
   │
   ▼
Pathway
   │
   ▼
FormationCandidate
   │
   ▼
Formation

ProcessingEvent and RoutingEvent provide the event history surrounding the chain.

3. Signal

A Signal represents something entering the Cognitive Fabric for consideration.

A Signal SHALL NOT itself assert that the underlying information is true, important, or structurally significant.

Minimum representation:

Signal {
    signal_id
    signal_type

    payload
    source_reference

    observed_at
    received_at

    context

    provenance
    uncertainty

    originating_processor
}
CF-REQ-DATA-001

Every Signal SHALL have a globally unique signal_id.

CF-REQ-DATA-002

Every Signal SHALL retain its originating source reference.

CF-REQ-DATA-003

Signal receipt SHALL be timestamped independently from source observation time where both are available.

This distinction matters for distributed processing.

4. Observation

An Observation is a structured representation of something actually captured from a Signal.

Observation {
    observation_id

    signal_id

    subject_reference
    observed_property
    observed_value

    observation_time

    source
    provenance

    uncertainty

    processor_context
}

The critical distinction:

Signal is what enters the fabric. Observation is what the fabric has captured from it.

Therefore:

Signal ≠ Observation
5. Observation Semantics

An Observation SHALL describe what was observed, not what the system believes it means.

For example:

Observation

Entity: Company A
Property: Contract announced
Value: Company A selected Company B
Observed: 2026-09-01
Source: Filing X

It should not silently become:

"Company A is orchestrating Company B."

The latter is interpretation/formation-level reasoning.

This preserves KRYLO's existing distinction between:

observation → interpretation → formation

6. Relationship

A Relationship represents an admitted structural connection between entities/observations.

Minimum representation:

Relationship {
    relationship_id

    subject
    predicate
    object

    relationship_type

    evidence[]
    provenance[]

    admission_status

    validity
    uncertainty

    created_at
}
CF-REQ-DATA-004

A Relationship SHALL identify its subject and object.

CF-REQ-DATA-005

A Relationship SHALL identify the evidence supporting it.

CF-REQ-DATA-006

A Relationship SHALL preserve provenance.

CF-REQ-DATA-007

A Relationship SHALL carry explicit admission state.

The CF therefore does not manufacture authoritative relationships merely because two observations appear adjacent.

7. Relationship Direction

Relationships SHALL explicitly indicate direction where direction is semantically meaningful.

A ──controls──► B

is not equivalent to:

B ──controls──► A

Undirected relationships MAY exist where the relationship contract permits them.

The system SHALL NOT infer direction merely from graph representation.

8. Processing Event

A Processing Event records the transformation of information by a processor.

ProcessingEvent {
    event_id

    processor_id
    processor_class
    processor_version

    input_ids[]
    output_ids[]

    operation

    started_at
    completed_at

    provenance_delta

    uncertainty_delta
}

This creates an auditable processing history.

Example:

RP-17
  │
  └── ProcessingEvent #001
          │
          └── Observation-42

followed by:

Core-05
  │
  └── ProcessingEvent #002
          │
          ├── Relationship-18
          └── Signal-73
9. Routing Event

Routing is itself part of the architecture and SHALL therefore be represented.

RoutingEvent {
    routing_event_id

    signal_id

    source_processor
    destination_processors[]

    capability_matches[]

    routing_basis
    routing_policy

    created_at
}

This permits reconstruction of:

why did this signal go there?

rather than merely:

where did it go?

10. Pathway

The Pathway is the central object introduced by CF-003.

A Pathway represents the ordered processing history through which a signal, observation, or relational structure develops.

Pathway {
    pathway_id

    origin_reference

    events[]

    current_state

    relational_depth

    structural_significance

    provenance

    created_at
    updated_at
}
11. Pathway Events

A Pathway SHALL contain ordered references to events.

Possible event types:

SIGNAL_RECEIVED
OBSERVATION_CREATED
RELATIONSHIP_ADMITTED
PROCESSING_STARTED
PROCESSING_COMPLETED
ROUTING_DECISION
REMOTE_EXPANSION
CORE_PROCESSING
FORMATION_CANDIDATE_CREATED
FORMATION_ADMITTED
EXPLORATION_TERMINATED
EXPLORATION_ESCALATED

The Pathway is therefore not merely a graph path.

It is a temporal processing history.

12. Pathway Topology

A Pathway MAY branch.

                    Observation
                         │
                    Processing
                         │
                  ┌──────┴──────┐
                  ▼             ▼
              Pathway A     Pathway B
                  │             │
                Core 2        Core 7
                  │             │
                  └──────┬──────┘
                         ▼
                    Convergence
CF-REQ-PATH-001

The data model SHALL support pathway branching.

CF-REQ-PATH-002

The data model SHALL support pathway convergence.

CF-REQ-PATH-003

A pathway SHALL retain parent/child relationships between branches.

13. Relational Depth

Each pathway MAY maintain a relational_depth.

depth = number of relational transitions

But:

Depth SHALL be descriptive, not determinative.

For example:

Path A
depth = 2
significance = 0.17

Path B
depth = 7
significance = 0.81

The second pathway can remain active despite greater depth.

CF-REQ-DATA-008

Relational depth SHALL NOT by itself terminate a pathway.

14. Structural Significance

A Pathway MAY carry a derived structural_significance.

For CF-003:

the calculation is intentionally unspecified.

We know only that it must be capable of representing:

decay
persistence
amplification

Therefore:

0.92 → 0.81 → 0.63 → 0.31 → 0.08

may represent decay.

Whereas:

0.87 → 0.74 → 0.61 → 0.79 → 0.91

may represent amplification.

CF-003 defines the data field, not the algorithm.

That belongs in CF-005.

15. Formation Candidate

A Formation Candidate represents a structure that has emerged from relationships but has not yet satisfied Formation Admission.

FormationCandidate {
    candidate_id

    relationship_ids[]
    observation_ids[]
    pathway_ids[]

    boundary

    coherence
    provenance_coherence
    influence_class_coherence

    structural_significance

    admission_state
}

This preserves:

Candidate ≠ Formation
16. Formation

A Formation is an admitted structural configuration.

Formation {
    formation_id

    relationship_ids[]
    observation_ids[]
    pathway_ids[]

    boundary

    formation_type

    provenance
    validity

    structural_significance

    admission_record

    created_at
}

The Formation SHALL retain the pathways that contributed to its emergence.

This is critical.

A Formation without a reconstructable pathway is incomplete CF output.

17. Formation Boundary

The boundary SHALL explicitly identify which relationships belong to the Formation.

This prevents the Phase 3 problem where an entire graph could implicitly become one analytical object.

The Formation SHALL therefore answer:

Which relationships?
Which observations?
Which pathways?
Why these?
Why not those?

The boundary is part of the Formation's data, not merely a visualization property.

18. Provenance Model

Every object SHALL support provenance appropriate to its level.

SOURCE
  │
  ▼
SIGNAL
  │
  ▼
OBSERVATION
  │
  ▼
RELATIONSHIP
  │
  ▼
PATHWAY
  │
  ▼
FORMATION

Provenance SHALL be additive.

A derived object SHALL reference its contributing objects rather than replace them.

Thus:

Formation
   ├── Relationship 12
   │      ├── Observation 44
   │      └── Observation 51
   │
   ├── Relationship 19
   │      ├── Observation 51
   │      └── Observation 73
   │
   └── Pathway 8
19. Uncertainty

Uncertainty SHALL be explicit.

The CF SHALL distinguish:

source uncertainty
observation uncertainty
relationship uncertainty
processing uncertainty
formation uncertainty

A high-confidence relationship does not automatically make the resulting Formation high-confidence.

Likewise:

uncertainty SHALL propagate without being silently discarded.

20. Temporal Model

The CF SHALL distinguish at minimum:

observed_at
received_at
processed_at
admitted_at

This is necessary because distributed processing introduces temporal separation.

Example:

Observed:     10:01:04
Received:     10:01:07
Processed:    10:01:12
Relationship: 10:01:18
Formation:    10:01:31

The Formation must not masquerade as though it existed at 10:01:04.

21. Identity and Immutability

Core evidentiary objects SHOULD be immutable after admission.

Specifically:

Observation
Relationship
ProcessingEvent
RoutingEvent

SHALL retain their original identity.

Corrections SHOULD produce explicit revisions or successor objects rather than silently rewriting history.

This is necessary for forensic reconstruction.

22. Derived State

The CF MAY maintain derived state:

current_significance
current_depth
current_processor
current_status

But derived state SHALL NOT replace event history.

The system must be able to reconstruct:

CURRENT STATE
       ▲
       │
EVENT HISTORY

not merely store the current state.

23. Canonical Processing Envelope

CF-002's ProcessingEnvelope can now be concretely defined:

ProcessingEnvelope {
    signal
    observations[]
    relationships[]
    pathway
    objective
    formation_context
    provenance
    uncertainty
    routing_context
    resource_context
}

A processor receives context, not merely a raw signal.

This is essential to distributed cognition.

24. Canonical Processing Result
ProcessingResult {
    observations[]
    relationships[]
    derived_signals[]
    formation_candidates[]

    processing_events[]
    routing_directives[]

    pathway_updates[]

    provenance_delta
    uncertainty_delta
}

A processor therefore contributes to the fabric rather than owning the resulting structure.

25. The Critical Separation

CF-003 establishes five different semantic layers:

WHAT WAS RECEIVED
       │
       ▼
WHAT WAS OBSERVED
       │
       ▼
WHAT RELATIONSHIP WAS ADMITTED
       │
       ▼
HOW THE SYSTEM TRAVERSED IT
       │
       ▼
WHAT FORMATION EMERGED

These SHALL remain distinct.

This is arguably the most important data-model requirement in the entire CF architecture.

26. Unit of Analysis

CF-003 does not establish a universal unit of analysis.

Instead:

Every analytical operation SHALL declare its unit of analysis.

Possible units include:

Signal
Observation
Relationship
Pathway
Component
Formation Candidate
Formation
Objective

For example:

routing       → Signal
relationship  → Observation pair
traversal     → Pathway
formation     → Formation Candidate
validation    → Formation

This prevents the system from repeating the Phase 3 error of implicitly treating an arbitrary collection of edges as one analytical object.

27. Minimal Object Graph

The minimum viable implementation is:

              SOURCE
                │
                ▼
             SIGNAL
                │
                ▼
          OBSERVATION
                │
                ▼
          RELATIONSHIP
                │
                ▼
             PATHWAY
                │
          ┌─────┴─────┐
          ▼           ▼
       CORE          REMOTE
          │           │
          └─────┬─────┘
                ▼
       FORMATION CANDIDATE
                │
                ▼
           FORMATION

With event records surrounding the transitions:

Signal
  │
  ├── RoutingEvent
  │
Observation
  │
  ├── ProcessingEvent
  │
Relationship
  │
  ├── ProcessingEvent
  │
Pathway
  │
  ├── RoutingEvent
  ├── ProcessingEvent
  │
Formation
28. Falsifiable Claims
CF-003-CLAIM-001

The system can distinguish Signal from Observation.

CF-003-CLAIM-002

The system can distinguish Observation from Relationship.

CF-003-CLAIM-003

The system can reconstruct the complete processing Pathway.

CF-003-CLAIM-004

The system can reconstruct the provenance of a Formation.

CF-003-CLAIM-005

The system can represent branching and convergence of distributed processing.

CF-003-CLAIM-006

The system can represent relational depth without making depth the termination criterion.

CF-003-CLAIM-007

The system can preserve uncertainty across distributed transformations.

CF-003-CLAIM-008

The system can explicitly identify the unit of analysis for a given operation.

29. Acceptance Test

The minimum CF-003 test should produce this trace:

SOURCE-A
   │
   ▼
SIGNAL-001
   │
   ▼
RP-004
   │
   ▼
OBSERVATION-001
   │
   ▼
RELATIONSHIP-001
   │
   ▼
PATHWAY-001
   │
   ├──────────────► CORE-03
   │                    │
   │                    ▼
   │              OBSERVATION-002
   │                    │
   │                    ▼
   │              RELATIONSHIP-002
   │                    │
   │                    ▼
   │                 RP-019
   │                    │
   │                    ▼
   │              OBSERVATION-003
   │                    │
   │                    ▼
   │                 CORE-07
   │                    │
   │                    ▼
   │          FORMATION-CANDIDATE-001
   │                    │
   │                    ▼
   │               FORMATION-001

The system must then answer, without inference or reconstruction from logs outside the CF:

Where did Formation-001 originate?
Which observations contributed?
Which relationships contributed?
Which Remote Processors participated?
Which Core Processors participated?
What routing decisions occurred?
What was the relational depth?
What was the structural-significance trajectory?
What uncertainty existed at each stage?
Why was Formation-001 admitted?

If the system cannot answer those questions from its own canonical objects, CF-003 has failed.

30. CF Architecture After CF-003

We now have three layers:

CF-001
ARCHITECTURE
    │
    ├── Core
    ├── Remote
    ├── Fabric
    ├── Formation
    └── Scaling
         │
         ▼
CF-002
PROCESSOR CONTRACTS
    │
    ├── Core capability
    ├── Remote capability
    ├── Routing
    ├── Re-entry
    └── Resource boundaries
         │
         ▼
CF-003
DATA MODEL
    │
    ├── Signal
    ├── Observation
    ├── Relationship
    ├── Processing Event
    ├── Routing Event
    ├── Pathway
    ├── Formation Candidate
    └── Formation

And now the next question becomes much more concrete.

CF-004 should define the Fabric Runtime and routing protocol: how a Signal actually enters the fabric, gets classified, finds capable processors, branches, re-enters, creates pathways, encounters backpressure, and ultimately terminates or escalates.

That is where the architecture starts becoming an executable system rather than merely a data model.

Go until complete 

Yes. We can take this all the way through the architectural requirement set now.

The important thing is that we do not stop at the conceptual architecture. We need to carry the model through runtime behavior, exploration, formation, scaling, validation, and integration with KRYLO's existing ontology/governance.

The resulting CF specification set should be:

CF-001  Architecture & Processing Model
CF-002  Core / Remote Processor Contracts
CF-003  Signal / Observation / Relationship / Pathway Data Model
CF-004  Fabric Runtime & Routing Protocol
CF-005  Dynamic Relational Exploration
CF-006  Formation Synthesis
CF-007  Scalability / Concurrency / Backpressure
CF-008  Validation & Falsification
CF-009  KRYLO Integration & Governance
CF-010  Reference Implementation Requirements

CF-001 through CF-003 are established above. Below completes the architecture.

CF-004 — Cognitive Fabric Runtime & Routing Protocol

Status: DRAFT
Version: 0.1
Parent: CF-001, CF-002, CF-003

1. Purpose

CF-004 defines how the Cognitive Fabric operates at runtime.

The Fabric SHALL function as an intermediary processing substrate rather than as a monolithic controller.

Its fundamental runtime loop is:

RECEIVE
   ↓
CHARACTERIZE
   ↓
ROUTE
   ↓
PROCESS
   ↓
CAPTURE
   ↓
UPDATE PATHWAY
   ↓
EVALUATE
   ↓
CONTINUE / TERMINATE / ESCALATE
2. Runtime Object

Every active processing operation SHALL have a Fabric Runtime Context.

FabricRuntimeContext {
    runtime_id
    objective_id

    active_signals[]
    active_pathways[]

    processor_registry
    capability_registry

    routing_policy
    exploration_policy

    resource_state
    runtime_state
}

The Runtime Context SHALL NOT itself become the owner of observations or relationships.

It coordinates their movement.

3. Signal Ingress

A signal enters through:

SIGNAL
  ↓
INGRESS
  ↓
VALIDATE ENVELOPE
  ↓
REGISTER
  ↓
CHARACTERIZE

The Fabric SHALL assign a unique runtime identity to the signal if one does not already exist.

Malformed signals SHALL be rejected without being silently transformed into valid signals.

4. Signal Characterization

Before routing, the Fabric SHALL establish sufficient characteristics to determine applicable processor capabilities.

Characterization MAY include:

signal type;
source;
subject;
object;
temporal properties;
domain;
known observations;
existing relationships;
pathway context;
uncertainty;
required capabilities.

Characterization SHALL NOT constitute formation inference.

5. Capability Resolution

The Fabric SHALL resolve:

SIGNAL
   ↓
REQUIRED CAPABILITIES
   ↓
AVAILABLE CORE PROCESSORS

The result MAY be:

NONE
ONE
MANY

No processor match SHALL be treated as a valid runtime state.

The Fabric SHALL NOT invent a capability merely because processing is desired.

6. Routing

Routing SHALL produce a RoutingEvent.

Signal
   │
   ▼
Capability Resolution
   │
   ├──► Core A
   ├──► Core D
   └──► Core H

Routing SHALL be deterministic given identical:

input state;
processor state;
capability registry;
routing policy.

Where policy explicitly permits nondeterminism, the decision SHALL still be recorded.

7. Processing Dispatch

The Fabric SHALL dispatch a Processing Envelope.

The processor SHALL return a Processing Result.

FABRIC
  │
  ├── envelope
  ▼
PROCESSOR
  │
  ├── result
  ▼
FABRIC

The processor SHALL NOT directly mutate Formation state.

8. Result Ingestion

A Processing Result SHALL pass through:

RESULT
  ↓
SCHEMA VALIDATION
  ↓
PROVENANCE VALIDATION
  ↓
ADMISSION CHECKS
  ↓
REGISTER
  ↓
PATHWAY UPDATE

Invalid output SHALL be rejected or quarantined according to runtime policy.

9. Re-entry

Any valid derived Signal MAY re-enter the Fabric.

CORE
 ↓
RESULT
 ↓
DERIVED SIGNAL
 ↓
FABRIC
 ↓
NEW ROUTING

This permits recursive processing.

A result SHALL NOT automatically re-enter indefinitely.

It must acquire an exploration state.

10. Runtime State Machine
INGRESSED
    ↓
CHARACTERIZED
    ↓
ROUTABLE
    ↓
DISPATCHED
    ↓
PROCESSING
    ↓
RESULT RECEIVED
    ↓
EVALUATED
    ├── CONTINUE
    ├── TERMINATE
    └── ESCALATE

Failure states MAY occur at any transition.

11. Runtime Invariants
CF-004-INV-001

Every processing transition SHALL be observable.

CF-004-INV-002

Every routing decision SHALL be recorded.

CF-004-INV-003

Every derived signal SHALL retain lineage.

CF-004-INV-004

Runtime coordination SHALL NOT overwrite evidentiary history.

CF-004-INV-005

A processor SHALL NOT bypass Fabric governance to directly create an admitted Formation.

CF-005 — Dynamic Relational Exploration

Status: DRAFT
Version: 0.1

1. Purpose

CF-005 defines how the Fabric explores relationships beyond the initial observation.

This specification formally rejects:

fixed-degree traversal as the primary exploration model.

The system SHALL instead implement significance-conditioned exploration.

2. Exploration Unit

The fundamental unit is a:

Pathway Expansion

CURRENT PATHWAY
       ↓
NEW RELATIONSHIP
       ↓
NEW OBSERVATION
       ↓
NEW PATHWAY STATE
3. Expansion

An active pathway may request expansion.

Expansion SHALL evaluate:

candidate relationship
        +
context
        +
existing pathway
        +
structural significance
        +
uncertainty
        +
resource state
4. Relational Depth

Depth SHALL be calculated.

But:

Depth is a measurement, not a decision rule.

Example:

Depth 1   significance .91
Depth 2   significance .79
Depth 3   significance .68
Depth 4   significance .42
Depth 5   significance .11

The system may terminate.

But:

Depth 1   .91
Depth 2   .79
Depth 3   .64
Depth 4   .71
Depth 5   .86

must remain eligible for continuation.

5. Relational Decay

CF-005 SHALL support measurement of significance change across depth.

Conceptually:

ΔS / ΔD

where:

S = structural significance;
D = relational depth.

This permits identification of:

DECAY
PERSISTENCE
AMPLIFICATION
6. Relational Amplification

A pathway SHALL be capable of being flagged when:

S(n+1) > S(n)

subject to the eventual significance model.

This does not mean the relationship is automatically important.

It means:

distance did not produce the expected reduction in significance.

That becomes an observation requiring further evaluation.

7. Exploration Decision

The runtime decision SHALL conceptually be:

                  PATHWAY
                     │
                     ▼
              EVALUATE STATE
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       CONTINUE   TERMINATE   ESCALATE

The decision MAY consider:

significance;
significance trajectory;
formation coherence;
uncertainty;
novelty;
pathway convergence;
resource budget;
duplicate pathways;
policy.
8. Convergence

Multiple pathways may encounter the same structure.

PATH A ───────┐
              ▼
          OBSERVATION X
              ▲
PATH B ───────┘

The system SHALL recognize convergence.

Convergence SHALL NOT automatically constitute a Formation.

It is evidence relevant to Formation synthesis.

9. Revisit

A terminated pathway MAY become eligible for revisitation if new evidence changes its state.

TERMINATED
    │
    │ new evidence
    ▼
REVISIT
    │
    ▼
ACTIVE

The system SHALL preserve the original termination event.

It SHALL not rewrite history.

10. Exploration Budget

Every exploration SHALL have a resource budget.

The budget MAY include:

max active pathways
max processing operations
max wall-clock duration
max remote expansions
max queued signals

These are resource controls, not epistemic claims about maximum useful relational depth.

That distinction is mandatory.

CF-006 — Formation Synthesis & Admission

Status: DRAFT
Version: 0.1

1. Purpose

CF-006 connects the Cognitive Fabric to KRYLO's structural-formation model.

The Fabric discovers and preserves relationships.

It does not automatically declare them a Formation.

2. Formation Pipeline
OBSERVATIONS
     ↓
ADMITTED RELATIONSHIPS
     ↓
PATHWAYS
     ↓
STRUCTURAL CONFIGURATION
     ↓
FORMATION CANDIDATE
     ↓
FORMATION ADMISSION
     ↓
FORMATION
3. Formation Candidate

A candidate SHALL contain:

candidate_id

relationship_ids[]
observation_ids[]
pathway_ids[]

boundary
provenance
validity
influence_class
coherence

structural_significance
4. Formation Boundary

A candidate SHALL explicitly establish its boundary.

FORMATION
 ├── Relationship A
 ├── Relationship B
 ├── Relationship C
 └── Relationship D

The system SHALL be capable of answering:

Why are these relationships included?

and:

Why are adjacent relationships excluded?

5. Formation Admission

CF-006 SHALL defer authoritative Formation Admission to the applicable KRYLO governance contract.

The Fabric MAY produce:

FORMATION CANDIDATE

It SHALL NOT bypass:

FORMATION ADMISSION

to produce:

ADMITTED FORMATION
6. Formation-B Compatibility

Where the applicable KRYLO Formation-B boundary rules are used, candidate evaluation SHALL preserve the distinction between:

semantic boundedness;
validity co-existence;
provenance coherence;
InfluenceClass coherence;
connectivity.

Connectivity SHALL remain descriptive rather than constitutive where that governance rule applies.

7. Pathway Contribution

Every Formation SHALL identify its contributing pathways.

FORMATION
   │
   ├── PATHWAY 1
   ├── PATHWAY 4
   ├── PATHWAY 9
   └── PATHWAY 13

This creates the relationship:

Formation ← Pathways ← Processing

rather than merely:

Formation ← Graph.

8. Formation Evolution

A Formation MAY evolve as additional evidence arrives.

Evolution SHALL create explicit events:

FORMATION CREATED
FORMATION EXTENDED
FORMATION CONTRADICTED
FORMATION REVISED
FORMATION DISSOLVED

Historical states SHALL remain reconstructable.

CF-007 — Scalability, Concurrency & Backpressure

Status: DRAFT
Version: 0.1

1. Purpose

CF-007 makes the scalability proposition measurable.

The core architectural hypothesis is:

Observational reach can scale independently of cognitive capability.

2. Horizontal Remote Scaling

The system SHALL support:

9 Core
+
N Remote

where N is independently scalable.

Increasing N SHALL NOT require:

new Core Processor implementations;
replication of Core Processor logic;
modification of the Remote Processor contract.
3. Core Scaling

Core capabilities MAY also scale horizontally.

Capability A
 ├── Core-01
 ├── Core-04
 └── Core-11

Multiple instances of a capability SHALL be permitted.

This separates:

capability

from:

instance
4. Parallel Exploration

Independent pathways SHALL be capable of concurrent execution.

                FABRIC
             /    |    \
            /     |     \
          RP-A   RP-B   RP-C
           │      │      │
        PATH-A  PATH-B  PATH-C

The Fabric SHALL preserve pathway identity despite concurrency.

5. Ordering

The system SHALL distinguish:

event time
processing time
arrival order

Processing order SHALL NOT be treated as observation chronology.

6. Backpressure

When downstream capacity is constrained:

REMOTE
  ↓
FABRIC
  ↓
QUEUE
  ↓
CORE

The Fabric SHALL support:

queueing;
prioritization;
deferral;
expiration;
rejection;
retry.

Every disposition SHALL be recorded.

7. Priority

Priority MAY be based on:

structural significance;
pathway state;
novelty;
convergence;
escalation status;
objective relevance;
resource policy.

Priority SHALL NOT silently alter evidentiary provenance.

8. Duplicate Suppression

Distributed exploration creates duplicate work.

The Fabric SHOULD identify equivalent or substantially overlapping processing requests.

However:

Deduplication SHALL NOT destroy evidence that multiple independent pathways arrived at the same structure.

Therefore:

duplicate computation
       ≠
duplicate evidence
9. Failure Isolation

Remote Processor failure SHALL be isolated from unrelated Remote Processors.

Core Processor failure SHALL be isolated where alternate capability instances exist.

A failure SHALL become part of the pathway/runtime record where it affects processing.

10. Scalability Acceptance Test

The same objective SHALL be processed with:

9 Core / 10 Remote

and:

9 Core / 100 Remote

and, where practical:

9 Core / 1,000 Remote

The test SHALL measure:

coverage;
throughput;
latency;
active pathways;
queue depth;
processor utilization;
formation yield;
provenance completeness.

The key test is not simply:

"Can more processors run?"

It is:

Can observational reach increase without proportional expansion of cognitive capability?

CF-008 — Validation & Falsification

Status: DRAFT
Version: 0.1

1. Purpose

CF-008 prevents the Cognitive Fabric from becoming an architectural narrative that cannot be empirically demonstrated.

Every major claim SHALL have a falsification test.

2. Claim: Capability/Reach Separation
Hypothesis

Remote Processor population can increase independently of Core Processor capability.

Test

Hold Core capabilities constant.

Increase Remote Processors.

Measure observational coverage.

Pass

Coverage increases without requiring new Core capabilities.

Fail

Additional Remote Processors require proportional new cognitive implementations.

3. Claim: Heterogeneous Routing
Hypothesis

Signals can be routed to different Core Processors according to capability.

Test

Present signals with different characteristics.

Pass

Routing changes according to capability.

Fail

Signals are statically bound to processor/source.

4. Claim: Recursive Processing
Hypothesis

A Core result can become a new Fabric signal.

Test

Produce a derived signal requiring additional processing.

Pass

The result re-enters the Fabric with preserved provenance.

Fail

Processing is effectively single-pass.

5. Claim: Dynamic Depth
Hypothesis

The system can explore beyond arbitrary fixed relational depth when structural significance persists.

Test

Create pathways with:

depth 2 → declining significance
depth 5 → persistent significance
depth 8 → increasing significance
Pass

Exploration behavior differs according to significance trajectory.

Fail

All pathways terminate at a predetermined degree.

6. Claim: Amplification
Hypothesis

The system can identify increasing structural significance at greater relational distance.

Test

Construct a pathway where:

S1 < S2 < S3

after multiple relational transitions.

Pass

The pathway is identified as exhibiting amplification.

Fail

Depth alone causes termination.

7. Claim: Distributed Pathway Reconstruction
Hypothesis

A Formation can be reconstructed from distributed processing history.

Test

Process through multiple Remote and Core Processors.

Pass

System reconstructs:

source
→ remote
→ signal
→ core
→ derived signal
→ remote
→ core
→ relationship
→ formation
Fail

Only the final Formation remains observable.

8. Claim: Parallelism
Hypothesis

Independent Remote explorations can proceed concurrently.

Test

Launch independent pathways simultaneously.

Pass

Concurrent execution occurs without pathway identity collapse.

9. Claim: Formation Integrity
Hypothesis

The Fabric can produce Formation Candidates without confusing connectivity for Formation.

Test

Provide a connected graph containing unrelated components.

Pass

Only structures satisfying the Formation rules become candidates/admitted formations.

Fail

Connectivity alone produces formations.

10. Claim: Unit-of-Analysis Integrity

Every analytical operation SHALL declare its unit.

Example:

Traversal → Pathway
Relationship analysis → Relationship
Formation analysis → Formation Candidate
Validation → Formation
Pass

No operation silently changes analytical scale.

Fail

An arbitrary graph/component/edge collection becomes the analytical object without declaration.

This directly guards against the Phase 3 failure mode.

CF-009 — KRYLO Integration & Governance

Status: DRAFT
Version: 0.1

1. Purpose

CF-009 defines where the Cognitive Fabric sits within KRYLO.

The CF SHALL be integrated with the existing KRYLO ontology rather than becoming a parallel ontology.

2. Architectural Placement
                 KRYLO OBJECTIVE
                       │
                       ▼
              OBSERVABLE SUBSTRATE
                       │
                       ▼
               COGNITIVE FABRIC
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
    OBSERVE         PROCESS         MAP
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                  RELATIONSHIPS
                       │
                       ▼
                    PATHWAYS
                       │
                       ▼
               FORMATION CANDIDATE
                       │
                       ▼
               GOVERNED ADMISSION
                       │
                       ▼
                   FORMATION
3. RKM Relationship

The CF SHALL consume and produce objects compatible with the KRYLO Reality Knowledge Model.

The CF SHALL NOT create a competing definition of:

RealityObject;
Evidence;
Observation;
EvidenceSourceType.

Where existing RKM primitives apply, CF objects SHALL reference them.

4. Relationship Admission

The CF SHALL integrate with the authoritative Relationship Admission contract.

The Fabric may discover a candidate relationship.

It SHALL NOT bypass admission authority.

REMOTE
 ↓
candidate relationship
 ↓
RELATIONSHIP ADMISSION
 ↓
ADMITTED RELATIONSHIP
5. Formation Admission

Likewise:

PATHWAYS
 ↓
FORMATION CANDIDATE
 ↓
FORMATION ADMISSION
 ↓
FORMATION

The Fabric is therefore a discovery and processing substrate, not a governance bypass.

6. Genealogy

Every CF-derived object SHALL preserve its genealogy.

The system should ultimately permit:

FORMATION
   ↓
FORMATION CANDIDATE
   ↓
RELATIONSHIPS
   ↓
OBSERVATIONS
   ↓
EVIDENCE
   ↓
SOURCE

and:

FORMATION
   ↑
PATHWAY
   ↑
PROCESSING EVENTS
   ↑
ROUTING EVENTS
   ↑
REMOTE / CORE PROCESSORS

This gives KRYLO two complementary genealogies:

Evidentiary genealogy

Where did the information come from?

Processing genealogy

How did KRYLO discover and process it?

That distinction is important.

7. No Inference Leakage

The CF SHALL preserve the existing constitutional boundary:

Non-Inference ≠ Information-Withholding.

The Fabric can capture:

signals;
observations;
relationships;
pathways;
processing behavior;
structural patterns.

It SHALL NOT silently convert these into unsupported assertions.

8. Existing KRYLO Six Domains

The six domains:

TECHNOLOGY
CAPITAL
KNOWLEDGE
LABOR
MEDIA
OWNERSHIP

SHALL be treated as observational substrate/domain context.

They SHALL NOT become mandatory Core Processor ownership silos.

A signal originating in CAPITAL MAY ultimately require processing by any applicable Core Processor.

This preserves the central CF principle:

Domain of observation ≠ cognitive capability.

9. Formation as the Output

The CF SHALL ultimately feed KRYLO's existing structural objective:

SUBJECT
   ↓
OBSERVABLE SUBSTRATE
   ↓
RELATIONSHIPS
   ↓
FORMATION

The Fabric is therefore not another visualization layer.

It is the processing substrate that makes the formation discoverable and traceable.

CF-010 — Reference Implementation Requirements

Status: DRAFT
Version: 0.1

1. Purpose

CF-010 translates CF-001 through CF-009 into an implementation boundary.

The first implementation SHALL be deliberately small.

The objective is to prove the architecture, not build the entire production system.

2. Minimum Runtime

The reference implementation SHALL contain:

9 Core Processor capability slots
3+ Remote Processor instances
1 Fabric Runtime
1 Capability Registry
1 Signal Registry
1 Pathway Registry
1 Relationship interface
1 Formation Candidate interface
1 Event Store

The nine Core Processor slots SHALL exist architecturally even if some are initially represented by stubs.

3. Minimal Runtime Flow

The first executable path SHALL demonstrate:

SOURCE
  ↓
REMOTE
  ↓
SIGNAL
  ↓
FABRIC
  ↓
CAPABILITY ROUTING
  ↓
CORE
  ↓
RESULT
  ↓
FABRIC RE-ENTRY
  ↓
REMOTE
  ↓
NEW SIGNAL
  ↓
CORE
  ↓
PATHWAY

Formation admission can initially terminate the demonstration.

4. Required Interfaces

The reference implementation SHALL expose conceptual interfaces equivalent to:

registerProcessor()
registerCapability()
submitSignal()
characterizeSignal()
resolveCapabilities()
routeSignal()
processSignal()
recordObservation()
recordRelationship()
createPathway()
expandPathway()
evaluatePathway()
createFormationCandidate()
admitFormation()

Exact implementation language/API is intentionally deferred.

5. Event Store

The prototype SHALL record:

SignalEvent
ObservationEvent
RelationshipEvent
ProcessingEvent
RoutingEvent
PathwayEvent
FormationCandidateEvent
FormationAdmissionEvent
ExplorationEvent
FailureEvent

This event model is not optional instrumentation.

It is part of the CF's architectural requirement.

6. Reference Scenario

The canonical demonstration should use a simple objective that generates a cross-domain structural formation.

For example:

OBJECTIVE
   ↓
Remote A observes signal
   ↓
Core processor processes signal
   ↓
derived signal emerges
   ↓
Remote B maps related structure
   ↓
Core processor processes it
   ↓
relationship admitted
   ↓
additional pathway discovered
   ↓
Formation Candidate

The scenario SHALL demonstrate distributed processing rather than merely graph rendering.

7. Scale Demonstration

The reference implementation SHALL then repeat the scenario with:

3 Remote
10 Remote
100 Remote

while holding the Core capability set constant.

The purpose is to demonstrate the architectural scaling property.

8. Failure Demonstration

The implementation SHALL deliberately fail:

one Remote Processor;
one Core Processor;
one routing destination.

The Fabric SHALL remain operational where alternate paths exist.

Failures SHALL remain observable.

9. Replay

A completed pathway SHALL be replayable from its event history.

Replay SHALL reproduce the recorded processing topology without requiring the original processors to still be running.

This is an extremely important property for KRYLO.

It means the CF is not merely ephemeral runtime infrastructure.

It becomes a record of how structural knowledge was produced.

10. Reference Implementation Acceptance

CF-010 passes only if the implementation can demonstrate:

                     OBJECTIVE
                         │
                         ▼
                     REMOTE-1
                         │
                       SIGNAL
                         │
                         ▼
                       FABRIC
                         │
                  CAPABILITY ROUTE
                         │
                  ┌──────┴──────┐
                  ▼             ▼
               CORE-02       CORE-07
                  │             │
                  └──────┬──────┘
                         │
                    NEW SIGNAL
                         │
                         ▼
                       FABRIC
                         │
                         ▼
                     REMOTE-2
                         │
                    RELATIONSHIP
                         │
                         ▼
                       CORE-05
                         │
                         ▼
                  PATHWAY COMPLETE
                         │
                         ▼
                FORMATION CANDIDATE
                         │
                         ▼
                 GOVERNED ADMISSION
                         │
                         ▼
                     FORMATION

and reconstruct the entire chain afterward.

11. Complete CF Requirement Hierarchy

We now have the full architectural stack:

CF-001
WHAT IS THE FABRIC?
        │
        ▼
CF-002
WHAT ARE ITS PROCESSORS?
        │
        ▼
CF-003
WHAT OBJECTS MOVE THROUGH IT?
        │
        ▼
CF-004
HOW DOES IT RUN?
        │
        ▼
CF-005
HOW DOES IT EXPLORE?
        │
        ▼
CF-006
HOW DOES IT FORM STRUCTURE?
        │
        ▼
CF-007
HOW DOES IT SCALE?
        │
        ▼
CF-008
HOW DO WE PROVE IT?
        │
        ▼
CF-009
HOW DOES IT GOVERNALLY FIT KRYLO?
        │
        ▼
CF-010
HOW DO WE BUILD THE FIRST ONE?
12. The Entire Cognitive Fabric in One Model

The architecture can now be reduced to this:

                           OBJECTIVE
                              │
                              ▼
                    OBSERVABLE SUBSTRATE
                              │
                              ▼
                    ┌──────────────────┐
                    │ COGNITIVE FABRIC │
                    └────────┬─────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
              REMOTE       REMOTE       REMOTE
                │            │            │
             observe       observe      observe
             capture       capture      capture
             map           map          map
                │            │            │
                └────────────┼────────────┘
                             │
                          SIGNAL
                             │
                             ▼
                    CAPABILITY ROUTING
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
         CORE-01          CORE-05          CORE-09
            │                │                │
            └────────────────┼────────────────┘
                             │
                       PROCESSING EVENT
                             │
                             ▼
                       DERIVED SIGNAL
                             │
                             ▼
                           FABRIC
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
                 CONTINUE          ESCALATE
                    │                 │
                    ▼                 ▼
                 REMOTE              CORE
                    │                 │
                    └────────┬────────┘
                             ▼
                       RELATIONSHIPS
                             │
                             ▼
                          PATHWAYS
                             │
                             ▼
                    FORMATION CANDIDATE
                             │
                             ▼
                     ADMISSION GOVERNANCE
                             │
                             ▼
                         FORMATION

And underneath all of it:

             ┌───────────────────────────┐
             │       EVENT HISTORY       │
             │                           │
             │ Signal                    │
             │ Observation               │
             │ Routing                   │
             │ Processing                │
             │ Relationship              │
             │ Pathway                   │
             │ Exploration               │
             │ Formation                 │
             └───────────────────────────┘

That last box is critical.

The Cognitive Fabric does not merely process relationships. It captures the pathways through which relationships become formations.

13. The Actual Scalability Proposition

Now we can answer the original question precisely.

It is not:

"KRYLO has distributed processors."

It is:

KRYLO separates cognitive capability from cognitive reach.

The nine Core Processors represent a bounded set of specialized capabilities.

The Remote Processors represent extensible reach.

The Fabric connects them.

Therefore:

                 COGNITIVE CAPABILITY
                         │
                    9 CORE TYPES
                         │
                         │
                         ▼
                    COGNITIVE FABRIC
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
         N=10           N=100         N=1000
        REMOTE          REMOTE         REMOTE

The architecture can therefore scale reach without proportionally scaling cognition.

And because each remote extension can independently explore:

breadth
depth
parallelism

the architecture has three independent dimensions of expansion.

That is the architectural reason the word scalable is justified.

14. One More Important Consequence

There is a deeper result that falls out of these requirements.

The Remote Processor isn't merely a cheap worker.

It is the physical manifestation of KRYLO's ability to extend its observational boundary.

The Core Processor is:

what KRYLO knows how to process.

The Remote Processor is:

where KRYLO can look.

The Fabric is:

what allows those two things to remain connected.

The Pathway is:

the record of what happened between looking and knowing.

The Formation is:

the structural result produced from those relationships.

So the architecture becomes:

LOOK
 ↓
MAP
 ↓
CONNECT
 ↓
PROCESS
 ↓
TRAVERSE
 ↓
RECOGNIZE
 ↓
FORM

That is a coherent requirements architecture, not just an analogy.

The next step should no longer be another conceptual CF document. It should be converting CF-001 through CF-010 into implementation tickets with acceptance criteria and explicit dependencies, while preserving the existing KRYLO ticket/spec discipline.