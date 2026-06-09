// WO-896: Signal Field Overhaul
import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { latLonToScene } from '../utils/geoprojection.js'
import { extractOriginState, STATE_CENTROIDS } from '../utils/originstate.js'

const TERRAIN_Y      = 0
const PROXIMITY_R    = 2.5

const ATTRACTORS = [
  { lat: 40.71, lon: -74.01, w: 3.0 },
  { lat: 42.36, lon: -71.06, w: 2.2 },
  { lat: 39.95, lon: -75.17, w: 2.0 },
  { lat: 38.91, lon: -77.04, w: 2.1 },
  { lat: 41.88, lon: -87.63, w: 2.8 },
  { lat: 42.33, lon: -83.05, w: 1.8 },
  { lat: 41.50, lon: -81.69, w: 1.5 },
  { lat: 44.98, lon: -93.27, w: 1.4 },
  { lat: 29.76, lon: -95.37, w: 2.5 },
  { lat: 32.78, lon: -96.80, w: 2.3 },
  { lat: 29.42, lon: -98.49, w: 1.6 },
  { lat: 30.27, lon: -97.74, w: 1.5 },
  { lat: 34.05, lon:-118.24, w: 3.0 },
  { lat: 37.77, lon:-122.42, w: 2.4 },
  { lat: 47.61, lon:-122.33, w: 1.9 },
  { lat: 45.52, lon:-122.68, w: 1.4 },
  { lat: 25.76, lon: -80.19, w: 2.0 },
  { lat: 27.95, lon: -82.46, w: 1.5 },
  { lat: 33.75, lon: -84.39, w: 2.0 },
  { lat: 33.45, lon:-112.07, w: 1.8 },
  { lat: 39.74, lon:-104.98, w: 1.6 },
  { lat: 36.17, lon:-115.14, w: 1.5 },
  { lat: 39.10, lon: -94.58, w: 1.3 },
  { lat: 39.29, lon: -76.61, w: 1.6 },
  { lat: 35.47, lon: -97.52, w: 1.2 },
]
const TOTAL_W = ATTRACTORS.reduce((s, a) => s + a.w, 0)

// KRYLO Signal Gate — originState is prerequisite (primary key). Then 2 of 3
// intelligence vectors must clear their floors AND fs >= 0.40.
function ksg(score, fidelity, originState) {
  if (!originState) return false
  if (fidelity) {
    const active = (
      ((fidelity.m_checksum  ?? 0) > 0.15 ? 1 : 0) +
      ((fidelity.t_telemetry ?? 0) > 0.10 ? 1 : 0) +
      ((fidelity.e_viral     ?? 0) > 0.05 ? 1 : 0)
    )
    return active >= 2 && score >= 0.40
  }
  return score >= 0.40
}
const LIFT_THRESHOLD = 0.40 // KSG composite floor — do not change without KSG review
const NODE_COUNT     = 320  // InstancedMesh capacity ceiling
const MAX_ATTEMPTS   = NODE_COUNT * 10

const dosRegistry = new Map()

const audio = {
  ctx: null, buffer: null, unlocked: false, queue: [],
  lastFired: 0,
  COOLDOWN: 8000,
  init() {
    if (this.ctx) return
    this.ctx = new (window.AudioContext || window.webkitAudioContext)()
    fetch('/assets/audio/Bubble burst sound.mp3')
      .then(r => r.arrayBuffer())
      .then(b => this.ctx.decodeAudioData(b))
      .then(d => { this.buffer = d })
      .catch(() => {})
  },
  unlock() {
    if (this.unlocked || !this.ctx) return
    this.ctx.resume().then(() => {
      this.unlocked = true
      this.queue.splice(0).forEach(() => this._fire())
    })
  },
  play() {
    const now = Date.now()
    if (now - this.lastFired < this.COOLDOWN) return
    this.lastFired = now
    if (!this.unlocked) { this.queue.push(1); return }
    this._fire()
  },
  _fire() {
    if (!this.buffer || !this.ctx) return
    const src  = this.ctx.createBufferSource()
    const gain = this.ctx.createGain()
    src.buffer      = this.buffer
    gain.gain.value = 0.15
    src.connect(gain)
    gain.connect(this.ctx.destination)
    src.start()
  },
}

function gauss() {
  let u = 0, v = 0
  while (!u) u = Math.random()
  while (!v) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function noise(seed, t) {
  const n = Math.sin(seed * 12.9898 + t * 78.233) * 43758.5453
  return n - Math.floor(n)
}

const C_NODE = new THREE.Color(0x66FF00)

const _col   = new THREE.Color()
const _mat   = new THREE.Matrix4()

function getColor(score, out) {
  out.copy(C_NODE)
}

function generateNodes() {
  const nodes   = []
  let attempts  = 0
  while (nodes.length < NODE_COUNT && attempts < MAX_ATTEMPTS) {
    attempts++
    let r = Math.random() * TOTAL_W
    let a = ATTRACTORS[0]
    for (const att of ATTRACTORS) { r -= att.w; if (r <= 0) { a = att; break } }
    const spread = 1.2 * (1 + (Math.random() - 0.5) * 0.3) // LOCKED — maritime boundary approved
    const lat    = a.lat + gauss() * spread
    const lon    = a.lon + gauss() * spread * 1.4
    const p      = latLonToScene(lat, lon)
    if (!p) continue
    const MIN_DIST = 0.5
    if (nodes.some(n => Math.hypot(n.baseX - p[0], n.baseZ - p[1]) < MIN_DIST)) continue
    nodes.push({
      id:          nodes.length,
      baseX:       p[0],
      baseZ:       p[1],
      x:           p[0],
      y:           TERRAIN_Y,
      z:           p[1],
      score:       Math.random(),
      seed:        Math.random() * 9999,
      orbitRadius: Math.sqrt(p[0] * p[0] + p[1] * p[1]),
      orbitAngle:  Math.atan2(p[1], p[0]),
      orbitSpeed:  0.15 + Math.random() * 0.1,
    })
  }
  return nodes
}

export default function SignalField() {
  const meshRef  = useRef()
  const linesRef = useRef()
  const nodes    = useRef([])
  const lineGeo  = useRef(new THREE.BufferGeometry())
  const frame    = useRef(0)
  const cbRef    = useRef(null)
  const { scene } = useThree()

  useEffect(() => {
    nodes.current = generateNodes()
    audio.init()
    const unlock = () => { audio.unlock(); window.removeEventListener('click', unlock) }
    window.addEventListener('click', unlock)
    return () => window.removeEventListener('click', unlock)
  }, [])

  const meshCallbackRef = (mesh) => {
    meshRef.current = mesh
    if (mesh && cbRef.current !== mesh) {
      cbRef.current = mesh
      const zero = new THREE.Matrix4().makeScale(0, 0, 0)
      for (let i = 0; i < NODE_COUNT; i++) mesh.setMatrixAt(i, zero)
      mesh.instanceMatrix.needsUpdate = true
    }
  }

  useFrame((state, delta) => {
    if (!meshRef.current) return

    const t   = state.clock.getElapsedTime()
    const tMs = t * 1000
    frame.current++
    const doMesh = frame.current % 3 === 0

    let isElevated = false
    for (let i = 0; i < nodes.current.length; i++) {
      const n = nodes.current[i]

      // Drift around home position
      const angle = n.orbitAngle + t * n.orbitSpeed
      n.x = n.baseX + Math.cos(angle) * 0.6
      n.z = n.baseZ + Math.sin(angle) * 0.6

      n.scale = n.score < 0.3
        ? 0.06 + n.score * 0.2
        : 0.12 + (n.score - 0.3) * 0.18

      // Elevation lift by score — TERRAIN_Y is absolute floor, never sub-zero
      const lift = Math.pow(Math.max(0, n.score - LIFT_THRESHOLD) / 0.7, 1.5) * 5.0
      n.y = Math.max(TERRAIN_Y, TERRAIN_Y + lift)

      if (n.y > TERRAIN_Y) isElevated = true

      // DOS — fires once, immutable
      if (!dosRegistry.get(n.id)?.hasFiredDOS) {
        dosRegistry.set(n.id, { hasFiredDOS: true, dosTimestamp: Date.now() })
        // audio.play() — disabled
      }

      _mat.makeScale(n.scale, n.scale, n.scale).setPosition(n.x, n.y, n.z)
      meshRef.current.setMatrixAt(i, _mat)
      getColor(n.score, _col)
      meshRef.current.setColorAt(i, _col)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true

    if (doMesh) {
      const linePts = []
      for (let i = 0; i < nodes.current.length; i++) {
        const n = nodes.current[i]
        if (n.score < LIFT_THRESHOLD || n.scale <= 0.05) continue
        for (let j = i + 1; j < nodes.current.length; j++) {
          const m = nodes.current[j]
          if (m.score < LIFT_THRESHOLD || m.scale <= 0.05) continue
          const dx = n.x - m.x, dy = n.y - m.y, dz = n.z - m.z
          if (dx*dx + dy*dy + dz*dz < PROXIMITY_R * PROXIMITY_R)
            linePts.push(n.x, n.y, n.z, m.x, m.y, m.z)
        }
      }
      if (linePts.length) {
        lineGeo.current.setAttribute('position',
          new THREE.BufferAttribute(new Float32Array(linePts), 3))
        lineGeo.current.attributes.position.needsUpdate = true
      }
    }
  })

  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 16, 12), [])
  const mat       = useMemo(() => new THREE.MeshBasicMaterial({ color: '#66FF00' }), [])

  return (
    <group>
      <instancedMesh
        ref={meshCallbackRef}
        args={[sphereGeo, mat, NODE_COUNT]}
        frustumCulled={false}
        renderOrder={2}
      />
      <lineSegments ref={linesRef} geometry={lineGeo.current}>
        <lineBasicMaterial color="#C8F905" transparent opacity={0.35} depthWrite={false} />
      </lineSegments>
    </group>
  )
}
