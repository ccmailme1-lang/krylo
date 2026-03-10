// src/components/spine/signalmap.jsx
// WO-248 — InstancedMesh, Friction Matrix shaders, GPU disposal
// WO-232 — Tracking Listener: camera intelligence, edge intelligence, contamination field
// WO-233 — Friction Record: surface fracture, crystallization, heat dissipation
// KRYL-311 — Logarithmic node size: radius = baseRadius * (1 + log10(1 + Fs * 9))
// KRYL-235 — Atmospheric pulse: 4.4Hz sine wave, background opacity 0.02–0.05
// KRYL-310 — Edge pulse: staggered 0.8Hz sine per edge, opacity 0.3–0.7
// KRYL-322 — Forensic halo: shader ring around HARDENED nodes, #EAEAEF, 0.15 opacity, 1.4× radius
// KRYL-243 — ALERT state: Fs ≥ 0.844 → per-node rim glow only (aAlert instanced attribute); no global effects
// KRYL-274 — 0.844 threshold: 3s hysteresis gate → CONFIRMED state + ALERT cascade + console audit
// Location: src/components/spine/signalmap.jsx

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';

const MAX_NODES = 512;
const FIELD_COUNT = 40;
const BOUNDS = 8;

// ── Friction Matrix Shaders v2 ────────────────────────────────────────────────
const VERT = /* glsl */`
  uniform float uTime;

  attribute float aFidelity;
  attribute float aStress;
  attribute float aPhase;
  attribute float aScale;
  attribute float aIsStub;
  attribute float aAlert;

  varying float vFidelity;
  varying float vStress;
  varying vec3  vNormal;
  varying float vAlert;

  void main() {
    vFidelity = aFidelity;
    vStress   = aStress;
    vNormal   = normalize(normalMatrix * normal);
    vAlert    = aAlert;

    float cohesion = 1.0 - aFidelity;

    // Surface noise — low fidelity = high turbulence
    float noise = sin(position.x * 6.0 + uTime + aPhase)
                * cos(position.y * 6.0 + uTime)
                * sin(position.z * 6.0 + uTime - aPhase);

    // Viral contamination — drives surface fracture
    float viral    = aStress * sin(uTime * (2.0 + aStress * 12.0));
    float fracture = aStress * sin(uTime * (3.0 + aStress * 18.0)) * cohesion * 0.25;

    // Crystallization — high fidelity locks geometry
    float crystal  = aFidelity * 0.04 * sin(uTime * 0.8 + aPhase);

    vec3 displaced = position
      + normal * (noise * cohesion * 0.18 + viral * 0.09 + fracture + crystal);

    vec4 world = instanceMatrix * vec4(displaced * aScale, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * world;
  }
`;

const FRAG = /* glsl */`
  uniform float uTime;

  varying float vFidelity;
  varying float vStress;
  varying vec3  vNormal;
  varying float vAlert;

  void main() {
    // HARDENED ≥0.70 → cold white | WATCH 0.40–0.69 → signal blue | CALM <0.40 → amber
    vec3 coldWhite  = vec3(0.91,  0.957, 1.0);
    vec3 signalBlue = vec3(0.0,   0.588, 1.0);
    vec3 amber      = vec3(0.961, 0.651, 0.137);

    vec3 color;
    if (vFidelity >= 0.70) {
      color = mix(signalBlue, coldWhite, (vFidelity - 0.70) / 0.30);
    } else if (vFidelity >= 0.40) {
      color = mix(amber, signalBlue, (vFidelity - 0.40) / 0.30);
    } else {
      color = amber;
    }

    // Contamination heat — high stress bleeds amber into any color
    color = mix(color, amber, vStress * 0.45);

    // Rim lighting — crystalline nodes get stronger rim; ALERT node glow per-instance via vAlert
    float rim  = pow(1.0 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 2.0);
    color     += rim * vFidelity * (0.4 + vAlert * 0.6);
    color     += vAlert * vFidelity * vec3(0.91, 0.957, 1.0) * 0.25;

    // Heat shimmer on contaminated nodes
    float shimmer = vStress * sin(uTime * 8.0) * 0.08;
    color        += vec3(shimmer, shimmer * 0.3, 0.0);

    float alpha = 0.55 + vFidelity * 0.45;
    gl_FragColor = vec4(color, alpha);
  }
`;

// ── Forensic Halo Shaders (KRYL-322) ─────────────────────────────────────────
const HALO_VERT = /* glsl */`
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const HALO_FRAG = /* glsl */`
  void main() {
    gl_FragColor = vec4(0.918, 0.918, 0.937, 0.15);
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

// ── Hover Card ────────────────────────────────────────────────────────────────
function HoverCard({ node }) {
  const accent = '#0096ff';
  const contColor = node.eViral >= 0.6 ? '#F5A623' : node.eViral >= 0.4 ? '#aaa' : '#00b894';
  return (
    <Html position={[0, node.scale + 0.5, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
      <div style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '10px',
        background: 'rgba(5,7,10,0.92)',
        borderRadius: '8px',
        padding: '10px 14px',
        width: '200px',
        border: `1px solid ${accent}33`,
        color: 'rgba(232,244,255,0.9)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
        letterSpacing: '0.05em',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontWeight: 'bold', color: accent, fontSize: '11px' }}>{node.id}</span>
          <span style={{ color: 'rgba(232,244,255,0.4)', fontSize: '9px' }}>Fs {node.fs.toFixed(2)}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
          <span style={{ opacity: 0.5, fontSize: '9px' }}>sentiment</span>
          <span style={{ fontSize: '9px', color: node.fs >= 0.7 ? '#00b894' : accent }}>{sentimentLabel(node.fs)}</span>
          <span style={{ opacity: 0.5, fontSize: '9px' }}>velocity</span>
          <span style={{ fontSize: '9px' }}>{velocityLabel(node.eViral)}</span>
          <span style={{ opacity: 0.5, fontSize: '9px' }}>contamination</span>
          <span style={{ fontSize: '9px', color: contColor }}>{contaminationLabel(node.eViral)}</span>
        </div>
      </div>
    </Html>
  );
}

// ── ETR Label ────────────────────────────────────────────────────────────────
function ETRLabel({ node, hovered }) {
  return (
    <Html position={[0, node.scale + 0.18, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
      <div style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '8px',
        color: `rgba(100,160,255,${hovered ? 0.95 : 0.4})`,
        letterSpacing: '0.12em',
        transition: 'opacity 0.2s',
        whiteSpace: 'nowrap',
        textTransform: 'uppercase',
      }}>
        {node.id}
      </div>
    </Html>
  );
}

// ── Edge Pulse (KRYL-310) ─────────────────────────────────────────────────────
function PulsedEdge({ edge, idx }) {
  const lineRef = useRef();
  useFrame(({ clock }) => {
    const mat = lineRef.current?.material;
    if (!mat) return;
    const t     = clock.getElapsedTime();
    const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.8 + idx * 0.7);
    mat.opacity = 0.3 + pulse * 0.4;
    mat.color?.set(edge.color);
  });
  return (
    <Line
      ref={lineRef}
      points={[edge.start, edge.end]}
      color={edge.color}
      lineWidth={edge.width}
      transparent
      opacity={edge.opacity}
    />
  );
}

// ── Forensic Halo (KRYL-322) ──────────────────────────────────────────────────
function HaloMesh({ hardenedNodes, stateRef }) {
  const meshRef  = useRef();
  const { camera } = useThree();
  const dummy    = useMemo(() => new THREE.Object3D(), []);
  const count    = hardenedNodes.length;
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   HALO_VERT,
    fragmentShader: HALO_FRAG,
    transparent:    true,
    depthWrite:     false,
    side:           THREE.DoubleSide,
  }), []);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || !count) return;
    hardenedNodes.forEach((node, i) => {
      const state = stateRef.current[node.index];
      if (!state) return;
      dummy.position.copy(state.pos);
      dummy.scale.setScalar(node.scale * 1.4);
      dummy.quaternion.copy(camera.quaternion);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  });
  if (!count) return null;
  return (
    <instancedMesh ref={meshRef} args={[null, null, Math.max(1, count)]} frustumCulled={false}>
      <ringGeometry args={[0.9, 1.0, 64]} />
      <primitive object={material} attach="material" />
    </instancedMesh>
  );
}

// ── Camera Intelligence ───────────────────────────────────────────────────────
function CameraController({ primaryNodes, orbitRef }) {
  const { camera } = useThree();
  const targetRef  = useRef(new THREE.Vector3(0, 0, 16));
  const doneRef    = useRef(false);

  useEffect(() => {
    if (!primaryNodes.length) return;
    // Find centroid of highest Fs cluster (top 50%)
    const sorted  = [...primaryNodes].sort((a, b) => b.fs - a.fs);
    const top     = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.5)));
    const centroid = top.reduce((acc, n) => acc.add(n.pos), new THREE.Vector3())
      .divideScalar(top.length);
    targetRef.current.set(centroid.x * 0.25, centroid.y * 0.25, 16);
    doneRef.current = false;
  }, [primaryNodes]);

  useFrame(() => {
    if (doneRef.current) return;
    camera.position.lerp(targetRef.current, 0.004);
    if (camera.position.distanceTo(targetRef.current) < 0.05) doneRef.current = true;
  });

  return null;
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function Scene({ signals, alertRef }) {
  const meshRef  = useRef(null);
  const matRef   = useRef(null);
  const stateRef = useRef([]);
  const orbitRef = useRef(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const { geometry, material, primaryNodes, edges, hardenedNodes, totalCount } = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 48, 48);

    const fidelities = new Float32Array(MAX_NODES);
    const stresses   = new Float32Array(MAX_NODES);
    const phases     = new Float32Array(MAX_NODES);
    const scales     = new Float32Array(MAX_NODES);
    const isStubs    = new Float32Array(MAX_NODES);
    const alerts     = new Float32Array(MAX_NODES);

    const state    = [];
    const primaries = [];

    signals.forEach((sig, i) => {
      const fs     = clamp01(sig.fs ?? (sig.strength ?? 1) / 5);
      const eViral = clamp01(sig.fidelity?.e_viral ?? 0);
      const phi    = i * 2.399963;
      const rad    = Math.sqrt(i / Math.max(signals.length, 1)) * BOUNDS * 0.65;
      const scale  = 0.28 * (1 + Math.log10(1 + fs * 9));

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
      alerts[i]     = fs >= 0.844 ? 1.0 : 0.0;

      state.push({ pos: pos.clone(), vel, speedScale: 1 + eViral * 3.0, primary: true, index: i, crossTime: null, confirmed: false });
      primaries.push({ pos: pos.clone(), id: sig.id ?? `ETR-${String(i+1).padStart(3,'0')}`, fs, eViral, scale, index: i });
    });

    // Field nodes
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
        primary: false,
        index: i
      });
    }

    geo.setAttribute('aFidelity', new THREE.InstancedBufferAttribute(fidelities, 1));
    geo.setAttribute('aStress',   new THREE.InstancedBufferAttribute(stresses,   1));
    geo.setAttribute('aPhase',    new THREE.InstancedBufferAttribute(phases,     1));
    geo.setAttribute('aScale',    new THREE.InstancedBufferAttribute(scales,     1));
    geo.setAttribute('aIsStub',   new THREE.InstancedBufferAttribute(isStubs,    1));
    geo.setAttribute('aAlert',    new THREE.InstancedBufferAttribute(alerts,     1));

    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      transparent:    true,
      depthWrite:     false,
      uniforms: { uTime: { value: 0 } },
    });

    // Edge intelligence — opacity and width driven by avg Fs of connected nodes
    const edgeList = [];
    for (let a = 0; a < primaries.length; a++) {
      for (let b = a + 1; b < primaries.length; b++) {
        if (primaries[a].pos.distanceTo(primaries[b].pos) < BOUNDS * 1.3) {
          const avgFs = (primaries[a].fs + primaries[b].fs) / 2;
          edgeList.push({
            key:     `e-${a}-${b}`,
            start:   primaries[a].pos.clone(),
            end:     primaries[b].pos.clone(),
            opacity: 0.08 + avgFs * 0.35,
            width:   0.3 + avgFs * 0.8,
            color:   avgFs >= 0.7 ? '#9dd0ff' : avgFs >= 0.4 ? '#0096FF' : '#F5A623',
          });
        }
      }
    }

    const hardenedNodes = primaries.filter(n => n.fs >= 0.70);

    stateRef.current = state;
    return { geometry: geo, material: mat, primaryNodes: primaries, edges: edgeList, hardenedNodes, totalCount: state.length };
  }, [signals]);

  // Pillar 4 — GPU disposal
  useEffect(() => {
    matRef.current = material;
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Average e_viral for contamination field speed
  const avgViral = useMemo(() => {
    if (!primaryNodes.length) return 0;
    return primaryNodes.reduce((acc, n) => acc + n.eViral, 0) / primaryNodes.length;
  }, [primaryNodes]);

  useFrame(({ clock }, dt) => {
    const m = matRef.current ?? material;
    m.uniforms.uTime.value = clock.getElapsedTime();

    const mesh = meshRef.current;
    if (!mesh) return;

    stateRef.current.forEach((node) => {
      // Contamination field — field nodes near high viral primary nodes accelerate
      const speed = node.primary
        ? node.speedScale
        : 1 + avgViral * 2.5;

      node.pos.addScaledVector(node.vel, dt * speed * 60);

      const b = node.primary ? BOUNDS * 0.8 : BOUNDS;
      if (Math.abs(node.pos.x) > b) node.vel.x *= -1;
      if (Math.abs(node.pos.y) > b * 0.7) node.vel.y *= -1;
      if (Math.abs(node.pos.z) > b * 0.5) node.vel.z *= -1;

      dummy.position.copy(node.pos);
      dummy.updateMatrix();
      mesh.setMatrixAt(node.index, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;

    // KRYL-274 — 0.844 hysteresis gate: 3s hold → CONFIRMED + ALERT cascade
    const elapsed = clock.getElapsedTime();
    stateRef.current.forEach((node) => {
      if (!node.primary) return;
      const sig = signals[node.index];
      if (!sig) return;
      const fs = Math.min(1, Math.max(0, sig.fs ?? (sig.strength ?? 1) / 5));
      if (fs >= 0.844) {
        if (node.crossTime === null) {
          node.crossTime = elapsed;
        } else if (!node.confirmed && (elapsed - node.crossTime) >= 3.0) {
          node.confirmed = true;
          if (alertRef) alertRef.current = true;
          console.log(`[KRYL-274] CONFIRMED: ${sig.id ?? 'node-' + node.index} Fs=${fs.toFixed(3)} held ≥0.844 for 3s — ALERT cascade triggered`);
        }
      } else {
        node.crossTime = null;
        node.confirmed = false;
      }
    });
  });

  return (
    <>
      <CameraController primaryNodes={primaryNodes} orbitRef={orbitRef} />

      {/* Pillar 1 — Single InstancedMesh */}
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, totalCount]}
        frustumCulled={true}
      />

      {/* Primary node overlays — hover cards + ETR labels */}
      {primaryNodes.map((node, i) => {
        const state = stateRef.current[i];
        if (!state) return null;
        return (
          <group key={node.id} position={state.pos}>
            {/* Invisible hit sphere for pointer events */}
            <mesh
              onPointerOver={e => { e.stopPropagation(); setHoveredIdx(i); document.body.style.cursor = 'pointer'; }}
              onPointerOut={e => { e.stopPropagation(); setHoveredIdx(null); document.body.style.cursor = 'auto'; }}
            >
              <sphereGeometry args={[node.scale * 1.4, 16, 16]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <ETRLabel node={node} hovered={hoveredIdx === i} />
            {hoveredIdx === i && <HoverCard node={node} />}
          </group>
        );
      })}

      {/* Forensic halo — KRYL-322 */}
      <HaloMesh hardenedNodes={hardenedNodes} stateRef={stateRef} />

      {/* Edge intelligence — KRYL-310 pulsed */}
      {edges.map((e, i) => (
        <PulsedEdge key={e.key} edge={e} idx={i} />
      ))}

      {/* Node count */}
      <Html position={[-BOUNDS * 0.9, -BOUNDS * 0.65, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '10px',
          color: 'rgba(100,160,255,0.4)',
          letterSpacing: '0.1em',
        }}>
          nodes: {totalCount}
        </div>
      </Html>

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
  const resolved   = signalMapData ?? data;
  const signals    = Array.isArray(resolved) ? resolved : (resolved?.signals ?? []);
  const loading    = resolved?.loading ?? false;
  const pulseRef   = useRef(null);
  const alertRef   = useRef(false);

  // KRYL-235 — Atmospheric pulse: 4.4Hz sine, background opacity 0.02–0.05
  useEffect(() => {
    let frame;
    function tick() {
      if (pulseRef.current) {
        const t     = performance.now() / 1000;
        const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 4.4);
        pulseRef.current.style.opacity = (0.02 + pulse * 0.03).toFixed(4);
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      {/* KRYL-235 — Atmospheric pulse overlay */}
      <div ref={pulseRef} style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'rgba(0, 96, 255, 1)',
        opacity: 0.02,
      }} />
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
      <Canvas
        style={{ width: '100%', height: '100%', background: '#000000' }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 55, position: [0, 0, 16], near: 0.1, far: 200 }}
      >
        <ambientLight intensity={0.25} />
        <directionalLight position={[10, 10, 5]} intensity={0.4} />
        <Scene signals={signals} alertRef={alertRef} />
      </Canvas>
    </div>
  );
}
