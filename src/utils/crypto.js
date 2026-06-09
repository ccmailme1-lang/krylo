/* src/utils/crypto.js                                                  */
/* WO-751 — Integrity Stack: ABI-framed Keccak256 node fingerprinting  */

import { keccak256 } from 'js-sha3';

// Produces a deterministic '0x'-prefixed Keccak256 hash for an ETR node.
// Input fields are pseudo-ABI encoded: each truncated/padded to 32 chars,
// then concatenated before hashing — byte-for-byte reproducible per node.
export function getKeccakHash({ title = '', source = '', born_at = '', url = '' }) {
  const fields = [title, source, born_at, url];
  const encoded = fields
    .map(s => String(s).padEnd(32, '\0').slice(0, 32))
    .join('');
  return '0x' + keccak256(encoded);
}
