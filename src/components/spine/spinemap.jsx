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

const MAX_NODES   = 512;
const FIELD_COUNT = 40;
const BOUNDS      = 8;
const ALERT_FS    = 0.25;
const CRYSTAL_FS  = 0.844;
const SLAM_MS     = 719;
const RING_MS     = 2000;
const HZ44        = 27.6460;
const W_BASE      = 0.06;

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

  varying float vFidelity;
  varying float vStress;
  varying vec3  vNormal;

  void main() {
    vFidelity = aFidelity;
    vStress   = aStress;
    vNormal   = normalize(normalMatrix * normal);

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

    vec3 displaced = position
      + normal * (noise * cohesion * 0.18 + viral * 0.09 + fracture + crystal + alertPulse);

    vec4 world = instanceMatrix * vec4(displaced * aScale, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * world;
  }
`;

const FRAG = /* glsl */`
  uniform float uTime;
  uniform float uAlertMode;

  varying float vFidelity;
  varying float vStress;
  varying vec3  vNormal;

  void main() {
    vec3 coldWhite  = vec3(0.91,  0.957, 1.0);
    vec3 signalBlue = vec3(0.0,   0.588, 1.0);
    vec3 amber      = vec3(0.961, 0.651, 0.137);
    vec3 alertRed   = vec3(0.9,   0.1,   0.1);

    vec3 color;
    if (vFidelity >= 0.70) {
      color = mix(signalBlue, coldWhite, (vFidelity - 0.70) / 0.30);
    } else if (vFidelity >= 0.40) {
      color = mix(amber, signalBlue, (vFidelity - 0.40) / 0.30);
    } else {
      color = amber;
    }

    color = mix(color, amber, vStress * 0.45);

    float isContam = (1.0 - step(0.25, vFidelity)) * uAlertMode;
    float pulse    = 0.6 + sin(uTime * 6.0) * 0.4;
    color = mix(color, alertRed, isContam * pulse);

    float isCrystal = step(0.844, vFidelity);
    color = mix(color, coldWhite, isCrystal);

    float rim  = pow(1.0 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 2.0);
    color     += rim * (vFidelity * 0.4 + isCrystal * 0.6);

    float shimmer = vStress * sin(uTime * 8.0) * 0.08;
    color        += vec3(shimmer, shimmer * 0.3, 0.0);

    float alpha = mix(0.55 + vFidelity * 0.45, 1.0, isCrystal);
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
    vec3 signalBlue = vec3(0.0,   0.588, 1.0);
    vec3 amber      = vec3(0.961, 0.651, 0.137);

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
    vec3 signalBlue = vec3(0.0, 0.588, 1.0);
    vec3 amber      = vec3(0.961, 0.651, 0.137);
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

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function sentimentLabel(fs) {
  if (fs >= 0.80) return 'Confirmed';
  if (fs >= 0.60) return 'Aligned';
  if (fs >= 0.40) return 'Mixed';
  if (fs >= 0.20) return 'Weak';
  return 'Contested';
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

// ── Hover Card ────────────────────────────────────────────────────────────────
function HoverCard({ node, locked, velocity }) {
  const accent    = locked ? '#FFD700' : '#0096ff';
  const contColor = node.eViral >= 0.6 ? '#F5A623' : node.eViral >= 0.4 ? '#aaa' : '#00b894';
  const velLabel  = frictionVelocityLabel(velocity ?? 0);
  const velColor  = (velocity ?? 0) > 0.001 ? '#00b894' : (velocity ?? 0) < -0.001 ? '#F5A623' : 'rgba(232,244,255,0.55)';
  return (
    <Html position={[0, node.scale + 0.5, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
      <div style={{
        fontFamily:    'IBM Plex Mono, monospace',
        fontSize:      '10px',
        background:    'rgba(5,7,10,0.92)',
        borderRadius:  '8px',
        padding:       '10px 14px',
        width:         '200px',
        border:        `1px solid ${accent}33`,
        color:         'rgba(232,244,255,0.9)',
        boxShadow:     `0 4px 32px rgba(0,0,0,0.5)${locked ? ', 0 0 12px rgba(255,215,0,0.2)' : ''}`,
        letterSpacing: '0.05em',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontWeight: 'bold', color: accent, fontSize: '11px' }}>{node.id}</span>
          <span style={{ color: 'rgba(232,244,255,0.4)', fontSize: '9px' }}>
            Fs {node.fs.toFixed(2)}{locked ? ' 📌' : ''}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
          <span style={{ opacity: 0.5, fontSize: '9px' }}>sentiment</span>
          <span style={{ fontSize: '9px', color: node.fs >= 0.7 ? '#00b894' : accent }}>{sentimentLabel(node.fs)}</span>
          <span style={{ opacity: 0.5, fontSize: '9px' }}>velocity</span>
          <span style={{ fontSize: '9px', color: velColor }}>{velLabel}</span>
          <span style={{ opacity: 0.5, fontSize: '9px' }}>contamination</span>
          <span style={{ fontSize: '9px', color: contColor }}>{contaminationLabel(node.eViral)}</span>
        </div>
      </div>
    </Html>
  );
}

// ── ETR Label ─────────────────────────────────────────────────────────────────
function ETRLabel({ node, hovered, locked, selected, matchesSearch }) {
  const isHardened = node.fs >= CRYSTAL_FS;
  const color = locked
    ? 'rgba(255,215,0,0.95)'
    : selected
    ? 'rgba(0,220,180,0.95)'
    : matchesSearch
    ? 'rgba(255,255,100,0.95)'
    : `rgba(100,160,255,${hovered ? 0.95 : 0.4})`;

  return (
    <Html position={[0, node.scale + 0.18, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
      <div style={{
        fontFamily:    'IBM Plex Mono, monospace',
        fontSize:      '8px',
        color,
        letterSpacing: '0.12em',
        transition:    'color 0.2s',
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

// ── Confirmation Ring (KRYL-274) ─────────────────────────────────────────────
function ConfirmationRing({ stateRef, nodeIdx, t0, onExpire }) {
  const ref     = useRef();
  const expired = useRef(false);

  useFrame(() => {
    if (expired.current) return;
    const t = (performance.now() - t0) / RING_MS;
    if (t >= 1) { expired.current = true; onExpire(); return; }
    const state = stateRef.current[nodeIdx];
    if (!ref.current || !state) return;
    ref.current.position.copy(state.pos);
    ref.current.scale.setScalar(1 + t * 3);
    ref.current.material.opacity = (1 - t) * 0.28;
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.8, 0.018, 8, 64]} />
      <meshBasicMaterial color="#E8F4FF" transparent opacity={0.28} depthWrite={false} />
    </mesh>
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
      const a    = document.createElement('a');
      a.href     = oc.toDataURL('image/png');
      a.download = `krylo-snapshot-${Date.now()}.png`;
      a.click();
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

// ── Scene ─────────────────────────────────────────────────────────────────────
function Scene({ signals, alertMode, captureRef, lockedIdx, setLockedIdx, selectedSet, setSelectedSet, searchQuery }) {
  const meshRef  = useRef(null);
  const matRef   = useRef(null);
  const stateRef = useRef([]);
  const orbitRef = useRef(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const firedRef     = useRef(new Set());
  const slamScaleRef = useRef(new Map());
  const [slamEvents, setSlamEvents]       = useState([]);
  const [ringEvents, setRingEvents]       = useState([]);
  const [brightNodeSet, setBrightNodeSet] = useState(new Set());
  const prevFsRef    = useRef({});
  const fsHistoryRef = useRef({});
  const fsVelocityRef = useRef({});
  const alertModeRef = useRef(false);
  alertModeRef.current = alertMode;

  const { geometry, material, primaryNodes, edges, totalCount } = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 48, 48);

    const fidelities = new Float32Array(MAX_NODES);
    const stresses   = new Float32Array(MAX_NODES);
    const phases     = new Float32Array(MAX_NODES);
    const scales     = new Float32Array(MAX_NODES);
    const isStubs    = new Float32Array(MAX_NODES);

    const state     = [];
    const primaries = [];

    signals.forEach((sig, i) => {
      const fs     = clamp01(sig.fs ?? (sig.strength ?? 1) / 5);
      const eViral = clamp01(sig.fidelity?.e_viral ?? 0);
      const phi    = i * 2.399963;
      const rad    = Math.sqrt(i / Math.max(signals.length, 1)) * BOUNDS * 0.65;
      const scale  = 0.28 + Math.log1p(fs * (Math.E - 1)) * 0.52;

      const pos = new THREE.Vector3(
        Math.cos(phi) * rad + (lcg(i * 3 + 1) * 2 - 1) * 1.5,
        (lcg(i * 3 + 2) * 2 - 1) * BOUNDS * 0.45,
        Math.sin(phi) * rad * 0.5 + (lcg(i * 3 + 3) * 2 - 1) * 1.0
      );
      const vel = new THREE.Vector3(
        (lcg(i * 7 + 1) * 2 - 1) * 0.008,
        (lcg(i * 7 + 2) * 2 - 1) * 0.006,
        (lcg(i * 7 + 3) * 2 - 1) * 0.004
      );

      fidelities[i] = fs;
      stresses[i]   = eViral;
      phases[i]     = lcg(i) * Math.PI * 2;
      scales[i]     = scale;
      isStubs[i]    = sig._isStub ? 1.0 : 0.0;

      state.push({ pos: pos.clone(), vel, speedScale: 1 + eViral * 3.0, primary: true, index: i, fsVal: fs });
      primaries.push({
        pos: pos.clone(),
        id:     sig.id ?? `ETR-${String(i + 1).padStart(3, '0')}`,
        fs, eViral, scale, index: i,
      });
    });

    for (let j = 0; j < FIELD_COUNT; j++) {
      const i   = signals.length + j;
      const phi = j * 2.399963;
      const r2  = Math.sqrt(j / FIELD_COUNT) * BOUNDS;
      const pos = new THREE.Vector3(
        Math.cos(phi) * r2,
        (lcg(j * 5 + 4) * 2 - 1) * BOUNDS * 0.7,
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

    geo.setAttribute('aFidelity', new THREE.InstancedBufferAttribute(fidelities, 1));
    geo.setAttribute('aStress',   new THREE.InstancedBufferAttribute(stresses,   1));
    geo.setAttribute('aPhase',    new THREE.InstancedBufferAttribute(phases,     1));
    geo.setAttribute('aScale',    new THREE.InstancedBufferAttribute(scales,     1));
    geo.setAttribute('aIsStub',   new THREE.InstancedBufferAttribute(isStubs,    1));

    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      transparent:    true,
      depthWrite:     false,
      uniforms: { uTime: { value: 0 }, uAlertMode: { value: 0 } },
    });

    const edgeList = [];
    for (let a = 0; a < primaries.length; a++) {
      for (let b = a + 1; b < primaries.length; b++) {
        if (primaries[a].pos.distanceTo(primaries[b].pos) < BOUNDS * 1.3) {
          const avgFs = (primaries[a].fs + primaries[b].fs) / 2;
          edgeList.push({
            key:   `e-${a}-${b}`,
            nodeA: a,
            nodeB: b,
            avgFs,
            start: primaries[a].pos.clone(),
            end:   primaries[b].pos.clone(),
          });
        }
      }
    }

    stateRef.current = state;
    return { geometry: geo, material: mat, primaryNodes: primaries, edges: edgeList, totalCount: state.length };
  }, [signals]);

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
    const newRings  = [];
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
        const t0 = performance.now();
        slamScaleRef.current.set(i, t0);
        newSlams.push({ key: `slam-${id}-${t0}`, nodeIdx: i, t0 });
        newRings.push({ key: `ring-${id}-${t0}`, nodeIdx: i, t0 });
        newBright.push(i);
      }
      prevFsRef.current[id] = fs;
    });

    if (newSlams.length)  setSlamEvents(prev => [...prev, ...newSlams]);
    if (newRings.length)  setRingEvents(prev => [...prev, ...newRings]);
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
    return () => { geometry.dispose(); material.dispose(); };
  }, [geometry, material]);

  const dummy    = useMemo(() => new THREE.Object3D(), []);
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

  useFrame(({ clock }, dt) => {
    const m = matRef.current ?? material;
    m.uniforms.uTime.value      = clock.getElapsedTime();
    m.uniforms.uAlertMode.value = alertModeRef.current ? 1.0 : 0.0;

    const mesh = meshRef.current;
    if (!mesh) return;

    const now = performance.now();

    stateRef.current.forEach((node) => {
      const speed = node.primary ? node.speedScale : 1 + avgViral * 2.5;
      node.pos.addScaledVector(node.vel, dt * speed * 60);

      const b = node.primary ? BOUNDS * 0.8 : BOUNDS;
      if (Math.abs(node.pos.x) > b)       node.vel.x *= -1;
      if (Math.abs(node.pos.y) > b * 0.7) node.vel.y *= -1;
      if (Math.abs(node.pos.z) > b * 0.5) node.vel.z *= -1;

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

      dummy.updateMatrix();
      mesh.setMatrixAt(node.index, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  // KRYL-314: search match
  const searchLower = searchQuery.trim().toLowerCase();
  const matchSet = useMemo(() => {
    if (!searchLower) return null;
    const s = new Set();
    primaryNodes.forEach((n, i) => {
      if (n.id.toLowerCase().includes(searchLower)) s.add(i);
    });
    return s;
  }, [searchLower, primaryNodes]);

  return (
    <>
      <BackgroundPlane />

      <CameraController
        primaryNodes={primaryNodes}
        alertMode={alertMode}
        lowestCluster={lowestCluster}
      />

      <instancedMesh
        ref={meshRef}
        args={[geometry, material, totalCount]}
        frustumCulled={true}
      />

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

      {/* Primary node overlays */}
      {primaryNodes.map((node, i) => {
        const state       = stateRef.current[i];
        if (!state) return null;
        const isLocked    = lockedIdx === i;
        const isSelected  = selectedSet.has(i);
        const matchSearch = matchSet ? matchSet.has(i) : false;
        const opacity     = matchSet && !matchSearch ? 0.15 : 1;

        return (
          <group key={node.id} position={state.pos} style={{ opacity }}>
            <mesh
              onPointerOver={e => { e.stopPropagation(); setHoveredIdx(i); document.body.style.cursor = 'pointer'; }}
              onPointerOut={e => { e.stopPropagation(); if (!isLocked) setHoveredIdx(null); document.body.style.cursor = 'auto'; }}
              onClick={e => {
                e.stopPropagation();
                if (e.shiftKey) {
                  // KRYL-313: shift-click multi-select
                  setSelectedSet(prev => {
                    const next = new Set(prev);
                    next.has(i) ? next.delete(i) : next.add(i);
                    return next;
                  });
                } else {
                  // KRYL-312: click to lock/unlock
                  setLockedIdx(prev => prev === i ? null : i);
                  setHoveredIdx(i);
                }
              }}
            >
              <sphereGeometry args={[node.scale * 1.4, 16, 16]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {/* KRYL-314: search highlight ring */}
            {matchSearch && (
              <mesh>
                <torusGeometry args={[node.scale * 1.6, 0.012, 8, 48]} />
                <meshBasicMaterial color="#FFFF64" transparent opacity={0.7} depthWrite={false} />
              </mesh>
            )}

            {/* KRYL-313: selection ring */}
            {isSelected && (
              <mesh>
                <torusGeometry args={[node.scale * 1.5, 0.012, 8, 48]} />
                <meshBasicMaterial color="#00DCB4" transparent opacity={0.8} depthWrite={false} />
              </mesh>
            )}

            <ETRLabel
              node={node}
              hovered={hoveredIdx === i}
              locked={isLocked}
              selected={isSelected}
              matchesSearch={matchSearch}
            />

            {/* KRYL-312: show card if hovered OR locked */}
            {(hoveredIdx === i || isLocked) && (
              <HoverCard node={node} locked={isLocked} velocity={fsVelocityRef.current[node.id] ?? 0} />
            )}
          </group>
        );
      })}

      {ringEvents.map(ev => (
        <ConfirmationRing
          key={ev.key}
          stateRef={stateRef}
          nodeIdx={ev.nodeIdx}
          t0={ev.t0}
          onExpire={() => setRingEvents(prev => prev.filter(e => e.key !== ev.key))}
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

      {edges.map(e => (
        <PulseEdge
          key={e.key}
          start={e.start}
          end={e.end}
          avgFs={e.avgFs}
          alertMode={alertMode}
          isBright={brightNodeSet.has(e.nodeA) || brightNodeSet.has(e.nodeB)}
        />
      ))}

      {/* KRYL-313: corroboration bridges for selected pairs */}
      <CorroborationBridges selectedNodes={selectedSet} stateRef={stateRef} />

      <Html position={[-BOUNDS * 0.9, -BOUNDS * 0.65, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{
          fontFamily:    'IBM Plex Mono, monospace',
          fontSize:      '10px',
          color:         alertMode ? 'rgba(240,80,80,0.55)' : 'rgba(100,160,255,0.4)',
          letterSpacing: '0.1em',
        }}>
          nodes: {totalCount}
        </div>
      </Html>

      <GhostCapture primaryNodes={primaryNodes} totalCount={totalCount} captureRef={captureRef} />

      <OrbitControls
        ref={orbitRef}
        enableDamping
        enablePan={false}
        dampingFactor={0.08}
        rotateSpeed={0.5}
        minDistance={6}
        maxDistance={22}
        autoRotate
        autoRotateSpeed={0.2}
      />
    </>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function SignalMap({ data, signalMapData }) {
  const resolved = signalMapData ?? data;
  const signals  = Array.isArray(resolved) ? resolved : (resolved?.signals ?? []);
  const loading  = resolved?.loading ?? false;

  const alertMode = useMemo(
    () => signals.some(s => clamp01(s.fs ?? (s.strength ?? 1) / 5) < ALERT_FS),
    [signals]
  );

  const captureRef = useRef(null);
  const [flashing, setFlashing]       = useState(false);
  const [lockedIdx, setLockedIdx]     = useState(null);   // KRYL-312
  const [selectedSet, setSelectedSet] = useState(new Set()); // KRYL-313
  const [searchQuery, setSearchQuery] = useState('');     // KRYL-314
  const [heartbeat, setHeartbeat]     = useState(1.0);

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

  useEffect(() => {
    const handler = (e) => { if (e.key === 'g' || e.key === 'G') triggerCapture(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [triggerCapture]);

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>

      {flashing && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          pointerEvents: 'none',
          background: 'rgba(255,255,255,0.12)',
        }} />
      )}

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

      {/* Heartbeat HUD */}
      <div style={{
        position:      'absolute', bottom: 16, left: 16, zIndex: 10,
        display:       'flex', alignItems: 'center', gap: '6px',
        pointerEvents: 'none',
      }}>
        <div style={{
          width:        '7px',
          height:       '7px',
          borderRadius: '50%',
          background:   heartbeat >= 0.95 ? '#00b894' : heartbeat >= 0.8 ? '#F5A623' : '#FF6B6B',
          boxShadow:    `0 0 6px ${heartbeat >= 0.95 ? '#00b89466' : heartbeat >= 0.8 ? '#F5A62366' : '#FF6B6B66'}`,
        }} />
        <span style={{
          fontFamily:    'IBM Plex Mono, monospace',
          fontSize:      '9px',
          letterSpacing: '0.12em',
          color:         heartbeat >= 0.95 ? 'rgba(0,184,148,0.6)' : heartbeat >= 0.8 ? 'rgba(245,166,35,0.6)' : 'rgba(255,107,107,0.6)',
        }}>
          HEARTBEAT
        </span>
      </div>

      {/* KRYL-314: search input — top center */}
      <div style={{
        position:       'absolute',
        top:            12,
        left:           '50%',
        transform:      'translateX(-50%)',
        zIndex:         10,
        display:        'flex',
        alignItems:     'center',
        gap:            '8px',
      }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="filter nodes..."
          style={{
            fontFamily:    'IBM Plex Mono, monospace',
            fontSize:      '10px',
            background:    'rgba(5,7,10,0.82)',
            border:        '1px solid rgba(232,244,255,0.12)',
            borderRadius:  '4px',
            color:         'rgba(232,244,255,0.85)',
            padding:       '5px 10px',
            outline:       'none',
            letterSpacing: '0.08em',
            width:         '160px',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              fontFamily:  'IBM Plex Mono, monospace',
              fontSize:    '9px',
              color:       'rgba(232,244,255,0.4)',
              background:  'none',
              border:      'none',
              cursor:      'pointer',
              padding:     '0',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {loading && (
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

      <button
        onClick={triggerCapture}
        style={{
          position:      'absolute', bottom: 16, right: 16, zIndex: 10,
          fontFamily:    'IBM Plex Mono, monospace',
          fontSize:      '10px',
          color:         'rgba(232,244,255,0.4)',
          background:    'none',
          border:        'none',
          cursor:        'pointer',
          letterSpacing: '0.1em',
          padding:       '4px 0',
        }}
      >
        [ G ]
      </button>

      <Canvas
        style={{ width: '100%', height: '100%', background: '#000000' }}
        gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
        camera={{ fov: 55, position: [0, 0, 16], near: 0.1, far: 200 }}
      >
        <ambientLight
          intensity={alertMode ? 0.6   : 0.25}
          color={alertMode     ? '#ff2200' : '#ffffff'}
        />
        <directionalLight position={[10, 10, 5]} intensity={0.4} />
        <Scene
          signals={signals}
          alertMode={alertMode}
          captureRef={captureRef}
          lockedIdx={lockedIdx}
          setLockedIdx={setLockedIdx}
          selectedSet={selectedSet}
          setSelectedSet={setSelectedSet}
          searchQuery={searchQuery}
        />
      </Canvas>
    </div>
  );
}