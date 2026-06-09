// WO-2010.5: Seed Persistence Egress — Vector A Enforcement
// Destructively strips synthesis (semantic text) before DB write.
// 18.41x deflation: 5,211 bytes → 283 bytes per write.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function persistConvergenceSnapshot(sessionId, targetPacket) {
  if (!sessionId) throw new Error('[WO-2010] FATAL: session_id is required for egress.');

  // VECTOR A ENFORCEMENT: Destructively strip the semantic weight
  const { synthesis, ...seedPacket } = targetPacket;

  const payload = {
    session_id:        sessionId,
    t_telemetry:       Date.now(),
    intent_vector:     seedPacket.intent_vector  || {},
    locked_chips:      seedPacket.locked_chips   || [],
    convergence_score: seedPacket.arbitration?.convergence_score || 0.0,
    target_packet:     seedPacket,   // 283 bytes, not 5.2KB
    status:            'SNAPSHOT_LOCKED',
    updated_at:        new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('event_envelope')
    .upsert(payload, { onConflict: 'session_id' });

  if (error) {
    console.error('[WO-2010] EGRESS NETWORK DRIFT:', error);
    return { success: false, error };
  }

  return { success: true, data };
}
