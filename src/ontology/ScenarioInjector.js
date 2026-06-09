/**
 * src/ontology/ScenarioInjector.js
 *
 * WO-810: Scenario Injection
 * Stress-test framework for the physics kernel. Injects synthetic conditions
 * into stateRef each frame to validate core constants under pathological loads.
 *
 * Scenarios are self-contained objects:
 *   setup(stateRef)          — one-time state mutation at scenario start
 *   tick(stateRef, simTime)  — per-frame overrides applied BEFORE the physics forEach
 *   teardown(stateRef)       — restore normal state at scenario end
 *   report(log)              — summarize observed behavior, suggest constant tuning
 *
 * ── BLACK HOLE ────────────────────────────────────────────────────────────────
 * The pathological case: one node (the singularity) is locked at combined=1.0
 * anchored at the center. All other primary nodes experience an additional radial
 * attraction force. This tests:
 *   - Sovereign Gate robustness (MAX_OCCUPANCY under pressure)
 *   - Anchor dwell stability (singularity should hold without oscillation)
 *   - Ejection impulse correctness (nodes shattering at the boundary)
 *   - Kernel performance under maximum repulsion + attraction load
 *
 * Toggle: press 'b' in the scene (wired in spinemap.jsx).
 * Duration: runs until dismissed — no auto-timeout.
 *
 * ── SCENARIO REGISTRY ────────────────────────────────────────────────────────
 * Additional scenarios can be registered via ScenarioInjector.register(scenario).
 */

const BH_GRAVITY_K   = 0.04;  // radial attraction force per frame toward center
const BH_GRAVITY_MAX = 3.0;   // max vr adjustment per frame from gravity

// ── Black Hole Scenario ───────────────────────────────────────────────────────

const BlackHole = {
  id:          'BLACK_HOLE',
  label:       '⬤  BLACK HOLE',
  description: 'Singularity locked at core. All nodes experience radial attraction.',

  _singularityIdx: null,
  _log: [],           // { simTime, event, data }
  _startSimTime: null,

  setup(stateRef) {
    this._log = [];
    this._singularityIdx = null;

    // Select the highest-combined non-shattered primary node as the singularity
    let best = null, bestC = -1;
    stateRef.current.forEach(node => {
      if (!node.primary || node.isShattered || node.isZombie) return;
      if ((node.combined ?? 0) > bestC) {
        bestC = node.combined ?? 0;
        best  = node;
      }
    });

    if (!best) {
      console.warn('[WO-810 BLACK HOLE] No eligible singularity candidate found.');
      return;
    }

    this._singularityIdx = best.index;
    best._bhSingularity  = true;
    this._log.push({ simTime: 0, event: 'SINGULARITY_SELECTED', data: { idx: best.index, combined: bestC } });
    console.log(`[WO-810 BLACK HOLE] Singularity → node idx:${best.index} combined:${bestC.toFixed(4)}`);
  },

  tick(stateRef, simTime) {
    if (this._startSimTime == null) this._startSimTime = simTime;

    stateRef.current.forEach(node => {
      if (!node.primary) return;

      if (node.index === this._singularityIdx) {
        // Lock singularity: force fs=1.0, combined=1.0, pin at radial center
        node.fsVal    = 1.0;
        node.combined = 1.0;
        node.r        = 0;
        node.vr       = 0;
        node.pos.x    = 0;
        node.pos.z    = 0;
        node.nodeState = 2; // NS.L1_ANCHORED
      } else if (!node.isShattered && !node.isZombie) {
        // Apply gravitational pull — add inward radial velocity component
        const pull = Math.min(BH_GRAVITY_MAX, BH_GRAVITY_K * (1.0 - (node.r ?? 0.5)));
        node.vr = (node.vr ?? 0) - pull;

        // Log shatter events caused by the gravity well
        if (node.isShattered && !node._bhShatterLogged) {
          node._bhShatterLogged = true;
          this._log.push({
            simTime,
            event: 'NODE_SHATTERED',
            data: { idx: node.index, r: node.r, combined: node.combined },
          });
        }
      }
    });
  },

  teardown(stateRef) {
    stateRef.current.forEach(node => {
      delete node._bhSingularity;
      delete node._bhShatterLogged;
    });
    this._singularityIdx = null;
    this._startSimTime   = null;
    console.log('[WO-810 BLACK HOLE] Scenario ended.');
  },

  /**
   * Returns a formatted tuning report.
   * Compares observed shatter rates against SHATTER_J constants and suggests
   * adjustments if shatters occurred too early or too late.
   */
  report() {
    const shatterEvents = this._log.filter(e => e.event === 'NODE_SHATTERED');
    const lines = [
      `[WO-810 BLACK HOLE] ── Scenario Report ──`,
      `  Singularity idx:  ${this._singularityIdx ?? 'N/A'}`,
      `  Shatter events:   ${shatterEvents.length}`,
    ];

    if (shatterEvents.length > 0) {
      const avgR = shatterEvents.reduce((a, e) => a + (e.data.r ?? 0), 0) / shatterEvents.length;
      lines.push(`  Mean shatter r:   ${avgR.toFixed(4)}`);
      if (avgR < 0.05) {
        lines.push('  TUNING: shatters very close to core — consider raising SHATTER_J_BASE to increase ejection distance.');
      } else if (avgR > 0.40) {
        lines.push('  TUNING: shatters far from core — SHATTER_J_BASE may be too high, nodes ejected before approaching.');
      } else {
        lines.push('  TUNING: shatter radii nominal (0.05–0.40). Constants appear well-calibrated.');
      }
    } else {
      lines.push('  TUNING: no shatters observed — BH_GRAVITY_K may be too low to stress ejection logic.');
    }

    return lines.join('\n');
  },
};

// ── ScenarioInjector ─────────────────────────────────────────────────────────

const registry = { BLACK_HOLE: BlackHole };

export const ScenarioInjector = {
  _active: null,

  register(scenario) {
    registry[scenario.id] = scenario;
  },

  /** Activate a scenario by ID. Tears down any currently running scenario first. */
  start(id, stateRef) {
    if (this._active) this.stop(stateRef);
    const scenario = registry[id];
    if (!scenario) { console.warn(`[WO-810] Unknown scenario: ${id}`); return; }
    this._active = scenario;
    scenario.setup(stateRef);
  },

  /** Deactivate the current scenario and log its report. */
  stop(stateRef) {
    if (!this._active) return;
    console.log(this._active.report());
    this._active.teardown(stateRef);
    this._active = null;
  },

  /** Toggle a scenario on/off by ID. */
  toggle(id, stateRef) {
    if (this._active?.id === id) {
      this.stop(stateRef);
    } else {
      this.start(id, stateRef);
    }
  },

  /** Call once per frame inside useFrame, BEFORE the physics forEach. */
  tick(stateRef, simTime) {
    if (this._active) this._active.tick(stateRef, simTime);
  },

  /** True if any scenario is currently running. */
  get isActive() { return this._active != null; },

  /** Label of the active scenario for HUD display. */
  get activeLabel() { return this._active?.label ?? null; },
};
