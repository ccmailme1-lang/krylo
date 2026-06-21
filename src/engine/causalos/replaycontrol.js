// WO-1080 — Deterministic Replay Control Plane
// Control plane wrapping replayengine.js.
// INVARIANT: replay is always deterministic — same envelope produces same snapshot.
// INVARIANT: checkpoints are immutable once written; no checkpoint mutation is permitted.
// INVARIANT: replay mode is exclusive — LIVE and REPLAY cannot run concurrently.

import { validateReplay, replay, ReplayCorruption } from '../replayengine.js';

export const ReplayMode = Object.freeze({
  LIVE:   'LIVE',
  REPLAY: 'REPLAY',
  PAUSED: 'PAUSED',
});

export const ControlPlaneViolation = Object.freeze({
  MODE_COLLISION:          'MODE_COLLISION',
  CHECKPOINT_MUTATION:     'CHECKPOINT_MUTATION',
  CHECKPOINT_NOT_FOUND:    'CHECKPOINT_NOT_FOUND',
  REPLAY_WHILE_LIVE:       'REPLAY_WHILE_LIVE',
  DETERMINISM_FAILURE:     'DETERMINISM_FAILURE',
  INVALID_MODE_TRANSITION: 'INVALID_MODE_TRANSITION',
});

const ALLOWED_TRANSITIONS = Object.freeze({
  [ReplayMode.LIVE]:   new Set([ReplayMode.PAUSED]),
  [ReplayMode.PAUSED]: new Set([ReplayMode.LIVE, ReplayMode.REPLAY]),
  [ReplayMode.REPLAY]: new Set([ReplayMode.PAUSED]),
});

export class ReplayControlError extends Error {
  constructor(code, detail) {
    super(`REPLAY_CONTROL [${code}]: ${detail}`);
    this.name = 'ReplayControlError';
    this.code = code;
  }
}

export class ReplayControlPlane {
  constructor() {
    this._mode        = ReplayMode.LIVE;
    this._checkpoints = new Map(); // checkpointId → frozen envelope
    this._cursor      = null;      // current checkpoint being replayed
    this._log         = [];
    this._violations  = [];
  }

  // Transition to a new mode.
  transition(nextMode) {
    if (!Object.values(ReplayMode).includes(nextMode)) {
      throw new ReplayControlError(ControlPlaneViolation.INVALID_MODE_TRANSITION, `unknown mode: ${nextMode}`);
    }
    const allowed = ALLOWED_TRANSITIONS[this._mode];
    if (!allowed.has(nextMode)) {
      const v = { code: ControlPlaneViolation.INVALID_MODE_TRANSITION, from: this._mode, to: nextMode, ts: Date.now() };
      this._violations.push(v);
      throw new ReplayControlError(ControlPlaneViolation.INVALID_MODE_TRANSITION, `${this._mode} → ${nextMode} is not a valid transition`);
    }
    this._log.push({ action: 'TRANSITION', from: this._mode, to: nextMode, ts: Date.now() });
    this._mode = nextMode;
  }

  // Write a checkpoint. Checkpoints are immutable once written.
  writeCheckpoint(id, envelope) {
    if (this._checkpoints.has(id)) {
      const v = { code: ControlPlaneViolation.CHECKPOINT_MUTATION, id, ts: Date.now() };
      this._violations.push(v);
      throw new ReplayControlError(ControlPlaneViolation.CHECKPOINT_MUTATION, `checkpoint "${id}" already exists — mutation is forbidden`);
    }
    const frozen = Object.freeze({ ...envelope, _checkpointId: id, _writtenAt: Date.now() });
    this._checkpoints.set(id, frozen);
    this._log.push({ action: 'CHECKPOINT_WRITE', id, ts: Date.now() });
    return id;
  }

  // Execute replay from a stored checkpoint.
  replayFromCheckpoint(id) {
    if (this._mode === ReplayMode.LIVE) {
      const v = { code: ControlPlaneViolation.REPLAY_WHILE_LIVE, id, ts: Date.now() };
      this._violations.push(v);
      throw new ReplayControlError(ControlPlaneViolation.REPLAY_WHILE_LIVE, 'cannot replay while in LIVE mode — transition to PAUSED first');
    }

    const envelope = this._checkpoints.get(id);
    if (!envelope) {
      throw new ReplayControlError(ControlPlaneViolation.CHECKPOINT_NOT_FOUND, `checkpoint "${id}" not found`);
    }

    this._cursor = id;
    this._log.push({ action: 'REPLAY_START', id, ts: Date.now() });

    try {
      const snapshot = replay(envelope);
      this._log.push({ action: 'REPLAY_COMPLETE', id, ts: Date.now() });
      return snapshot;
    } catch (err) {
      const v = { code: ControlPlaneViolation.DETERMINISM_FAILURE, id, error: err.message, ts: Date.now() };
      this._violations.push(v);
      this._log.push({ action: 'REPLAY_FAILURE', id, error: err.message, ts: Date.now() });
      throw err;
    } finally {
      this._cursor = null;
    }
  }

  // Validate an envelope before checkpointing.
  validate(envelope) {
    try {
      validateReplay(envelope);
      return { valid: true, error: null };
    } catch (err) {
      return { valid: false, error: err instanceof ReplayCorruption ? err : new ReplayCorruption('UNKNOWN', err.message) };
    }
  }

  listCheckpoints() { return [...this._checkpoints.keys()]; }

  get mode()        { return this._mode; }
  get cursor()      { return this._cursor; }
  get violations()  { return [...this._violations]; }
  get log()         { return [...this._log]; }
}
