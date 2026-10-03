// formationstatestore.js — KRYL-1334 Part 1, the actual DB write/read wrapper. Thin on purpose:
// all real logic (what to write, whether it's a material change) already lives in
// src/engine/formationsnapshot.js (pure, tested). This file's only job is persisting and reading
// rows: Postgres first, with a local JSONL file as the fallback so production persists even when
// the DB is unreachable (it is, from the VPS -- observed 2026-10-03). Same pattern as
// tester_telemetry (as-diff/engine.js): any DB failure falls back to the file, never drops the row.
//
// A row lives in exactly ONE place (DB or file), never both, so reads merge the two sources by
// captured_at. captured_at is always CAPTURE time -- when KRYLO observed it -- never a filing date.

import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { pool } from './db.js';

const FORMATION_STATE_FILE = fileURLToPath(new URL('./data/formation_state.jsonl', import.meta.url));

// Log the failure CLASS only -- a pg connection error's message can carry host/user text.
function logDbFallback(op, err) {
  console.error(`[formation-state] ${op}: DB unavailable (${err?.code ?? 'error'}) -- using file fallback`);
}

function readFileRows() {
  if (!existsSync(FORMATION_STATE_FILE)) return [];
  const rows = [];
  for (const line of readFileSync(FORMATION_STATE_FILE, 'utf8').split('\n')) {
    if (!line) continue;
    try { rows.push(JSON.parse(line)); } catch { /* a torn line is skipped, never fatal */ }
  }
  return rows;
}

function appendFileRow(row) {
  const dir = dirname(FORMATION_STATE_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(FORMATION_STATE_FILE, JSON.stringify(row) + '\n');
}

const byCapturedAt = (a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime();

async function dbRowsFor(formationId) {
  if (!pool) return [];
  try {
    const { rows } = await pool.query(
      `SELECT * FROM formation_state WHERE formation_id = $1 ORDER BY captured_at ASC`,
      [formationId]
    );
    return rows;
  } catch (err) {
    logDbFallback('read', err);
    return [];
  }
}

export async function writeFormationState(row) {
  if (pool) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO formation_state
           (formation_id, subject_scope, entity_a, entity_b, relationship_type, state, evidence_ref, provenance, trigger)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, captured_at`,
        [row.formation_id, row.subject_scope, row.entity_a, row.entity_b, row.relationship_type,
         row.state, row.evidence_ref, row.provenance ? JSON.stringify(row.provenance) : null, row.trigger]
      );
      return rows[0];
    } catch (err) {
      logDbFallback('write', err);
    }
  }
  const stored = {
    id: `file-${randomUUID()}`,
    formation_id: row.formation_id,
    subject_scope: row.subject_scope ?? null,
    entity_a: row.entity_a,
    entity_b: row.entity_b,
    relationship_type: row.relationship_type,
    state: row.state,
    evidence_ref: row.evidence_ref ?? null,
    provenance: row.provenance ?? null,
    trigger: row.trigger,
    captured_at: new Date().toISOString(),
  };
  appendFileRow(stored);
  return { id: stored.id, captured_at: stored.captured_at };
}

// Most recent row for a formation_id -- what decideWrite() compares a new candidate against.
export async function lastFormationState(formationId) {
  const all = await formationStateHistory(formationId);
  return all.length ? all[all.length - 1] : null;
}

// Every snapshot for one resolved subject (all of its canonical formations), oldest first --
// KRYL-1350's read: one request for a subject instead of one per formation_id. Same DB + file
// merge as formationStateHistory().
export async function formationStateHistoryBySubject(subject) {
  let fromDb = [];
  if (pool) {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM formation_state WHERE subject_scope = $1 ORDER BY captured_at ASC`,
        [subject]
      );
      fromDb = rows;
    } catch (err) {
      logDbFallback('read', err);
    }
  }
  const fromFile = readFileRows().filter(r => r.subject_scope === subject);
  return [...fromDb, ...fromFile].sort(byCapturedAt);
}

// Full history for a formation_id, oldest first -- what diffFormationHistory() consumes.
export async function formationStateHistory(formationId) {
  const fromDb = await dbRowsFor(formationId);
  const fromFile = readFileRows().filter(r => r.formation_id === formationId);
  return [...fromDb, ...fromFile].sort(byCapturedAt);
}
