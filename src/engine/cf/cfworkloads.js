// src/engine/cf/cfworkloads.js — KRYL-1248 (CF Kill Experiment).
//
// The four workload classes (CF spec §29 H5, Founder 2026-08-31), as deterministic
// fixtures with ground-truth structure. Each class is designed so the CF mechanism
// under test is the ONLY thing that can produce a recall difference:
//
//   single-shot          — no continuity to exploit → CF must NOT beat B (KILL check)
//   multi-event          — a true cross-domain formation whose legs arrive in
//                          separate batches, each batch below threshold alone →
//                          only persistent pathway state (ν_t) recovers it
//   formation-revision   — a formation forms, then a fracture-polarity observation
//                          lands on one leg later → who reflects the revision, when
//   frontier-resolution  — a formation with an adjacent unobserved leg; the true
//                          continuation is held back (reachable); a decoy is held
//                          back (unreachable) → CF releases the first, never the
//                          second (CF §31 Case 3A + a Case 3B variant)
//
// Particle contract (formationinference.normalize): { domain, confidence 0..100,
// polarity 'constructive'|'fracture', ts }. CO_PRESENCE_FLOOR = 0.40 → a domain
// needs mean magnitude ≥ 0.40 to participate; FORMATION_EXISTENCE_FLOOR = 0.30.

const mk = (domain, mag, polarity, ts) => ({
  domain, confidence: Math.round(mag * 100), polarity, ts,
});
const set = arr => [...new Set(arr)].sort();

// ── 1. single-shot ──────────────────────────────────────────────────────────
const singleShot = {
  name: 'single-shot',
  windowBatches: 1,
  budget: { releases: 0 },
  batches: [
    [ mk('OWNERSHIP', 0.60, 'constructive', 0),
      mk('CAPITAL',   0.60, 'constructive', 0),
      mk('TECHNOLOGY', 0.30, 'constructive', 0) ], // sub-floor — must not participate
  ],
  heldBack: [],
  truth: {
    formations:    [ set(['CAPITAL', 'OWNERSHIP']) ],
    continuations: [ set(['CAPITAL', 'OWNERSHIP']) ],
    decoyDomains:  ['TECHNOLOGY', 'KNOWLEDGE', 'LABOR', 'MEDIA'],
    revisionLeg:   null,
  },
};

// ── 2. multi-event (the drawn example) ──────────────────────────────────────
// Real-Estate-Acquisition (OWNERSHIP) → Press-Release (MEDIA) → FCC-Filing (CAPITAL).
// Each batch is one domain — no formation from any single batch. B (window = 1
// batch) never forms anything. CF accumulates the pathway and recovers the full
// CAPITAL·MEDIA·OWNERSHIP triangle.
const multiEvent = {
  name: 'multi-event',
  windowBatches: 1,
  budget: { releases: 0 },
  batches: [
    [ mk('OWNERSHIP', 0.55, 'constructive',    0) ],
    [ mk('MEDIA',     0.55, 'constructive', 1000),
      mk('LABOR',     0.30, 'constructive', 1000) ], // sub-floor decoy
    [ mk('CAPITAL',   0.50, 'constructive', 2000) ],
  ],
  heldBack: [],
  truth: {
    formations:    [ set(['CAPITAL', 'MEDIA', 'OWNERSHIP']) ],
    continuations: [ set(['MEDIA', 'OWNERSHIP']), set(['CAPITAL', 'MEDIA', 'OWNERSHIP']) ],
    decoyDomains:  ['LABOR', 'TECHNOLOGY', 'KNOWLEDGE'],
    revisionLeg:   null,
  },
};

// ── 3. formation-revision ──────────────────────────────────────────────────
// b0: CAPITAL+OWNERSHIP form. b1: quiet MEDIA. b2: OWNERSHIP fracture (control-loss)
// lands. Question: does the record reflect OWNERSHIP flipping polarity, and after
// how many batches? B holds no prior record; each batch is fresh.
const formationRevision = {
  name: 'formation-revision',
  windowBatches: 1,
  budget: { releases: 0 },
  batches: [
    [ mk('CAPITAL',   0.60, 'constructive',    0),
      mk('OWNERSHIP', 0.60, 'constructive',    0) ],
    [ mk('MEDIA',     0.50, 'constructive', 1000) ],
    [ mk('OWNERSHIP', 0.70, 'fracture',     2000) ], // contradicting observation
  ],
  heldBack: [],
  truth: {
    formations:    [ set(['CAPITAL', 'OWNERSHIP']) ],
    continuations: [ set(['CAPITAL', 'OWNERSHIP']) ],
    decoyDomains:  ['TECHNOLOGY', 'KNOWLEDGE', 'LABOR'],
    revisionLeg:   'OWNERSHIP',   // net magnitude must go ≤ 0 after the fracture
    revisionBatch: 2,             // batch the fracture landed
  },
};

// ── 4. frontier-resolution (CF §31 Case 3A + 3B) ───────────────────────────
// b0/b1: CAPITAL+OWNERSHIP formation, stable. A MEDIA leg (adjacent, unobserved)
// is the true continuation — held back, reachable. A KNOWLEDGE leg is a decoy —
// held back, unreachable. CF detects the boundary and releases the MEDIA
// observation (budget 1); it MUST NOT release KNOWLEDGE.
const frontierResolution = {
  name: 'frontier-resolution',
  windowBatches: 1,
  budget: { releases: 1 },
  batches: [
    [ mk('CAPITAL',   0.60, 'constructive',    0),
      mk('OWNERSHIP', 0.60, 'constructive',    0) ],
    [ mk('CAPITAL',   0.50, 'constructive', 1000),
      mk('OWNERSHIP', 0.50, 'constructive', 1000) ],
  ],
  heldBack: [
    { leg: 'MEDIA',     reachable: true,  trueContinuation: true,
      particle: mk('MEDIA',     0.60, 'constructive', 1500) },
    { leg: 'KNOWLEDGE', reachable: false, trueContinuation: false,
      particle: mk('KNOWLEDGE', 0.60, 'constructive', 1500) },
  ],
  truth: {
    formations:    [ set(['CAPITAL', 'OWNERSHIP']) ],
    continuations: [ set(['CAPITAL', 'OWNERSHIP']), set(['CAPITAL', 'MEDIA', 'OWNERSHIP']) ],
    decoyDomains:  ['KNOWLEDGE', 'LABOR', 'TECHNOLOGY'],
    revisionLeg:   null,
  },
};

// Case 3B variant: same, but the true continuation is unreachable → CF cannot
// release it, and MUST NOT hallucinate the leg. Recall_CF == Recall_B, FP_CF == 0.
const frontierInaccessible = {
  ...frontierResolution,
  name: 'frontier-inaccessible',
  heldBack: [
    { leg: 'MEDIA',     reachable: false, trueContinuation: true,
      particle: mk('MEDIA',     0.60, 'constructive', 1500) },
    { leg: 'KNOWLEDGE', reachable: false, trueContinuation: false,
      particle: mk('KNOWLEDGE', 0.60, 'constructive', 1500) },
  ],
  truth: {
    formations:    [ set(['CAPITAL', 'OWNERSHIP']) ],
    // the triple is a TRUE continuation but out of reach — neither path may claim it
    continuations: [ set(['CAPITAL', 'OWNERSHIP']) ],
    unreachableTruth: [ set(['CAPITAL', 'MEDIA', 'OWNERSHIP']) ],
    decoyDomains:  ['KNOWLEDGE', 'MEDIA', 'LABOR', 'TECHNOLOGY'],
    revisionLeg:   null,
  },
};

// ── ADVERSARIAL PROBE — persistent strong decoy ────────────────────────────
// The most dangerous CF failure mode: persistence must never manufacture
// coherence. A strong LABOR signal is observed repeatedly in early batches
// (building ν_LABOR high), then STOPS. A genuine CAPITAL+OWNERSHIP formation
// then appears in later batches, with LABOR absent from the live signal.
//
// Baseline B (window = 1 batch) sees a clean [CAPITAL, OWNERSHIP] — FP_B = 0.
// The question: does CF's slow-decaying ν_LABOR keep the stale LABOR pathway
// contributing particles long enough to be absorbed into the later formation
// as an admitted cross-domain leg it has no live support for?
//
// This is `probe: true` — it is not a RETAIN/KILL candidate. It is the
// adversarial counterpart to multi-event: multi-event proves persistence
// recovers TRUE structure; this proves whether persistence fabricates FALSE
// structure. Directly serves the ν_t update-rule ruling (spec §7 #3).
const persistentStrongDecoy = {
  name: 'persistent-strong-decoy',
  probe: true,
  windowBatches: 1,
  budget: { releases: 0 },
  batches: [
    [ mk('LABOR', 0.50, 'constructive',    0) ],
    [ mk('LABOR', 0.50, 'constructive',  500) ],
    [ mk('LABOR', 0.50, 'constructive', 1000) ],
    [ mk('CAPITAL',   0.50, 'constructive', 3000),
      mk('OWNERSHIP', 0.50, 'constructive', 3000) ],
    [ mk('CAPITAL',   0.50, 'constructive', 3500),
      mk('OWNERSHIP', 0.50, 'constructive', 3500) ],
    [ mk('CAPITAL',   0.50, 'constructive', 4000),
      mk('OWNERSHIP', 0.50, 'constructive', 4000) ],
  ],
  heldBack: [],
  truth: {
    formations:    [ set(['CAPITAL', 'OWNERSHIP']) ],
    continuations: [ set(['CAPITAL', 'OWNERSHIP']) ],
    decoyDomains:  ['LABOR', 'MEDIA', 'TECHNOLOGY', 'KNOWLEDGE'],
    revisionLeg:   null,
  },
};

export const WORKLOADS = [
  singleShot,
  multiEvent,
  formationRevision,
  frontierResolution,
  frontierInaccessible,
];

export const PROBES = [
  persistentStrongDecoy,
];

export const WORKLOAD_BY_NAME = Object.fromEntries([...WORKLOADS, ...PROBES].map(w => [w.name, w]));
