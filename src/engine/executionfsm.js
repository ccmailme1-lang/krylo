// WO-1332 — Execution Plan FSM Generator
// Deterministic conditional payload from structured ingress entities.
// Output is a strict FSM object — no natural language prose, no mocks.

const INITIAL_ASK_MULTIPLIER = 1.13; // STARTUP standard opening premium
const STALL_THRESHOLD_HOURS  = 72;
const LOWBALL_THRESHOLD      = 140000;

export async function generateExecutionPlan(entities) {
  const { target_salary, geo, org_type } = entities;

  if (!target_salary) return null;

  const initial_ask_value = Math.round(target_salary * INITIAL_ASK_MULTIPLIER);

  return {
    initial_ask: {
      value:     initial_ask_value,
      basis:     `${Math.round((INITIAL_ASK_MULTIPLIER - 1) * 100)}% above anchor — ${org_type} opening premium`,
      condition: 'ALWAYS',
    },
    branches: {
      stall: {
        trigger:       `response_time > ${STALL_THRESHOLD_HOURS}h`,
        action:        'Deploy market pressure: cite active competing pipeline or pending offer',
        pressure_type: 'TEMPORAL',
      },
      lowball: {
        trigger:       `counter_offer < ${LOWBALL_THRESHOLD}`,
        action:        'Shift demand from capital to ownership stake',
        pivot_vector:  'equity_vesting',
        demand:        'Accelerate cliff 12mo → 6mo + additional 0.5% equity grant',
      },
    },
    meta: {
      geo,
      org_type,
      anchor:    target_salary,
      threshold: LOWBALL_THRESHOLD,
    },
  };
}
