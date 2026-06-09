// qa_wo1022_tensor.mjs — WO-1022 Anisotropic Tensor BAU Harness
import { createTensor, updateTensor, applyTensor, validateTensor } from './src/math/tensors.js';

async function runQaHarness() {
  console.log('[QA HARNESS] Initiating WO-1022 Anisotropic Tensor Validation...\n');

  try {
    const startTime = performance.now();

    // 1. Identity init
    const t   = createTensor();
    const v01 = validateTensor(t);

    // 2. applyTensor on unit vector — must return same vector (identity)
    const out = new Float32Array(3);
    applyTensor(t, [1, 0, 0], out);
    const identityPass = out[0] === 1 && out[1] === 0 && out[2] === 0;

    // 3. Off-diagonal violation detection
    const bad = createTensor();
    updateTensor(bad, [1.0, 0.5, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0]); // 0.5 > 0.4
    const v03 = validateTensor(bad);

    // 4. Degenerate tensor detection
    const zero = createTensor();
    updateTensor(zero, new Float32Array(9)); // all zeros → det=0
    const v04 = validateTensor(zero);

    const executionTime = performance.now() - startTime;

    const telemetry = {
      execution_ms:        executionTime.toFixed(2),
      status:              'SUCCESS',
      tensor_validation: {
        identity_valid:        v01.valid,
        apply_identity_pass:   identityPass,
        off_diagonal_caught:   !v03.valid && v03.violations.some(v => v.includes('OFF_DIAGONAL')),
        degenerate_caught:     !v04.valid && v04.violations.includes('DEGENERATE_TENSOR'),
      }
    };

    console.log('================ [QA RAW TELEMETRY OUTPUT] ================');
    console.log(JSON.stringify(telemetry, null, 2));
    console.log('===========================================================');

  } catch (error) {
    console.log('================ [QA FATAL ERROR TRACE] ================');
    console.error(JSON.stringify({
      status:        'FAIL',
      error_name:    error.name,
      error_message: error.message,
      stack:         error.stack,
    }, null, 2));
    console.log('========================================================');
  }
}

runQaHarness();
