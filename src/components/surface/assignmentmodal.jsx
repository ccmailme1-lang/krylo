// WO-1344B — Assignment Intent Modal
// Intent router: pendingAssignment → domain-bay slot binding.
// Each bay shows its fixed domain label. Assignment is an overlay, not a replacement.
import React, { useEffect } from 'react';
import { useBayStore, DOMAIN_ABBR } from '../../store/usebaystore.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';
const DIM  = 'rgba(255,255,255,0.25)';
const MID  = 'rgba(255,255,255,0.55)';
const BRT  = 'rgba(255,255,255,0.9)';

export default function AssignmentModal() {
  const pendingAssignment      = useBayStore(s => s.pendingAssignment);
  const bays                   = useBayStore(s => s.bays);
  const assignToBay            = useBayStore(s => s.assignToBay);
  const clearPendingAssignment = useBayStore(s => s.clearPendingAssignment);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') clearPendingAssignment();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearPendingAssignment]);

  if (!pendingAssignment) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
      onClick={clearPendingAssignment}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#000', border: '1px solid rgba(102,255,0,0.25)',
          padding: '28px 32px', minWidth: 500, maxWidth: 600,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <span style={{ fontFamily: MONO, fontSize: 7, color: LIME, letterSpacing: '0.35em' }}>ASSIGN TO DOMAIN</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(102,255,0,0.15)' }} />
          <span style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: '0.2em' }}>ESC to cancel</span>
        </div>

        {/* Signal being assigned */}
        <div style={{
          fontFamily: MONO, fontSize: 13, color: BRT,
          letterSpacing: '0.12em', marginBottom: 24,
          borderLeft: `2px solid ${LIME}`, paddingLeft: 14,
        }}>
          {pendingAssignment.title}
        </div>

        {/* 6 domain-bay slots — 2 rows of 3 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[1, 2, 3, 4, 5, 6].map(bayId => {
            const bay    = bays[bayId];
            const abbr   = DOMAIN_ABBR[bay.domain] ?? bay.domain.toUpperCase().slice(0, 4);
            const taken  = bay.assignment !== null;
            return (
              <button
                key={bayId}
                onClick={() => assignToBay(bayId, pendingAssignment)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${taken ? 'rgba(102,255,0,0.22)' : 'rgba(255,255,255,0.1)'}`,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 120ms, background 120ms',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = LIME;
                  e.currentTarget.style.background  = 'rgba(102,255,0,0.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = taken ? 'rgba(102,255,0,0.22)' : 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.background  = 'transparent';
                }}
              >
                {/* Bay number + domain abbr */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <span style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: '0.28em' }}>
                    {bayId < 10 ? `0${bayId}` : bayId}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: taken ? 'rgba(102,255,0,0.45)' : MID, letterSpacing: '0.22em' }}>
                    {abbr}
                  </span>
                </div>

                {/* Current state */}
                {taken ? (
                  <>
                    <div style={{
                      fontFamily: MONO, fontSize: 9, color: LIME,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      marginBottom: 4,
                    }}>
                      {bay.assignment.title}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(102,255,0,0.4)', letterSpacing: '0.18em' }}>
                      → REPLACE
                    </div>
                  </>
                ) : (
                  <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.14em' }}>
                    → ASSIGN HERE
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 20, fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: '0.18em', textAlign: 'center' }}>
          SELECT A DOMAIN BAY · DOMAIN IDENTITY IS PRESERVED
        </div>
      </div>
    </div>
  );
}
