// WO-1063 — Frame Scheduling Governor
// Priority queue for causal frame tasks.
// INVARIANT: frames are processed in priority-then-FIFO order; starvation is prevented
// by promotion after MAX_WAIT_MS.

const MAX_QUEUE_DEPTH  = 256;
const MAX_WAIT_MS      = 2000;
const RATE_WINDOW_MS   = 100;
const MAX_FRAMES_PER_WINDOW = 60;

export const FramePriority = Object.freeze({
  CRITICAL: 0,
  HIGH:     1,
  NORMAL:   2,
  LOW:      3,
});

export class FrameSchedulingViolation extends Error {
  constructor(code, detail) {
    super(`FRAME_SCHEDULING [${code}]: ${detail}`);
    this.name = 'FrameSchedulingViolation';
    this.code = code;
  }
}

export class FrameSchedulingGovernor {
  constructor() {
    this._queue       = [];
    this._seq         = 0;
    this._windowStart = Date.now();
    this._windowCount = 0;
    this._processed   = 0;
    this._dropped     = 0;
  }

  // Enqueue a frame task. Returns assigned sequence number.
  // task: { id, priority?, payload }
  enqueue(task) {
    if (!task || !task.id) {
      throw new FrameSchedulingViolation('MISSING_TASK_ID', 'task.id is required');
    }
    if (this._queue.length >= MAX_QUEUE_DEPTH) {
      this._dropped++;
      throw new FrameSchedulingViolation('QUEUE_OVERFLOW', `depth ${MAX_QUEUE_DEPTH} exceeded`);
    }

    const priority = task.priority ?? FramePriority.NORMAL;
    if (!Object.values(FramePriority).includes(priority)) {
      throw new FrameSchedulingViolation('INVALID_PRIORITY', `unknown priority: ${priority}`);
    }

    const seq = ++this._seq;
    this._queue.push({ ...task, priority, seq, enqueuedAt: Date.now() });
    this._queue.sort((a, b) => a.priority !== b.priority ? a.priority - b.priority : a.seq - b.seq);
    return seq;
  }

  // Dequeue the next eligible frame task, applying rate governor.
  // Returns null if queue is empty or rate limit exceeded.
  dequeue() {
    const now = Date.now();

    // Promote stale LOW tasks to NORMAL to prevent starvation
    for (const entry of this._queue) {
      if (entry.priority === FramePriority.LOW && now - entry.enqueuedAt > MAX_WAIT_MS) {
        entry.priority = FramePriority.NORMAL;
      }
    }

    // Rate window reset
    if (now - this._windowStart >= RATE_WINDOW_MS) {
      this._windowStart = now;
      this._windowCount = 0;
    }

    if (this._windowCount >= MAX_FRAMES_PER_WINDOW) return null;
    if (this._queue.length === 0) return null;

    // Re-sort after starvation promotion
    this._queue.sort((a, b) => a.priority !== b.priority ? a.priority - b.priority : a.seq - b.seq);

    const task = this._queue.shift();
    this._windowCount++;
    this._processed++;
    return task;
  }

  // Drain all CRITICAL frames regardless of rate limit.
  drainCritical() {
    const critical = this._queue.filter(t => t.priority === FramePriority.CRITICAL);
    this._queue    = this._queue.filter(t => t.priority !== FramePriority.CRITICAL);
    this._processed += critical.length;
    return critical;
  }

  flush() { this._queue = []; }

  get depth()     { return this._queue.length; }
  get processed() { return this._processed; }
  get dropped()   { return this._dropped; }

  diagnostics() {
    return {
      depth:      this._queue.length,
      processed:  this._processed,
      dropped:    this._dropped,
      rateWindow: { start: this._windowStart, count: this._windowCount, limit: MAX_FRAMES_PER_WINDOW },
    };
  }
}
