// WO-1120 — Lattice-to-Timeline Scene Transition Hook
// Lerps camera position and flattens InstancedMesh nodes into stratified tier tracks.
// isTimelineMode=true → collapse; false → restore spatial map.

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const TIMELINE_Y_TRACKS = {
  '-1': 1.5,  // Ambient Exhaust
   0:   0.7,  // Behavioral
   1:   0.0,  // Organizational
   2:  -0.7,  // Financial
   3:  -1.5,  // Legal / Regulatory
};

const CAM_SPATIAL   = new THREE.Vector3(0,  3.0,  5.0);
const CAM_TIMELINE  = new THREE.Vector3(0,  0.0,  5.0);
const LOOK_SPATIAL  = new THREE.Vector3(0,  0.0, -2.0);
const LOOK_TIMELINE = new THREE.Vector3(0,  0.0,  0.0);

const _tempMatrix = new THREE.Matrix4();
const _tempPos    = new THREE.Vector3();
const _tempRot    = new THREE.Quaternion();
const _tempScale  = new THREE.Vector3();
const _targetCam  = new THREE.Vector3();
const _targetLook = new THREE.Vector3();

/**
 * @param {React.RefObject<THREE.InstancedMesh>} nodesRef
 * @param {boolean} isTimelineMode
 * @param {number}  transitionDuration  seconds (default 0.8)
 * @returns {number} current transition progress [0, 1]
 */
export function useLatticeTransition(nodesRef, isTimelineMode, transitionDuration = 0.8, priority = 0) {
  const { camera } = useThree();
  const progressRef = useRef(0);

  useFrame((_, delta) => {
    if (!isTimelineMode && progressRef.current === 0) return; // idle — nothing to do

    const step = delta / transitionDuration;
    progressRef.current = THREE.MathUtils.clamp(
      progressRef.current + (isTimelineMode ? step : -step),
      0,
      1,
    );

    const t = progressRef.current;

    // Camera — only move when there is actual progress to apply
    _targetCam.copy(isTimelineMode  ? CAM_TIMELINE  : CAM_SPATIAL);
    _targetLook.copy(isTimelineMode ? LOOK_TIMELINE : LOOK_SPATIAL);
    camera.position.lerp(_targetCam, 0.1);
    camera.lookAt(_targetLook);

    const mesh = nodesRef.current;
    if (!mesh) return;

    const count = mesh.count;
    for (let i = 0; i < count; i++) {
      mesh.getMatrixAt(i, _tempMatrix);
      _tempMatrix.decompose(_tempPos, _tempRot, _tempScale);

      const origX = ((i % 15) - 7.5) * 0.8;
      const origY = Math.sin(i * 0.1) * 0.2;
      const origZ = -Math.floor(i / 15) * 0.6;

      const timeX   = ((i % 15) - 7.5) * 0.6;
      const tier    = (i % 5) - 1;
      const targetY = TIMELINE_Y_TRACKS[tier] ?? 0;

      _tempPos.x = THREE.MathUtils.lerp(origX, timeX,   t);
      _tempPos.y = THREE.MathUtils.lerp(origY, targetY, t);
      _tempPos.z = THREE.MathUtils.lerp(origZ, 0,       t);

      _tempMatrix.compose(_tempPos, _tempRot, _tempScale);
      mesh.setMatrixAt(i, _tempMatrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, priority);

  return progressRef.current;
}
