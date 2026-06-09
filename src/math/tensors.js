// WO-1022 — Anisotropic Tensor
// 3×3 stiffness matrix C_ijk over D/V/A signal axes.
// Axes: 0=Divergence, 1=Velocity, 2=Amplitude.
// Off-diagonal terms bounded ≤ 0.4. No allocation inside frame loop.

const OFF_DIAGONAL_MAX = 0.4;

export function createTensor() {
  return new Float32Array([
    1.0, 0.0, 0.0,
    0.0, 1.0, 0.0,
    0.0, 0.0, 1.0,
  ]);
}

export function updateTensor(t, values) {
  for (let i = 0; i < 9; i++) t[i] = values[i];
}

// mat3 × vec3 — result written into out (pre-allocated Float32Array(3))
export function applyTensor(t, vec3, out) {
  out[0] = t[0] * vec3[0] + t[1] * vec3[1] + t[2] * vec3[2];
  out[1] = t[3] * vec3[0] + t[4] * vec3[1] + t[5] * vec3[2];
  out[2] = t[6] * vec3[0] + t[7] * vec3[1] + t[8] * vec3[2];
  return out;
}

export function validateTensor(t) {
  const violations = [];

  for (let i = 0; i < 9; i++) {
    if (!isFinite(t[i])) violations.push(`CELL_${i}_NON_FINITE`);
  }

  // Off-diagonal bounds check
  const offDiagonal = [1, 2, 3, 5, 6, 7];
  for (const i of offDiagonal) {
    if (Math.abs(t[i]) > OFF_DIAGONAL_MAX) {
      violations.push(`OFF_DIAGONAL_${i}_EXCEEDS_${OFF_DIAGONAL_MAX}`);
    }
  }

  // Non-degenerate check (det ≠ 0)
  const det =
    t[0] * (t[4] * t[8] - t[5] * t[7]) -
    t[1] * (t[3] * t[8] - t[5] * t[6]) +
    t[2] * (t[3] * t[7] - t[4] * t[6]);

  if (Math.abs(det) < 1e-10) violations.push('DEGENERATE_TENSOR');

  return { valid: violations.length === 0, violations };
}
