// formationstatestore.js — KRYL-1334 Part 1, the actual DB write/read wrapper. Thin on purpose:
// all real logic (what to write, whether it's a material change) already lives in
// src/engine/formationsnapshot.js (pure, tested). This file's only job is the pool.query() calls
// themselves, mirroring the tester_telemetry / formation_snapshots handler pattern already in
// as-diff/engine.js.

import { pool } from './db.js';

export async function writeFormationState(row) {
  if (!pool) throw new Error('formationstatestore: DB unavailable');
  const { rows } = await pool.query(
    `INSERT INTO formation_state
       (formation_id, subject_scope, entity_a, entity_b, relationship_type, state, evidence_ref, provenance, trigger)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, captured_at`,
    [row.formation_id, row.subject_scope, row.entity_a, row.entity_b, row.relationship_type,
     row.state, row.evidence_ref, row.provenance ? JSON.stringify(row.provenance) : null, row.trigger]
  );
  return rows[0];
}

// Most recent row for a formation_id -- what decideWrite() compares a new candidate against.
export async function lastFormationState(formationId) {
  if (!pool) return null;
  const { rows } = await pool.query(
    `SELECT * FROM formation_state WHERE formation_id = $1 ORDER BY captured_at DESC LIMIT 1`,
    [formationId]
  );
  return rows[0] ?? null;
}

// Full history for a formation_id, oldest first -- what diffFormationHistory() consumes.
export async function formationStateHistory(formationId) {
  if (!pool) return [];
  const { rows } = await pool.query(
    `SELECT * FROM formation_state WHERE formation_id = $1 ORDER BY captured_at ASC`,
    [formationId]
  );
  return rows;
}
