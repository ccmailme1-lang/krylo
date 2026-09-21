// as-diff/db.js
// WO-1334 — PostgreSQL connection pool + schema migration
// 2026-09-21: Supabase (managed Postgres). Reverted from a same-day MariaDB/IONOS attempt that
// hit an unresolvable external-access block on IONOS's webhosting-tier database.
// Minimal inline .env loader below because ecosystem.config.cjs never loaded one and dotenv
// isn't a dependency — must run here, at the top of this file, before `pool` is evaluated (ES
// import hoisting means loading it from engine.js instead would run too late).

import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

if (!process.env.DATABASE_URL) {
  console.warn('[WO-1334] DATABASE_URL not set — persistence layer disabled');
}

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

// Idempotent migration — runs on engine start
export async function migrate() {
  if (!pool) return;
  try {
    await runMigration();
  } catch (err) {
    console.error('[WO-1334] migration failed, DB unreachable — server continues, telemetry falls back to file:', err.message);
  }
}

async function runMigration() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS execution_plans (
      id          SERIAL PRIMARY KEY,
      plan_id     UUID        NOT NULL UNIQUE,
      timestamp   TIMESTAMPTZ NOT NULL,
      version     TEXT        NOT NULL,
      payload     JSONB       NOT NULL,
      signature   TEXT        NOT NULL,
      source      TEXT        NOT NULL,
      commit_hash TEXT        NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_execution_plans_plan_id  ON execution_plans (plan_id);
    CREATE INDEX IF NOT EXISTS idx_execution_plans_created  ON execution_plans (created_at DESC);

    CREATE TABLE IF NOT EXISTS tester_telemetry (
      id           SERIAL PRIMARY KEY,
      profile_id   TEXT,
      session_id   TEXT,
      event_type   TEXT        NOT NULL,
      payload      JSONB       NOT NULL,
      emitted_at   TIMESTAMPTZ NOT NULL,
      received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_tester_telemetry_profile  ON tester_telemetry (profile_id);
    CREATE INDEX IF NOT EXISTS idx_tester_telemetry_session  ON tester_telemetry (session_id);
    CREATE INDEX IF NOT EXISTS idx_tester_telemetry_received ON tester_telemetry (received_at DESC);
  `);
  console.log('[WO-1334] migration complete (Supabase/Postgres)');
}
