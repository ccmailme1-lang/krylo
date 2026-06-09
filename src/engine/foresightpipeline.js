// WO-1032: Foresight Engine — Multi-Model Pipeline
// DeepSeek (Stage 1: ingestion) → o3 (Stage 2: trajectory math) → Opus 4.7 (Stage 3: synthesis)
import { ingestSignal } from './deepseekingest.js';
import { calculateTrajectory } from './o3trajectory.js';
import { synthesizeForesight } from './opussynth.js';

// Minimum deviation score to trigger o3 — avoids burning o3 on noise
const DEVIATION_GATE = 0.2;

export async function runForesightPipeline(signalData, currentScore, scoreHistory) {
  // Stage 1: DeepSeek — signal ingestion and pattern recognition
  const signalPacket = await ingestSignal(signalData);

  // Gate: skip o3 and Opus if signal is too close to baseline
  if (signalPacket.deviation_score !== null && signalPacket.deviation_score < DEVIATION_GATE) {
    return null;
  }

  // Stage 2: o3 — trajectory mathematics
  const mathObject = await calculateTrajectory(signalPacket, currentScore, scoreHistory);

  // Stage 3: Opus 4.7 — plain-English synthesis
  const foresightOutput = await synthesizeForesight(mathObject);

  return {
    signal_packet: signalPacket,
    math_object: mathObject,
    foresight: foresightOutput,
    generated_at: new Date().toISOString()
  };
}
