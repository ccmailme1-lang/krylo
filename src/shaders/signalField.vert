// WO-1025/1040 — Signal Substrate vertex shader
// High-density path: uniform arrays uActiveNodes[10] + uActiveVectors[10]
// Low-density path: CPU pre-deforms position buffer; shader is passthrough (all z-flags = 0)

uniform float uTime;
uniform vec3  uActiveNodes[10];    // xy = scene coords, z = active flag (0 or 1)
uniform vec4  uActiveVectors[10];  // x=D, y=V, z=A, w=T

varying float vDisplacement;
varying vec2  vUv;

void main() {
  vec3  pos               = position;
  float totalDisplacement = 0.0;

  for (int i = 0; i < 10; i++) {
    if (uActiveNodes[i].z > 0.5) {
      float dist      = distance(pos.xy, uActiveNodes[i].xy);
      float amplitude = uActiveVectors[i].z;               // A → amplitude
      float frequency = 2.0 + uActiveVectors[i].y * 4.0;  // V → frequency

      totalDisplacement += (amplitude / (dist * dist + 0.15))
                         * sin(uTime * 3.0 - dist * frequency);
    }
  }

  pos.z        += totalDisplacement;
  vDisplacement = totalDisplacement;
  vUv           = uv;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
