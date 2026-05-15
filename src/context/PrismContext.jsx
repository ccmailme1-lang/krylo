/* src/context/PrismContext.jsx */
/* WO-267 — Prism context: global layer + refraction state           */
/* WO-294 — THE BRIDGE: passive postMessage listener for krylo-submit */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';
import { anchorArtifact } from '../engine/categoricalAnchor.js';
import { refract }        from '../engine/refractionPipeline.js';

const PrismContext = createContext();

const initialState = {
  currentLayer:     0,          // 0 = Interface (krylo-feed.html) | 1 = Oracle
  status:           'AMBIENT',  // AMBIENT | THINKING | ORACLE
  activeRefraction: null,
  rawSignal:        '',
};

function prismReducer(state, action) {
  switch (action.type) {
    case 'START_INHALE':
      return {
        ...state,
        status:    'THINKING',
        rawSignal: action.payload,
      };
    case 'EXECUTE_REFRACTION':
      return {
        ...state,
        activeRefraction: action.payload,
      };
    case 'COMPLETE_INVERSION':
      return {
        ...state,
        currentLayer: 1,
        status:       'ORACLE',
      };
    case 'RESET_ENGINE':
      return initialState;
    default:
      return state;
  }
}

export const PrismProvider = ({ children }) => {
  const [state, dispatch] = useReducer(prismReducer, initialState);

  // THE CROSS-DOCUMENT HANDSHAKE
  const handleMessage = useCallback((event) => {
    // SECURITY: Only accept signals from the same origin
    if (event.origin !== window.location.origin) return;

    // PREVENT RACE CONDITIONS: Ignore if already processing
    if (state.status !== 'AMBIENT') return;

    if (event.data?.type === 'krylo-submit') {
      const query = event.data.query ?? event.data.payload ?? '';

      // 1. COMMENCE THE 2500ms INHALE (Triggers CSS Transitions in App.jsx)
      dispatch({ type: 'START_INHALE', payload: query });

      // 2. BACKGROUND ANALYTICS (Non-blocking processing)
      try {
        const anchored = anchorArtifact({
          uuid:      crypto.randomUUID(),
          timestamp: Date.now(),
          text:      query,
        });

        const refraction = refract(anchored);

        // Only set activeRefraction on a real refraction — ZERO_POINT_FALLBACK
        // (isRefracted: false) must not overwrite null, or the score in TenKView
        // reads all-zero pillars instead of falling back to data.fs.
        if (refraction.isRefracted) {
          dispatch({
            type:    'EXECUTE_REFRACTION',
            payload: { ...refraction, metadata: anchored.metadata },
          });
        }
      } catch (err) {
        console.error('KRYLO_CORE_ERROR: Refraction Pipeline failed during Inhale.', err);
      }

      // 3. THE HYDRAULIC SNAP (Handshake Timing)
      setTimeout(() => {
        dispatch({ type: 'COMPLETE_INVERSION' });
      }, 2500);
    }
  }, [state.status]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  return (
    <PrismContext.Provider value={{ state, dispatch }}>
      {children}
    </PrismContext.Provider>
  );
};

export const usePrism = () => useContext(PrismContext);
