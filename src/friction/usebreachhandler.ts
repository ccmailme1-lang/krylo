
import { useCallback, useRef, useEffect } from "react";
import type { BusSnapshot } from "./useghostphotography";

export type BreachSeverity = "low" | "medium" | "high" | "critical";

export interface BreachEvent {
  breachId: string;
  detectedAt: DOMHighResTimeStamp;
  severity: BreachSeverity;
  triggerSnapshot: BusSnapshot;
  reason: string;
  resolved: boolean;
}

export interface BreachRule {
  id: string;
  severity: BreachSeverity;
  reason: string;
  test: (payload: Record<string, unknown>) => boolean;
}

interface BreachHandlerOptions {
  rules: BreachRule[];
  onBreach?: (event: BreachEvent) => void;
  onResolve?: (breachId: string) => void;
  autoFlushOnCritical?: boolean;
}

let _breachSeq = 0;
const nextBreachId = () =>
  `BRH-${Date.now()}-${(++_breachSeq).toString().padStart(4, "0")}`;

export function useBreachHandler(options: BreachHandlerOptions) {
  const { rules, onBreach, onResolve, autoFlushOnCritical = false } = options;
  const activeBreaches = useRef<Map<string, BreachEvent>>(new Map());
  const flushCallbackRef = useRef<(() => void) | null>(null);

  const registerFlush = useCallback((flushFn: () => void) => {
    flushCallbackRef.current = flushFn;
  }, []);

  const evaluate = useCallback(
    (snapshot: BusSnapshot): BreachEvent[] => {
      const triggered: BreachEvent[] = [];
      for (const rule of rules) {
        let matched = false;
        try {
          matched = rule.test(snapshot.payload);
        } catch {
          console.warn(`[BreachHandler] Rule "${rule.id}" threw during eval.`);
        }
        if (matched) {
          const event: BreachEvent = {
            breachId: nextBreachId(),
            detectedAt: performance.now(),
            severity: rule.severity,
            triggerSnapshot: snapshot,
            reason: rule.reason,
            resolved: false,
          };
          activeBreaches.current.set(event.breachId, event);
          triggered.push(event);
          onBreach?.(event);
          if (rule.severity === "critical" && autoFlushOnCritical) {
            flushCallbackRef.current?.();
          }
        }
      }
      return triggered;
    },
    [rules, onBreach, autoFlushOnCritical]
  );

  const resolve = useCallback(
    (breachId: string) => {
      const breach = activeBreaches.current.get(breachId);
      if (breach) {
        breach.resolved = true;
        onResolve?.(breachId);
      }
    },
    [onResolve]
  );

  const getActiveBreaches = useCallback((): BreachEvent[] => {
    return [...activeBreaches.current.values()].filter((b) => !b.resolved);
  }, []);

  const pruneResolved = useCallback(() => {
    for (const [id, breach] of activeBreaches.current) {
      if (breach.resolved) activeBreaches.current.delete(id);
    }
  }, []);

  useEffect(() => {
    return () => { activeBreaches.current.clear(); };
  }, []);

  return { evaluate, resolve, getActiveBreaches, pruneResolved, registerFlush };
}
