/* src/hooks/useNodeMetadata.js                                         */
/* WO-729 — Derives display state from an ETR node for IntegrityBadge  */
/* Returns PENDING state when synthetic_risk_score is null.            */

import { getRiskColor, getRiskLabel, CATEGORY_LABELS } from '../designSystem/badges';

export function useNodeMetadata(node) {
  if (!node) return null;

  const {
    category_id,
    synthetic_risk_score,
    trust_delta,
    integrity_badges,
    keccak_hash,
  } = node;

  const isPending   = synthetic_risk_score === null || synthetic_risk_score === undefined;
  const riskColor   = getRiskColor(synthetic_risk_score);
  const riskLabel   = getRiskLabel(synthetic_risk_score);
  const catLabel    = CATEGORY_LABELS[category_id] ?? 'GENERAL NEWS';
  const riskPct     = isPending ? 0 : Math.min(100, Math.max(0, synthetic_risk_score));
  const shouldPulse = (trust_delta ?? 0) < 0;
  const trustDelta  = trust_delta ?? 0;
  const trustSign   = trustDelta >= 0 ? '+' : '';

  return {
    catLabel,
    riskColor,
    riskLabel,
    riskPct,
    isPending,
    shouldPulse,
    trustDelta,
    trustSign,
    badges:     integrity_badges ?? null,
    keccakHash: keccak_hash ?? null,
  };
}
