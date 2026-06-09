// WO-873: Active-State Promotion hook
// Takes stateRef (live node array), fires onPromotion callback with promoted descriptors
// 750ms tick — does not cause React re-renders on every tick, only on promotion events

import { useEffect, useRef } from 'react';
import { tickStateContract, clearStateHistory } from '../core/stateManager';

const TICK_MS = 750;

export function useOracle(stateRef, onPromotion) {
  const onPromotionRef = useRef(onPromotion);
  useEffect(() => { onPromotionRef.current = onPromotion; }, [onPromotion]);

  useEffect(() => {
    const interval = setInterval(() => {
      const promoted = tickStateContract(stateRef, Date.now());
      if (promoted.length > 0) {
        promoted.forEach(p => {
          console.log(`[WO-873] PROMOTED: ${p.id} | score=${p.score} R=${p.R} V=${p.V} FS=${p.FS}`);
        });
        onPromotionRef.current?.(promoted);
      }
    }, TICK_MS);

    return () => {
      clearInterval(interval);
      clearStateHistory();
    };
  }, [stateRef]);
}
