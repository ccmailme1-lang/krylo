import { useRef, useCallback } from "react";

export interface BusSnapshot {
  timestamp: DOMHighResTimeStamp;
  sequenceId: string;
  payload: Record<string, unknown>;
  slamType: string;
  checksum: string;
}

interface GhostPhotographyOptions {
  onCapture?: (snapshot: BusSnapshot) => void;
  maxHistory?: number;
}

function computeChecksum(payload: Record<string, unknown>): string {
  const raw = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (Math.imul(31, hash) + raw.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

let _seq = 0;
const nextSeqId = () => `SLM-${(++_seq).toString().padStart(6, "0")}`;

export function useGhostPhotography(options: GhostPhotographyOptions = {}) {
  const { onCapture, maxHistory = 50 } = options;
  const historyRef = useRef<BusSnapshot[]>([]);

  const capture = useCallback(
    (payload: Record<string, unknown>, slamType = "primary"): BusSnapshot => {
      const snapshot: BusSnapshot = {
        timestamp: performance.now(),
        sequenceId: nextSeqId(),
        payload: structuredClone(payload),
        slamType,
        checksum: computeChecksum(payload),
      };
      historyRef.current.push(snapshot);
      if (historyRef.current.length > maxHistory) {
        historyRef.current.shift();
      }
      onCapture?.(snapshot);
      return snapshot;
    },
    [onCapture, maxHistory]
  );

  const getHistory = useCallback((): Readonly<BusSnapshot[]> => {
    return Object.freeze([...historyRef.current]);
  }, []);

  const getById = useCallback((id: string): BusSnapshot | undefined => {
    return historyRef.current.find((s) => s.sequenceId === id);
  }, []);

  const flush = useCallback(() => {
    historyRef.current = [];
  }, []);

  return { capture, getHistory, getById, flush };
}
