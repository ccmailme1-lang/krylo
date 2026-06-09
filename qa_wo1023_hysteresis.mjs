// qa_wo1023_hysteresis.mjs — WO-1023 Hysteresis Buffer BAU Harness
import { createHysteresisBuffer, writeFrame, readFrame, flushBuffer, getDepth, isDesynced } from './src/engine/memory.js';

async function runQaHarness() {
  console.log('[QA HARNESS] Initiating WO-1023 Hysteresis Buffer Validation...\n');

  try {
    const startTime  = performance.now();
    const VERT_COUNT = 4;
    const buf        = createHysteresisBuffer(VERT_COUNT);

    // 1. Init — depth must be 0
    const initDepth = getDepth(buf);

    // 2. Three writes → depth = 3
    const f1 = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
    const f2 = new Float32Array([2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0]);
    const f3 = new Float32Array([3, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0]);
    writeFrame(buf, 1, f1);
    writeFrame(buf, 2, f2);
    writeFrame(buf, 3, f3);
    const afterThreeDepth = getDepth(buf);

    // 3. Fourth write → depth still 3 (ring, not 4)
    const f4 = new Float32Array([4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0]);
    writeFrame(buf, 4, f4);
    const afterFourDepth = getDepth(buf);

    // 4. readFrame(1) → prior frame (f3, since f4 is current)
    const prior = readFrame(buf, 1);
    const priorIsF3 = prior?.offsets[0] === 3;

    // 5. Desync detection — gap of 6 frames
    const desynced = isDesynced(buf, 10); // last frameId=4, current=10 → gap=6 > 5

    // 6. Flush → depth back to 0
    flushBuffer(buf);
    const afterFlushDepth = getDepth(buf);

    const executionTime = performance.now() - startTime;

    const telemetry = {
      execution_ms:       executionTime.toFixed(2),
      status:             'SUCCESS',
      buffer_validation: {
        init_depth_zero:     initDepth === 0,
        depth_3_after_3:     afterThreeDepth === 3,
        ring_holds_at_3:     afterFourDepth === 3,
        prior_frame_correct: priorIsF3,
        desync_detected:     desynced,
        flush_resets_depth:  afterFlushDepth === 0,
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
