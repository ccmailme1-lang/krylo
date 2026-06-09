// WO-703: Worker Raycasting — sphere intersection off main thread
// Receives: { nodes: [{x, y, z, r}], origin: {x,y,z}, direction: {x,y,z} }
// Returns:  { closest: number } — index of hit node, -1 if none

self.onmessage = ({ data: { nodes, origin, direction } }) => {
  const { x: ox, y: oy, z: oz } = origin;
  const { x: dx, y: dy, z: dz } = direction;

  let closest = -1;
  let minDist  = Infinity;

  for (let i = 0; i < nodes.length; i++) {
    const { x, y, z, r } = nodes[i];
    // Ray-sphere intersection: solve ||(o + t*d) - c||^2 = r^2
    const ex   = ox - x;
    const ey   = oy - y;
    const ez   = oz - z;
    const b    = ex * dx + ey * dy + ez * dz;
    const c    = ex * ex + ey * ey + ez * ez - r * r;
    const disc = b * b - c;
    if (disc < 0) continue;
    const t = -b - Math.sqrt(disc);
    if (t > 0 && t < minDist) { minDist = t; closest = i; }
  }

  self.postMessage({ closest });
};
