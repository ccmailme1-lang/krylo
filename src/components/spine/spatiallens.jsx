// WO-1343 — Kinetic Optics: Field-Sampling Lens
// R3F component — lives inside SignalMapLayer Canvas.
// LensPhysics ∩ FieldState = ∅ — reads nodes, never mutates them.
//
// Kinetic architecture:
//   pointer/wheel → kinetics ref (raw input, no React state)
//   useFrame → smoothed state integrated → mesh position set directly
//   onSample → parent receives field readout (read-only)

import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const DAMPING   = 0.12;
const SCALE_MIN = 0.3;
const SCALE_MAX = 3.5;
const LIME      = '#66FF00';
const BLUE      = '#007FFF';
const PURPLE    = '#8A2BE2';

const limeColor   = new THREE.Color(LIME);
const blueColor   = new THREE.Color(BLUE);
const purpleColor = new THREE.Color(PURPLE);

function convergenceColor(c) {
  if (c >= 0.7) return purpleColor;
  if (c >= 0.4) return limeColor;
  return blueColor;
}

export default function SpatialLens({ controlsRef, nodes = [], onSample }) {
  const groupRef = useRef();
  const rimRef   = useRef();
  const { gl, camera } = useThree();

  // Kinetic buffer — all physics state in refs, zero React renders on this path
  const kinetics = useRef({
    rawX: 0, rawY: 0,
    smoothX: 0, smoothY: 0,
    rawScale: 1, smoothScale: 1,
    pinchActive: false,
    pinchDist0: 0,
    scale0: 1,
    worldPos: new THREE.Vector3(0, 0, 0),
    raycaster: new THREE.Raycaster(),
    ndc: new THREE.Vector2(),
    plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
  });
  const pointers  = useRef(new Map());
  const nodesRef  = useRef(nodes);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  function screenToWorld(clientX, clientY) {
    const k    = kinetics.current;
    const rect = gl.domElement.getBoundingClientRect();
    k.ndc.set(
      ((clientX - rect.left) / rect.width)  *  2 - 1,
      -((clientY - rect.top)  / rect.height) *  2 + 1,
    );
    k.raycaster.setFromCamera(k.ndc, camera);
    if (k.raycaster.ray.intersectPlane(k.plane, k.worldPos)) {
      k.rawX = k.worldPos.x;
      k.rawY = k.worldPos.y;
    }
  }

  useEffect(() => {
    const dom = gl.domElement;

    function onPointerMove(e) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const k = kinetics.current;
      if (k.pinchActive && pointers.current.size >= 2) {
        const pts = [...pointers.current.values()];
        const dx  = pts[1].x - pts[0].x;
        const dy  = pts[1].y - pts[0].y;
        const d   = Math.sqrt(dx * dx + dy * dy);
        k.rawScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, k.scale0 * (d / k.pinchDist0)));
      } else if (pointers.current.size <= 1) {
        screenToWorld(e.clientX, e.clientY);
      }
    }

    function onPointerDown(e) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        const pts = [...pointers.current.values()];
        const dx  = pts[1].x - pts[0].x;
        const dy  = pts[1].y - pts[0].y;
        const k   = kinetics.current;
        k.pinchActive = true;
        k.pinchDist0  = Math.sqrt(dx * dx + dy * dy);
        k.scale0      = k.rawScale;
        // Gate OrbitControls while pinching
        if (controlsRef?.current) controlsRef.current.enabled = false;
      }
    }

    function onPointerUp(e) {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) {
        kinetics.current.pinchActive = false;
        if (controlsRef?.current) controlsRef.current.enabled = true;
      }
    }

    function onWheel(e) {
      e.stopPropagation();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      kinetics.current.rawScale = Math.max(SCALE_MIN,
        Math.min(SCALE_MAX, kinetics.current.rawScale * factor));
    }

    dom.addEventListener('pointermove',   onPointerMove,  { passive: true });
    dom.addEventListener('pointerdown',   onPointerDown,  { passive: true });
    dom.addEventListener('pointerup',     onPointerUp,    { passive: true });
    dom.addEventListener('pointercancel', onPointerUp,    { passive: true });
    dom.addEventListener('wheel',         onWheel,        { passive: false });

    return () => {
      dom.removeEventListener('pointermove',   onPointerMove);
      dom.removeEventListener('pointerdown',   onPointerDown);
      dom.removeEventListener('pointerup',     onPointerUp);
      dom.removeEventListener('pointercancel', onPointerUp);
      dom.removeEventListener('wheel',         onWheel);
    };
  }, [gl.domElement, controlsRef]);

  useFrame(() => {
    const k = kinetics.current;
    k.smoothX     += (k.rawX     - k.smoothX)     * DAMPING;
    k.smoothY     += (k.rawY     - k.smoothY)     * DAMPING;
    k.smoothScale += (k.rawScale - k.smoothScale)  * DAMPING;

    if (groupRef.current) {
      groupRef.current.position.set(k.smoothX, k.smoothY, 0.5);
      groupRef.current.scale.setScalar(k.smoothScale);
    }

    // Field sampling — read-only
    const ns     = nodesRef.current;
    const radius = 2.5 * k.smoothScale;
    let total = 0, count = 0;
    for (const n of ns) {
      const dx = (n.position?.[0] ?? 0) - k.smoothX;
      const dy = (n.position?.[1] ?? 0) - k.smoothY;
      if (Math.sqrt(dx * dx + dy * dy) < radius) {
        total += n.fs ?? 0;
        count++;
      }
    }
    const localConvergence = count > 0 ? total / count : 0;
    if (onSample) onSample({ localConvergence, nodeCount: count });
  });

  return (
    <group ref={groupRef}>
      {/* Rim — ringGeometry, correct Three.js pattern */}
      <mesh ref={rimRef}>
        <ringGeometry args={[1.95, 2.05, 64]} />
        <meshBasicMaterial color={LIME} transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      {/* Glass disk */}
      <mesh>
        <circleGeometry args={[1.95, 64]} />
        <meshBasicMaterial color={BLUE} transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}
