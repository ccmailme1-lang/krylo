// WO-896: Extruded 3D US Map — replaces flat ShapeGeometry/terrain
// Colors: #040404 bg, #242230 face, #07080A walls

import * as THREE from 'three'
import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as topojson from 'topojson-client'
import { latLonToScene } from '../../utils/geoprojection.js'

const TOPO_URL  = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'
const FILL_Y    = -3
const EXTRUDE_D = 0.28
const MAT_SIDE   = new THREE.MeshBasicMaterial({ color: '#07080A' })
const MAT_BORDER = new THREE.LineBasicMaterial({ color: '#3D3B47', linewidth: 1 })

function coordsToShape(ring) {
  const shape = new THREE.Shape()
  let started = false
  ring.forEach(([lon, lat]) => {
    const p = latLonToScene(lat, lon)
    if (!p) return
    if (!started) { shape.moveTo(p[0], p[1]); started = true }
    else shape.lineTo(p[0], p[1])
  })
  return shape
}

function buildStateGeometry(polygons) {
  const shape = coordsToShape(polygons[0][0])
  for (let i = 1; i < polygons[0].length; i++) {
    shape.holes.push(coordsToShape(polygons[0][i]))
  }
  return new THREE.ExtrudeGeometry(shape, {
    depth:         EXTRUDE_D,
    bevelEnabled:  false,
  })
}

export default function Layer3USMesh() {
  const { scene } = useThree()
  const groupRef  = useRef(null)
  const [ready, setReady]       = useState(false)
  const [progress, setProgress] = useState(0)
  const progressRef             = useRef(0)
  const rafRef                  = useRef(null)

  useEffect(() => {
    // Drive bar to 85% quickly, hold until fetch completes
    const tick = () => {
      const target = progressRef.current < 85 ? 85 : progressRef.current
      progressRef.current = Math.min(target, progressRef.current + (85 - progressRef.current) * 0.12 + 0.3)
      setProgress(Math.round(progressRef.current * 10) / 10)
      if (progressRef.current < 99.9) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => {
    if (!scene) return
    let alive = true

    const group = new THREE.Group()
    group.rotation.x = Math.PI / 2
    group.position.set(0, FILL_Y, 0)
    group.scale.set(0.963, 0.963, 1)
    scene.add(group)
    groupRef.current = group

    fetch(TOPO_URL)
      .then(r => r.json())
      .then(data => {
        if (!alive) return
        const fc = topojson.feature(data, data.objects.states)
        const hitMeshes  = []
        const faceMeshes = []

        fc.features.forEach(feature => {
          if (!feature.geometry) return
          const polys = feature.geometry.type === 'Polygon'
            ? [feature.geometry.coordinates]
            : feature.geometry.coordinates

          polys.forEach(poly => {
            try {
              const geo     = buildStateGeometry([poly])
              const faceMat = new THREE.MeshBasicMaterial({ color: '#242230', side: THREE.DoubleSide })
              const mesh    = new THREE.Mesh(geo, [faceMat, MAT_SIDE])
              mesh.userData.stateName = feature.properties?.name ?? ''
              group.add(mesh)
              faceMeshes.push(mesh)
              hitMeshes.push(mesh)
            } catch (_) {}
          })
        })

        // Interior borders only — excludes coastline outline
        const interior = topojson.mesh(data, data.objects.states, (a, b) => a !== b)
        interior.coordinates.forEach(ring => {
          const pts = []
          ring.forEach(([lon, lat]) => {
            const p = latLonToScene(lat, lon)
            if (p) pts.push(p[0], p[1], -EXTRUDE_D - 0.01)
          })
          if (pts.length < 6) return
          const lineGeo = new THREE.BufferGeometry()
          lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3))
          group.add(new THREE.Line(lineGeo, MAT_BORDER))
        })

        scene.userData.stateHitMeshes  = hitMeshes
        scene.userData.stateFaceMeshes = faceMeshes
        scene.userData.mapReady = true
        progressRef.current = 100
        setProgress(100)
        setTimeout(() => setReady(true), 120)
      })
      .catch(() => {})

    return () => {
      alive = false
      scene.userData.mapReady = false
      scene.remove(group)
      group.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose()
      })
      scene.userData.stateHitMeshes  = []
      scene.userData.stateFaceMeshes = []
    }
  }, [scene])

  if (ready) return null

  return (
    <Html fullscreen style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <div style={{ width: '200px' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', letterSpacing: '0.22em', color: '#444', marginBottom: '10px', textAlign: 'center' }}>LOADING SIGNAL FIELD</div>
          <div style={{ width: '100%', height: '1px', background: '#111', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#66FF00', width: `${progress}%`, transition: 'width 0.08s linear' }} />
          </div>
        </div>
      </div>
    </Html>
  )
}
