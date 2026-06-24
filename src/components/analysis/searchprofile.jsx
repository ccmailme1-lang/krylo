// WO-1316 — Analysis P1: Profile + Search Payload (split layout)
import React, { useState, useRef, useEffect, useContext } from 'react';
import { useAnalysisStore } from '../../store/useanalysisstore.js';
import { useUIStore }        from '../../store/useuistore.js';
import { ecosystemcontext }  from '../../ecosystemcontext.jsx';

const MONO  = "'IBM Plex Mono', monospace";
const SERIF = "Georgia, 'Playfair Display', serif";
const LIME  = '#66FF00';
const BORDER = 'rgba(26,26,26,1)';
const LENSES = ['INVESTOR', 'REALTOR', 'ATHLETE', 'SALES', 'LEGAL', 'RETIREMENT'];

// ── Global Noise Matrix (idle state, right panel overlay) ─────────────────────

function GlobalNoiseMatrix() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();

    const N = 40;
    const nodes = Array.from({ length: N }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      vx:    (Math.random() - 0.5) * 0.3,
      vy:    (Math.random() - 0.5) * 0.3,
      r:     1 + Math.random() * 1.2,
      pulse: 0,
    }));

    const pulseInterval = setInterval(() => {
      nodes[Math.floor(Math.random() * N)].pulse = 1.0;
    }, 1100);

    let raf;
    function draw() {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255,255,255,${0.07 * (1 - d / 100)})`;
            ctx.lineWidth   = 0.5;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }
      for (let i = 0; i < N; i++) {
        const n = nodes[i];
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.pulse > 0.5
          ? `rgba(102,255,0,${n.pulse * 0.7})`
          : 'rgba(255,255,255,0.25)';
        ctx.fill();
        n.pulse = Math.max(0, n.pulse - 0.012);
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > W) { n.vx *= -1; n.x = Math.max(0, Math.min(W, n.x)); }
        if (n.y < 0 || n.y > H) { n.vy *= -1; n.y = Math.max(0, Math.min(H, n.y)); }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); clearInterval(pulseInterval); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  );
}

// ── SearchProfile ─────────────────────────────────────────────────────────────

export default function SearchProfile() {
  const [searchInput, setSearchInput] = useState('');
  const [activeLens,  setActiveLens]  = useState('RETIREMENT');

  const activeSessionId = useAnalysisStore((s) => s.activeSessionId);
  const createSession   = useAnalysisStore((s) => s.createSession);
  const setSwipeIndex   = useUIStore((s) => s.setSwipeIndex);
  const { setquery }    = useContext(ecosystemcontext);

  function handleSearch(e) {
    e.preventDefault();
    if (!searchInput.trim()) return;
    createSession(`session_${Date.now()}`, activeLens, searchInput);
    setquery(searchInput);   // fires usetruthlens + useingest + usehnsignals + useframeingest
    setSwipeIndex(1);        // advance to Oracle (P2)
  }

  const isActive = !!activeSessionId;

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      background: '#000000',
      overflow: 'hidden',
    }}>

      {/* ── LEFT: Color block — command surface ───────────────────── */}
      <div style={{
        background: '#000000',
        borderRight: `1px solid ${BORDER}`,
        display: 'flex', flexDirection: 'column',
        padding: '40px 36px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}>

        {/* Top label */}
        <div style={{
          fontFamily: MONO, fontSize: 8, letterSpacing: '0.28em',
          color: 'rgba(255,255,255,0.25)', marginBottom: 48,
          textTransform: 'uppercase',
        }}>
          P1 — PROFILE / SEARCH
        </div>

        {/* Headline */}
        <div style={{
          fontFamily: SERIF,
          fontSize: 32,
          lineHeight: 1.15,
          color: '#ffffff',
          marginBottom: 12,
          letterSpacing: '-0.01em',
        }}>
          What are you<br />tracking?
        </div>
        <div style={{
          fontFamily: MONO, fontSize: 8, letterSpacing: '0.16em',
          color: 'rgba(255,255,255,0.25)', marginBottom: 40,
        }}>
          ENTITY · TOPIC · SIGNAL
        </div>

        {/* Search input */}
        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="name, org, topic..."
            disabled={isActive}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'transparent',
              border: `1px solid ${searchInput.trim() && !isActive ? 'rgba(102,255,0,0.5)' : 'rgba(255,255,255,0.12)'}`,
              color: '#ffffff',
              fontFamily: MONO, fontSize: 14,
              letterSpacing: '0.04em',
              padding: '14px 16px',
              outline: 'none',
              transition: 'border-color 150ms',
              opacity: isActive ? 0.5 : 1,
            }}
          />

          {/* Lens pills */}
          <div>
            <div style={{
              fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em',
              color: 'rgba(255,255,255,0.3)', marginBottom: 10,
            }}>
              LENS
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {LENSES.map(l => {
                const on = l === activeLens;
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => !isActive && setActiveLens(l)}
                    style={{
                      background:    on ? LIME : 'transparent',
                      border:        `1px solid ${on ? LIME : 'rgba(255,255,255,0.14)'}`,
                      color:         on ? '#000000' : 'rgba(255,255,255,0.4)',
                      fontFamily:    MONO, fontSize: 8,
                      letterSpacing: '0.16em',
                      padding:       '6px 12px',
                      cursor:        isActive ? 'default' : 'pointer',
                      transition:    'all 150ms',
                      opacity:       isActive ? 0.5 : 1,
                    }}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          {!isActive && (
            <button
              type="submit"
              disabled={!searchInput.trim()}
              style={{
                marginTop: 'auto',
                background:    searchInput.trim() ? LIME : 'transparent',
                border:        `1px solid ${searchInput.trim() ? LIME : 'rgba(255,255,255,0.1)'}`,
                color:         searchInput.trim() ? '#000000' : 'rgba(255,255,255,0.2)',
                fontFamily:    MONO, fontSize: 9,
                letterSpacing: '0.26em',
                padding:       '14px 0', cursor: searchInput.trim() ? 'pointer' : 'default',
                transition:    'all 150ms',
              }}
            >
              BEGIN ANALYSIS
            </button>
          )}

          {/* Active state — dossier */}
          {isActive && (
            <div style={{ marginTop: 'auto', borderTop: `1px solid ${BORDER}`, paddingTop: 20 }}>
              <div style={{
                fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em',
                color: 'rgba(255,255,255,0.3)', marginBottom: 14,
              }}>
                TARGET DOSSIER
              </div>
              {[
                { label: 'LIQUIDITY BURN', value: '$45K/MO', color: '#ffffff'  },
                { label: 'RISK INDEX',     value: '0.84',    color: '#ef4444'  },
                { label: 'HORIZON',        value: '48 MO',   color: '#ffffff'  },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  marginBottom: 10, alignItems: 'center',
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.18em' }}>{label}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* ── RIGHT: Image + semi-trans result surface ──────────────── */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#0a0a0a',
      }}>
        {/* Photo */}
        <img
          src="/assets/hero_face.png"
          alt=""
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center top',
            display: 'block',
            opacity: isActive ? 0.55 : 0.72,
            transition: 'opacity 600ms ease',
          }}
        />

        {/* Noise canvas (idle only) */}
        {!isActive && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <GlobalNoiseMatrix />
          </div>
        )}

        {/* Gradient scrim — bottom */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          height: '60%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 40%, transparent 100%)',
          zIndex: 2,
        }} />

        {/* Idle state label */}
        {!isActive && (
          <div style={{
            position: 'absolute', top: 20, left: 20, zIndex: 3,
            fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em',
            color: 'rgba(255,255,255,0.3)',
          }}>
            RESOLUTION: GLOBAL
          </div>
        )}

        {/* Active: results over scrim */}
        {isActive && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '32px 28px',
            zIndex: 3,
          }}>
            <div style={{
              fontFamily: MONO, fontSize: 9, letterSpacing: '0.26em',
              color: 'rgba(255,255,255,0.35)', marginBottom: 10,
            }}>
              RESOLUTION: ISOLATED
            </div>
            <div style={{
              fontFamily: SERIF, fontSize: 18, lineHeight: 1.5,
              color: '#ffffff', marginBottom: 20,
            }}>
              Signal environment is adverse.<br />
              3 active pressure vectors detected.
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              {[
                { label: 'SIGNALS',    value: '47'   },
                { label: 'FRACTURES',  value: '3'    },
                { label: 'COVERAGE',   value: '62%'  },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontFamily: MONO, fontSize: 18, color: LIME, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.16em', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* [CONFESS] watermark — idle */}
        {!isActive && (
          <div style={{
            position: 'absolute', bottom: 28, left: 0, right: 0,
            textAlign: 'center', zIndex: 3,
            fontFamily: MONO, fontSize: 28, letterSpacing: '0.18em',
            color: 'rgba(255,255,255,0.12)',
            pointerEvents: 'none',
          }}>
            [SIGNAL]
          </div>
        )}
      </div>

    </div>
  );
}
