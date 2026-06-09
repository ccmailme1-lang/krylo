export const KRYLO_CONFIG = { 
  THRESHOLD: 0.88, 
  CADENCE: 750, 
  WEIGHTS: { mu: 0.4, v: 0.3, tau: 0.3 } 
};
export const calculateTLE = (mu, v, tau) => 
  (mu * KRYLO_CONFIG.WEIGHTS.mu) + 
  (v * KRYLO_CONFIG.WEIGHTS.v) + 
  (tau * KRYLO_CONFIG.WEIGHTS.tau);
