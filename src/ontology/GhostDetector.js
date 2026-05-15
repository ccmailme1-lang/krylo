/**
 * src/ontology/GhostDetector.js
 *
 * WO-807: Ghost Detection
 * Identifies and purges zombie nodes — nodes with a valid ID that have received
 * no new packets for more than 600 seconds.
 *
 * A zombie is NOT the same as a stale node (WO-802, 300s fade):
 *   WO-802: graceful visual decay — scale fades to zero over 5s at 300s staleness.
 *   WO-807: hard purge — physics loop skips the node entirely at 600s. The slot is
 *           dead. It will never recover unless the signal reappears in a fresh fetch.
 *
 * Once node.isZombie = true, the physics loop must:
 *   1. Zero its InstancedMesh slot (scale=0, position=(0,-999,0))
 *   2. Skip ALL spring/sovereign/shatter computation for that index
 *   3. Leave the slot for natural reclaim on next signal refresh (useMemo rebuild)
 */

export const ZOMBIE_TTL_MS = 600_000; // 600s — hard purge threshold

/**
 * scanForZombies(stateRef, now)
 *
 * Scans all primary nodes. Marks newly detected zombies with node.isZombie = true.
 * Returns a snapshot of all currently zombie nodes (new + previously detected).
 *
 * @param {{ current: Array }} stateRef — physics state ref
 * @param {number}             now      — performance.now() or Date.now() in ms
 *
 * @returns {Array<{ index: number, id: string|number, staleness: number, lastPacketAt: number }>}
 */
export function scanForZombies(stateRef, now) {
  const zombies = [];

  stateRef.current.forEach((node) => {
    if (!node.primary) return;

    const staleness = now - (node.lastPacketAt ?? now);

    if (staleness > ZOMBIE_TTL_MS && !node.isZombie) {
      // First detection — stamp the node
      node.isZombie     = true;
      node.zombieAt     = now;
      node.zombieStaleness = staleness;
    }

    if (node.isZombie) {
      zombies.push({
        index:       node.index,
        id:          node.id ?? node.index,
        staleness:   Math.round(node.zombieStaleness / 1000),   // seconds
        lastPacketAt: node.lastPacketAt ?? null,
        detectedAt:   node.zombieAt ?? now,
      });
    }
  });

  return zombies;
}

/**
 * formatGhostReport(zombies)
 * Returns a compact console-printable string for the zombie inventory.
 */
export function formatGhostReport(zombies) {
  if (zombies.length === 0) {
    return '[WO-807 GHOST] ✅ No zombies detected.';
  }
  const lines = [
    `[WO-807 GHOST] ⚠️  ${zombies.length} zombie node(s) purged from physics loop:`,
  ];
  zombies.forEach(z => {
    lines.push(
      `  ☠  idx:${String(z.index).padStart(3)} | id: ${String(z.id).slice(0, 20).padEnd(20)} | stale: ${z.staleness}s`
    );
  });
  return lines.join('\n');
}
