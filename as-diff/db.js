// as-diff/db.js
// WO-1334 — PostgreSQL connection pool + schema migration
// Targets Render managed PostgreSQL. Upgrade path: redirect to WO-1327 Rust socket when promoted.

import pg from 'pg';
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn('[WO-1334] DATABASE_URL not set — persistence layer disabled');
}

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

// Idempotent migration — runs on engine start
export async function migrate() {
  if (!pool) return;
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
  `);
  console.log('[WO-1334] migration complete');
}
