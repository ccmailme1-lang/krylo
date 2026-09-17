// src/engine/cf/read.js — the ONLY CF module a render path may import (WS5).
//
// Pure read surface. Every export here is O(1), does no analytical work, has no
// side effects. This is the enforcement point for CF-004-INV-006 (c): a render
// path imports `cf/read.js` and nothing else under `engine/cf/`, so rendering
// can never trigger a CF analytical pass.
//
// (Transitively this still pulls the analytical modules into the bundle;
//  production may split them into a lazy chunk. That is a build concern, not an
//  INV-006 violation — the code is imported, never executed on render.)

import { getCFFormation, producerState } from './producer.js';

export { getCFFormation, producerState };
