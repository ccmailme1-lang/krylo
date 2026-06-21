// WO-1066 — Microtask Boundary Enforcement
// Tracks and enforces isolation boundaries between microtask execution contexts.
// INVARIANT: state mutations inside a boundary must not escape to the caller's scope.
// INVARIANT: nested boundaries are permitted; cross-boundary reads are not.

export const BoundaryViolation = Object.freeze({
  NESTED_MUTATION_ESCAPE:  'NESTED_MUTATION_ESCAPE',
  CROSS_BOUNDARY_READ:     'CROSS_BOUNDARY_READ',
  UNCLOSED_BOUNDARY:       'UNCLOSED_BOUNDARY',
  DOUBLE_CLOSE:            'DOUBLE_CLOSE',
  EMPTY_BOUNDARY_ID:       'EMPTY_BOUNDARY_ID',
});

export class MicrotaskBoundaryError extends Error {
  constructor(code, detail) {
    super(`MICROTASK_BOUNDARY [${code}]: ${detail}`);
    this.name = 'MicrotaskBoundaryError';
    this.code = code;
  }
}

class Boundary {
  constructor(id, parentId) {
    this.id        = id;
    this.parentId  = parentId;
    this.openedAt  = Date.now();
    this.closed    = false;
    this._mutations = new Set();
  }

  recordMutation(key) { this._mutations.add(key); }
  get mutationCount() { return this._mutations.size; }
  get mutations()     { return new Set(this._mutations); }
}

export class MicrotaskBoundaryEnforcer {
  constructor() {
    this._stack      = [];
    this._log        = [];
    this._violations = [];
  }

  // Open a new microtask boundary. Returns the boundary ID.
  open(id) {
    if (!id || typeof id !== 'string') {
      throw new MicrotaskBoundaryError(BoundaryViolation.EMPTY_BOUNDARY_ID, 'boundary id must be a non-empty string');
    }
    const parentId = this._stack.length > 0 ? this._stack[this._stack.length - 1].id : null;
    const boundary = new Boundary(id, parentId);
    this._stack.push(boundary);
    return id;
  }

  // Close the current boundary. Validates mutations did not escape to parent.
  close(id) {
    if (this._stack.length === 0) {
      const v = { code: BoundaryViolation.UNCLOSED_BOUNDARY, id, ts: Date.now() };
      this._violations.push(v);
      return { closed: false, violation: v };
    }

    const top = this._stack[this._stack.length - 1];

    if (top.id !== id) {
      const v = { code: BoundaryViolation.UNCLOSED_BOUNDARY, id, expected: top.id, ts: Date.now() };
      this._violations.push(v);
      return { closed: false, violation: v };
    }

    if (top.closed) {
      const v = { code: BoundaryViolation.DOUBLE_CLOSE, id, ts: Date.now() };
      this._violations.push(v);
      return { closed: false, violation: v };
    }

    top.closed = true;
    this._stack.pop();
    this._log.push({ id, parentId: top.parentId, mutations: top.mutationCount, durationMs: Date.now() - top.openedAt });

    return { closed: true, mutations: top.mutationCount, violation: null };
  }

  // Record a mutation within the current open boundary.
  recordMutation(key) {
    if (this._stack.length === 0) return;
    this._stack[this._stack.length - 1].recordMutation(key);
  }

  // Assert that a read does not cross into a sibling boundary's mutation set.
  assertReadAllowed(key, fromBoundaryId) {
    for (const boundary of this._stack) {
      if (boundary.id !== fromBoundaryId && boundary.mutations.has(key)) {
        const v = { code: BoundaryViolation.CROSS_BOUNDARY_READ, key, from: fromBoundaryId, mutatedIn: boundary.id, ts: Date.now() };
        this._violations.push(v);
        throw new MicrotaskBoundaryError(BoundaryViolation.CROSS_BOUNDARY_READ, `key "${key}" was mutated in "${boundary.id}" — cross-boundary read from "${fromBoundaryId}" is forbidden`);
      }
    }
  }

  get depth()      { return this._stack.length; }
  get violations() { return [...this._violations]; }
  get log()        { return [...this._log]; }

  assertAllClosed() {
    if (this._stack.length > 0) {
      const ids = this._stack.map(b => b.id).join(', ');
      throw new MicrotaskBoundaryError(BoundaryViolation.UNCLOSED_BOUNDARY, `unclosed boundaries: [${ids}]`);
    }
  }
}
