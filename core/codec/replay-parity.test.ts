// WO-1084-G — Replay parity: validate persisted frame corpus against both runtimes
// Reads runtime/frames.ndjson, decodes every stored frame with TS + Rust verify.
// Zero divergences required. Skips gracefully if log is empty.

import { readFileSync, existsSync } from 'node:fs';
import { resolve }                  from 'node:path';
import { decode }                   from './decode.js';
import { DecodeError }              from './errors.js';
import { toHex, rustBatch }         from './fuzz.telemetry.js';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..');
const LOG_PATH  = resolve(REPO_ROOT, 'runtime', 'frames.ndjson');

if (!existsSync(LOG_PATH)) {
    console.log('replay-parity: runtime/frames.ndjson not found — skip');
    process.exit(0);
}

const raw     = readFileSync(LOG_PATH, 'utf8').trim();
const entries = raw.split('\n').filter(Boolean).map(l => JSON.parse(l));

if (entries.length === 0) {
    console.log('replay-parity: log empty — skip');
    process.exit(0);
}

console.log(`\nreplay-parity: ${entries.length} stored frame(s)\n`);

const bufs: Uint8Array[] = entries.map(e =>
    Uint8Array.from(atob(e.frame), c => c.charCodeAt(0))
);

// TS decode pass
const tsResults: string[] = bufs.map(buf => {
    try { decode(buf); return 'OK'; }
    catch (e) { return e instanceof DecodeError ? `ERR:${(e as DecodeError).kind}` : 'ERR:UNKNOWN'; }
});

// Rust verify pass
const rustResults = rustBatch(bufs);

let divergences = 0;
for (let i = 0; i < entries.length; i++) {
    const ts   = tsResults[i];
    const rust = rustResults[i];
    const tag  = ts === rust ? '✓' : '✗';
    console.log(`  ${tag} seq=${entries[i].seq}  compliance=${entries[i].compliance}  TS=${ts}  Rust=${rust}`);
    if (ts !== rust) {
        divergences++;
        console.error(`      frameHex: ${toHex(bufs[i]).slice(0, 64)}…`);
    }
}

console.log(`\n  frames: ${entries.length}  divergences: ${divergences}`);
console.log(`  result: ${divergences === 0 ? 'CLEAN' : 'DIVERGENCES DETECTED'}\n`);

if (divergences > 0) process.exitCode = 1;
