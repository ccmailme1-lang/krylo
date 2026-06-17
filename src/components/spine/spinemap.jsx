// WO-633 | PhillyMassingBase Hook Order Fix | 2026-03-31
// src/components/spine/signalmap.jsx
// WO-248 — InstancedMesh, Friction Matrix shaders, GPU disposal
// WO-232 — Tracking Listener: camera intelligence, edge intelligence, contamination field
// WO-233 — Friction Record: surface fracture, crystallization, heat dissipation
// WO-250 — Friction Gate + Perceptual Field
//           KRYL-243: ALERT state
//           KRYL-274: 0.844 hardened threshold + confirmation ring
//           KRYL-275: 719ms slam animation
//           KRYL-277: Ghost Photo snapshot
// WO-252 — Kinetic Environment
//           KRYL-310: GLSL noise background plane, 4.4 Hz pulse
//           KRYL-235: PulseEdge — varying distance, uFidelity luminous leak
//           KRYL-311: logarithmic Fs scale differential
// WO-253 — Signal Map Expansion
//           KRYL-312: Click to lock node — pin card while orbiting
//           KRYL-313: Multi-node selection — corroboration score + instanced billboard bridges
//           KRYL-314: Search/filter — keyword highlight

import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { THRESHOLDS } from './constants.js';
import { evaluateThresholds, THRESHOLD_COLORS } from '../../engine/thresholdevaluator.js';
import { fetchHeadlines, ingestHeadlines } from '../../engine/newsfeed.js';
import { fetchHNTop } from '../../hooks/usehnsignals.js';
import { isInsideUS, boundaryReady } from '../../engine/usboundary.js';
import { FEATURES } from '../../config/features.js';
import { tickPulseState, PULSE_STATES }        from '../../engine/pulseStateMachine.js';
import { isUnderScrutiny, applyScrutinyBrake } from '../../engine/propagationController.js';
import { IntegrityBadge }        from '../integritybadge.jsx';
import { IntegrityScorecard }    from '../integrityscorecard.jsx';
import Layer3USMesh    from './usmesh.jsx';
import SignalField      from '../signalfield.jsx';
import ClusterField    from './clusterfield.jsx';
import LeverageEngine  from './leverageengine.jsx';
import { pruneSubstrate } from '../../utils/prunesubstrate.js';
import { auditMeshParity, formatAuditReport } from '../../ontology/TelemetryAudit.js';
import { scanForZombies, formatGhostReport }  from '../../ontology/GhostDetector.js';
import { KernelProfiler }                      from '../../ontology/KernelProfiler.js';
import { computeAdmittedSet, rejectFromCore }  from '../../ontology/SovereignGate.js';
import { ScenarioInjector }                    from '../../ontology/ScenarioInjector.js';
import { useOracle }                           from '../../hooks/useOracle.js';
import { mockETRs }                            from '../../data/mockETRs.js';
import { classifyConvergenceState }            from '../../engine/convergenceclassifier.js';
import { useLatticeTransition }               from '../../hooks/uslattice_transition.js';
import { computeVisualFrame }                 from '../../engine/visualtransfer.js';

// KRYL-277: forensic log — importable by Audit Workspace for export
export const ghostPhotosLog = { current: [] };

const MAX_NODES   = 512;
const FIELD_COUNT = 40;
const BOUNDS      = 8;
// WO-892: Zone scale — ground zero (Y=0), each zone owns 2 units, no overlap
const ZONE_BOUNDS = {
  local:    { floor: 0, target: 1, ceiling: 2 },
  regional: { floor: 2, target: 3, ceiling: 4 },
  national: { floor: -10, target: -10, ceiling: -10 }, // disabled
};
const ALERT_FS    = 0.25;
const CRYSTAL_FS  = 0.844;
const SLAM_MS     = 719;

// WO-1044: Hardware LOD — concurrency-aware segment scaling
const HIGH_CORE = typeof window !== 'undefined' && (window.navigator?.hardwareConcurrency ?? 4) > 4;
const RING_MS     = 2000;
const HZ44        = 27.6460;
const W_BASE          = 0.15;
const MAX_NODE_SCALE  = 0.56;   // WO-628: locked max — never exceed this

// WO-604: Leaderboard identity colors — ranked 1–6 by fs
const IDENTITY_COLORS = ['#FF4500', '#FF8C00', '#8800CC', '#00FF00', '#FF00CC', '#00FFCC'];

function hexToRgb01(hex) {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

const COLOR_MAP = {
  low:      0x66FF00,
  neutral:  0x66FF00,
  high:     0x66FF00,
  critical: 0x66FF00,
};

// WO-1127 — convergence color per node (no hysteresis — per-signal classification)
const CONVERGENCE_HEX = {
  void_gray:      0x1a1a1a,
  muted_slate:    0x3a3d4a,
  signal_lime:    0x66FF00,
  signal_blue:    0x007FFF,
  unicorn_purple: 0x8A2BE2,
};

function getConvergenceColor(signal) {
  const fc = signal?.fidelity ?? {};
  const D  = Math.min(1, Math.max(0, fc.m_checksum  ?? 0));
  const V  = Math.min(1, Math.max(0, fc.t_telemetry ?? 0));
  const A  = Math.min(1, Math.max(0, fc.e_viral     ?? 0));
  const T  = Math.min(1, (V + A) / 2);
  const confidence = (D + V + A) / 3;
  const { theme } = classifyConvergenceState({ D, V, A, T }, confidence);
  return CONVERGENCE_HEX[theme] ?? 0x66FF00;
}

const SHARED_GEOM = {
  low:      new THREE.SphereGeometry(2, HIGH_CORE ? 32 : 16, HIGH_CORE ? 32 : 16),
  neutral:  new THREE.BoxGeometry(3, 3, 3),
  high:     new THREE.OctahedronGeometry(2),
  critical: new THREE.TetrahedronGeometry(2),
};
const SHARED_WIRE = new THREE.WireframeGeometry(SHARED_GEOM.critical);

// ── WO-817: Origin State Extraction ───────────────────────────────
const US_STATE_NAMES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
  'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming',
];

const CITY_TO_STATE = {
  'Chicago':       'Illinois',
  'Los Angeles':   'California',
  'Houston':       'Texas',
  'Phoenix':       'Arizona',
  'Philadelphia':  'Pennsylvania',
  'San Antonio':   'Texas',
  'Dallas':        'Texas',
  'San Francisco': 'California',
  'Miami':         'Florida',
  'Atlanta':       'Georgia',
  'Seattle':       'Washington',
  'Denver':        'Colorado',
  'Boston':        'Massachusetts',
  'Detroit':       'Michigan',
  'Nashville':     'Tennessee',
  'Austin':        'Texas',
  'Jacksonville':  'Florida',
  'Columbus':      'Ohio',
  'Indianapolis':  'Indiana',
  'Charlotte':     'North Carolina',
  'Minneapolis':   'Minnesota',
  'Portland':      'Oregon',
  'Las Vegas':     'Nevada',
  'Louisville':    'Kentucky',
  'Pittsburgh':    'Pennsylvania',
  'Tampa':         'Florida',
};

function extractOriginState(text) {
  if (!text) return null;
  for (const [city, state] of Object.entries(CITY_TO_STATE)) {
    if (text.includes(city)) return state;
  }
  for (const state of US_STATE_NAMES) {
    if (text.includes(state)) return state;
  }
  return null;
}

// ── SPEC-VIS-001 v1.1 — Signal adapter (requires Founder calibration) ────────
// Maps existing signal schema → transfer function input contract.
// All coefficients are named constants — tune here, not in the transfer function.
const Z_SCALE       = 40;   // LRF output [-1,1] → world Z units
const LRF_RANGE     = 20;   // maps confidence [0,1] → LRF [-10,10]
const ZONE_COHESION = { local: 0.8, regional: 0.4, national: 0.1 };


function signalToTransferInputs(signal, now, age) {
  const conf       = Math.min(1, Math.max(0, signal.confidence ?? 0));
  const ageMs      = Math.max(0, now - (signal.timestamp ?? now));
  const zone       = signal.zone ?? 'national';
  return {
    lrf:                 (conf - 0.5) * LRF_RANGE,
    capital:             Math.max(1, (signal.boosts ?? 0) + 1),
    volatility:          Math.max(0, 1 - age),
    causalStrength:      conf,
    propagationVelocity: signal.geoWeight ?? 0.5,
    eventIngestionAgeMs: ageMs,
    clusterCohesion:     ZONE_COHESION[zone] ?? 0.1,
  };
}

// ── SignalNode ─────────────────────────────────────────────────────
function SignalNode({ signal }) {
  const { x, y, z } = useMemo(() => {
    const now    = Date.now();
    const age    = Math.min(1, Math.max(0, (now - (signal.timestamp ?? now)) / 86400000));
    const conf   = Math.min(1, Math.max(0, signal.confidence ?? 0));
    const theta  = (signal.value ?? 0) * Math.PI * 2;
    // WO-514 — Social Rank Multiplier
    const geoWeight       = signal.geoWeight ?? 1.0;
    const socialMultiplier = Math.min((signal.boosts || 0) * 0.1 * geoWeight, 3.0);
    const rank            = 1.0 + socialMultiplier;
    const radius          = (1 - conf) * 40 * rank;
    // SPEC-VIS-001 v1.1 §6.2 — Z exclusively encodes LRF via transfer function
    const vf = computeVisualFrame(signalToTransferInputs(signal, now, age));
    return { x: radius * Math.cos(theta), y: age * 60, z: vf.z * Z_SCALE };
  }, [signal.id, signal.timestamp, signal.confidence, signal.value, signal.boosts, signal.geoWeight]);

  const geom       = SHARED_GEOM[signal.state] ?? SHARED_GEOM.low;
  const isCritical = signal.state === 'critical';
  const color      = getConvergenceColor(signal);

  return (
    <group position={[x, y, z]}>
      <mesh geometry={geom}>
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </mesh>
      {isCritical && (
        <lineSegments geometry={SHARED_WIRE}>
          <lineBasicMaterial color={0x808080} transparent opacity={0} />
        </lineSegments>
      )}
    </group>
  );
}

// ── WO-260: Resonance Wave Shaders ───────────────────────────────────────────
const WAVE_VERT = /* glsl */`
  uniform float uTime;
  uniform float uAmplitude;
  varying vec2  vUv;
  void main() {
    vUv     = uv;
    vec3 p  = position;
    p.y    += uAmplitude
            * sin(p.x * 0.8 + uTime * 27.6460)
            * cos(p.z * 0.8 + uTime * 27.6460 * 0.7);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const WAVE_FRAG = /* glsl */`
  uniform float uTime;
  varying vec2  vUv;
  void main() {
    float pulse = 0.5 + 0.5 * sin(uTime * 27.6460);
    float ex    = 1.0 - abs(vUv.x - 0.5) * 2.0;
    float ey    = 1.0 - abs(vUv.y - 0.5) * 2.0;
    float alpha = ex * ey * pulse * 0.10;
    gl_FragColor = vec4(0.0, 0.55, 1.0, alpha);
  }
`;

// ── KRYL-310: Background Noise Shaders ───────────────────────────────────────
const BGVERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv         = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

const BGFRAG = /* glsl */`
  uniform float uTime;
  varying vec2 vUv;

  float hash21(vec2 p) {
    p  = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 18.5453);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise(p);
      p  = p * 2.0 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2  uv    = vUv * 6.0 + vec2(uTime * 0.03, uTime * 0.015);
    float n     = fbm(uv);
    float pulse = 0.5 + 0.5 * sin(uTime * 27.6460);
    float glow  = n * n * pulse * 0.10;
    vec3  field = vec3(0.0, 0.028, 0.08);
    vec3  color = mix(vec3(0.0), field, glow);
    gl_FragColor = vec4(color, 0.96);
  }
`;

// ── Friction Matrix Shaders v3 (WO-250) ──────────────────────────────────────
const VERT = /* glsl */`
  uniform float uTime;
  uniform float uAlertMode;

  attribute float aFidelity;
  attribute float aStress;
  attribute float aPhase;
  attribute float aScale;
  attribute float aIsStub;
  attribute vec3  aIdentityColor;
  attribute vec3  aDebugColor;
  attribute float aRadiusNorm;
  attribute float aSovereign;
  attribute float aSearchMatch;
  attribute float aShattered;

  varying float vFidelity;
  varying float vStress;
  varying vec3  vNormal;
  varying vec3  vViewPosition;
  varying float vIsStub;
  varying vec3  vIdentityColor;
  varying vec3  vDebugColor;
  varying float vRadiusNorm;
  varying float vSovereign;
  varying float vSearchMatch;
  varying float vShattered;

  void main() {
    vFidelity      = aFidelity;
    vStress        = aStress;
    vNormal        = normalize(normalMatrix * normal);
    vIsStub        = aIsStub;
    vIdentityColor = aIdentityColor;
    vDebugColor    = aDebugColor;
    vRadiusNorm    = aRadiusNorm;
    vSovereign     = aSovereign;
    vSearchMatch   = aSearchMatch;
    vShattered     = aShattered;

    float isLocked = step(0.844, aFidelity);
    float cohesion = (1.0 - aFidelity) * (1.0 - isLocked);

    float noise = sin(position.x * 6.0 + uTime + aPhase)
                * cos(position.y * 6.0 + uTime)
                * sin(position.z * 6.0 + uTime - aPhase);

    float viral    = aStress * sin(uTime * (2.0 + aStress * 12.0));
    float fracture = aStress * sin(uTime * (3.0 + aStress * 18.0)) * cohesion * 0.25;
    float crystal  = aFidelity * 0.04 * sin(uTime * 0.8 + aPhase) * (1.0 - isLocked);
    float isContam   = 1.0 - step(0.25, aFidelity);
    float alertPulse = uAlertMode * isContam * sin(uTime * 7.0 + aPhase) * 0.15;

    vec3 displaced = position;

    vec4 world    = instanceMatrix * vec4(displaced * aScale, 1.0);
    vec4 mvPos    = modelViewMatrix * world;
    vViewPosition = -mvPos.xyz;
    gl_Position   = projectionMatrix * mvPos;
  }
`;

const FRAG = /* glsl */`
  uniform float uTime;
  uniform float uAlertMode;
  uniform float uDebugMode;

  varying float vFidelity;
  varying float vStress;
  varying vec3  vNormal;
  varying vec3  vViewPosition;
  varying float vIsStub;
  varying vec3  vIdentityColor;
  varying vec3  vDebugColor;
  varying float vRadiusNorm;
  varying float vSovereign;
  varying float vSearchMatch;
  varying float vShattered;

  void main() {
    // Zone color is the law — vIdentityColor carries the zone color for every node
    float hasZoneColor = step(0.001, dot(vIdentityColor, vec3(1.0)));
    vec3  color = vIdentityColor;
    float alpha = 0.85 * hasZoneColor;

    // Stub blink
    float stubBlink = 0.2 + 0.7 * (0.5 + 0.5 * sin(uTime * 9.42));
    alpha = mix(alpha, stubBlink, vIsStub);

    // Sovereign: lime bloom pulse — peak signal in national zone
    vec3  sovereignC     = vec3(0.400, 1.000, 0.000);  // #66FF00
    float sovereignPulse = 0.7 + 0.3 * sin(uTime * 4.0);
    vec3  sovereignBloom = sovereignC * (1.0 + sovereignPulse * 0.6);
    color = mix(color, sovereignBloom, vSovereign);
    alpha = mix(alpha, 1.0, vSovereign * 0.15);

    // Shatter / expiring: flashing red
    vec3  shatterRed = vec3(0.400, 1.000, 0.000);  // #66FF00
    color = mix(color, shatterRed, vShattered);

    // Debug overlay
    float hasDebug = step(0.001, dot(vDebugColor, vec3(1.0)));
    color = mix(color, vDebugColor, uDebugMode * hasDebug);

    gl_FragColor = vec4(color, alpha);
  }
`;

// ── KRYL-235: Edge Pulse Shaders ─────────────────────────────────────────────
const EDGE_VERT = /* glsl */`
  attribute float aProgress;
  varying float   vProgress;
  void main() {
    vProgress   = aProgress;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const EDGE_FRAG = /* glsl */`
  uniform float uTime;
  uniform float uFidelity;
  uniform float uAlertMode;
  uniform float uBright;
  varying float vProgress;

  void main() {
    vec3 signalBlue = vec3(0.502, 0.502, 0.502);
    vec3 amber      = vec3(0.0,   0.498, 1.0);

    float dist = abs(vProgress - 0.5) * 2.0;
    float fade = 1.0 - dist * dist;
    float baseOpacity = 0.08 + uFidelity * 0.35;
    float isLow = 1.0 - step(0.40, uFidelity);
    float leak  = isLow * max(0.0, sin(uTime * 27.6460 + vProgress * 3.14159)) * 0.20;

    vec3 color = mix(amber, signalBlue, clamp(uFidelity / 0.70, 0.0, 1.0));
    color = mix(color, amber, uAlertMode);

    float alpha = fade * baseOpacity + leak + uBright * 0.55;
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.85));
  }
`;

// ── KRYL-313: Corroboration Bridge Shaders ───────────────────────────────────
const BRIDGE_VERT = /* glsl */`
  attribute float aFidelity;
  varying float   vFidelity;
  varying vec2    vUv2;

  void main() {
    float Fs  = clamp(aFidelity, 0.05, 1.0);
    vFidelity = Fs;
    vUv2      = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BRIDGE_FRAG = /* glsl */`
  uniform float uTime;
  varying float vFidelity;
  varying vec2  vUv2;

  void main() {
    vec3 signalBlue = vec3(0.502, 0.502, 0.502);
    vec3 amber      = vec3(0.0,  0.498, 1.0);
    vec3 color      = mix(amber, signalBlue, clamp(vFidelity / 0.70, 0.0, 1.0));

    // fade at edges along bridge length
    float edgeFade = smoothstep(0.0, 0.12, vUv2.x) * smoothstep(1.0, 0.88, vUv2.x);
    // pulse at 4.4 Hz
    float pulse    = 0.5 + 0.5 * sin(uTime * 27.6460 + vUv2.x * 6.2832);
    float alpha    = edgeFade * (0.18 + pulse * 0.22) * vFidelity;

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.9));
  }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function clamp01(x) {
  const n = Number.isFinite(x) ? x : 0;
  return Math.min(1, Math.max(0, n));
}

function lcg(seed) {
  let s = (seed + 1337) >>> 0;
  s = (Math.imul(1664525, s) + 1013904223) >>> 0;
  return (s & 0xffffff) / 0x1000000;
}

// ── WO-0290-B: Centrifugal Truth Engine — Constants & Kernel ─────────────────
const R_MIN          = 0.20;
const R_MAX          = 0.78;
const SHATTER_LIMIT  = 0.80;
const SOVEREIGN_LIMIT= 0.80;
const CORE_TARGET    = 0.05;
const KERNEL_DT      = 0.016;
const KERNEL_K       = 12.0;
const KERNEL_DAMP    = 0.85;
const SHATTER_J      = 15.0;
const SHATTER_MS     = 500;
// WO-802: Temporal Decay — TTL purge constants
const TTL_MS            = 300_000;  // 300s stale threshold before decay begins
const DECAY_DURATION_MS =   5_000;  // 5s linear scale-to-zero fade after TTL expires

// WO-805: Sovereign Kernel v2 — simTime-gated constants
const SOVEREIGN_HOLD  = 0.5;   // simTime seconds above limit before L1_APPROACH locks
const ANCHOR_DWELL    = 1.0;   // simTime seconds minimum hold in L1_ANCHORED before exit
const SHATTER_J_BASE  = 12.0;  // minimum ejection impulse
const SHATTER_J_MAX   = 25.0;  // maximum ejection impulse (long sovereign hold)
const SHATTER_J_SCALE = 10.0;  // hold seconds → extra impulse

const round4 = (n) => Math.round(n * 10000) / 10000;

function geoCloseness(rGeo) {
  return clamp01(1.0 - ((rGeo - R_MIN) / (R_MAX - R_MIN)));
}

// NODE_STATE values
const NS = { NORMAL: 0, L1_APPROACH: 1, L1_ANCHORED: 2, SHATTERED: 3 };

function resolveState(node, combined) {
  if (node.isShattered) return NS.SHATTERED;
  if (combined > SOVEREIGN_LIMIT) {
    return node.r < 0.10 ? NS.L1_ANCHORED : NS.L1_APPROACH;
  }
  return NS.NORMAL;
}

// WO-805: simTime-gated state resolver with hysteresis + anchor dwell
function resolveStateV2(node, sovereignHeld, simTime) {
  if (node.isShattered) return NS.SHATTERED;

  if (sovereignHeld) {
    if (node.r < 0.10) {
      if (node.anchorEntryTime == null) node.anchorEntryTime = simTime;
      return NS.L1_ANCHORED;
    }
    node.anchorEntryTime = null;
    return NS.L1_APPROACH;
  }

  // Sovereign dropped — enforce anchor dwell before NORMAL exit
  if (node.anchorEntryTime != null) {
    if ((simTime - node.anchorEntryTime) < ANCHOR_DWELL) return NS.L1_ANCHORED;
    node.anchorEntryTime = null;
  }

  return NS.NORMAL;
}

// WO-805: ejection impulse scales with sovereign hold duration
function executeEjectionImpulseV2(node, simTime) {
  const holdDuration = node.sovereignEntryTime != null
    ? simTime - node.sovereignEntryTime : 0;
  const impulse = Math.min(SHATTER_J_MAX, SHATTER_J_BASE + holdDuration * SHATTER_J_SCALE);
  node.vr         += impulse;
  node.shatterTime = simTime;
}

function applyRadialSpringForces(node, rTarget, vMax) {
  const force = KERNEL_K * (rTarget - node.r);
  node.vr = (node.vr + force * KERNEL_DT) * KERNEL_DAMP;
  node.vr = Math.max(-vMax, Math.min(vMax, node.vr));
  node.r  = Math.max(0, Math.min(1, node.r + node.vr * KERNEL_DT));
}

function executeEjectionImpulse(node, simTime) {
  node.vr         += SHATTER_J;
  node.shatterTime = simTime;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function sentimentLabel(fs) {
  if (fs > 0.66) return 'High';
  if (fs >= 0.33) return 'Mid';
  return 'Low';
}

function velocityLabel(eViral) {
  if (eViral >= 0.80) return 'Surging';
  if (eViral >= 0.60) return 'Rising';
  if (eViral >= 0.40) return 'Stable';
  if (eViral >= 0.20) return 'Cooling';
  return 'Dormant';
}

function contaminationLabel(eViral) {
  if (eViral >= 0.80) return 'Critical';
  if (eViral >= 0.60) return 'High';
  if (eViral >= 0.40) return 'Moderate';
  if (eViral >= 0.20) return 'Low';
  return 'Clean';
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function frictionVelocityLabel(vel) {
  if (vel >  0.001) return '↑ Rising';
  if (vel < -0.001) return '↓ Cooling';
  return '— Stable';
}

function signalStrengthLabel(s) {
  if (s >= 0.6)  return 'Strong';
  if (s >= 0.35) return 'Moderate';
  return 'Weak';
}

// ── Node Preview (hover — lightweight) ───────────────────────────────────────
function NodePreview({ node, text }) {
  const label    = text ? (text.length > 72 ? text.slice(0, 72) + '…' : text) : node.id;
  const scoreBar = Math.round((node.fs ?? 0) * 100);
  const scoreColor = node.fs >= 0.7 ? '#66FF00' : node.fs >= 0.4 ? '#F5A623' : '#ff6b6b';
  return (
    <Html position={[0, node.scale + 0.5, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
      <div style={{
        fontFamily:   'IBM Plex Mono, monospace',
        background:   'rgba(5,7,10,0.92)',
        borderRadius: '6px',
        padding:      '8px 12px',
        border:       '1px solid rgba(102,255,0,0.2)',
        maxWidth:     '260px',
        display:      'flex',
        flexDirection:'column',
        gap:          '5px',
      }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.92)', lineHeight: '1.4', letterSpacing: '0.02em' }}>
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px' }}>
            <div style={{ width: `${scoreBar}%`, height: '100%', background: scoreColor, borderRadius: '1px' }} />
          </div>
          <span style={{ fontSize: '9px', color: scoreColor, letterSpacing: '0.1em' }}>{scoreBar}</span>
        </div>
      </div>
    </Html>
  );
}

// ── Hover Card (click-lock — full) ────────────────────────────────────────────
const ZONE_COLORS = { local: '#5599FF', regional: '#FFFFFF', national: '#66FF00' };

function HoverCard({ node, signal, locked, velocity, strength, velocityTimerState, text, onClose, onOpenScorecard }) {
  const accent    = locked ? '#FFD700' : '#0096ff';
  const contColor = node.eViral >= 0.6 ? '#F5A623' : node.eViral >= 0.4 ? '#aaa' : '#00b894';
  const zone      = signal?.geoTier ?? 'unknown';
  const zoneColor = ZONE_COLORS[zone] ?? 'rgba(232,244,255,0.5)';
  const velVal    = velocity ?? 0;
  const strVal    = strength ?? 0;
  const velLabel  = frictionVelocityLabel(velVal);
  const strLabel  = signalStrengthLabel(strVal);

  // Threshold-driven colors
  const bands  = evaluateThresholds({
    velocity:            velVal,
    velocityNegDuration: velocityTimerState === 'amber' || velocityTimerState === 'red' ? 999 : 0,
    signal:              strLabel,
  });
  const velColor = THRESHOLD_COLORS[velocityTimerState === 'red' ? 'red' : bands.velocity ?? 'green'];
  const strColor = THRESHOLD_COLORS[bands.signal ?? 'green'];
  return (
    <div style={{
      fontFamily:    'IBM Plex Mono, monospace',
      fontSize:      '13px',
      background:    'rgba(5,7,10,0.95)',
      borderRadius:  '10px',
      padding:       '18px 22px',
      width:         '300px',
      border:        `1px solid ${accent}33`,
      color:         'rgba(232,244,255,0.9)',
      boxShadow:     `0 8px 48px rgba(0,0,0,0.6)${locked ? ', 0 0 20px rgba(255,215,0,0.2)' : ''}`,
      letterSpacing: '0.05em',
      pointerEvents: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontWeight: 'bold', color: accent, fontSize: '14px' }}>{node.id}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: 'rgba(232,244,255,0.4)', fontSize: '11px' }}>
            Fs {node.fs.toFixed(2)}{locked ? ' 📌' : ''}
          </span>
          {onClose && (
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(232,244,255,0.4)', fontSize: '14px', lineHeight: 1,
              padding: '0', letterSpacing: 0,
            }}>✕</button>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
        <span style={{ opacity: 0.5, fontSize: '11px' }}>signal score</span>
        <span style={{ fontSize: '11px', color: node.fs >= 0.7 ? '#66FF00' : accent }}>{sentimentLabel(node.fs)}</span>
        <span style={{ opacity: 0.5, fontSize: '11px' }}>velocity</span>
        <span style={{ fontSize: '11px', color: velColor }}>{velLabel}</span>
        <span style={{ opacity: 0.5, fontSize: '11px' }}>contamination</span>
        <span style={{ fontSize: '11px', color: contColor }}>{contaminationLabel(node.eViral)}</span>
        <span style={{ opacity: 0.5, fontSize: '11px' }}>signal strength</span>
        <span style={{ fontSize: '11px', color: strColor }}>{strLabel}</span>
        <span style={{ opacity: 0.5, fontSize: '11px' }}>active zone</span>
        <span style={{ fontSize: '11px', color: zoneColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{zone}</span>
      </div>
      {/* WO-729: Integrity Badge — category + risk + trust state */}
      {signal && (
        <IntegrityBadge
          node={signal}
          onOpenScorecard={onOpenScorecard}
        />
      )}

      {text && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(232,244,255,0.08)' }}>
          <div style={{ opacity: 0.5, fontSize: '11px', marginBottom: '4px' }}>headline</div>
          <div style={{ fontSize: '11px', color: 'rgba(232,244,255,0.75)', lineHeight: 1.6 }}>
            {text}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ETR Label ─────────────────────────────────────────────────────────────────
function ETRLabel({ node, locked, selected }) {
  if (!locked && !selected) return null;
  const isHardened = node.fs >= CRYSTAL_FS;
  const color = locked
    ? 'rgba(255,215,0,0.95)'
    : 'rgba(0,220,180,0.95)';

  return (
    <Html position={[0, node.scale + 0.18, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
      <div style={{
        fontFamily:    'IBM Plex Mono, monospace',
        fontSize:      '8px',
        color,
        letterSpacing: '0.12em',
        whiteSpace:    'nowrap',
        textTransform: 'uppercase',
        display:       'flex',
        gap:           '4px',
        alignItems:    'center',
      }}>
        {node.id}
        {isHardened && <span style={{ opacity: 0.6 }}>HARDENED</span>}
        {locked     && <span style={{ opacity: 0.8 }}>LOCKED</span>}
        {selected   && !locked && <span style={{ opacity: 0.8 }}>SELECTED</span>}
      </div>
    </Html>
  );
}

// ── WO-601: Three-Ring Node Expression ───────────────────────────────────────
// Ring 1 (inner)  — Layer 4 actions
// Ring 2 (middle) — identity + Fs score
// Ring 3 (outer)  — strength band + velocity
const RING_LIME = '#66FF00';

// ── WO-734/749: Neurolink Edges ──────────────────────────────────────────────
// Thin low-opacity lines between category-matched node pairs.
// k = f(avgTrust): brightness encodes stalk elasticity — high trust = visible, low = dim.
// Fixed MAX_NL_PAIRS buffer — THREE.js does not support buffer resize on signal update.
// WO-749: bloom pairs (Unicorn nodes) pulse amber-lime at SCRUTINY_PULSE_PERIOD.
const MAX_NL_PAIRS         = 500;
const NL_PULSE_PERIOD      = (2 * Math.PI) / 4.5; // ~1.396s — matches ScrutinyField
function NeurolinkEdges({ pairs, stateRef }) {
  const geoRef   = useRef();
  const pairsRef = useRef(pairs);
  pairsRef.current = pairs;

  // Fixed-size buffers — allocated once, never resized
  const posArr = useMemo(() => new Float32Array(MAX_NL_PAIRS * 6), []);
  const colArr = useMemo(() => new Float32Array(MAX_NL_PAIRS * 6), []);

  // Update colors + drawRange when pairs list changes
  useEffect(() => {
    if (!geoRef.current) return;
    const p     = pairsRef.current;
    const count = Math.min(p.length, MAX_NL_PAIRS);
    for (let i = 0; i < count; i++) {
      // k: 0.06 (TrustΔ −50) → 0.26 (TrustΔ +50)
      const k = Math.min(0.26, Math.max(0.06, 0.06 + (p[i].avgTrust + 50) / 100 * 0.20));
      const o = i * 6;
      colArr[o]   = k; colArr[o+1] = k; colArr[o+2] = k;
      colArr[o+3] = k; colArr[o+4] = k; colArr[o+5] = k;
    }
    geoRef.current.attributes.color.needsUpdate = true;
    geoRef.current.setDrawRange(0, count * 2);
  }, [pairs, colArr]);

  useFrame(({ clock }) => {
    const state = stateRef.current;
    if (!state || !geoRef.current) return;
    const p     = pairsRef.current;
    const count = Math.min(p.length, MAX_NL_PAIRS);
    const t     = clock.getElapsedTime();
    let   colDirty = false;

    for (let i = 0; i < count; i++) {
      const { idxA, idxB, bloom, avgTrust } = p[i];
      const a = state[idxA]?.pos, b = state[idxB]?.pos;
      if (!a || !b) continue;

      const o = i * 6;
      posArr[o]   = a.x; posArr[o+1] = a.y; posArr[o+2] = a.z;
      posArr[o+3] = b.x; posArr[o+4] = b.y; posArr[o+5] = b.z;

      // WO-749: Unicorn bloom — animate brightness for bloom pairs
      if (bloom) {
        const pulse = 0.5 + 0.5 * Math.sin(t * (2 * Math.PI / NL_PULSE_PERIOD));
        const k = Math.min(1.0, 0.4 + pulse * 0.6);
        colArr[o]   = 0; colArr[o+1] = k * 0.498; colArr[o+2] = k;
        colArr[o+3] = 0; colArr[o+4] = k * 0.498; colArr[o+5] = k;
        colDirty = true;
      }
    }

    geoRef.current.attributes.position.needsUpdate = true;
    if (colDirty) geoRef.current.attributes.color.needsUpdate = true;
  });

  return (
    <lineSegments>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" array={posArr} count={MAX_NL_PAIRS * 2} itemSize={3} />
        <bufferAttribute attach="attributes-color"    array={colArr} count={MAX_NL_PAIRS * 2} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.85} depthWrite={false} />
    </lineSegments>
  );
}

// ── WO-603: Vertical Stalk ────────────────────────────────────────────────────
// 1px line from node center down to floor at y = -BOUNDS * 0.72
// Rendered inside the node group (positions are group-local)
function Stalk({ nodeIndex, stateRef }) {
  const { lineObj, geo } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, -1, 0]), 3));
    const mat = new THREE.LineBasicMaterial({ color: '#66FF00', transparent: true, opacity: 0.35, depthWrite: false });
    return { lineObj: new THREE.Line(g, mat), geo: g };
  }, []);

  useEffect(() => () => { lineObj.geometry.dispose(); lineObj.material.dispose(); }, [lineObj]);

  useFrame(() => {
    const state = stateRef.current[nodeIndex];
    if (!state) return;
    // WO-752: hide stalk on snap (stalked === false)
    // Also hide when node has drifted beyond the local zone (r > 0.30)
    const beyondLocal = (state.r ?? 0) > 0.30;
    lineObj.material.opacity = (state.stalked === false || beyondLocal) ? 0 : 0.35;
    const localBottom = -3 - state.pos.y; // terminate at map surface (FILL_Y = -3)
    const pos = geo.attributes.position;
    pos.setY(1, localBottom);
    pos.needsUpdate = true;
  });

  return <primitive object={lineObj} />;
}

// ── WO-753: Scrutiny Field ────────────────────────────────────────────────────
// Pulsing red wireframe cage rendered around any node under scrutiny.
// Self-manages position + visibility via stateRef — no React state.
function ScrutinyField({ nodeIndex, nodeScale, stateRef }) {
  const ref = useRef();
  const { wireGeo } = useMemo(() => {
    const ico = new THREE.IcosahedronGeometry(1, 1);
    const wg  = new THREE.WireframeGeometry(ico);
    ico.dispose();
    return { wireGeo: wg };
  }, []);

  useEffect(() => () => wireGeo.dispose(), [wireGeo]);

  useFrame(({ clock }) => {
    const state = stateRef.current[nodeIndex];
    if (!ref.current || !state) return;
    ref.current.position.copy(state.pos);
    if (state.underScrutiny) {
      const pulse = 0.2 + 0.15 * Math.sin(clock.getElapsedTime() * 4.5);
      ref.current.material.opacity  = pulse;
      ref.current.material.visible  = true;
    } else {
      ref.current.material.visible = false;
    }
  });

  return (
    <lineSegments ref={ref} scale={nodeScale * 2.8}>
      <primitive object={wireGeo} attach="geometry" />
      <lineBasicMaterial color="#FF3B30" transparent opacity={0.3} depthWrite={false} />
    </lineSegments>
  );
}

// ── WO-801: Elastic HUD Labels ────────────────────────────────────────────────
// Force-directed label separation for r<0.15 core cluster nodes.
// Spring pulls each label back above its node; pairwise repulsion prevents overlap.

const CORE_LABEL_R   = 0.15;   // radial threshold — labels only show inside this radius
const LABEL_REPEL_R  = 1.2;    // world-space repulsion radius between label anchors
const LABEL_K_SPRING = 0.018;  // spring constant — return toward rest position
const LABEL_K_REPEL  = 0.6;    // repulsion force scale
const LABEL_DAMPEN   = 0.72;   // velocity dampen per frame
const LABEL_OY_REST  = 0.55;   // resting Y offset above node center

// Renders one label — group position updated imperatively every frame via ref
function CoreLabelGroup({ nodeIndex, primaryNode, stateRef, offsetsRef }) {
  const groupRef = useRef();

  useFrame(() => {
    const state = stateRef.current[nodeIndex];
    const off   = offsetsRef.current[nodeIndex];
    if (!state || !off || !groupRef.current) return;
    groupRef.current.position.set(
      state.pos.x + off.ox,
      state.pos.y + off.oy,
      state.pos.z
    );
  });

  const score = Math.round((primaryNode.fs ?? 0) * 100);
  const label = primaryNode.id.length > 14
    ? primaryNode.id.slice(0, 14) + '…'
    : primaryNode.id;

  return (
    <group ref={groupRef}>
      <Html center distanceFactor={12} style={{ pointerEvents: 'none' }}>
        <div style={{
          fontFamily:    'IBM Plex Mono, monospace',
          fontSize:      '9px',
          color:         'rgba(102,255,0,0.88)',
          letterSpacing: '0.12em',
          whiteSpace:    'nowrap',
          textTransform: 'uppercase',
          background:    'rgba(0,0,0,0.72)',
          padding:       '2px 5px',
          borderRadius:  '2px',
          border:        '1px solid rgba(102,255,0,0.18)',
          display:       'flex',
          gap:           '4px',
          alignItems:    'center',
        }}>
          <span>{label}</span>
          <span style={{ opacity: 0.55, fontSize: '6px' }}>{score}</span>
        </div>
      </Html>
    </group>
  );
}

// Manages force simulation for all labels; renders CoreLabelGroup per active node
function ElasticCoreLabels({ primaryNodes, stateRef }) {
  const offsetsRef = useRef({});
  const [coreIndices, setCoreIndices] = useState([]);
  const tickRef = useRef(0);

  useFrame((_, dt) => {
    const nodes  = stateRef.current;
    const active = [];

    nodes.forEach((node, idx) => {
      if (!node.primary || node.isShattered) return;
      const inCore = (node.r ?? 1) < CORE_LABEL_R;
      if (!inCore) {
        delete offsetsRef.current[idx];
        return;
      }
      if (!offsetsRef.current[idx]) {
        offsetsRef.current[idx] = { ox: 0, oy: LABEL_OY_REST, vx: 0, vy: 0 };
      }
      active.push({ idx, node });
    });

    if (active.length === 0) {
      tickRef.current += dt;
      if (tickRef.current >= 0.2 && coreIndices.length) {
        tickRef.current = 0;
        setCoreIndices([]);
      }
      return;
    }

    // Spring: pull each label back toward rest offset above its node
    active.forEach(({ idx }) => {
      const off = offsetsRef.current[idx];
      off.vx += LABEL_K_SPRING * (0            - off.ox);
      off.vy += LABEL_K_SPRING * (LABEL_OY_REST - off.oy);
    });

    // Pairwise repulsion — push overlapping label anchors apart
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const ai = active[i], aj = active[j];
        const oi = offsetsRef.current[ai.idx], oj = offsetsRef.current[aj.idx];
        const dx = (ai.node.pos.x + oi.ox) - (aj.node.pos.x + oj.ox);
        const dy = (ai.node.pos.y + oi.oy) - (aj.node.pos.y + oj.oy);
        const dist2 = dx * dx + dy * dy;
        if (dist2 < LABEL_REPEL_R * LABEL_REPEL_R && dist2 > 0.0001) {
          const dist  = Math.sqrt(dist2);
          const force = LABEL_K_REPEL * (LABEL_REPEL_R - dist) / dist;
          const fx = dx * force, fy = dy * force;
          oi.vx += fx; oi.vy += fy;
          oj.vx -= fx; oj.vy -= fy;
        }
      }
    }

    // Integrate + dampen
    const safeDt = Math.min(dt, 0.05);
    active.forEach(({ idx }) => {
      const off = offsetsRef.current[idx];
      off.vx *= LABEL_DAMPEN;
      off.vy *= LABEL_DAMPEN;
      off.ox += off.vx * safeDt;
      off.oy += off.vy * safeDt;
    });

    // Sync React state at 5Hz — only when core membership changes
    tickRef.current += dt;
    if (tickRef.current >= 0.2) {
      tickRef.current = 0;
      const nextIds = active.map(({ idx }) => idx);
      setCoreIndices(prev => {
        if (prev.length !== nextIds.length || nextIds.some((id, i) => prev[i] !== id)) return nextIds;
        return prev;
      });
    }
  });

  return (
    <>
      {coreIndices.map(idx => {
        const node = primaryNodes[idx];
        if (!node) return null;
        return (
          <CoreLabelGroup
            key={idx}
            nodeIndex={idx}
            primaryNode={node}
            stateRef={stateRef}
            offsetsRef={offsetsRef}
          />
        );
      })}
    </>
  );
}

// ── Camera Controller ─────────────────────────────────────────────────────────
function CameraController({ primaryNodes, alertMode, lowestCluster }) {
  const { camera } = useThree();
  const targetRef  = useRef(new THREE.Vector3(0, 0, 16));
  const doneRef    = useRef(false);
  const alertRef   = useRef(false);
  alertRef.current = alertMode;

  useEffect(() => {
    if (alertMode && lowestCluster) {
      targetRef.current.set(lowestCluster.x * 0.4, lowestCluster.y * 0.4, 10);
      doneRef.current = false;
    } else if (primaryNodes.length) {
      const sorted   = [...primaryNodes].sort((a, b) => b.fs - a.fs);
      const top      = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.5)));
      const centroid = top.reduce((acc, n) => acc.add(n.pos), new THREE.Vector3())
        .divideScalar(top.length);
      targetRef.current.set(centroid.x * 0.25, centroid.y * 0.25, 16);
      doneRef.current = false;
    }
  }, [primaryNodes, alertMode, lowestCluster]);

  useFrame(() => {
    if (doneRef.current) return;
    const speed = alertRef.current ? 0.028 : 0.004;
    camera.position.lerp(targetRef.current, speed);
    if (camera.position.distanceTo(targetRef.current) < 0.05) doneRef.current = true;
  });

  return null;
}


// ── Ghost Aura (WO-258) ───────────────────────────────────────────────────────
// Spawned at node position on RED alert. Fades from 0.4 → 0 over 3s.
const AURA_MS = 3000;
function GhostAura({ pos, t0, onExpire }) {
  const ref     = useRef();
  const expired = useRef(false);

  useFrame(() => {
    if (expired.current) return;
    const t = (performance.now() - t0) / AURA_MS;
    if (t >= 1) { expired.current = true; onExpire(); return; }
    if (!ref.current) return;
    ref.current.material.opacity = 0.4 * (1 - t);
  });

  return (
    <mesh ref={ref} position={[pos.x, pos.y, pos.z]}>
      <sphereGeometry args={[1.5, 16, 16]} />
      <meshBasicMaterial color="#FF4444" transparent opacity={0.4} depthWrite={false} />
    </mesh>
  );
}

// ── Cluster Formation Blink ───────────────────────────────────────────────────
// One-time triangle pulse when 3rd node completes a cluster. ~1.2s, 3 blinks, then gone.
const CLUSTER_BLINK_MS = 1800;
function ClusterFormationBlink({ stateRef, stateIndices, t0, onExpire }) {
  const lineRef = useRef();
  const expired = useRef(false);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    // 6 points (3 line segments as pairs): A→B, B→C, C→A
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18), 3));
    return g;
  }, []);

  useFrame(() => {
    if (expired.current) return;
    const t = (performance.now() - t0) / CLUSTER_BLINK_MS;
    if (t >= 1) { expired.current = true; onExpire(); return; }

    const [iA, iB, iC] = stateIndices;
    const nA = stateRef.current[iA];
    const nB = stateRef.current[iB];
    const nC = stateRef.current[iC];
    if (!lineRef.current || !nA || !nB || !nC) return;

    // Update triangle vertices to track live node positions
    const arr = lineRef.current.geometry.attributes.position.array;
    arr[ 0] = nA.pos.x; arr[ 1] = nA.pos.y; arr[ 2] = nA.pos.z;
    arr[ 3] = nB.pos.x; arr[ 4] = nB.pos.y; arr[ 5] = nB.pos.z;
    arr[ 6] = nB.pos.x; arr[ 7] = nB.pos.y; arr[ 8] = nB.pos.z;
    arr[ 9] = nC.pos.x; arr[10] = nC.pos.y; arr[11] = nC.pos.z;
    arr[12] = nC.pos.x; arr[13] = nC.pos.y; arr[14] = nC.pos.z;
    arr[15] = nA.pos.x; arr[16] = nA.pos.y; arr[17] = nA.pos.z;
    lineRef.current.geometry.attributes.position.needsUpdate = true;

    // 3 blinks: abs(sin) keeps every half-cycle visible, fade-out envelope
    const blink   = Math.abs(Math.sin(t * Math.PI * 4)); // 4 full flashes over duration
    const fadeOut = 1.0 - t;
    lineRef.current.material.opacity = blink * fadeOut * 1.0;
  });

  return (
    <lineSegments ref={lineRef} geometry={geo}>
      <lineBasicMaterial color="#66FF00" transparent opacity={0} depthWrite={false} />
    </lineSegments>
  );
}

// ── Slam Overlay (KRYL-275) ───────────────────────────────────────────────────
function SlamOverlay({ stateRef, nodeIdx, t0, onExpire }) {
  const ref     = useRef();
  const expired = useRef(false);

  useFrame(() => {
    if (expired.current) return;
    const raw = (performance.now() - t0) / SLAM_MS;
    if (raw >= 1) { expired.current = true; onExpire(); return; }
    const state = stateRef.current[nodeIdx];
    if (!ref.current || !state) return;
    ref.current.position.copy(state.pos);
    const eased = easeInOutCubic(raw);
    ref.current.scale.setScalar(1 + 0.35 * Math.sin(eased * Math.PI));
    ref.current.material.opacity = (1 - raw) * 0.72;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.55, 16, 16]} />
      <meshBasicMaterial color="#E8F4FF" transparent opacity={0.72} depthWrite={false} />
    </mesh>
  );
}

// ── Ghost Capture (KRYL-277) ──────────────────────────────────────────────────
function GhostCapture({ primaryNodes, totalCount, captureRef }) {
  const { gl, scene, camera } = useThree();

  const capture = useCallback(() => {
    gl.render(scene, camera);
    const baseURL = gl.domElement.toDataURL('image/png');
    const w = gl.domElement.width;
    const h = gl.domElement.height;
    const oc  = document.createElement('canvas');
    oc.width  = w;
    oc.height = h;
    const ctx = oc.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      ctx.font      = '13px monospace';
      ctx.fillStyle = 'rgba(100,160,255,0.85)';
      ctx.fillText(new Date().toISOString(), 14, 22);
      ctx.font      = '11px monospace';
      ctx.fillStyle = 'rgba(100,160,255,0.7)';
      ctx.fillText(`nodes: ${primaryNodes.length}`, 14, h - 14);
      ctx.textAlign  = 'right';
      ctx.fillStyle  = 'rgba(232,244,255,0.25)';
      ctx.fillText('KRYLO', w - 14, h - 14);
      const snapshot = {
        id:        `ghost-${Date.now()}`,
        timestamp: new Date().toISOString(),
        nodeCount: primaryNodes.length,
        nodes:     primaryNodes.map(n => ({ id: n.id, fs: n.fs })),
        imageData: oc.toDataURL('image/png'),
      };
      ghostPhotosLog.current.push(snapshot);
    };
    img.src = baseURL;
  }, [gl, scene, camera, primaryNodes]);

  useEffect(() => {
    captureRef.current = capture;
  }, [capture, captureRef]);

  return null;
}

// ── KRYL-310: Background Plane ────────────────────────────────────────────────
function BackgroundPlane() {
  const { planeObj, mat } = useMemo(() => {
    const geo  = new THREE.PlaneGeometry(2, 2);
    const m    = new THREE.ShaderMaterial({
      vertexShader:   BGVERT,
      fragmentShader: BGFRAG,
      depthTest:      false,
      depthWrite:     false,
      transparent:    true,
      uniforms:       { uTime: { value: 0 } },
    });
    const mesh       = new THREE.Mesh(geo, m);
    mesh.renderOrder = -1;
    return { planeObj: mesh, mat: m };
  }, []);

  useEffect(() => {
    return () => { planeObj.geometry.dispose(); planeObj.material.dispose(); };
  }, [planeObj]);

  useFrame(({ clock }) => { mat.uniforms.uTime.value = clock.getElapsedTime(); });

  return <primitive object={planeObj} />;
}

// ── WO-627A: Philadelphia LoD1 Massing ───────────────────────────────────────
const PHL_CENTER    = { lat: 39.9526, lng: -75.1652 }; // City Hall
const SCENE_SCALE   = 0.012;   // Three.js units per meter
const HEIGHT_SCALE  = 3.5;     // vertical exaggeration so buildings read clearly
const DEFAULT_H     = 12;      // meters — contextual fallback
const MIN_H         = 4;       // meters — prevents zero-height sheds
const OVERPASS_URL  = 'https://overpass-api.de/api/interpreter';
const OVERPASS_BBOX = '39.9395,-75.1850,39.9680,-75.1420'; // Center City bbox

let _phillyOsmCache = null;
let _phillyPrefetchPromise = null;
const PHILLY_OSM_KEY = 'krylo_philly_osm_v1';
async function fetchPhillyOSM() {
  if (_phillyOsmCache) return _phillyOsmCache;
  try {
    const stored = localStorage.getItem(PHILLY_OSM_KEY);
    if (stored) { _phillyOsmCache = JSON.parse(stored); return _phillyOsmCache; }
  } catch {}
  const query = `[out:json][timeout:30];way["building"](${OVERPASS_BBOX});out body;>;out skel qt;`;
  const res = await fetch(OVERPASS_URL, { method: 'POST', body: query });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  _phillyOsmCache = await res.json();
  try { localStorage.setItem(PHILLY_OSM_KEY, JSON.stringify(_phillyOsmCache)); } catch {}
  return _phillyOsmCache;
}
// DISABLED: prefetch fires at module load — blocked while Layer3USMesh is active
// _phillyPrefetchPromise = fetchPhillyOSM().catch(() => {});

function vec2FromLatLng(lat, lng) {
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(PHL_CENTER.lat * Math.PI / 180);
  return new THREE.Vector2(
    (lng - PHL_CENTER.lng) * mPerDegLng * SCENE_SCALE,
    (lat - PHL_CENTER.lat) * mPerDegLat * SCENE_SCALE,
  );
}

function buildPhillyGeometry(osm) {
  const nodeMap = {};
  osm.elements.forEach(el => { if (el.type === 'node') nodeMap[el.id] = el; });

  const geos = [];
  osm.elements.forEach(el => {
    if (el.type !== 'way' || !el.tags?.building) return;
    const refs = el.nodes ?? [];
    if (refs.length < 4) return; // need at least 3 unique + closing node

    const pts = refs.slice(0, -1).map(id => {
      const n = nodeMap[id];
      return n ? vec2FromLatLng(n.lat, n.lon) : null;
    }).filter(Boolean);
    if (pts.length < 3) return;

    const tags = el.tags;
    let hM = DEFAULT_H;
    if (tags.height)             hM = parseFloat(tags.height) || DEFAULT_H;
    else if (tags['building:levels']) hM = parseFloat(tags['building:levels']) * 3.5;
    hM = Math.max(MIN_H, hM);
    const h = hM * SCENE_SCALE * HEIGHT_SCALE;

    const shape = new THREE.Shape();
    shape.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2); // XY shape → XZ ground plane, Y = up
    geos.push(geo);
  });

  if (geos.length === 0) return null;
  const merged = mergeGeometries(geos, false);
  geos.forEach(g => g.dispose());
  return merged;
}

function PhillyMassingBase() {
  const [geo, setGeo] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchPhillyOSM()
      .then(osm => { if (alive) setGeo(buildPhillyGeometry(osm)); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  // Philly street grid — regular 400ft blocks, ~122m
  const gridLines = useMemo(() => {
    const pts = [];
    const blockM = 122;
    const halfSpan = 2400;
    const step = blockM * SCENE_SCALE;
    const span = halfSpan * SCENE_SCALE;
    for (let x = -span; x <= span; x += step) {
      pts.push(x, 0.02, -span, x, 0.02, span);
    }
    for (let z = -span; z <= span; z += step) {
      pts.push(-span, 0.02, z, span, 0.02, z);
    }
    const buf = new THREE.BufferGeometry();
    buf.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return buf;
  }, []);

  // Fallback while loading or on error — keep static image visible
  if (!geo || failed) return <CityGroundPlane src={CITY_MATTE} />;

  return (
    <group position={[0, -8, 0]}>
      <mesh geometry={geo} renderOrder={-1}>
        <meshBasicMaterial color="#3a3a3a" />
      </mesh>
      {/* Street grid */}
      <lineSegments geometry={gridLines} renderOrder={0}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.08} />
      </lineSegments>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
    </group>
  );
}

// ── WO-600: City Background — Philly video, fullscreen ───────────────────────
// WO-626: Philly massing — static, anchored, no movement
// WO-628C: Multi-city asset map — stable module-level reference
const CITY_MATTE = '/assets/cities/philly_matte.png';

const CITY_ASSETS = {
  phl: '/assets/cities/philly_matte.png',
  la:  '/assets/cities/LA_matte.jpg',
  mia: '/assets/cities/miami_matte.jpg',
  sf:  '/assets/cities/SF_matte.jpg',
};

const CITY_VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv         = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;
const CITY_FRAG = /* glsl */`
  uniform sampler2D uTex;
  uniform vec2      uResolution;
  uniform float     uTexAspect;
  varying vec2 vUv;
  void main() {
    float canvasAspect = uResolution.x / uResolution.y;
    vec2 uv = vUv;
    if (canvasAspect > uTexAspect) {
      float ratio = uTexAspect / canvasAspect;
      uv.y = uv.y * ratio + (1.0 - ratio) * 0.5;
    } else {
      float ratio = canvasAspect / uTexAspect;
      uv.x = uv.x * ratio + (1.0 - ratio) * 0.5;
    }
    gl_FragColor = texture2D(uTex, uv);
  }
`;

function CityGroundPlane({ src = CITY_MATTE }) {
  const [ready, setReady] = useState(false);
  const { size } = useThree();

  const { mesh } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
      vertexShader:   CITY_VERT,
      fragmentShader: CITY_FRAG,
      depthTest:      false,
      depthWrite:     false,
      uniforms: {
        uTex:        { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTexAspect:  { value: 1.0 },
      },
    });
    const m       = new THREE.Mesh(geo, mat);
    m.renderOrder = -1;
    return { mesh: m };
  }, []);

  useFrame(() => {
    mesh.material.uniforms.uResolution.value.set(size.width, size.height);
  });

  // Texture-only swap on src change — never touches geometry or material
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      src,
      (tex) => {
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        mesh.material.uniforms.uTexAspect.value = tex.image.width / tex.image.height;
        const prev = mesh.material.uniforms.uTex.value;
        mesh.material.uniforms.uTex.value = tex;
        prev?.dispose();
        setReady(true);
      },
      undefined,
      () => {},
    );
  }, [mesh, src]);

  // Full cleanup on unmount only
  useEffect(() => {
    return () => {
      mesh.material.uniforms.uTex.value?.dispose();
      mesh.geometry.dispose();
      mesh.material.dispose();
    };
  }, [mesh]);

  if (!ready) return <BackgroundPlane />;
  return <primitive object={mesh} />;
}

// ── WO-260: Resonance Wave ────────────────────────────────────────────────────
// 4.4Hz sine displacement on floor plane. Amplitude tied to heartbeat metric.
function ResonanceWave({ heartbeat }) {
  const matRef = useRef();

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value      = clock.getElapsedTime();
    matRef.current.uniforms.uAmplitude.value = (heartbeat ?? 1) * 0.35;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <planeGeometry args={[BOUNDS * 2.6, BOUNDS * 2.6, 48, 48]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={WAVE_VERT}
        fragmentShader={WAVE_FRAG}
        transparent
        depthWrite={false}
        uniforms={{
          uTime:      { value: 0 },
          uAmplitude: { value: 0.35 },
        }}
      />
    </mesh>
  );
}

// ── KRYL-235: Pulse Edge ──────────────────────────────────────────────────────
function PulseEdge({ start, end, avgFs, alertMode, isBright }) {
  const alertRef  = useRef(alertMode);
  const brightRef = useRef(isBright);
  alertRef.current  = alertMode;
  brightRef.current = isBright;

  const { lineObj } = useMemo(() => {
    const positions = new Float32Array([start.x, start.y, start.z, end.x, end.y, end.z]);
    const progress  = new Float32Array([0, 1]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aProgress', new THREE.BufferAttribute(progress, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader:   EDGE_VERT,
      fragmentShader: EDGE_FRAG,
      transparent:    true,
      depthWrite:     false,
      uniforms: {
        uTime:      { value: 0 },
        uFidelity:  { value: clamp01(avgFs) },
        uAlertMode: { value: 0 },
        uBright:    { value: 0 },
      },
    });
    return { lineObj: new THREE.Line(geo, mat) };
  }, [start, end, avgFs]);

  useEffect(() => {
    return () => { lineObj.geometry.dispose(); lineObj.material.dispose(); };
  }, [lineObj]);

  useFrame(({ clock }) => {
    const u = lineObj.material.uniforms;
    u.uTime.value      = clock.getElapsedTime();
    u.uAlertMode.value = alertRef.current  ? 1.0 : 0.0;
    u.uBright.value    = brightRef.current ? 1.0 : 0.0;
  });

  return <primitive object={lineObj} />;
}

// ── KRYL-313: Corroboration Bridge ────────────────────────────────────────────
// Instanced billboard plane per selected pair — pairwise only
function CorroborationBridges({ selectedNodes, stateRef }) {
  const matRef  = useRef(null);
  const meshRef = useRef(null);

  // Build pairs from selected nodes
  const pairs = useMemo(() => {
    const arr = Array.from(selectedNodes);
    const out = [];
    for (let a = 0; a < arr.length; a++) {
      for (let b = a + 1; b < arr.length; b++) {
        out.push([arr[a], arr[b]]);
      }
    }
    return out;
  }, [selectedNodes]);

  const { geo, mat, count } = useMemo(() => {
    // 4-vertex plane: unit quad [-0.5,0.5] x [0,1] — length along Y, width along X
    const g = new THREE.PlaneGeometry(1, 1);
    const m = new THREE.ShaderMaterial({
      vertexShader:   BRIDGE_VERT,
      fragmentShader: BRIDGE_FRAG,
      transparent:    true,
      depthWrite:     false,
      side:           THREE.DoubleSide,
      uniforms:       { uTime: { value: 0 } },
    });

    // Per-instance fidelity attribute — max 128 bridges
    const fidelities = new Float32Array(128);
    g.setAttribute('aFidelity', new THREE.InstancedBufferAttribute(fidelities, 1));

    matRef.current = m;
    return { geo: g, mat: m, count: 128 };
  }, []);

  useEffect(() => {
    return () => { geo.dispose(); mat.dispose(); };
  }, [geo, mat]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!meshRef.current || !pairs.length) return;
    mat.uniforms.uTime.value = clock.getElapsedTime();

    const fidelities = geo.attributes.aFidelity.array;

    pairs.forEach(([iA, iB], idx) => {
      const stA = stateRef.current[iA];
      const stB = stateRef.current[iB];
      if (!stA || !stB) return;

      const pA = stA.pos;
      const pB = stB.pos;

      // Pc — center
      dummy.position.set(
        (pA.x + pB.x) * 0.5,
        (pA.y + pB.y) * 0.5,
        (pA.z + pB.z) * 0.5
      );

      // Vab — direction A→B
      const vab = new THREE.Vector3().subVectors(pB, pA);
      const L   = vab.length();
      vab.normalize();

      // Align local Y to Vab via quaternion
      const up  = new THREE.Vector3(0, 1, 0);
      const q   = new THREE.Quaternion().setFromUnitVectors(up, vab);
      dummy.quaternion.copy(q);

      // Corroboration = avg Fs of the two nodes (from primaryNodes via index)
      // fidelity stored in aFidelity attribute — use index mapping
      const fsA = geo.attributes.aFidelity ? 0.5 : 0.5; // placeholder; set below
      // Width driven by smoothstep(0.3, 1.0, corroboration)
      const corrob = clamp01((stA.fsVal ?? 0.5) + (stB.fsVal ?? 0.5)) / 2;
      const W      = W_BASE * smoothstep(0.3, 1.0, corrob);

      dummy.scale.set(W, L, 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(idx, dummy.matrix);

      fidelities[idx] = corrob;
    });

    if (pairs.length) {
      geo.attributes.aFidelity.needsUpdate = true;
      meshRef.current.instanceMatrix.needsUpdate = true;
      meshRef.current.count = pairs.length;
    }
  });

  if (!pairs.length) return null;

  return (
    <instancedMesh ref={meshRef} args={[geo, mat, count]} frustumCulled={false} />
  );
}

// ── ZoneRings ─────────────────────────────────────────────────────────────────
// Horizontal ellipses at distinct Y elevations — LOCAL/REGIONAL/NATIONAL bands.
// Visible at side/mid view; fade out as camera lifts toward overhead.
const ZONE_DEFS = [
  { r: 0.20, label: 'LOCAL',    baseOpacity: 0.07, y: 0, color: '#5599FF', rgb: 'rgba(85,153,255,' },
  { r: 0.50, label: 'REGIONAL', baseOpacity: 0.08, y: 2, color: '#5599FF', rgb: 'rgba(85,153,255,' },
  { r: 0.78, label: 'NATIONAL', baseOpacity: 0.10, y: 4, color: '#5599FF', rgb: 'rgba(85,153,255,' },
];
function ZoneRings({ zoneRingGeo, lockedZone, setLockedZone }) {
  const matRefs   = [useRef(null), useRef(null), useRef(null)];
  const labelRefs = [useRef(null), useRef(null), useRef(null)];
  const lockedRef = useRef(lockedZone);
  useEffect(() => { lockedRef.current = lockedZone; }, [lockedZone]);

  // Front-facing half-ring: angles 0→π (east tip → south face → west tip)
  const halfRingGeo = useMemo(() => {
    const SEG = HIGH_CORE ? 64 : 32;
    const pts = [];
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI;
      pts.push(Math.cos(a), 0, Math.sin(a));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    return geo;
  }, []);

  useFrame(({ camera }) => {
    const dist      = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
    const elevation = Math.atan2(camera.position.y, dist);
    const LOW = 0.25, HIGH = 0.55;
    const t = Math.max(0, Math.min(1, 1 - (elevation - LOW) / (HIGH - LOW)));
    const locked = lockedRef.current;

    ZONE_DEFS.forEach(({ baseOpacity, label }, i) => {
      if (locked) {
        const isLocked = label === locked;
        if (matRefs[i].current)   matRefs[i].current.opacity = isLocked ? 0.55 : 0.02;
        if (labelRefs[i].current) labelRefs[i].current.style.opacity = isLocked ? '1' : '0.15';
      } else {
        if (matRefs[i].current)   matRefs[i].current.opacity = t * baseOpacity;
        if (labelRefs[i].current) labelRefs[i].current.style.opacity = String(t);
      }
    });
  });

  return (
    <>
      {ZONE_DEFS.map(({ r, label, y, color, rgb }, i) => (
        <group key={label}>
          <line geometry={halfRingGeo} position={[0, y, 0]} scale={[11 * r, 1, 7 * r]}>
            <lineBasicMaterial ref={matRefs[i]} color={color} transparent opacity={0} depthWrite={false} />
          </line>
          <Html position={[9.2, y, 0]} occlude={false} style={{ background: 'transparent' }}>
            <div
              ref={labelRefs[i]}
              onDoubleClick={() => setLockedZone(prev => prev === label ? null : label)}
              onMouseEnter={e => { e.currentTarget.style.borderColor=`${rgb}1.0)`; e.currentTarget.style.color='#fff'; e.currentTarget.style.background=`${rgb}0.22)`; e.currentTarget.style.boxShadow=`0 0 10px ${rgb}0.4)`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=`${rgb}0.6)`; e.currentTarget.style.color=`${rgb}1.0)`; e.currentTarget.style.background='transparent'; e.currentTarget.style.boxShadow='none'; }}
              style={{
                fontFamily:    'IBM Plex Mono, monospace',
                fontSize:      '10px',
                letterSpacing: '0.16em',
                color:         `${rgb}1.0)`,
                whiteSpace:    'nowrap',
                userSelect:    'none',
                cursor:        'pointer',
                opacity:       0,
                border:        `1px solid ${rgb}0.6)`,
                padding:       '4px 8px',
                borderRadius:  '2px',
                background:    'transparent',
                transition:    'border-color 150ms, color 150ms, background 150ms, box-shadow 150ms',
              }}
            >
              {label}
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}

// ── ZoneLabelProjector ────────────────────────────────────────────────────────
// Projects zone Y centers to screen space each frame — mutates DOM refs directly.
// No React state = no re-renders.
function ZoneLabelProjector({ labelDomRefs, lockedZoneRef }) {
  const { camera, size } = useThree();
  useFrame(() => {
    const dist      = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
    const elevation = Math.atan2(camera.position.y, dist);
    const LOW = 0.25, HIGH = 0.55;
    const t      = Math.max(0, Math.min(1, 1 - (elevation - LOW) / (HIGH - LOW)));
    const locked = lockedZoneRef.current;

    ZONE_DEFS.forEach(({ y, r, label }, i) => {
      const el = labelDomRefs[i]?.current;
      if (!el) return;
      const v = new THREE.Vector3(11 * r + 0.6, y, 0);
      v.project(camera);
      const screenX = (v.x * 0.5 + 0.5) * size.width;
      const screenY = (-v.y * 0.5 + 0.5) * size.height;
      el.style.left    = `${screenX}px`;
      el.style.top     = `${screenY}px`;
      el.style.opacity = locked
        ? (label === locked ? '1' : '0.15')
        : String(t);
    });
  });
  return null;
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function Scene({ signals, alertMode, captureRef, lockedIdx, setLockedIdx, selectedSet, setSelectedSet, searchQuery, onRedAlert, heartbeat, onNodeLock, top1Idx, top1Color, top2Idx, top2Color, top3Idx, top3Color, top4Idx, top4Color, top5Idx, top5Color, top6Idx, top6Color, topSixSet, cityMatteSrc, activeCity, leaderboardHoveredIdx, leaderboardClickEvent, onHoverChange, debugMode, activeFilters, onClusterData, activeStateFilter, onStateDoubleClick, onPromotion, lockedZone, setLockedZone, isTimelineMode }) {
  const meshRef  = useRef(null);
  const matRef   = useRef(null);
  const stateRef = useRef([]);
  const orbitRef = useRef(null);
  // WO-1120: ref mirrors prop so physics useFrame can read it without closure staleness
  const isTimelineModeRef = useRef(false);
  isTimelineModeRef.current = !!isTimelineMode;
  // WO-1120: lattice-to-timeline transition — priority 1 runs after physics loop (priority 0)
  useLatticeTransition(meshRef, !!isTimelineMode, 0.8, 1);
  // WO-873: State Contract — promotion engine
  useOracle(stateRef, (promoted) => { onPromotion?.(promoted); });
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const simTimeRef     = useRef(0);       // WO-0290-B: deterministic sim clock (no wall clock)
  const shatterFiredRef= useRef(new Set()); // nodes that have already triggered shatter this cycle
  const matchSetRef    = useRef(null);    // WO-0290-B: live matchSet for search-spring override in physics loop
  const clusterFormedRef = useRef(new Set()); // cluster keys that have already fired their formation blink
  const [clusterBlinks, setClusterBlinks] = useState([]);

  // WO-755: trigger boundary fetch at mount — polygon loads in background, PIP becomes active once ready
  useEffect(() => { boundaryReady; }, []);

  const firedRef     = useRef(new Set());
  const slamScaleRef = useRef(new Map());
  const [slamEvents, setSlamEvents]       = useState([]);
  const [brightNodeSet, setBrightNodeSet] = useState(new Set());
  const [ghostAuras, setGhostAuras]       = useState([]);
  const prevFsRef      = useRef({});
  const fsHistoryRef   = useRef({});
  const fsVelocityRef  = useRef({});
  const velocityTimerRef  = useRef({});
  const prevVelBandRef    = useRef({});
  const alertModeRef     = useRef(false);
  alertModeRef.current   = alertMode;
  const lastUploadRef    = useRef(0); // WO-702: throttle instance buffer uploads to 30Hz
  const lastAuditRef     = useRef(0); // WO-806: telemetry parity — last audit wall-clock ms
  const lastGhostScanRef = useRef(0); // WO-807: ghost detection — last scan wall-clock ms
  const kernelProfiler   = useRef(new KernelProfiler()); // WO-808: kernel profiler instance
  const rayWorkerRef     = useRef(null); // WO-703: background raycasting worker

  // WO-817: state double-click raycaster — hit test against scene.userData.stateHitMeshes
  const { gl: glRef, scene: sceneRef, camera: cameraRef } = useThree();
  useEffect(() => {
    const canvas = glRef.domElement;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const DEFAULT_STATE_COLOR = new THREE.Color(0x34342e);
    const ACTIVE_STATE_COLOR  = new THREE.Color(0x66ff00);

    function onDblClick(e) {
      const rect = canvas.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left)  / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)   / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef);
      const hitMeshes = sceneRef.userData.stateHitMeshes ?? [];
      const hits = raycaster.intersectObjects(hitMeshes, false);
      if (hits.length === 0) return;
      const stateName = hits[0].object.userData.stateName;
      if (!stateName) return;

      // Update fill mesh colors
      hitMeshes.forEach(m => {
        m.material.color.copy(m.userData.stateName === stateName ? ACTIVE_STATE_COLOR : DEFAULT_STATE_COLOR);
      });

      onStateDoubleClick?.(stateName);
    }

    canvas.addEventListener('dblclick', onDblClick);
    return () => canvas.removeEventListener('dblclick', onDblClick);
  }, [glRef, sceneRef, cameraRef, onStateDoubleClick]);

  // WO-817: clear state filter — reset fill mesh colors when filter is cleared
  useEffect(() => {
    if (activeStateFilter !== null) return;
    const hitMeshes = sceneRef?.userData.stateHitMeshes ?? [];
    const DEFAULT_STATE_COLOR = new THREE.Color(0x34342e);
    hitMeshes.forEach(m => m.material.color.copy(DEFAULT_STATE_COLOR));
  }, [activeStateFilter, sceneRef]);

  // Stable geometry + material — created ONCE, never rebuilt. Buffer attributes updated in-place below.
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, HIGH_CORE ? 48 : 24, HIGH_CORE ? 48 : 24);
    geo.setAttribute('aFidelity',     new THREE.InstancedBufferAttribute(new Float32Array(MAX_NODES),     1));
    geo.setAttribute('aStress',       new THREE.InstancedBufferAttribute(new Float32Array(MAX_NODES),     1));
    geo.setAttribute('aPhase',        new THREE.InstancedBufferAttribute(new Float32Array(MAX_NODES),     1));
    geo.setAttribute('aScale',        new THREE.InstancedBufferAttribute(new Float32Array(MAX_NODES),     1));
    geo.setAttribute('aIsStub',       new THREE.InstancedBufferAttribute(new Float32Array(MAX_NODES),     1));
    geo.setAttribute('aIdentityColor',new THREE.InstancedBufferAttribute(new Float32Array(MAX_NODES * 3), 3));
    geo.setAttribute('aDebugColor',   new THREE.InstancedBufferAttribute(new Float32Array(MAX_NODES * 3), 3));
    geo.setAttribute('aRadiusNorm',   new THREE.InstancedBufferAttribute(new Float32Array(MAX_NODES),     1));
    geo.setAttribute('aSovereign',    new THREE.InstancedBufferAttribute(new Float32Array(MAX_NODES),     1));
    geo.setAttribute('aSearchMatch',  new THREE.InstancedBufferAttribute(new Float32Array(MAX_NODES),     1));
    geo.setAttribute('aShattered',    new THREE.InstancedBufferAttribute(new Float32Array(MAX_NODES),     1));
    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      transparent:    true,
      depthWrite:     false,
      uniforms: { uTime: { value: 0 }, uAlertMode: { value: 0 }, uDebugMode: { value: 0 } },
    });
    return { geometry: geo, material: mat };
  }, []);

  // Signal-dependent data — updates buffer attributes in-place on geometry (no remount)
  const { primaryNodes, edges, nodeStrength, nodeIds, totalCount, neurolinkPairs, completedClusters, protoClusterCount } = useMemo(() => {
    const fidelities     = geometry.attributes.aFidelity.array;
    const stresses       = geometry.attributes.aStress.array;
    const phases         = geometry.attributes.aPhase.array;
    const scales         = geometry.attributes.aScale.array;
    const isStubs        = geometry.attributes.aIsStub.array;
    const identityColors = geometry.attributes.aIdentityColor.array;
    const debugColors    = geometry.attributes.aDebugColor.array;

    // WO-0288 debug tier colors: local=green, regional=yellow, national=magenta
    const DEBUG_TIER_COLOR = {
      local:    [0.0, 1.0, 0.0],
      regional: [1.0, 1.0, 0.0],
      national: [1.0, 0.0, 1.0],
    };

    // Reset buffers
    fidelities.fill(0); stresses.fill(0); phases.fill(0);
    scales.fill(0); isStubs.fill(0); identityColors.fill(0); debugColors.fill(0);

    const state     = [];
    const primaries = [];
    const ids       = [];

    signals.forEach((sig, i) => {
      const fs     = clamp01(sig.fs ?? (sig.strength ?? 1) / 5);
      const eViral = clamp01(sig.fidelity?.e_viral ?? 0);
      const phi    = i * 2.399963;
      const scale  = 0.15;

      // WO-736/737/730: spawn within US ellipse — Y driven by fs + age (born_at)
      const FUNNEL_BOTTOM_Y = -3;
      const FUNNEL_TOP_Y    = 6;
      const US_A = 11; // semi-axis X (east-west) — expanded to enclose FL + NW states
      const US_B = 7;  // semi-axis Z (north-south)
      const ageNorm = sig.born_at
        ? clamp01((Date.now() - new Date(sig.born_at).getTime()) / (90 * 86400000))
        : 0;

      // WO-0289 — Flatten Y, rescale radial rings
      // All nodes sit on the map surface (Y≈0). Tier is expressed by radial ring only.
      // local=inner(0.20), regional=mid(0.50), national=outer(0.78)
      const geoAff     = sig.geographic_affinity ?? 0.2;
      const isNational = sig.is_national ?? false;
      const geoTierSpawn = sig.geoTier ?? (geoAff >= 0.70 ? 'local' : geoAff >= 0.30 ? 'regional' : 'regional'); // national disabled
      const spawnY   = ZONE_BOUNDS[geoTierSpawn]?.target ?? 3;

      // WO-0290-B: rGeo = native geo-affinity ring per tier
      const BASE_R = { local: 0.20, regional: 0.50, national: 0.78 };
      const SIGMA  = { local: 0.03, regional: 0.05,  national: 0.05  };
      const rHash  = lcg(i * 31 + 7);
      const rGeo   = (BASE_R[geoTierSpawn] ?? 0.50) + rHash * (SIGMA[geoTierSpawn] ?? 0.05) - (SIGMA[geoTierSpawn] ?? 0.05) / 2;
      const rTarget = rGeo; // initial rTarget = rGeo (kernel resolves each frame)

      // idPhase: deterministic [0, 2π] from nodeId characters — no wall clock
      const nodeIdStr  = sig.id ?? `ETR-${String(i + 1).padStart(3, '0')}`;
      const idSeed     = nodeIdStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const idPhase    = lcg(idSeed) * Math.PI * 2;

      const thetaBase = phi;
      const spawnRad  = rGeo; // spawn AT geo ring — no travel-from-center lag

      // WO-755: PIP spawn guard — resample angle if position lands outside US polygon
      let resolvedTheta = thetaBase;
      let spawnX = Math.cos(thetaBase) * spawnRad * US_A;
      let spawnZ = Math.sin(thetaBase) * spawnRad * US_B;
      if (!isInsideUS(spawnX, spawnZ)) {
        for (let attempt = 1; attempt <= 8; attempt++) {
          const tryTheta = thetaBase + attempt * (Math.PI * 2 / 8);
          const tx = Math.cos(tryTheta) * spawnRad * US_A;
          const tz = Math.sin(tryTheta) * spawnRad * US_B;
          if (isInsideUS(tx, tz)) {
            resolvedTheta = tryTheta;
            spawnX = tx;
            spawnZ = tz;
            break;
          }
        }
      }
      const pos = new THREE.Vector3(spawnX, spawnY, spawnZ);
      const vel = new THREE.Vector3(0, 0, 0);

      fidelities[i] = fs;
      stresses[i]   = eViral;
      phases[i]     = lcg(i) * Math.PI * 2;
      scales[i]     = scale;
      isStubs[i]    = sig._isStub ? 1.0 : 0.0;

      // WO-0288: debug tier color
      const dc = DEBUG_TIER_COLOR[geoTierSpawn] ?? [1.0, 0.0, 1.0];
      debugColors[i * 3]     = dc[0];
      debugColors[i * 3 + 1] = dc[1];
      debugColors[i * 3 + 2] = dc[2];

      const nodeId      = sig.id ?? `ETR-${String(i + 1).padStart(3, '0')}`;
      const geoAffinity = geoAff;
      const geoTier     = geoTierSpawn;
      const geoSpeedMod = sig.geoSpeedMod ?? (geoTier === 'local' ? 1.0 : geoTier === 'regional' ? 1.4 : 2.0);
      state.push({ pos: pos.clone(), vel, speedScale: 1 + eViral * 3.0, primary: true, index: i, fsVal: fs, ageNorm,
        trustDelta:     sig.trust_delta ?? 0,
        pulseState:     PULSE_STATES.DORMANT,
        stalked:        true,
        underScrutiny:  false,
        isNational,
        geoAffinity,
        geoTier,
        geoSpeedMod,
        originState:   extractOriginState(sig.text ?? sig.truth_statement ?? ''), // WO-817
        // WO-0290-B: polar kernel state
        r:           rGeo,  // spawn at geo ring, not center
        vr:          0,
        rGeo,
        idPhase,
        thetaBase:   resolvedTheta,
        thetaFinal:  resolvedTheta,
        fsPrev:      fs,
        isShattered:       false,
        pulse:             false,
        nodeState:         NS.NORMAL,
        shatterTime:       null,
        sovereignEntryTime: null,  // WO-805: simTime when combined first crossed SOVEREIGN_LIMIT
        anchorEntryTime:   null,   // WO-805: simTime when node first reached L1_ANCHORED
        lastPacketAt: sig.timestamp ?? Date.now(),  // WO-802: wall-clock ms of last data refresh
        combined:          0,
      });
      primaries.push({ pos: pos.clone(), id: nodeId, fs, eViral, scale, index: i, isNational });
      ids.push(nodeId);
    });

    for (let j = 0; j < FIELD_COUNT; j++) {
      const i   = signals.length + j;
      const phi = j * 2.399963;
      const r2  = Math.sqrt(j / FIELD_COUNT) * BOUNDS;
      const pos = new THREE.Vector3(
        Math.cos(phi) * r2,
        lcg(j * 5 + 4) * 6,
        Math.sin(phi) * r2 * 0.4
      );

      fidelities[i] = 0.15;
      stresses[i]   = 0.05;
      phases[i]     = lcg(j * 3) * Math.PI * 2;
      scales[i]     = 0.06;
      isStubs[i]    = 0.0;

      state.push({
        pos: pos.clone(),
        vel: new THREE.Vector3(
          (lcg(j * 11 + 1) * 2 - 1) * 0.018,
          (lcg(j * 11 + 2) * 2 - 1) * 0.012,
          (lcg(j * 11 + 3) * 2 - 1) * 0.009
        ),
        speedScale: 1,
        primary:    false,
        index:      i,
        fsVal:      0.15,
      });
    }

    // Zone colors for all primary signal nodes — initialized here so the GPU
    // buffer is never [0,0,0] on signal load (prevents base-gradient bleed-through)
    const ZC_INIT = { local:[0.333,0.600,1.000], regional:[1.000,1.000,1.000], national:[0.400,1.000,0.000] };
    for (let i = 0; i < signals.length; i++) {
      const tier = state[i]?.geoTier ?? 'national';
      const zc   = ZC_INIT[tier] ?? ZC_INIT.national;
      identityColors[i * 3]     = zc[0];
      identityColors[i * 3 + 1] = zc[1];
      identityColors[i * 3 + 2] = zc[2];
    }

    // Zone color is law — no identity overrides on the map.
    // Leaderboard rank colors are shown in the panel only, not on nodes.

    // Mark all attributes dirty
    geometry.attributes.aFidelity.needsUpdate     = true;
    geometry.attributes.aStress.needsUpdate       = true;
    geometry.attributes.aPhase.needsUpdate        = true;
    geometry.attributes.aScale.needsUpdate        = true;
    geometry.attributes.aIsStub.needsUpdate       = true;
    geometry.attributes.aIdentityColor.needsUpdate = true;
    geometry.attributes.aDebugColor.needsUpdate   = true;

    const edgeList = [];
    for (let a = 0; a < primaries.length; a++) {
      for (let b = a + 1; b < primaries.length; b++) {
        if (primaries[a].pos.distanceTo(primaries[b].pos) < BOUNDS * 1.3) {
          const avgFs = (primaries[a].fs + primaries[b].fs) / 2;
          edgeList.push({ key: `e-${a}-${b}`, nodeA: a, nodeB: b, avgFs, start: primaries[a].pos.clone(), end: primaries[b].pos.clone() });
        }
      }
    }

    const edgeAcc = {};
    for (const edge of edgeList) {
      for (const idx of [edge.nodeA, edge.nodeB]) {
        if (!edgeAcc[idx]) edgeAcc[idx] = { sum: 0, count: 0 };
        edgeAcc[idx].sum   += edge.avgFs;
        edgeAcc[idx].count += 1;
      }
    }
    const nodeStrength = {};
    for (const [idx, { sum, count }] of Object.entries(edgeAcc)) {
      nodeStrength[idx] = count > 0 ? sum / count : 0;
    }

    // WO-263: Pulse Sync
    const uf = Array.from({ length: primaries.length }, (_, i) => i);
    const ufFind = (x) => { while (uf[x] !== x) { uf[x] = uf[uf[x]]; x = uf[x]; } return x; };
    for (const edge of edgeList) {
      const ra = ufFind(edge.nodeA), rb = ufFind(edge.nodeB);
      if (ra !== rb) uf[rb] = ra;
    }
    for (let i = 0; i < primaries.length; i++) phases[i] = phases[ufFind(i)];
    geometry.attributes.aPhase.needsUpdate = true;

    // WO-734/748: Neurolink — Trifecta pairing (category + fs_band + age_band)
    // Lifecycle: 1 node = lone signal | 2 nodes = pair in progress | 3 nodes = cluster complete
    // Fewer than 2 = no edge. More than 3 = top 3 by fs, rest dropped.
    const fsBand   = fs  => fs  < 0.33 ? 0 : fs  < 0.66 ? 1 : 2;
    const ageBand  = age => age < 0.33 ? 0 : age < 0.66 ? 1 : 2;
    const trifectaGroups = {};
    primaries.forEach((p, localIdx) => {
      const sig = signals[p.index];
      const cat = sig?.category_id ?? 'NONE';
      const fb  = fsBand(p.fs);
      const ab  = ageBand(sig?.ageNorm ?? 0);
      const zt  = sig?.geoTier?.[0]?.toUpperCase() ?? 'N'; // 'L' | 'R' | 'N'
      const key = `${cat}|${fb}|${ab}|${zt}`;
      if (!trifectaGroups[key]) trifectaGroups[key] = [];
      trifectaGroups[key].push(localIdx);
    });

    const neurolinkPairs  = [];
    const completedClusters = []; // keys + stateIndices of groups that just reached 3

    for (const [key, group] of Object.entries(trifectaGroups)) {
      if (group.length < 2) continue; // lone node — no edge
      const capped = [...group].sort((a, b) => primaries[b].fs - primaries[a].fs).slice(0, 3);
      // Draw edges for all members (pair = 1 edge, triangle = 3 edges)
      for (let a = 0; a < capped.length; a++) {
        for (let b = a + 1; b < capped.length; b++) {
          const ia = capped[a], ib = capped[b];
          const tdA = signals[primaries[ia].index]?.trust_delta ?? 0;
          const tdB = signals[primaries[ib].index]?.trust_delta ?? 0;
          const avgTrust = (tdA + tdB) / 2;
          neurolinkPairs.push({ idxA: ia, idxB: ib, avgTrust, strength: avgTrust });
        }
      }
      // Track completed (3-node) clusters for formation blink
      if (capped.length === 3) {
        completedClusters.push({
          key,
          stateIndices: capped.map(localIdx => primaries[localIdx].index),
        });
      }
    }

    stateRef.current = state;
    // WO-754: compute proto-cluster count for RightRailHUD Clusters panel
    const protoClusterCount = Object.values(trifectaGroups).filter(g => {
      const c = [...g].slice(0, 3);
      return c.length === 2;
    }).length;
    return { primaryNodes: primaries, edges: edgeList, nodeStrength, nodeIds: ids, totalCount: state.length, neurolinkPairs, completedClusters, protoClusterCount };
  }, [signals, geometry, top1Idx, top1Color, top2Idx, top2Color, top3Idx, top3Color, top4Idx, top4Color, top5Idx, top5Color]);

  // WO-748: Structural Pruning — apply before render, after physics init
  const { pairs: prunedPairs } = useMemo(() => {
    const { pairs } = pruneSubstrate(neurolinkPairs, primaryNodes);
    if (!activeStateFilter) return { pairs };
    // WO-817: hide connector lines where either endpoint doesn't match state filter
    const filtered = pairs.filter(p => {
      const a = stateRef.current[p.idxA];
      const b = stateRef.current[p.idxB];
      return a?.originState === activeStateFilter && b?.originState === activeStateFilter;
    });
    return { pairs: filtered };
  }, [neurolinkPairs, primaryNodes, activeStateFilter]);

  // WO-754: report cluster counts to RightRailHUD via callback
  useEffect(() => {
    onClusterData?.({ protoCount: protoClusterCount ?? 0, completeCount: completedClusters?.length ?? 0 });
  }, [protoClusterCount, completedClusters, onClusterData]);

  // Cluster formation blink — reset fired set on each new signal load so fresh data triggers blinks
  useEffect(() => { clusterFormedRef.current.clear(); }, [signals]);

  // Cluster formation blink — fire once per cluster key when it first reaches 3 nodes
  useEffect(() => {
    if (!completedClusters?.length) return;
    const now = performance.now();
    const newBlinks = [];
    completedClusters.forEach(({ key, stateIndices }) => {
      if (!clusterFormedRef.current.has(key)) {
        clusterFormedRef.current.add(key);
        newBlinks.push({ key: `cblink-${key}-${now}`, stateIndices, t0: now });
      }
    });
    if (newBlinks.length) setClusterBlinks(prev => [...prev, ...newBlinks]);
  }, [completedClusters]);

  const lowestCluster = useMemo(() => {
    if (!alertMode) return null;
    const low = primaryNodes.filter(n => n.fs < ALERT_FS);
    if (!low.length) return null;
    return low
      .reduce((acc, n) => acc.add(n.pos), new THREE.Vector3())
      .divideScalar(low.length);
  }, [alertMode, primaryNodes]);

  useEffect(() => {
    const newSlams  = [];
    const newBright = [];
    const now = performance.now();

    signals.forEach((sig, i) => {
      const fs   = clamp01(sig.fs ?? (sig.strength ?? 1) / 5);
      const id   = sig.id ?? i;
      const prev = prevFsRef.current[id] ?? -1;

      // Velocity tracking
      const hist = fsHistoryRef.current[id];
      if (hist) {
        const deltaT = (now - hist.time) / 1000;
        if (deltaT > 0.1) {
          fsVelocityRef.current[id] = (fs - hist.fs) / deltaT;
          fsHistoryRef.current[id]  = { fs, time: now };
        }
      } else {
        fsHistoryRef.current[id]  = { fs, time: now };
        fsVelocityRef.current[id] = 0;
      }

      if (prev < CRYSTAL_FS && fs >= CRYSTAL_FS && !firedRef.current.has(id)) {
        firedRef.current.add(id);
        document.dispatchEvent(new Event('CONFIRMED'));
        const t0 = performance.now();
        slamScaleRef.current.set(i, t0);
        newSlams.push({ key: `slam-${id}-${t0}`, nodeIdx: i, t0 });
        newBright.push(i);
      }
      prevFsRef.current[id] = fs;
    });

    if (newSlams.length)  setSlamEvents(prev => [...prev, ...newSlams]);
    if (newBright.length) {
      setBrightNodeSet(prev => new Set([...prev, ...newBright]));
      setTimeout(() => {
        setBrightNodeSet(prev => {
          const next = new Set(prev);
          newBright.forEach(idx => next.delete(idx));
          return next;
        });
      }, SLAM_MS);
    }
  }, [signals]);

  useEffect(() => {
    matRef.current = material;
    material.needsUpdate = true;
    return () => { geometry.dispose(); material.dispose(); };
  }, [geometry, material]);


  // WO-810: Black Hole scenario — 'b' key toggle
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'b' || e.key === 'B') ScenarioInjector.toggle('BLACK_HOLE', stateRef);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // WO-703: Worker Raycasting — instantiate background thread once, wire hover result
  useEffect(() => {
    const worker = new Worker(new URL('./raycast.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data: { closest } }) => {
      const idx = closest === -1 ? null : closest;
      setHoveredIdx(idx);
      onHoverChange?.(idx);
      document.body.style.cursor = closest === -1 ? 'auto' : 'pointer';
    };
    rayWorkerRef.current = worker;
    return () => { worker.terminate(); rayWorkerRef.current = null; };
  }, []);

  // Signal-strength breach detection — fire onRedAlert when any node enters red
  const prevSignalStateRef = useRef({});
  const onRedAlertRef      = useRef(onRedAlert);
  onRedAlertRef.current    = onRedAlert;
  useEffect(() => {
    Object.entries(nodeStrength).forEach(([idx, s]) => {
      const band = s >= 0.6 ? 'green' : s >= 0.35 ? 'amber' : 'red';
      const prev = prevSignalStateRef.current[idx] ?? 'green';
      if (band === 'red' && prev !== 'red') {
        onRedAlertRef.current?.('signal');
        const nodePos = stateRef.current[parseInt(idx)]?.pos;
        if (nodePos) {
          const t0 = performance.now();
          setGhostAuras(prev => [...prev, { key: `aura-s-${idx}-${t0}`, pos: nodePos.clone(), t0 }]);
        }
      }
      prevSignalStateRef.current[idx] = band;
    });
  }, [nodeStrength]);

  const groupRefsMap = useRef({});
  const dummy    = useMemo(() => new THREE.Object3D(), []);

  // WO-736/730: Funnel contour wireframe — elliptical US footprint
  const FUNNEL_BOTTOM_Y = -3;
  const FUNNEL_TOP_Y    = 6;
  const funnelHeight    = FUNNEL_TOP_Y - FUNNEL_BOTTOM_Y;
  const funnelEdges = useMemo(() => {
    // Unit cylinder (r=1), scaled to US ellipse (10 x 6) via JSX scale prop
    const cyl = new THREE.CylinderGeometry(1, 1, funnelHeight, 64, 1, true);
    return new THREE.EdgesGeometry(cyl);
  }, []);

  // Zone rings — flat unit ellipse, scaled [11,1,7], positioned at zone Y heights
  const zoneRingGeo = useMemo(() => {
    const SEG = HIGH_CORE ? 64 : 32;
    const pts = [];
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      pts.push(Math.cos(a), 0, Math.sin(a));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    return geo;
  }, []);
  const avgViral = useMemo(() => {
    if (!primaryNodes.length) return 0;
    return primaryNodes.reduce((acc, n) => acc + n.eViral, 0) / primaryNodes.length;
  }, [primaryNodes]);

  // KRYL-313: corroboration score for selected nodes
  const corroborationScore = useMemo(() => {
    if (selectedSet.size < 2) return null;
    const sel = Array.from(selectedSet);
    const avg = sel.reduce((acc, idx) => acc + (primaryNodes[idx]?.fs ?? 0), 0) / sel.length;
    return avg;
  }, [selectedSet, primaryNodes]);

  useFrame(({ clock, camera }, dt) => {
    const m = matRef.current ?? material;
    m.uniforms.uTime.value      = clock.getElapsedTime();
    m.uniforms.uAlertMode.value = alertModeRef.current ? 1.0 : 0.0;
    m.uniforms.uDebugMode.value = debugMode ? 1.0 : 0.0;

    const mesh = meshRef.current;
    if (!mesh || isTimelineModeRef.current) return;

    const now = performance.now();

    // WO-0290-B: advance deterministic sim clock
    simTimeRef.current += KERNEL_DT;
    const simTime = simTimeRef.current;

    // WO-810: Scenario Injection — apply active scenario overrides before physics
    ScenarioInjector.tick(stateRef, simTime);

    // WO-809: Sovereign Gate — compute admitted set once per frame before forEach
    const admittedToCore = computeAdmittedSet(stateRef);

    // WO-808: Kernel Profiler — begin timing the physics forEach
    kernelProfiler.current.begin();

    stateRef.current.forEach((node) => {
      const US_A = 11;
      const US_B = 7;

      // WO-807: Ghost Detection — zombie nodes are dead; zero the slot and skip all physics
      if (node.isZombie) {
        dummy.position.set(0, -999, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(node.index, dummy.matrix);
        return;
      }

      if (node.primary) {
        // ── WO-0290-B: Centrifugal Truth Kernel ──────────────────────────────
        const fs    = round4(node.fsVal ?? 0);
        const fsPrev= round4(node.fsPrev ?? fs);

        // 1. Shatter gate — bypass all other logic on catastrophic drop
        const delta = round4(fsPrev - fs);
        if (delta > SHATTER_LIMIT && !node.isShattered) {
          node.isShattered = true;
          executeEjectionImpulseV2(node, simTime);
        }

        if (!node.isShattered) {
          // 2. Score & deterministic shim
          const gc       = geoCloseness(node.rGeo ?? 0.50);
          const combined = round4((gc * 0.3) + (fs * 0.7));
          node.combined  = combined;
          const shim     = Math.sin(simTime * 0.5 + (node.idPhase ?? 0)) * 0.02;
          node.thetaFinal = (node.thetaBase ?? 0) + shim;

          // WO-809: Sovereign Gate — hard admission check before sovereign detection
          if (!admittedToCore.has(node.index)) {
            rejectFromCore(node);
          }

          // WO-805: simTime-gated sovereign detection — must hold continuously for SOVEREIGN_HOLD
          if (admittedToCore.has(node.index) && combined > SOVEREIGN_LIMIT) {
            if (node.sovereignEntryTime == null) node.sovereignEntryTime = simTime;
          } else {
            node.sovereignEntryTime = null;
          }
          const sovereignHeld = node.sovereignEntryTime != null &&
            (simTime - node.sovereignEntryTime) >= SOVEREIGN_HOLD;

          // 3. State & target resolution — WO-805: use v2 resolver
          const state = resolveStateV2(node, sovereignHeld, simTime);
          node.nodeState = state;
          let rTarget, vMax;

          // Search-spring override: pull matching nodes to r=0.15, near-critical damping
          const isSearchMatch = matchSetRef.current?.has(node.index) ?? false;
          if (isSearchMatch) {
            // Override spring: rTarget=0.15, k=0.08, d=0.18 (near-critical)
            const SEARCH_K = 0.08;
            const SEARCH_D = 0.18;
            const searchForce = SEARCH_K * (0.15 - node.r);
            node.vr = (node.vr + searchForce * KERNEL_DT) * (1.0 - SEARCH_D);
            node.vr = Math.max(-2.0, Math.min(2.0, node.vr));
            node.r  = Math.max(0, Math.min(1, node.r + node.vr * KERNEL_DT));
          } else if (state === NS.L1_APPROACH) {
            rTarget = CORE_TARGET; vMax = 1.5; node.pulse = false;
          } else if (state === NS.L1_ANCHORED) {
            rTarget = CORE_TARGET; vMax = 0.0; node.pulse = true;
          } else {
            // NORMAL (L2/L3/L4): combined score maps evenly across R_MIN→R_MAX
            // High combined (local+high-integrity) → inner ring
            // Low combined  (national+low-integrity) → outer ring
            rTarget = R_MIN + (1.0 - combined) * (R_MAX - R_MIN);
            if      (combined >= 0.60) vMax = 1.0;
            else if (combined >= 0.40) vMax = 1.5;
            else                       vMax = 3.0;
            node.pulse = false;
          }

          // 4. Apply radial spring (r, vr integration) — only when not in search override
          if (!isSearchMatch) applyRadialSpringForces(node, rTarget, vMax);

          // 5. Revolution — thetaBase advances by tier churn rate
          const CHURN_BY_TIER = { local: 0.00019, regional: 0.00050, national: 0.00100 };
          const tier      = node.geoTier ?? 'national';
          const churnRate = CHURN_BY_TIER[tier] ?? 0.00100;
          node.thetaBase  = (node.thetaBase ?? 0) - churnRate * KERNEL_DT * 60;
          node.thetaFinal = node.thetaBase + shim;

          // 6. Project polar → world XZ
          node.pos.x = node.r * US_A * Math.cos(node.thetaFinal);
          node.pos.z = node.r * US_B * Math.sin(node.thetaFinal);
        } else {
          // SHATTERED: fly outward, fade over SHATTER_MS
          node.r = Math.min(1.5, node.r + node.vr * KERNEL_DT);
          node.vr *= 0.92; // bleed velocity
          node.pos.x = node.r * US_A * Math.cos(node.thetaFinal ?? 0);
          node.pos.z = node.r * US_B * Math.sin(node.thetaFinal ?? 0);
        }

        // Store fsPrev for next frame delta
        node.fsPrev = fs;

        // WO-752: Pulse State Machine — escape velocity + stalk snap
        const { newState, escaped } = tickPulseState(node, node.fsVal);
        if (escaped && node.pulseState !== PULSE_STATES.ESCAPING) {
          node.vel.y += 0.05;
          node.stalked = false;
        }
        node.pulseState = newState;

        // WO-753: Propagation Controller — Scrutiny Field
        node.underScrutiny = isUnderScrutiny(node);
        if (node.underScrutiny) applyScrutinyBrake(node);

      } else {
        // Field nodes — simple XZ drift + wall bounce (unchanged)
        const tier = 'national';
        const cc = Math.cos(-0.00100 * KERNEL_DT * 60);
        const ss = Math.sin(-0.00100 * KERNEL_DT * 60);
        const nx = node.pos.x * cc - node.pos.z * ss;
        const nz = node.pos.x * ss + node.pos.z * cc;
        node.pos.x = nx; node.pos.z = nz;
        const ex = node.pos.x / US_A, ez = node.pos.z / US_B;
        const ed = Math.sqrt(ex * ex + ez * ez);
        if (ed > 1) {
          node.pos.x = (ex / ed) * US_A;
          node.pos.z = (ez / ed) * US_B;
        }
      }

      // Y physics — zone-stratified altitude: ground zero = 0, each zone owns 2 units
      const zoneBounds = ZONE_BOUNDS[node.geoTier ?? 'national'];
      const yTarget    = zoneBounds.target;
      node.vel.y += (yTarget - node.pos.y) * 0.00012;
      node.vel.y *= 0.97;
      if (node.pos.y < zoneBounds.floor)   { node.pos.y = zoneBounds.floor;   node.vel.y =  Math.abs(node.vel.y) * 0.5; }
      if (node.pos.y > zoneBounds.ceiling) { node.pos.y = zoneBounds.ceiling; node.vel.y = -Math.abs(node.vel.y) * 0.5; }
      node.pos.y += node.vel.y;

      dummy.position.copy(node.pos);

      const slamT0 = slamScaleRef.current.get(node.index);
      if (slamT0 !== undefined) {
        const raw = (now - slamT0) / SLAM_MS;
        if (raw < 1) {
          dummy.scale.setScalar(1 + 0.35 * Math.sin(easeInOutCubic(raw) * Math.PI));
        } else {
          dummy.scale.setScalar(1);
          slamScaleRef.current.delete(node.index);
        }
      } else {
        dummy.scale.setScalar(1);
      }

      // WO-0290-B: shattered nodes fade over SHATTER_MS then disappear
      if (node.isShattered && node.shatterTime != null) {
        const age = (simTime - node.shatterTime) * 1000; // simTime is in seconds
        if (age >= SHATTER_MS) {
          dummy.scale.setScalar(0);
        } else {
          dummy.scale.multiplyScalar(1.0 - age / SHATTER_MS);
        }
      }

      // WO-802: Temporal Decay — fade nodes stale >300s to zero over 5s
      if (node.primary && !node.isShattered) {
        const staleness = now - (node.lastPacketAt ?? now);
        if (staleness > TTL_MS) {
          const decayT = Math.min(1.0, (staleness - TTL_MS) / DECAY_DURATION_MS);
          dummy.scale.multiplyScalar(1.0 - decayT);
        }
      }

      // WO-701: LOD bias — scale down by camera distance, cull beyond BOUNDS * 3
      const dist    = camera.position.distanceTo(node.pos);
      const lodBias = dist > BOUNDS * 3 ? 0.0 : dist > BOUNDS * 1.5 ? 0.65 : 1.0;
      dummy.scale.multiplyScalar(lodBias);

      // WO-812: Active filter mask — hide nodes that don't match any enabled filter bucket
      if (activeFilters && node.primary && !node.isShattered) {
        const tierKey = (node.geoTier ?? 'national').toUpperCase();
        const geoPass = activeFilters.geoZone.has(tierKey);

        const fs = node.fsVal ?? 0;
        const scoreKey = fs > 0.66 ? 'HIGH' : fs >= 0.33 ? 'MID' : 'LOW';
        const scorePass = activeFilters.signalScore.has(scoreKey);

        const ageMs = Date.now() - (node.lastPacketAt ?? Date.now());
        const ageH  = ageMs / 3_600_000;
        const ageKey = ageH < 12 ? 'FRESH' : ageH < 48 ? 'RECENT' : 'AGED';
        const agePass = activeFilters.age.has(ageKey);

        if (!geoPass || !scorePass || !agePass) dummy.scale.setScalar(0);
      }

      // WO-817: State filter — hide non-matching nodes
      if (activeStateFilter && node.primary && !node.isShattered) {
        if (node.originState !== activeStateFilter) {
          dummy.scale.setScalar(0);
        }
      }

      // WO-259: Weighted Lean — high-Fs primary nodes tilt toward camera on X
      dummy.rotation.set(
        node.primary ? node.fsVal * (Math.PI / 12) : 0,
        0,
        0
      );

      dummy.updateMatrix();
      mesh.setMatrixAt(node.index, dummy.matrix);

      // WO-0290-B: write dynamic per-node attributes for chromatic shift + Void Mode
      if (node.primary) {
        const idx = node.index;
        const isMatch = matchSetRef.current?.has(idx) ?? false;
        const isSovereign = node.nodeState === NS.L1_ANCHORED;
        const isShatteredNow = node.isShattered ? 1.0 : 0.0;
        geometry.attributes.aRadiusNorm.array[idx]  = node.r ?? 0;
        geometry.attributes.aSovereign.array[idx]   = isSovereign ? 1.0 : 0.0;
        geometry.attributes.aSearchMatch.array[idx] = isMatch ? 1.0 : 0.0;
        geometry.attributes.aShattered.array[idx]   = isShatteredNow;
        const yPos = node.pos.y;
        const zc   = yPos >= 4 ? [0.400,1.000,0.000] : yPos >= 2 ? [1.000,1.000,1.000] : [0.333,0.600,1.000];
        geometry.attributes.aIdentityColor.array[idx * 3]     = zc[0];
        geometry.attributes.aIdentityColor.array[idx * 3 + 1] = zc[1];
        geometry.attributes.aIdentityColor.array[idx * 3 + 2] = zc[2];
      }
    });

    // Zero out unused slots so phantom nodes don't appear when totalCount < MAX_NODES
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (let i = stateRef.current.length; i < MAX_NODES; i++) {
      mesh.setMatrixAt(i, dummy.matrix);
    }

    // WO-702: cap GPU buffer uploads to 30Hz — physics still run every frame
    if (now - lastUploadRef.current >= 33) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere(); // WO-700: frustum cull against accurate sphere each frame
      // WO-0290-B: upload chromatic shift + Void Mode attributes
      geometry.attributes.aRadiusNorm.needsUpdate    = true;
      geometry.attributes.aSovereign.needsUpdate     = true;
      geometry.attributes.aSearchMatch.needsUpdate   = true;
      geometry.attributes.aShattered.needsUpdate     = true;
      geometry.attributes.aIdentityColor.needsUpdate = true;
      geometry.attributes.aScale.needsUpdate         = true;  // WO-802: decay scale
      lastUploadRef.current = now;
      kernelProfiler.current.recordUpload(); // WO-808: tick GPU upload counter
    }

    // WO-808: end physics timing — record sample against active primary node count
    kernelProfiler.current.end(stateRef.current.filter(n => n.primary && !n.isZombie).length);

    // Sync overlay groups to live node positions so hit-targets track moving spheres
    stateRef.current.forEach((node, idx) => {
      if (!node.primary) return;
      const g = groupRefsMap.current[idx];
      if (g) g.position.copy(node.pos);
    });

    // Velocity timer — per-node negative duration tracking
    const elapsed = clock.getElapsedTime();
    nodeIds.forEach((id, i) => {
      const vel   = fsVelocityRef.current[id] ?? 0;
      const timer = velocityTimerRef.current[i] ?? { negStart: null, state: 'green' };

      if (vel <= THRESHOLDS.velocity.redRate) {
        timer.negStart = null;
        timer.state    = 'red';
      } else if (vel < -0.001) {
        if (timer.negStart === null) timer.negStart = elapsed;
        const dur = elapsed - timer.negStart;
        timer.state = dur >= THRESHOLDS.velocity.amberDuration ? 'amber' : 'green';
      } else {
        timer.negStart = null;
        timer.state    = 'green';
      }

      velocityTimerRef.current[i] = timer;

      // Fire onRedAlert on transition to red
      const prev = prevVelBandRef.current[i] ?? 'green';
      if (timer.state === 'red' && prev !== 'red') {
        onRedAlertRef.current?.('velocity');
        const nodePos = stateRef.current[i]?.pos;
        if (nodePos) {
          const t0 = performance.now();
          setGhostAuras(prev => [...prev, { key: `aura-v-${i}-${t0}`, pos: nodePos.clone(), t0 }]);
        }
      }
      prevVelBandRef.current[i] = timer.state;
    });

    // WO-808: Kernel Profiler — periodic report every 30s (or when p95 exceeds budget)
    kernelProfiler.current.shouldReport(now);

    // WO-807: Ghost Detection — scan for zombie nodes every 10s
    if (now - lastGhostScanRef.current >= 10_000) {
      lastGhostScanRef.current = now;
      scanForZombies(stateRef, now);
    }

    // WO-806: Telemetry Parity — audit GPU attributes vs stateRef at 5s interval
    if (now - lastAuditRef.current >= 5000) {
      lastAuditRef.current = now;
      auditMeshParity(geometry, stateRef, NS);
    }
  });

  // KRYL-314: search match
  const searchLower = searchQuery.trim().toLowerCase();
  const matchSet = useMemo(() => {
    if (!searchLower) return null;
    const s = new Set();
    primaryNodes.forEach((n, i) => {
      if (
        n.id.toLowerCase().includes(searchLower) ||
        signals[i]?.text?.toLowerCase().includes(searchLower) ||
        signals[i]?.truth_statement?.toLowerCase().includes(searchLower)
      ) s.add(i);
    });
    return s;
  }, [searchLower, primaryNodes]);
  matchSetRef.current = matchSet; // WO-0290-B: keep ref in sync for physics loop access

  return (
    <>
      <color attach="background" args={['#000000']} />

      {/* WO-717: US Mesh Map replaces city video/matte background */}
      <Layer3USMesh />

      {/* WO-896: Signal Field — InstancedMesh node engine */}
      {/* ClusterField (Option A swap) renders formation clusters */}
      <ClusterField signals={signals} />
      {/* <SignalField /> */}

      {/* WO-1038: Leverage Engine — Shannon-gated, u_impact tracks dominant signal XZ */}
      <LeverageEngine stateRef={stateRef} signals={signals} />

      {/* WO-736: Funnel contour — physics boundary made visible */}
      <lineSegments
        geometry={funnelEdges}
        position={[0, FUNNEL_BOTTOM_Y + funnelHeight / 2, 0]}
        scale={[11, 1, 7]}
      >
        <lineBasicMaterial color="#66FF00" transparent opacity={0.07} depthWrite={false} />
      </lineSegments>

      {/* Zone lattice — elevation-banded rings, side/mid view only */}
      <ZoneRings zoneRingGeo={zoneRingGeo} lockedZone={lockedZone} setLockedZone={setLockedZone} />

      {/* WO-0288: Debug rings — r=0.08 (local/green), r=0.18 (regional/yellow), r=0.33 (national/magenta) */}
      {/* Scale = r * [US_A, 1, US_B]. Press 'd' to toggle. */}
      {/* WO-810: Scenario Injection — active scenario HUD badge */}
      {ScenarioInjector.isActive && (
        <Html position={[0, 7, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            fontFamily:    'IBM Plex Mono, monospace',
            fontSize:      '8px',
            color:         '#66FF00',
            letterSpacing: '0.18em',
            background:    'rgba(0,0,0,0.8)',
            border:        '1px solid rgba(255,59,59,0.5)',
            padding:       '3px 8px',
            borderRadius:  '2px',
            animation:     'none',
          }}>
            {ScenarioInjector.activeLabel}
          </div>
        </Html>
      )}


      <ResonanceWave heartbeat={heartbeat} />



      {/* KRYL-313: corroboration score HUD */}
      {corroborationScore !== null && (
        <Html position={[BOUNDS * 0.9, BOUNDS * 0.65, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            fontFamily:    'IBM Plex Mono, monospace',
            fontSize:      '10px',
            color:         'rgba(0,220,180,0.85)',
            letterSpacing: '0.1em',
            textAlign:     'right',
          }}>
            corroboration: {corroborationScore.toFixed(3)}<br />
            <span style={{ opacity: 0.5, fontSize: '9px' }}>
              {selectedSet.size} nodes selected
            </span>
          </div>
        </Html>
      )}





      {clusterBlinks.map(ev => (
        <ClusterFormationBlink
          key={ev.key}
          stateRef={stateRef}
          stateIndices={ev.stateIndices}
          t0={ev.t0}
          onExpire={() => setClusterBlinks(prev => prev.filter(e => e.key !== ev.key))}
        />
      ))}

      {slamEvents.map(ev => (
        <SlamOverlay
          key={ev.key}
          stateRef={stateRef}
          nodeIdx={ev.nodeIdx}
          t0={ev.t0}
          onExpire={() => setSlamEvents(prev => prev.filter(e => e.key !== ev.key))}
        />
      ))}

      {/* PulseEdge removed — WO-603 stalks replace edge web */}

      {/* WO-734/748: Neurolink Edges — pruned pairs (max-3, proximity-filtered) */}
      <NeurolinkEdges pairs={prunedPairs} stateRef={stateRef} />

      {/* KRYL-313: corroboration bridges for selected pairs */}
      <CorroborationBridges selectedNodes={selectedSet} stateRef={stateRef} />

      <GhostCapture primaryNodes={primaryNodes} totalCount={totalCount} captureRef={captureRef} />

      {/* WO-801: Elastic HUD Labels — force-directed separation for r<0.15 core cluster */}
      <ElasticCoreLabels primaryNodes={primaryNodes} stateRef={stateRef} />

      <OrbitControls
        ref={orbitRef}
        enabled={!isTimelineMode}
        enableDamping
        enablePan={false}
        dampingFactor={0.08}
        rotateSpeed={0.5}
        minDistance={16}
        maxDistance={19}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2.2}
      />
    </>
  );
}

// ── WO-746: Leaderboard hover overlay ─────────────────────────────────────────
function LeaderboardHoverOverlay({ externalHoveredIdx, top6, activeSignals }) {
  if (externalHoveredIdx == null) return null;
  if (top6.some(e => e.idx === externalHoveredIdx)) return null;
  const sig = activeSignals[externalHoveredIdx];
  if (!sig) return null;
  const scoreBar   = Math.round((sig.fs ?? 0) * 100);
  const scoreColor = (sig.fs ?? 0) >= 0.7 ? '#66FF00' : (sig.fs ?? 0) >= 0.4 ? '#F5A623' : '#ff6b6b';
  return (
    <>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px -14px 8px' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(255,255,255,0.05)', borderLeft: '2px solid rgba(255,255,255,0.3)', borderRadius: '3px', padding: '6px 8px', margin: '0 -6px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '10px', letterSpacing: '0.06em', lineHeight: '1.4' }}>
            {sig.text ?? sig.truth_statement ?? sig.title ?? sig.id}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px' }}>
              <div style={{ width: `${scoreBar}%`, height: '100%', background: scoreColor, borderRadius: '1px' }} />
            </div>
            <span style={{ color: scoreColor, fontSize: '9px', letterSpacing: '0.08em', flexShrink: 0 }}>{scoreBar}</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ── WO-754: Right-Rail Control Panel ─────────────────────────────────────────
// 6-slot icon strip. Order ranked by click count, persisted in localStorage.
const RAIL_USAGE_KEY = 'krylo_rail_usage';
const loadRailUsage  = () => { try { return JSON.parse(localStorage.getItem(RAIL_USAGE_KEY) ?? '{}'); } catch { return {}; } };
const saveRailUsage  = (u) => { try { localStorage.setItem(RAIL_USAGE_KEY, JSON.stringify(u)); } catch {} };

const RAIL_ICONS = [
  { id: 'leaderboard', title: 'Signal Rank',     svg: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="3" height="6"/><rect x="8.5" y="7" width="3" height="10"/><rect x="14" y="3" width="3" height="14"/></svg> },
  { id: 'clusters',    title: 'Clusters',         svg: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="10,3 18,17 2,17"/></svg> },
  { id: 'signals',     title: 'Active Signals',   svg: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="10" cy="10" r="2.5"/><path d="M5.5 14.5a6.5 6.5 0 0 1 0-9M14.5 5.5a6.5 6.5 0 0 1 0 9"/><path d="M3 17a9.5 9.5 0 0 1 0-14M17 3a9.5 9.5 0 0 1 0 14"/></svg> },
  { id: 'search',      title: 'Search Nodes',     svg: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8.5" cy="8.5" r="5"/><line x1="13" y1="13" x2="17" y2="17"/></svg> },
  { id: 'filters',     title: 'Filters',           svg: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="3" y1="5" x2="17" y2="5"/><line x1="5" y1="10" x2="15" y2="10"/><line x1="7" y1="15" x2="13" y2="15"/></svg> },
  { id: 'settings',    title: 'Settings',          svg: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"/></svg> },
  { id: 'capture',     title: 'Ghost Capture',     svg: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="16" height="11" rx="2"/><path d="M7 6V5a3 3 0 0 1 6 0v1"/><circle cx="10" cy="11.5" r="2.5"/></svg> },
];

function RightRailHUD({
  top6, leaderboardHoveredIdx, setLeaderboardHoveredIdx,
  leaderboardClickEvent, setLeaderboardClickEvent,
  searchNodeLabel, searchNodeIdx, searchNodeRank,
  externalHoveredIdx, activeSignals, clusterData,
  debugMode, setDebugMode, totalCount,
  searchQuery, setSearchQuery,
  liveFeed, toggleLiveFeed, fetchLoading, fetchError, handleRefresh, heartbeat,
  triggerCapture,
  activeFilters, setActiveFilters,
}) {
  const [activePanel, setActivePanel] = useState(null);
  const [usage, setUsage] = useState(() => loadRailUsage());

  const toggle = (id) => {
    setActivePanel(p => {
      if (p === id) return null;
      // increment click count and persist
      setUsage(prev => {
        const next = { ...prev, [id]: (prev[id] ?? 0) + 1 };
        saveRailUsage(next);
        return next;
      });
      return id;
    });
  };

  // Sort by click count descending — equal counts preserve RAIL_ICONS default order
  const sortedIcons = [...RAIL_ICONS].sort((a, b) => (usage[b.id] ?? 0) - (usage[a.id] ?? 0));

  const STRIP_BG   = 'rgba(10,12,16,0.82)';
  const PANEL_BG   = 'rgba(10,12,16,0.88)';
  const TILE_SIZE  = 40;
  const PANEL_W    = 240;

  return (
    <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 20, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>

      {/* Slide-in panel */}
      {activePanel && (
        <div style={{
          width: `${PANEL_W}px`, maxHeight: '70vh', overflowY: 'auto',
          background: PANEL_BG, borderLeft: '1px solid rgba(255,255,255,0.07)',
          padding: '14px 14px', pointerEvents: 'auto',
          fontFamily: 'IBM Plex Mono, monospace',
        }}>
          {/* ── Leaderboard panel ── */}
          {activePanel === 'leaderboard' && (
            <div>
              <div style={{ color: '#66FF00', fontSize: '10px', letterSpacing: '0.2em', marginBottom: '12px', textTransform: 'uppercase' }}>Signal Rank</div>
              {top6.slice(0, 5).map(({ rank, color, signal, idx }) => {
                const isHov      = leaderboardHoveredIdx === idx || externalHoveredIdx === idx;
                const isSearch   = searchNodeIdx != null && idx === searchNodeIdx;
                return (
                  <div key={rank}
                    onMouseEnter={() => setLeaderboardHoveredIdx(idx)}
                    onMouseLeave={() => setLeaderboardHoveredIdx(null)}
                    onClick={() => setLeaderboardClickEvent({ idx, t0: performance.now() })}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '9px',
                      cursor: 'pointer', padding: '5px 6px',
                      background: isSearch ? 'rgba(102,255,0,0.08)' : isHov ? 'rgba(102,255,0,0.06)' : 'transparent',
                      borderLeft: isSearch ? '2px solid rgba(102,255,0,0.6)' : isHov ? '2px solid #66FF00' : '2px solid transparent',
                      borderRadius: '3px', transition: 'all 0.15s',
                    }}>
                    <span style={{ color: isHov ? '#66FF00' : 'rgba(255,255,255,0.3)', fontSize: '9px', letterSpacing: '0.1em', width: '22px', textAlign: 'right', flexShrink: 0, paddingTop: '1px' }}>{rank}</span>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0, marginTop: '3px', boxShadow: isHov ? `0 0 5px ${color}` : 'none' }} />
                    <span style={{ color: isHov ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.75)', fontSize: '10px', letterSpacing: '0.05em', lineHeight: '1.45' }}>
                      {signal.text ?? signal.truth_statement ?? signal.id}
                    </span>
                  </div>
                );
              })}
              {/* Slot 6 — only when search subject is outside top 5; shows true rank */}
              {(searchNodeRank === null || searchNodeRank > 5) && (() => {
                const searchSig    = searchNodeIdx != null ? activeSignals[searchNodeIdx] : null;
                const tier         = searchSig?.geoTier ?? null;
                const zc           = tier ? (ZONE_COLORS[tier] ?? '#66FF00') : '#66FF00';
                const zcRgb        = tier === 'local' ? '85,153,255' : tier === 'regional' ? '255,255,255' : '102,255,0';
                const isA          = leaderboardHoveredIdx === searchNodeIdx || externalHoveredIdx === searchNodeIdx;
                return (
                  <div
                    onMouseEnter={() => searchNodeIdx != null && setLeaderboardHoveredIdx(searchNodeIdx)}
                    onMouseLeave={() => setLeaderboardHoveredIdx(null)}
                    onClick={() => { if (searchNodeIdx == null) return; setLeaderboardClickEvent({ idx: searchNodeIdx, t0: performance.now() }); }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '4px',
                      background: isA ? `rgba(${zcRgb},0.14)` : `rgba(${zcRgb},0.08)`,
                      borderLeft: `2px solid rgba(${zcRgb},0.6)`,
                      borderRadius: '4px', padding: '6px 6px',
                      cursor: searchNodeIdx != null ? 'pointer' : 'default',
                      transition: 'background 0.15s',
                    }}>
                    <span style={{ color: zc, fontSize: '9px', letterSpacing: '0.08em', width: '22px', textAlign: 'right', flexShrink: 0, paddingTop: '1px' }}>
                      {searchNodeRank ? searchNodeRank.toLocaleString() : '—'}
                    </span>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: searchNodeLabel ? zc : `rgba(${zcRgb},0.2)`, flexShrink: 0, marginTop: '3px', boxShadow: searchNodeLabel ? `0 0 5px ${zc}` : 'none' }} />
                    <span style={{ color: searchNodeLabel ? zc : `rgba(${zcRgb},0.3)`, fontSize: '10px', letterSpacing: '0.05em', lineHeight: '1.45', fontStyle: searchNodeLabel ? 'normal' : 'italic' }}>
                      {searchNodeLabel ?? 'awaiting signal'}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── Clusters panel ── */}
          {activePanel === 'clusters' && (
            <div>
              <div style={{ color: '#66FF00', fontSize: '10px', letterSpacing: '0.2em', marginBottom: '14px', textTransform: 'uppercase' }}>Clusters</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '3px', borderLeft: '2px solid rgba(102,255,0,0.3)' }}>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', letterSpacing: '0.12em', marginBottom: '6px' }}>FORMING</div>
                  <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '22px', letterSpacing: '0.05em' }}>{clusterData.protoCount}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '3px', borderLeft: '2px solid #66FF00' }}>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', letterSpacing: '0.12em', marginBottom: '6px' }}>COMPLETE</div>
                  <div style={{ color: '#66FF00', fontSize: '22px', letterSpacing: '0.05em' }}>{clusterData.completeCount}</div>
                </div>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px', letterSpacing: '0.1em', lineHeight: '1.6' }}>
                <div>2 nodes → edge drawn, forming</div>
                <div>3 nodes → triangle locked, complete</div>
              </div>
            </div>
          )}

          {/* ── Active Signals panel ── */}
          {activePanel === 'signals' && (
            <div>
              <div style={{ color: '#66FF00', fontSize: '10px', letterSpacing: '0.2em', marginBottom: '4px', textTransform: 'uppercase' }}>Active Signals</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', letterSpacing: '0.1em', marginBottom: '12px' }}>nodes: {totalCount}</div>
              {[...activeSignals].sort((a, b) => (b.fs ?? 0) - (a.fs ?? 0)).slice(0, 20).map((sig, i) => {
                const fs = sig.fs ?? 0;
                const bar = Math.round(fs * 100);
                const col = fs >= 0.7 ? '#66FF00' : fs >= 0.4 ? '#F5A623' : '#ff6b6b';
                return (
                  <div key={sig.id ?? i} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '9px', letterSpacing: '0.05em', lineHeight: '1.4', marginBottom: '4px' }}>
                      {sig.text ?? sig.truth_statement ?? sig.title ?? sig.id}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.08)', borderRadius: '1px' }}>
                        <div style={{ width: `${bar}%`, height: '100%', background: col, borderRadius: '1px' }} />
                      </div>
                      <span style={{ color: col, fontSize: '9px', letterSpacing: '0.06em', flexShrink: 0 }}>{bar}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Search panel ── */}
          {activePanel === 'search' && (
            <div>
              <div style={{ color: '#66FF00', fontSize: '10px', letterSpacing: '0.2em', marginBottom: '14px', textTransform: 'uppercase' }}>Search Nodes</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="keyword..."
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#66FF00'; e.currentTarget.style.background = 'rgba(102,255,0,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  style={{
                    flex:          1,
                    fontFamily:    'IBM Plex Mono, monospace',
                    fontSize:      '11px',
                    letterSpacing: '0.06em',
                    background:    'rgba(255,255,255,0.04)',
                    border:        '1px solid rgba(255,255,255,0.12)',
                    borderRadius:  '0',
                    color:         'rgba(232,244,255,0.85)',
                    padding:       '7px 10px',
                    outline:       'none',
                    transition:    'border-color 150ms, background 150ms',
                  }}
                />
                {searchQuery && (
                  <div
                    onClick={() => setSearchQuery('')}
                    style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
                  >✕</div>
                )}
              </div>
              {searchQuery && (
                <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px', letterSpacing: '0.1em', marginTop: '10px' }}>
                  matching nodes pulled to core
                </div>
              )}
            </div>
          )}

          {/* ── Filters panel ── */}
          {activePanel === 'filters' && activeFilters && (
            <div>
              <div style={{ color: '#66FF00', fontSize: '10px', letterSpacing: '0.2em', marginBottom: '14px', textTransform: 'uppercase' }}>Filters</div>
              {[
                { key: 'geoZone',     label: 'GEO ZONE',     opts: [{ id: 'LOCAL', label: 'LOCAL' }, { id: 'REGIONAL', label: 'REGIONAL' }, { id: 'NATIONAL', label: 'NATIONAL' }] },
                { key: 'signalScore', label: 'SIGNAL SCORE', opts: [{ id: 'LOW', label: 'LOW < 0.33' }, { id: 'MID', label: 'MID 0.33–0.66' }, { id: 'HIGH', label: 'HIGH > 0.66' }] },
                { key: 'age',         label: 'AGE',          opts: [{ id: 'FRESH', label: 'FRESH < 12h' }, { id: 'RECENT', label: 'RECENT 12–48h' }, { id: 'AGED', label: 'AGED > 48h' }] },
              ].map(({ key, label, opts }) => (
                <div key={key} style={{ marginBottom: '14px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', letterSpacing: '0.14em', marginBottom: '7px' }}>{label}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {opts.map(({ id, label: optLabel }) => {
                      const checked = activeFilters[key].has(id);
                      return (
                        <div
                          key={id}
                          onClick={() => setActiveFilters(prev => {
                            const next = new Set(prev[key]);
                            checked ? next.delete(id) : next.add(id);
                            return { ...prev, [key]: next };
                          })}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', pointerEvents: 'auto', userSelect: 'none' }}
                        >
                          <div style={{
                            width: '12px', height: '12px', border: `1px solid ${checked ? '#66FF00' : 'rgba(255,255,255,0.2)'}`,
                            borderRadius: '2px', flexShrink: 0, background: checked ? '#66FF00' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {checked && <div style={{ width: '6px', height: '6px', background: '#000', borderRadius: '1px' }} />}
                          </div>
                          <span style={{ color: checked ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)', fontSize: '9px', letterSpacing: '0.08em' }}>{optLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Settings panel ── */}
          {activePanel === 'settings' && (() => {
            const hbBand  = evaluateThresholds({ heartbeat }).heartbeat ?? 'green';
            const hbColor = THRESHOLD_COLORS[hbBand];
            return (
            <div>
              <div style={{ color: '#66FF00', fontSize: '10px', letterSpacing: '0.2em', marginBottom: '14px', textTransform: 'uppercase' }}>Settings</div>

              {/* Live Feed */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: liveFeed ? 'rgba(0,184,148,0.75)' : 'rgba(255,255,255,0.4)', fontSize: '9px', letterSpacing: '0.12em' }}>LIVE FEED</span>
                  {liveFeed && fetchLoading && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.12)', borderTopColor: '#00b894', animation: 'krylo-spin 0.8s linear infinite' }} />
                  )}
                  {liveFeed && !fetchLoading && (
                    <span onClick={handleRefresh} style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', cursor: 'pointer', letterSpacing: '0.08em', lineHeight: 1 }}>↻</span>
                  )}
                  {fetchError && !fetchLoading && (
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF4444', boxShadow: '0 0 4px #FF444466' }} />
                  )}
                </div>
                <div onClick={toggleLiveFeed} style={{ width: '28px', height: '16px', borderRadius: '8px', background: liveFeed ? 'rgba(0,184,148,0.3)' : 'rgba(232,244,255,0.06)', border: `1px solid ${liveFeed ? 'rgba(0,184,148,0.45)' : 'rgba(232,244,255,0.1)'}`, position: 'relative', cursor: 'pointer', transition: 'background 0.2s', pointerEvents: 'auto' }}>
                  <div style={{ position: 'absolute', top: '2px', left: liveFeed ? '14px' : '2px', width: '10px', height: '10px', borderRadius: '50%', background: liveFeed ? '#00b894' : 'rgba(232,244,255,0.22)', transition: 'left 0.18s, background 0.18s' }} />
                </div>
              </div>

              {/* Heartbeat */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: hbColor, boxShadow: `0 0 5px ${hbColor}66`, flexShrink: 0 }} />
                <span style={{ color: `${hbColor}99`, fontSize: '9px', letterSpacing: '0.12em' }}>HEARTBEAT</span>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', letterSpacing: '0.12em' }}>DEBUG RINGS</span>
                  <div onClick={() => setDebugMode(v => !v)} style={{ width: '28px', height: '16px', borderRadius: '8px', background: debugMode ? 'rgba(102,255,0,0.3)' : 'rgba(232,244,255,0.06)', border: `1px solid ${debugMode ? 'rgba(102,255,0,0.45)' : 'rgba(232,244,255,0.1)'}`, position: 'relative', cursor: 'pointer', transition: 'background 0.2s', pointerEvents: 'auto' }}>
                    <div style={{ position: 'absolute', top: '2px', left: debugMode ? '13px' : '2px', width: '10px', height: '10px', borderRadius: '50%', background: debugMode ? '#66FF00' : 'rgba(232,244,255,0.22)', transition: 'left 0.18s, background 0.18s' }} />
                  </div>
                </div>
              </div>

              <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: '9px', letterSpacing: '0.1em', lineHeight: '1.8' }}>
                <div>d — toggle debug rings</div>
              </div>
            </div>
            );
          })()}
        </div>
      )}

      {/* Icon strip */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '2px',
        background: STRIP_BG, padding: '4px', pointerEvents: 'auto',
        alignSelf: 'center',
      }}>
        {sortedIcons.map(({ id, title, svg }) => {
          const isOn = activePanel === id;
          return (
            <div
              key={id}
              title={title}
              onClick={() => id === 'capture' ? triggerCapture?.() : toggle(id)}
              style={{
                width:  `${TILE_SIZE}px`,
                height: `${TILE_SIZE}px`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                background: isOn ? 'rgba(255,255,255,0.10)' : 'transparent',
                color: isOn ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                transition: 'background 0.15s, color 0.15s',
                borderLeft: isOn ? '1px solid rgba(102,255,0,0.4)' : '1px solid transparent',
              }}>
              <div style={{ width: '18px', height: '18px' }}>{svg}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function SignalMap({ data, signalMapData, isActive = false, onSelect, contained = false, filterQuery = null }) {
  const resolved = signalMapData ?? data;
  const signals  = Array.isArray(resolved) ? resolved : (resolved?.signals ?? []);
  const loading  = resolved?.loading ?? false;

  // filterQuery: terms derived from the search query for node dimming
  const filterTerms = filterQuery
    ? filterQuery.toLowerCase().split(/\s+/).filter(t => t.length > 2)
    : null;

  function nodeMatchesFilter(sig) {
    if (!filterTerms || filterTerms.length === 0) return true;
    const haystack = [
      sig.text, sig.truth_statement, sig.title,
      sig.category_id, sig.domain, sig.origin,
    ].filter(Boolean).join(' ').toLowerCase();
    return filterTerms.some(t => haystack.includes(t));
  }

  // WO-746: external hover index — lifted from Scene for leaderboard sync
  const [externalHoveredIdx, setExternalHoveredIdx] = useState(null);
  const [leaderboardHoveredIdx, setLeaderboardHoveredIdx] = useState(null);
  const [leaderboardClickEvent, setLeaderboardClickEvent] = useState(null); // { idx, t0 }

  // WO-754: debugMode lifted from Scene; clusterData fed by Scene via callback
  const [debugMode, setDebugMode] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    geoZone:     new Set(['LOCAL', 'REGIONAL', 'NATIONAL']),
    signalScore: new Set(['LOW', 'MID', 'HIGH']),
    age:         new Set(['FRESH', 'RECENT', 'AGED']),
  });
  const [clusterData, setClusterData] = useState({ protoCount: 0, completeCount: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [activeStateFilter, setActiveStateFilter] = useState(null); // WO-817
  const [lockedZone, setLockedZone] = useState(null); // WO-892
  useEffect(() => {
    if (lockedZone) {
      setActiveFilters(prev => ({ ...prev, geoZone: new Set([lockedZone]) }));
    } else {
      setActiveFilters(prev => ({ ...prev, geoZone: new Set(['LOCAL', 'REGIONAL', 'NATIONAL']) }));
    }
  }, [lockedZone]);
  const [promotedNodes, setPromotedNodes] = useState([]); // WO-873
  const [isTimelineMode, setIsTimelineMode] = useState(false); // WO-1120
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'd' || e.key === 'D') setDebugMode(v => !v);
      if (e.key === 't' || e.key === 'T') setIsTimelineMode(v => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Live Feed state — WO-254 (declared here so activeSignals can depend on it)
  const [liveFeed, setLiveFeed] = useState(false);
  const [newsSignals,  setNewsSignals]  = useState([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError,   setFetchError]   = useState(false);

  // WO-738: live ETR pool — 25 news + 25 HN fetched on mount, always merged
  const [livePool, setLivePool] = useState([]);
  useEffect(() => {
    let cancelled = false;
    // Spread full ETR object first — preserves trust_delta, category_id,
    // integrity_badges, keccak_hash, synthetic_risk_score from WO-750/751.
    // Only override fields that need renaming for spinemap compatibility.
    const mapNews = r => ({
      ...r,
      text:     r.title ?? r.id,
      source:   r.source_type ?? 'news',
      strength: Math.round((r.fs ?? 0) * 5),
      primary:  true,
      fidelity: { m_checksum: r.fidelity_components?.m_checksum ?? 0, t_telemetry: r.fidelity_components?.t_telemetry ?? 0, e_viral: r.fidelity_components?.e_viral ?? 0 },
    });
    const mapHN = h => ({
      ...h,
      text:     h.title ?? h.id,
      source:   h.source_type ?? 'hackernews',
      strength: Math.round((h.fs ?? 0) * 5),
      primary:  true,
      fidelity: { m_checksum: h.fidelity_components?.m_checksum ?? 0, t_telemetry: h.fidelity_components?.t_telemetry ?? 0, e_viral: h.fidelity_components?.e_viral ?? 0 },
    });
    Promise.allSettled([
      fetchHeadlines().catch(() => []),
      fetchHNTop(25).catch(() => []),
    ]).then(([newsRes, hnRes]) => {
      if (cancelled) return;
      const news = newsRes.status === 'fulfilled' ? newsRes.value.map(mapNews) : [];
      const hn   = hnRes.status  === 'fulfilled' ? hnRes.value.map(mapHN)   : [];
      setLivePool([...news, ...hn]);
    });
    return () => { cancelled = true; };
  }, []);

  // Active signal source: mockETRs always present as base ecosystem layer
  // Real signals + live pool merge on top — deduplicated by id
  const rawActiveSignals = useMemo(() => {
    const live = liveFeed && newsSignals.length ? newsSignals : signals;
    const seen = new Set();
    const pool = [];
    // Real signals take priority
    for (const s of [...live, ...livePool]) {
      if (!seen.has(s.id)) { seen.add(s.id); pool.push(s); }
    }
    // Mock ETRs fill the ecosystem — skip any id already present
    for (const s of mockETRs) {
      if (!seen.has(s.id)) { seen.add(s.id); pool.push(s); }
    }
    // WO-746: inject search ETR so searchNodeIdx resolves and echo-locate ring fires
    if (data?.id && !seen.has(data.id)) {
      pool.push(data);
    }
    return pool;
  }, [liveFeed, newsSignals, signals, livePool, data]);

  // WO-510 filter removed — ageNorm physics handles recency, timestamp cap was killing live ETRs
  const activeSignals = useMemo(() => rawActiveSignals, [rawActiveSignals]);

  const alertMode = useMemo(
    () => activeSignals.some(s => clamp01(s.fs ?? (s.strength ?? 1) / 5) < ALERT_FS),
    [activeSignals]
  );

  // WO-612: Search node rank — position of submitted signal in full ecosystem
  const searchNodeRank = useMemo(() => {
    if (!data?.id) return null;
    const sorted = [...activeSignals].sort((a, b) => (b.fs ?? 0) - (a.fs ?? 0));
    const idx = sorted.findIndex(s => s.id === data.id);
    return idx >= 0 ? idx + 1 : null;
  }, [activeSignals, data]);

  const searchNodeLabel = data?.text ?? data?.truth_statement ?? data?.title ?? data?.id ?? null;
  const searchNodeIdx = useMemo(() => {
    if (!data?.id) return null;
    const idx = activeSignals.findIndex(s => s.id === data.id);
    return idx >= 0 ? idx : null;
  }, [activeSignals, data]);

  // WO-604: Top-6 leaderboard — sorted by fs, assigned identity colors
  const top6 = useMemo(() => {
    return [...activeSignals]
      .map((s, i) => ({ s, i }))
      .sort((a, b) => (b.s.fs ?? 0) - (a.s.fs ?? 0))
      .slice(0, 6)
      .map((item, rank) => ({
        idx:    item.i,
        signal: item.s,
        color:  IDENTITY_COLORS[rank],
        rank:   rank + 1,
      }));
  }, [activeSignals]);

  const identityColorMap = useMemo(() => {
    const m = new Map();
    top6.forEach(({ idx, color }) => m.set(idx, color));
    return m;
  }, [top6]);

  const topSixSet = useMemo(() => new Set(top6.slice(0, 5).map(({ idx }) => idx)), [top6]);

  // Top-6 identity index/color pairs passed to Scene
  const top1Idx = top6[0]?.idx ?? -1; const top1Color = top6[0]?.color ?? null;
  const top2Idx = top6[1]?.idx ?? -1; const top2Color = top6[1]?.color ?? null;
  const top3Idx = top6[2]?.idx ?? -1; const top3Color = top6[2]?.color ?? null;
  const top4Idx = top6[3]?.idx ?? -1; const top4Color = top6[3]?.color ?? null;
  const top5Idx = top6[4]?.idx ?? -1; const top5Color = top6[4]?.color ?? null;
  const top6Idx = top6[5]?.idx ?? -1; const top6Color = top6[5]?.color ?? null;

  // WO-628: City selector state
  const [activeCity, setActiveCity] = useState('phl');
  const handleCityTransition = useCallback((nextCity) => {
    if (nextCity === activeCity) return;
    setActiveCity(nextCity);
  }, [activeCity]);

  const captureRef = useRef(null);
  const [flashing, setFlashing]       = useState(false);
  const [lockedIdx, setLockedIdx]     = useState(null);   // KRYL-312
  const [lockedNodeData, setLockedNodeData] = useState(null); // WO-506
  const handleNodeLock = useCallback((data) => {
    setLockedNodeData(data);
    if (onSelect && data?.signal) onSelect(data.signal);
  }, [onSelect]);
  const [scorecardSignal, setScorecardSignal] = useState(null); // WO-740
  const [selectedSet, setSelectedSet] = useState(new Set()); // KRYL-313
  const [searchQuery, setSearchQuery] = useState('');     // KRYL-314
  const [heartbeat, setHeartbeat]     = useState(1.0);
  const containerRef  = useRef();
  const [canvasReady, setCanvasReady] = useState(true);

  const toggleLiveFeed = useCallback(() => {
    setLiveFeed(prev => {
      const next = !prev;
      try { localStorage.setItem('krylo_live_feed', next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  // Refresh handler — WO-255 Step 6: fetchHeadlines → ingest → update Signal Map
  const handleRefresh = useCallback(async () => {
    if (fetchLoading) return;
    setFetchLoading(true);
    setFetchError(false);
    try {
      const etrs = await fetchHeadlines();
      // Ingest bridge: POST to /api/ingest (fire-and-forget)
      ingestHeadlines(etrs);
      // Map to Signal Map signal shape
      setNewsSignals(etrs.map(r => ({
        id:       r.id,
        text:     r.title ?? r.id,
        source:   'news',
        strength: Math.round(r.fs * 5),
        fs:       r.fs,
        primary:  true,
        fidelity: {
          m_checksum:  r.fidelity_components.m_checksum,
          t_telemetry: r.fidelity_components.t_telemetry,
          e_viral:     r.fidelity_components.e_viral,
        },
      })));
    } catch {
      setFetchError(true);
    } finally {
      setFetchLoading(false);
    }
  }, [fetchLoading]);

  // Inject spinner keyframes once
  useEffect(() => {
    if (document.getElementById('krylo-live-feed-styles')) return;
    const s = document.createElement('style');
    s.id = 'krylo-live-feed-styles';
    s.textContent = '@keyframes krylo-spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(s);
  }, []);


  useEffect(() => {
    let raf;
    let frames = 0;
    let lastTime = performance.now();
    function measure() {
      frames++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        const fps = frames / ((now - lastTime) / 1000);
        const measuredHz = fps * 4.4 / 60;
        setHeartbeat(Math.max(0, 1.0 - Math.abs(measuredHz - 4.4) / 4.4));
        frames = 0;
        lastTime = now;
      }
      raf = requestAnimationFrame(measure);
    }
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, []);

  const triggerCapture = useCallback(() => {
    if (!captureRef.current) return;
    captureRef.current();
    setFlashing(true);
    setTimeout(() => setFlashing(false), 120);
  }, []);

  // Red-state breach handler — Ghost Photo + log
  const handleRedAlert = useCallback((metric) => {
    triggerCapture();
  }, [triggerCapture]);

  // Heartbeat red-state detection
  const prevHeartbeatBandRef = useRef('green');
  useEffect(() => {
    const band = heartbeat >= THRESHOLDS.heartbeat.amber ? 'green'
      : heartbeat >= THRESHOLDS.heartbeat.red            ? 'amber'
      : 'red';
    if (band === 'red' && prevHeartbeatBandRef.current !== 'red') {
      handleRedAlert('heartbeat');
    }
    prevHeartbeatBandRef.current = band;
  }, [heartbeat, handleRedAlert]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'g' || e.key === 'G') triggerCapture(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [triggerCapture]);

  // KRYL-225: Ready-gate — confirm container has layout before mounting Canvas
  // Also stamps sessionStorage so health check passes even after navigating away
  useEffect(() => {
    if (containerRef.current?.offsetHeight > 0) {
      setCanvasReady(true);
    }
    try { sessionStorage.setItem('krylo_canvas_init', '1'); } catch {}
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: contained ? 'absolute' : 'fixed', inset: 0, zIndex: contained ? 0 : 5, background: '#000000', pointerEvents: isActive ? 'auto' : 'none' }}
      data-canvas-mounted={canvasReady ? 'true' : undefined}
    >
      {canvasReady && (
        <Canvas
          style={{ width: '100%', height: '100%' }}
          gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true, stencil: true }}
          camera={{ fov: 50, position: [0, 4, 10], near: 0.1, far: 200 }}
          onCreated={({ camera }) => camera.lookAt(0, 3, 0)}
          onPointerMissed={() => { setLockedIdx(null); setLockedNodeData(null); }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={0.5} />
          <Scene
            signals={activeSignals}
            alertMode={alertMode}
            captureRef={captureRef}
            lockedIdx={lockedIdx}
            setLockedIdx={setLockedIdx}
            selectedSet={selectedSet}
            setSelectedSet={setSelectedSet}
            searchQuery={searchQuery}
            onRedAlert={handleRedAlert}
            heartbeat={heartbeat}
            onNodeLock={handleNodeLock}
            top1Idx={top1Idx} top1Color={top1Color}
            top2Idx={top2Idx} top2Color={top2Color}
            top3Idx={top3Idx} top3Color={top3Color}
            top4Idx={top4Idx} top4Color={top4Color}
            top5Idx={top5Idx} top5Color={top5Color}
            top6Idx={top6Idx} top6Color={top6Color}
            topSixSet={topSixSet}
            cityMatteSrc={CITY_MATTE}
            activeCity={activeCity}
            leaderboardHoveredIdx={leaderboardHoveredIdx}
            leaderboardClickEvent={leaderboardClickEvent}
            onHoverChange={setExternalHoveredIdx}
            debugMode={debugMode}
            activeFilters={activeFilters}
            onClusterData={({ protoCount, completeCount }) => setClusterData({ protoCount, completeCount })}
            activeStateFilter={activeStateFilter}
            onStateDoubleClick={stateName => setActiveStateFilter(prev => prev === stateName ? null : stateName)}
            lockedZone={lockedZone}
            setLockedZone={setLockedZone}
            isTimelineMode={isTimelineMode}
            onPromotion={promoted => setPromotedNodes(prev => {
              const ids = new Set(prev.map(n => n.id));
              return [...prev, ...promoted.filter(n => !ids.has(n.id))];
            })}
          />
        </Canvas>
      )}

      {/* Zone labels moved to 3D Html in Scene — anchored to east rim of each zone ring */}

      {(<>

      {flashing && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          pointerEvents: 'none',
          background: 'rgba(255,255,255,0.12)',
        }} />
      )}

      {/* DISABLED — alertMode render off until WO-878 spec confirmed
      {alertMode && (
        <div style={{
          position:      'absolute', top: 12, left: 12, zIndex: 10,
          fontFamily:    'IBM Plex Mono, monospace',
          fontSize:      '10px',
          color:         '#F5A623',
          letterSpacing: '0.12em',
          pointerEvents: 'none',
        }}>
          ⚠ ALERT
        </div>
      )}
      */}

      {/* WO-754: Live Feed + Heartbeat moved to Settings panel in RightRailHUD */}

      {loading && signals.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.35)',
        }}>
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
            color: 'rgba(232,244,255,0.45)', letterSpacing: '0.2em',
          }}>ACQUIRING SIGNAL</span>
        </div>
      )}




      {/* WO-506: click-to-center node card — fixed overlay outside Canvas */}
      {lockedNodeData && (
        <div style={{
          position:  contained ? 'absolute' : 'fixed',
          top:       '50%',
          left:      '50%',
          transform: 'translate(-50%, -50%)',
          zIndex:    100,
          pointerEvents: 'none',
        }}>
          <HoverCard
            node={lockedNodeData.node}
            signal={lockedNodeData.signal}
            locked={true}
            velocity={lockedNodeData.velocity}
            strength={lockedNodeData.strength}
            velocityTimerState={lockedNodeData.velocityTimerState}
            text={lockedNodeData.text}
            onClose={() => { setLockedIdx(null); setLockedNodeData(null); setScorecardSignal(null); }}
            onOpenScorecard={() => setScorecardSignal(lockedNodeData.signal)}
          />
        </div>
      )}

      {/* WO-740: Integrity Scorecard — slides in when badge is clicked */}
      {scorecardSignal && (
        <div style={{
          position:  contained ? 'absolute' : 'fixed',
          top:       '50%',
          left:      'calc(50% + 170px)',
          transform: 'translateY(-50%)',
          zIndex:    101,
          pointerEvents: 'none',
        }}>
          <IntegrityScorecard
            signal={scorecardSignal}
            onClose={() => setScorecardSignal(null)}
          />
        </div>
      )}

      </>)}

      {/* WO-754: Right-Rail Control Panel — suppressed in contained mode (dashboard owns the right rail) */}
      {isActive && !contained && (
        <RightRailHUD
          top6={top6}
          leaderboardHoveredIdx={leaderboardHoveredIdx}
          setLeaderboardHoveredIdx={setLeaderboardHoveredIdx}
          leaderboardClickEvent={leaderboardClickEvent}
          setLeaderboardClickEvent={setLeaderboardClickEvent}
          searchNodeLabel={searchNodeLabel}
          searchNodeIdx={searchNodeIdx}
          searchNodeRank={searchNodeRank}
          externalHoveredIdx={externalHoveredIdx}
          activeSignals={activeSignals}
          clusterData={clusterData}
          debugMode={debugMode}
          setDebugMode={setDebugMode}
          totalCount={activeSignals.length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          liveFeed={liveFeed}
          toggleLiveFeed={toggleLiveFeed}
          fetchLoading={fetchLoading}
          fetchError={fetchError}
          handleRefresh={handleRefresh}
          heartbeat={heartbeat}
          triggerCapture={triggerCapture}
          activeFilters={activeFilters}
          setActiveFilters={setActiveFilters}
        />
      )}

      {!contained && (
        <div style={{
          position:      'fixed',
          bottom:        '16px',
          right:         '20px',
          fontFamily:    'IBM Plex Mono, monospace',
          fontSize:      '10px',
          letterSpacing: '0.2em',
          color:         'rgba(255,255,255,0.2)',
          pointerEvents: 'none',
          zIndex:        50,
        }}>v63</div>
      )}
    </div>
  );
}