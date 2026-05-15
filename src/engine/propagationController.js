/* src/engine/propagationController.js                                  */
/* WO-753 — Propagation Controller                                      */
/* The Scrutiny: monitors node velocity. If V > threshold and           */
/* Trust < 0, triggers a red Scrutiny Field and throttles the node.     */
/*                                                                      */
/* SCRUTINY_V_THRESHOLD maps to "60 km/h" in Three.js space.           */
/* Normal node drift: vel.length() ≈ 0.01–0.03                         */
/* Post-escape (WO-752 boost): vel.length() ≈ 0.05+                    */
/* Threshold set at 0.04 — catches escaping low-trust nodes.            */

export const SCRUTINY_V_THRESHOLD = 0.04;

// Returns true if this node should be caged by the Scrutiny Field.
// Condition: moving faster than threshold AND trust is negative.
export function isUnderScrutiny(node) {
  return node.vel.length() > SCRUTINY_V_THRESHOLD && (node.trustDelta ?? 0) < 0;
}

// Applies the Scrutiny Brake — extra velocity damping while caged.
// Called each frame the node remains under scrutiny.
export function applyScrutinyBrake(node) {
  node.vel.multiplyScalar(0.94); // throttle: slows the node toward the threshold
}
