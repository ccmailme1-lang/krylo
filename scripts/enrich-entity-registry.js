#!/usr/bin/env node
// WO-2042 — Entity Registry Enrichment Script
// Populates FEC committee IDs and SAM.gov UEIs in src/data/entityregistry.json
//
// Usage:
//   DATA_GOV_API_KEY=your_key node scripts/enrich-entity-registry.js          # dry run
//   DATA_GOV_API_KEY=your_key node scripts/enrich-entity-registry.js --write  # persist
//
// Dry run prints every match without modifying the file.
// --write overwrites entityregistry.json with populated identifiers.
//
// Rate limits: 600ms between FEC calls, 1000ms between SAM calls (conservative).
// Re-runnable: skips entities where identifier is already populated.

import https from 'https';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir        = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = join(__dir, '../src/data/entityregistry.json');
const WRITE_MODE   = process.argv.includes('--write');
const API_KEY      = process.env.DATA_GOV_API_KEY ?? '';

if (!API_KEY) {
  console.error('ERROR: DATA_GOV_API_KEY not set.');
  console.error('Run: DATA_GOV_API_KEY=your_key node scripts/enrich-entity-registry.js');
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpsGet(hostname, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method: 'GET',
      headers: { Accept: 'application/json', 'User-Agent': 'krylo/1.0' },
    };
    const req = https.request(options, res => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => {
        if (res.statusCode === 429) { reject(new Error('RATE_LIMITED')); return; }
        if (res.statusCode >= 400) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error(`parse error: ${body.slice(0, 80)}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Minimal token overlap: does haystack contain at least one significant token from needle?
function tokenOverlap(needle, haystack) {
  const sig = needle.split(' ').filter(w => w.length > 3);
  const h   = haystack.toUpperCase();
  return sig.some(w => h.includes(w));
}

// ── FEC lookup ────────────────────────────────────────────────────────────────
// Searches /v1/committees/ for corporate PACs/SSFs matching the entity name.
// FEC committee names are the PAC name (e.g. "APPLE EMPLOYEES PAC"),
// not the company name — so we match on token overlap.

async function lookupFec(canonicalName) {
  const norm  = canonicalName.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').trim();
  const query = encodeURIComponent(norm.split(' ')[0]); // search by first significant token
  const path  = `/v1/committees/?api_key=${API_KEY}&name=${query}&organization_type=C&per_page=10&sort=name`;
  const json  = await httpsGet('api.open.fec.gov', path);
  const results = json?.results ?? [];

  for (const r of results) {
    const rName = (r.name ?? '').toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').trim();
    if (tokenOverlap(norm, rName)) {
      return { id: r.committee_id, name: r.name, type: r.committee_type };
    }
  }
  return null;
}

// ── SAM.gov UEI lookup ────────────────────────────────────────────────────────
// SAM.gov Entity Information API v3 — returns UEI for active federal registrants.
// UEI (Unique Entity Identifier) replaced DUNS in 2022 and is used in USASpending.

async function lookupSam(canonicalName) {
  const query = encodeURIComponent(canonicalName);
  const path  = `/entity-information/v3/entities?api_key=${API_KEY}&legalBusinessName=${query}&samRegistered=Yes&registrationStatus=A`;
  const json  = await httpsGet('api.sam.gov', path);
  const entities = json?.entityData ?? [];
  if (entities.length === 0) return null;

  const first = entities[0];
  const uei   = first?.entityRegistration?.ueiSAM ?? null;
  const name  = first?.entityRegistration?.legalBusinessName ?? '';
  return uei ? { uei, name } : null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
  let fecHit = 0, fecMiss = 0, samHit = 0, samMiss = 0;

  console.log(`Mode: ${WRITE_MODE ? 'WRITE' : 'DRY RUN'} | Entities: ${registry.length}\n`);

  for (const entity of registry) {
    const name = entity.canonicalName;

    // ── FEC ──
    if (entity.identifiers.fec === null) {
      try {
        await sleep(600);
        const hit = await lookupFec(name);
        if (hit) {
          console.log(`FEC  ✓  ${entity.canonicalId.padEnd(30)} → ${hit.id}  (${hit.name})`);
          entity.identifiers.fec = hit.id;
          fecHit++;
        } else {
          console.log(`FEC  —  ${entity.canonicalId.padEnd(30)} → no match`);
          fecMiss++;
        }
      } catch (e) {
        console.log(`FEC  ✗  ${entity.canonicalId.padEnd(30)} → ${e.message}`);
        fecMiss++;
      }
    } else {
      console.log(`FEC  ·  ${entity.canonicalId.padEnd(30)} → already set (${entity.identifiers.fec})`);
    }

    // ── SAM.gov ──
    if (entity.identifiers.uei === null) {
      try {
        await sleep(1000);
        const hit = await lookupSam(name);
        if (hit) {
          console.log(`SAM  ✓  ${entity.canonicalId.padEnd(30)} → ${hit.uei}  (${hit.name})`);
          entity.identifiers.uei = hit.uei;
          samHit++;
        } else {
          console.log(`SAM  —  ${entity.canonicalId.padEnd(30)} → no match`);
          samMiss++;
        }
      } catch (e) {
        console.log(`SAM  ✗  ${entity.canonicalId.padEnd(30)} → ${e.message}`);
        samMiss++;
      }
    } else {
      console.log(`SAM  ·  ${entity.canonicalId.padEnd(30)} → already set (${entity.identifiers.uei})`);
    }

    console.log('');
  }

  console.log('─'.repeat(60));
  console.log(`FEC   populated: ${fecHit}  |  not found: ${fecMiss}`);
  console.log(`SAM   populated: ${samHit}  |  not found: ${samMiss}`);
  console.log('─'.repeat(60));

  if (WRITE_MODE) {
    writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');
    console.log(`\nWrote → ${REGISTRY_PATH}`);
  } else {
    console.log('\nDry run complete. Pass --write to persist.\n');
    console.log('Command:');
    console.log('  DATA_GOV_API_KEY=your_key node scripts/enrich-entity-registry.js --write');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
