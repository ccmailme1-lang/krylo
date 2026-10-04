// as-diff/db.js
// WO-1334 — PostgreSQL connection pool + schema migration
// 2026-09-21: Supabase (managed Postgres). Reverted from a same-day MariaDB/IONOS attempt that
// hit an unresolvable external-access block on IONOS's webhosting-tier database (confirmed by
// IONOS support, 2026-09-29: a hard limitation of that product tier, not a missed config option).
// 2026-09-29: moved OFF Supabase -- the hosted project's hostname stopped resolving in production
// (DNS/ENOTFOUND, confirmed via live logs), an operational failure independent of this ticket.
// Now PostgreSQL 16, self-hosted on this same VPS (root access already available here, which is
// exactly what IONOS support said is required for a database with real external-access control --
// moot anyway since krylo-api and this DB now share one machine, so it's a localhost connection,
// not external access at all). See ssl handling below.
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

// KRYL-1334 (2026-09-29): SSL is required for Supabase's remote connection but breaks against a
// local Postgres (localhost, now the real backend -- see db.js header) that isn't configured for
// it. Only request SSL for a non-local host; a localhost/127.0.0.1 connectionString skips it.
const isLocalDb = /^(postgres(?:ql)?:\/\/[^@]*@)?(localhost|127\.0\.0\.1)([:/]|$)/.test(process.env.DATABASE_URL ?? '');
export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: isLocalDb ? false : { rejectUnauthorized: false } })
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

    -- KRYL-1334 Part 1 (2026-09-30) -- Relational Change / Temporal Persistence. Schema per the
    -- ratified MAP design (specs/SPEC-relational-change-temporal-axis.md + tonight's three
    -- corrections): formation_id is derived from subject+field_scope+formation_scope+entity_a+
    -- entity_b+relationship_type (comparison-granularity ruling, LOCKED) -- computed by the
    -- application layer, stored as a plain column for indexed lookup, never re-derived
    -- inconsistently across writers. entity_a/entity_b are KRYL-1335/1336's structural
    -- participant labels (e.g. SUPPLIER, DISTRIBUTOR) -- entity-to-entity, not domain-to-domain
    -- (structural.js already covers domain-to-domain via inferFormation(), untouched, separate
    -- concern). state has no STABLE-as-event: a STABLE read is the ABSENCE of a new row for that
    -- formation_id between two samples, derived at diff time, never written (per tonight's
    -- correction: "a stable segment... should not require a new STABLE event glyph").
    CREATE TABLE IF NOT EXISTS formation_state (
      id                 SERIAL PRIMARY KEY,
      formation_id       TEXT        NOT NULL,
      subject_scope      TEXT,
      entity_a           TEXT        NOT NULL,
      entity_b           TEXT        NOT NULL,
      relationship_type  TEXT        NOT NULL,
      state              TEXT        NOT NULL CHECK (state IN
                           ('NEW','STRENGTHENING','WEAKENING','RECONFIGURATION','DISSOLUTION')),
      evidence_ref       TEXT,
      provenance         JSONB,
      trigger            TEXT        NOT NULL CHECK (trigger IN ('clock','material_change')),
      captured_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_formation_state_scope
      ON formation_state (formation_id, captured_at DESC);

    -- Guest State Durability (2026-10-02) -- server mirror for guest work-product that previously
    -- lived only in browser localStorage (saved projects, evidence, DNA cards, path memory, etc.):
    -- confirmed via repo-wide grep that only tester_telemetry had a server copy; everything else
    -- was device-only and unrecoverable if a guest cleared browser data or switched devices.
    -- One row per (profile_id, store_key) pair, upserted on every save -- same fire-and-forget,
    -- DB-with-file-fallback pattern as tester_telemetry above, not a new design.
    CREATE TABLE IF NOT EXISTS guest_state (
      id          SERIAL PRIMARY KEY,
      profile_id  TEXT        NOT NULL,
      store_key   TEXT        NOT NULL,
      data        JSONB       NOT NULL,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (profile_id, store_key)
    );
    CREATE INDEX IF NOT EXISTS idx_guest_state_profile ON guest_state (profile_id);
  `);
  console.log('[WO-1334] migration complete (Supabase/Postgres)');
}
