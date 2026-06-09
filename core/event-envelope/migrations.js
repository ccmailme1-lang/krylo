// WO-1700 — Migration registry
// Replay NEVER runs migrations.
// Migrations are strictly for offline back-fill or analytics re-export.
// Add entries only when a schemaVersion increment requires data transformation.
// Each upgrader must be a pure function that never mutates its argument.

// type Upgrader = (oldEnv: any) => any

export const MIGRATIONS = {
  // '1.0.0→1.1.0': upgrade_1_0_0_to_1_1_0,
};
