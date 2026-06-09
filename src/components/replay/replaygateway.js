// WO-1700 — ReplayGateway
// Sole controlled entry point for replay. Creates an isolated mount point.
// NEVER touches sessionStore, createSession, or LEV-02.
// NEVER shares lifecycle with HistoryBay session flow.
// open(requestId) → { snapshot, mount }
// close() → removes mount from DOM

import { loadEnvelope }             from '../../engine/lineage.js';
import { replay, ReplayCorruption } from '../../engine/replayengine.js';

const MOUNT_ID = 'krylo-replay-root';

export async function openReplay(requestId) {
  let envelope;
  try {
    envelope = await loadEnvelope(requestId);
  } catch (err) {
    throw new Error(
      `[ReplayGateway] Envelope not found for requestId="${requestId}": ${err.message}`
    );
  }

  // Throws ReplayCorruption if envelope fails invariant checks
  const snapshot = replay(envelope);

  // Isolated mount — does not touch the main React app root
  let mount = document.getElementById(MOUNT_ID);
  if (!mount) {
    mount = document.createElement('div');
    mount.id = MOUNT_ID;
    mount.setAttribute('data-wo', '1700');
    document.body.appendChild(mount);
  }

  return { snapshot, mount };
}

export function closeReplay() {
  const mount = document.getElementById(MOUNT_ID);
  if (mount) mount.remove();
}
