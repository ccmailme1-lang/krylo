// WO-1090 — Signal Pipeline Integration
// Encode/decode boundary: ETR signal objects ↔ ABI v1.0 frames

import { encode } from './encode';
import { decode } from './decode';
import { Frame, Event } from './types';

export const SOURCE_TO_DOMAIN: Record<string, number> = {
    'seed': 1, 'truth-engine': 2, 'hn': 3, 'fallback': 4, 'spine': 5, 'nooma': 6,
};
const DOMAIN_TO_SOURCE: Record<number, string> = Object.fromEntries(
    Object.entries(SOURCE_TO_DOMAIN).map(([k, v]) => [v, k])
);

export interface EtrSignal {
    id:                  string;
    truth_statement:     string;
    signal_score:        number;
    source_type:         string;
    fidelity_components: { m_checksum: number; t_telemetry: number; d_docs: number; v_voice: number; e_viral: number; };
    [k: string]:         unknown;
}

function packSpatialKey(sig: EtrSignal): bigint {
    const fc = sig.fidelity_components;
    const p = (v: number) => BigInt(Math.round(Math.min(1, Math.max(0, v)) * 255));
    return p(fc.m_checksum) | (p(fc.t_telemetry) << 8n) | (p(fc.d_docs) << 16n) |
           (p(fc.v_voice) << 24n) | (p(fc.e_viral) << 32n) | (p(sig.signal_score) << 40n);
}

function unpackSpatialKey(key: bigint): { fidelity_components: EtrSignal['fidelity_components']; signal_score: number } {
    const u = (shift: bigint) => Number((key >> shift) & 0xFFn) / 255;
    return {
        fidelity_components: { m_checksum: u(0n), t_telemetry: u(8n), d_docs: u(16n), v_voice: u(24n), e_viral: u(32n) },
        signal_score: u(40n),
    };
}

const enc = new TextEncoder();
const dec = new TextDecoder();

export function encodeSignalBatch(signals: EtrSignal[], domainId: number): Uint8Array {
    const events: Event[] = signals.map((sig, i) => ({
        domainId:    (SOURCE_TO_DOMAIN[sig.source_type] ?? 7) & 0xFF,
        typeId:      1,
        commitIndex: 0,
        sequenceId:  i,
        spatialKey:  packSpatialKey(sig),
        payload:     enc.encode(JSON.stringify({ id: sig.id, ts: (sig.truth_statement ?? '').slice(0, 512) })),
    }));
    return encode({ domainId, events });
}

export function decodeSignalBatch(frame: Uint8Array): EtrSignal[] {
    const { events } = decode(frame);
    return events.map(ev => {
        let id = `frame-${ev.sequenceId}`;
        let truth_statement = '';
        try {
            const compact = JSON.parse(dec.decode(ev.payload));
            id = compact.id ?? id;
            truth_statement = compact.ts ?? '';
        } catch { /* use defaults */ }
        const { fidelity_components, signal_score } = unpackSpatialKey(ev.spatialKey);
        return { id, truth_statement, signal_score, source_type: DOMAIN_TO_SOURCE[ev.domainId] ?? 'spine', fidelity_components };
    });
}

export function fromBase64(b64: string): Uint8Array {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}
