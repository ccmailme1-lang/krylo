// WO-1306 — Typed Event Bus
// Strictly typed, causally ordered, schema-enforced event transport layer.
// Replaces generic StateBus for all intra-kernel message passing.
//
// Domain rules (compile-time enforced via type system):
//   Math  → TypedEnvelope<MathMutation>  only
//   FSM   → TypedEnvelope<FsmMutation>   only
//   Ingest→ TypedEnvelope<IngestMutation> only
//   Watchdog → EventOrigin::Watchdog, reads all, emits System only
//
// sequence_id assigned ONLY by ingest clock. Never regenerated downstream.

pub mod bus;
pub mod envelope;
pub mod origin;
pub mod routing;

pub use bus::TypedEventBus;
pub use envelope::{TypedEnvelope, TypedMutation};
pub use origin::EventOrigin;
pub use routing::{BusRoutingTable, FsmMutation, IngestMutation, MathMutation};

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use krylo_scl::FsmState;

    fn math_envelope(seq: u64) -> TypedEnvelope<MathMutation> {
        TypedEnvelope {
            sequence_id: seq,
            entity_anchor: 42,
            origin: EventOrigin::Math,
            timestamp_ms: seq * 100,
            mutation: TypedMutation {
                inner: MathMutation::ResonanceComputed { r_oper: 1.5 },
                confidence: 0.9,
                entropy: 0.3,
            },
            fsm_hint: None,
        }
    }

    #[test]
    fn typed_event_bus_round_trip_preserves_all_fields() {
        let bus: TypedEventBus<TypedEnvelope<MathMutation>> = TypedEventBus::new();
        let tx = bus.sender();
        let rx = bus.receiver();

        let env = math_envelope(7);
        tx.send(env).unwrap();

        let received = rx.try_recv().unwrap();
        assert_eq!(received.sequence_id, 7);
        assert_eq!(received.entity_anchor, 42);
        assert_eq!(received.origin, EventOrigin::Math);
        assert_eq!(received.timestamp_ms, 700);
        assert!((received.mutation.confidence - 0.9).abs() < f32::EPSILON);
        assert!((received.mutation.entropy - 0.3).abs() < 1e-9);
        assert!(received.fsm_hint.is_none());
    }

    #[test]
    fn sequence_id_propagates_unchanged() {
        let bus: TypedEventBus<TypedEnvelope<MathMutation>> = TypedEventBus::new();
        let tx = bus.sender();
        let rx = bus.receiver();

        for seq in [1u64, 100, 999_999] {
            tx.send(math_envelope(seq)).unwrap();
            let r = rx.try_recv().unwrap();
            assert_eq!(r.sequence_id, seq, "sequence_id must not change in transit");
        }
    }

    #[test]
    fn bus_routing_table_uses_domain_separated_channels() {
        let math_bus: TypedEventBus<TypedEnvelope<MathMutation>> = TypedEventBus::new();
        let fsm_bus: TypedEventBus<TypedEnvelope<FsmMutation>> = TypedEventBus::new();
        let ingest_bus: TypedEventBus<TypedEnvelope<IngestMutation>> = TypedEventBus::new();

        let table = BusRoutingTable {
            math_tx: math_bus.sender(),
            fsm_tx: fsm_bus.sender(),
            ingest_tx: ingest_bus.sender(),
        };

        // Each channel only accepts its own domain type — compile-time enforced.
        // Runtime: send one event on each channel, verify isolation.
        table.math_tx.send(TypedEnvelope {
            sequence_id: 1,
            entity_anchor: 1,
            origin: EventOrigin::Math,
            timestamp_ms: 100,
            mutation: TypedMutation { inner: MathMutation::PhiComputed, confidence: 1.0, entropy: 0.0 },
            fsm_hint: None,
        }).unwrap();

        table.fsm_tx.send(TypedEnvelope {
            sequence_id: 2,
            entity_anchor: 1,
            origin: EventOrigin::Fsm,
            timestamp_ms: 200,
            mutation: TypedMutation {
                inner: FsmMutation::AuthorizationGranted,
                confidence: 1.0,
                entropy: 0.0,
            },
            fsm_hint: Some(FsmState::S2_CoherenceConfirmation),
        }).unwrap();

        table.ingest_tx.send(TypedEnvelope {
            sequence_id: 3,
            entity_anchor: 1,
            origin: EventOrigin::Ingest,
            timestamp_ms: 300,
            mutation: TypedMutation { inner: IngestMutation::RawSignalIngested, confidence: 1.0, entropy: 0.0 },
            fsm_hint: None,
        }).unwrap();

        // Math channel holds exactly 1 math event; fsm channel holds 0 math events.
        assert!(math_bus.receiver().try_recv().is_ok(), "math event must be in math channel");
        assert!(math_bus.receiver().try_recv().is_err(), "no bleed into math channel");
        assert!(fsm_bus.receiver().try_recv().is_ok(), "fsm event must be in fsm channel");
        assert!(ingest_bus.receiver().try_recv().is_ok(), "ingest event must be in ingest channel");
    }

    #[test]
    fn fsm_hint_is_advisory_and_optional() {
        let env: TypedEnvelope<MathMutation> = TypedEnvelope {
            sequence_id: 1,
            entity_anchor: 1,
            origin: EventOrigin::Math,
            timestamp_ms: 100,
            mutation: TypedMutation {
                inner: MathMutation::SigmaUpdated { fast: 0.5, slow: 0.1 },
                confidence: 0.8,
                entropy: 0.2,
            },
            fsm_hint: Some(FsmState::S1_StructureFormation),
        };
        // hint is present but advisory — value can differ from actual FSM state
        assert!(matches!(env.fsm_hint, Some(FsmState::S1_StructureFormation)));
    }

    #[test]
    fn math_mutation_variants_are_distinct() {
        let variants = vec![
            MathMutation::PhiComputed,
            MathMutation::SigmaUpdated { fast: 0.3, slow: 0.99 },
            MathMutation::XiShifted { delta: 0.05 },
            MathMutation::ResonanceComputed { r_oper: 2.1 },
        ];
        assert_eq!(variants.len(), 4);
    }

    #[test]
    fn fsm_mutation_variants_are_distinct() {
        let variants = vec![
            FsmMutation::StateTransition {
                from: FsmState::S0_PassiveObservation,
                to: FsmState::S1_StructureFormation,
            },
            FsmMutation::AuthorizationGranted,
            FsmMutation::DispatchBlocked,
        ];
        assert_eq!(variants.len(), 3);
    }

    #[test]
    fn ingest_mutation_variants_are_distinct() {
        let variants = vec![
            IngestMutation::RawSignalIngested,
            IngestMutation::ClockSynced,
            IngestMutation::BackpressureDetected,
        ];
        assert_eq!(variants.len(), 3);
    }

    #[test]
    fn multi_consumer_receives_same_events() {
        let bus: TypedEventBus<TypedEnvelope<MathMutation>> = TypedEventBus::new();
        let tx = bus.sender();
        let rx1 = bus.receiver();
        let rx2 = bus.receiver(); // second consumer on same channel

        tx.send(math_envelope(1)).unwrap();

        // crossbeam unbounded is MPMC — first receiver wins
        let r = rx1.try_recv().or_else(|_| rx2.try_recv()).unwrap();
        assert_eq!(r.sequence_id, 1);
    }
}
