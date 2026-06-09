import { geoAlbersUsa } from 'd3-geo'

const BOUNDS = { minX: -10, maxX: 10, minZ: -6, maxZ: 6 }

function projToScene(px, py) {
  const x = (px / 960 - 0.5) * (BOUNDS.maxX - BOUNDS.minX)
  const z = (py / 600 - 0.5) * (BOUNDS.maxZ - BOUNDS.minZ)
  return [x, z]
}

const albersProj = geoAlbersUsa().scale(1280).translate([480, 300])

export function latLonToScene(lat, lon) {
  const p = albersProj([lon, lat])
  if (!p) return null
  return projToScene(p[0], p[1])
}
