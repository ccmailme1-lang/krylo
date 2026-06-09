// WO-1025/1040 — Signal Substrate fragment shader
// Black void base; displacement lifts luminance to reveal surface topology

varying float vDisplacement;
varying vec2  vUv;

void main() {
  float lum = clamp(abs(vDisplacement) * 0.5, 0.0, 0.15);
  vec3  col = vec3(lum);
  gl_FragColor = vec4(col, 1.0);
}
