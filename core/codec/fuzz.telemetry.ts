// WO-1084-E — Divergence telemetry layer
// Wraps the fuzz suite with structured timing, per-phase stats, and divergence records.
// Writes fuzz-report.json on every run. Zero divergences = clean report.

import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { decode } from './decode.js';
import { encode } from './encode.js';
import { DecodeError, CodecError } from './errors.js';
import { Frame } from './types.js';

const REPO_ROOT  = resolve(import.meta.dirname, '..', '..');
const VERIFY_BIN = resolve(REPO_ROOT, 'codec', 'target', 'debug', 'verify');
const REPORT_OUT = resolve(import.meta.dirname, 'fuzz-report.json');

export interface DivergenceRecord {
    label:     string;
    tsResult:  string;
    rustResult: string;
    frameHex:  string;
}

export interface PhaseReport {
    name:          string;
    mutationCount: number;
    converged:     number;
    diverged:      number;
    durationMs:    number;
    divergences:   DivergenceRecord[];
}

export interface FuzzReport {
    timestamp:      string;
    abiVersion:     string;
    totalMutations: number;
    totalConverged: number;
    totalDiverged:  number;
    totalDurationMs: number;
    clean:          boolean;
    phases:         PhaseReport[];
}

// ── Shared utilities ──────────────────────────────────────────────────────────

export function toHex(buf: Uint8Array): string {
    return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function tsResult(buf: Uint8Array): string {
    try { decode(buf); return 'OK'; }
    catch (e) { return e instanceof CodecError ? `ERR:${e.kind}` : 'ERR:UNKNOWN'; }
}

export function rustBatch(frames: Uint8Array[]): string[] {
    const input = frames.map(toHex).join('\n') + '\n';
    const r = spawnSync(VERIFY_BIN, [], { input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.error) throw r.error;
    return (r.stdout as string).trim().split('\n').map(l => l.trim());
}

// ── Phase runner ──────────────────────────────────────────────────────────────

export function runPhase(
    name: string,
    mutations: { label: string; buf: Uint8Array }[]
): PhaseReport {
    const start     = Date.now();
    const tsResults = mutations.map(m => tsResult(m.buf));
    const rustResults = rustBatch(mutations.map(m => m.buf));
    const durationMs = Date.now() - start;

    const divergences: DivergenceRecord[] = [];
    let converged = 0;

    for (let i = 0; i < mutations.length; i++) {
        if (tsResults[i] === rustResults[i]) {
            converged++;
        } else {
            divergences.push({
                label:      mutations[i].label,
                tsResult:   tsResults[i],
                rustResult: rustResults[i],
                frameHex:   toHex(mutations[i].buf),
            });
        }
    }

    return {
        name,
        mutationCount: mutations.length,
        converged,
        diverged:    divergences.length,
        durationMs,
        divergences,
    };
}

// ── Report writer ─────────────────────────────────────────────────────────────

export function writeReport(phases: PhaseReport[]): FuzzReport {
    const report: FuzzReport = {
        timestamp:       new Date().toISOString(),
        abiVersion:      '1.0',
        totalMutations:  phases.reduce((s, p) => s + p.mutationCount, 0),
        totalConverged:  phases.reduce((s, p) => s + p.converged, 0),
        totalDiverged:   phases.reduce((s, p) => s + p.diverged, 0),
        totalDurationMs: phases.reduce((s, p) => s + p.durationMs, 0),
        clean:           phases.every(p => p.diverged === 0),
        phases,
    };

    writeFileSync(REPORT_OUT, JSON.stringify(report, null, 2));
    return report;
}

export function printReport(report: FuzzReport): void {
    console.log('\n' + '━'.repeat(58));
    console.log(` Fuzz Telemetry Report — ${report.timestamp}`);
    console.log('━'.repeat(58));

    for (const p of report.phases) {
        const status = p.diverged === 0 ? '✓' : '✗';
        console.log(`  ${status} ${p.name.padEnd(36)} ${p.mutationCount} mutations  ${p.durationMs}ms`);
        for (const d of p.divergences) {
            console.error(`      DIVERGENCE: ${d.label}`);
            console.error(`        TS:   ${d.tsResult}`);
            console.error(`        Rust: ${d.rustResult}`);
        }
    }

    console.log('━'.repeat(58));
    console.log(`  mutations:  ${report.totalMutations}`);
    console.log(`  converged:  ${report.totalConverged}`);
    console.log(`  diverged:   ${report.totalDiverged}`);
    console.log(`  duration:   ${report.totalDurationMs}ms`);
    console.log(`  result:     ${report.clean ? 'CLEAN' : 'DIVERGENCES DETECTED'}`);
    console.log('━'.repeat(58) + '\n');
    console.log(`  report written → ${REPORT_OUT}\n`);
}
