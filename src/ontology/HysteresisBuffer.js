/**
 * src/ontology/HysteresisBuffer.js
 *
 * WO-258: State Stability Gate
 * Prevents label flickering by enforcing a 30-frame temporal lock.
 *
 * Sits between TypeClassifier and the HUD render call.
 * A node's currentClass only changes after 30 consecutive frames
 * of a new proposed classification — eliminating strobe chatter
 * on nodes with borderline fs values (e.g., 0.79 ↔ 0.81).
 */

const LOCK_WINDOW = 30;

/**
 * Validates and triggers state transitions for ObjectClass.
 * @param {Object} node          - The target SignalNode.
 * @param {string} proposedClass - Incoming classification from TypeClassifier.
 */
export const applyHysteresis = (node, proposedClass) => {
  // 1. Current state matches proposed — reset counter, no transition needed
  if (proposedClass === node.currentClass) {
    node.pendingClass = null;
    node.lockTimer    = 0;
    return;
  }

  // 2. New state proposed — start or increment confirmation timer
  if (proposedClass !== node.pendingClass) {
    node.pendingClass = proposedClass;
    node.lockTimer    = 1;
  } else {
    node.lockTimer++;
  }

  // 3. Confirm transition only after LOCK_WINDOW stable frames
  if (node.lockTimer >= LOCK_WINDOW) {
    node.currentClass = node.pendingClass;
    node.pendingClass = null;
    node.lockTimer    = 0;

    // WO-258: stub — wiring point for Layer 5 HUD update on confirmed transition
    // triggerHudUpdate(node) — implement when Layer 5 HUD WO lands
  }
};
