import React, { useState } from 'react';

/* ── Krylo palette ── */
const BG     = '#000000';
const LIME   = '#66FF00';
const BORDER = 'rgba(255,255,255,0.06)';
const SEL_BG = 'rgba(102,255,0,0.04)';
const T1     = 'rgba(255,255,255,0.92)';
const T2     = 'rgba(255,255,255,0.50)';
const T3     = 'rgba(255,255,255,0.28)';
const MONO   = "'IBM Plex Mono', monospace";
const SERIF  = "Georgia, 'Times New Roman', serif";

/* ── Sidebar data ── */
const FOLLOWING = [
  { id:1, name:'Signal Analysts',    cat:'TECHNOLOGY', mem:'32.7K', code:'SIG', badge:4    },
  { id:2, name:'Market Convergence', cat:'CAPITAL',    mem:'47.2K', code:'MKT', badge:12   },
  { id:3, name:'Macro Readers',      cat:'KNOWLEDGE',  mem:'24.1K', code:'MAC', badge:null, active:true },
  { id:4, name:'Pattern Scouts',     cat:'LABOR',      mem:'18.2K', code:'PAT', badge:7    },
];

const SUGGESTED = [
  { id:5,  name:'Forensic Economists',  cat:'CAPITAL',    mem:'21.9K', code:'FOR' },
  { id:6,  name:'Narrative Trackers',   cat:'MEDIA',      mem:'52.1K', code:'NAR' },
  { id:7,  name:'Asset Allocators',     cat:'OWNERSHIP',  mem:'13.4K', code:'AST' },
  { id:8,  name:'Weak Signal Club',     cat:'KNOWLEDGE',  mem:'30.2K', code:'WSC' },
  { id:9,  name:'Quant Operators',      cat:'TECHNOLOGY', mem:'18.7K', code:'QNT' },
  { id:10, name:'Macro Synthesis',      cat:'CAPITAL',    mem:'25.5K', code:'SYN' },
];

/* ── Story feed data ── */
const STORIES = [
  {
    id: 1,
    source: 'SIGNAL BRIEF',
    community: 'KRYLO',
    headline: 'TECHNOLOGY Convergence Breaks Above 65 — Infrastructure Commitment Flow Active',
    readTime: '2 MIN READ',
    images: [
      'https://picsum.photos/seed/tech1a/300/120',
      'https://picsum.photos/seed/tech1b/300/120',
    ],
  },
  {
    id: 2,
    source: 'CONVERGENCE DESK',
    community: 'KRYLO',
    headline: 'MEDIA Hits Turbulent State While KNOWLEDGE Builds — Godin Protocol Window Open',
    readTime: '3 MIN READ',
    images: [
      'https://picsum.photos/seed/media2a/300/120',
      'https://picsum.photos/seed/media2b/300/120',
    ],
  },
  {
    id: 3,
    source: 'MACRO READERS',
    community: 'KRYLO',
    headline: 'Non-Consensus Detector Returns consensusDelta 34 — DIVERGING Gap Widens in Real Estate',
    readTime: '4 MIN READ',
    images: [
      'https://picsum.photos/seed/macro3a/300/120',
      'https://picsum.photos/seed/macro3b/300/120',
    ],
  },
  {
    id: 4,
    source: 'CAPITAL FLOW',
    community: 'KRYLO',
    headline: 'EDGAR Form D Volume Up 22% WoW in Infrastructure — Forward Compute Demand Forming',
    readTime: '2 MIN READ',
    images: [
      'https://picsum.photos/seed/cap4a/300/120',
      'https://picsum.photos/seed/cap4b/300/120',
    ],
  },
  {
    id: 5,
    source: 'PLATFORM WATCH',
    community: 'KRYLO',
    headline: 'TECHNOLOGY + CAPITAL Both Sustain Above 55 for 14 Days — Formation Confirmed',
    readTime: '3 MIN READ',
    images: [
      'https://picsum.photos/seed/plat5a/300/120',
      'https://picsum.photos/seed/plat5b/300/120',
    ],
  },
  {
    id: 6,
    source: 'OWNERSHIP DESK',
    community: 'KRYLO',
    headline: 'LABOR + OWNERSHIP Convergence Threshold Crossed — Flexible Space Demand Signal Active',
    readTime: '2 MIN READ',
    images: [
      'https://picsum.photos/seed/own6a/300/120',
      'https://picsum.photos/seed/own6b/300/120',
    ],
  },
];

const DETAIL = {
  name:     'Macro Readers',
  members:  '24.1K',
  code:     'MAC',
  creator:  '@deepconvergence',
  created:  'Mar 4, 2025',
  category: 'KNOWLEDGE',
  tags:     ['#convergence','#macro','#signals','#knowledge','#dalio','+4'],
  description: 'Practitioners tracking macro convergence across the six domains. Signal-first. No noise. Share KRYLO briefings, annotated convergence events, and cross-domain synthesis...',
  rules: [
    'Signal-backed claims only — cite your Fs score.',
    'No speculative narratives without provenance.',
    'Cross-domain analysis earns Top Contributor.',
    'No ticker spam; use CAPITAL domain framing.',
    'Keep discussion inside the six domains.',
  ],
  roles: [
    { label:'Member',          info:true, count:'24,127 members' },
    { label:'Top Contributor', info:true, count:'43 members'     },
    { label:'Moderator',       info:true, count:'5 members'      },
  ],
};

/* ── Domain code icon ── */
function DomainIcon({ code, size = 40 }) {
  return (
    <div style={{
      width: size, height: size,
      border: `1px solid ${BORDER}`,
      display:'flex', alignItems:'center', justifyContent:'center',
      flexShrink: 0,
      background: 'rgba(255,255,255,0.03)',
    }}>
      <span style={{
        fontFamily: MONO, fontSize: size * 0.22,
        color: T2, letterSpacing: '0.06em', fontWeight: 400,
      }}>
        {code}
      </span>
    </div>
  );
}

/* ── Author avatar ── */
function Avatar({ initials, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `1px solid ${BORDER}`,
      background: 'rgba(255,255,255,0.05)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily: MONO, fontSize: size * 0.28, color: T2, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

/* ── Unread badge ── */
function Badge({ n }) {
  return (
    <span style={{
      fontFamily: MONO, fontSize: 10, color: LIME,
      border: `1px solid rgba(102,255,0,0.25)`,
      padding:'1px 6px', letterSpacing: '0.04em', flexShrink: 0,
    }}>
      {n}
    </span>
  );
}

/* ── SVG icons ── */
const IcCollapse = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>
  </svg>
);
const IcSearch = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IcCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={LIME} strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcInfo = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const IcArrow = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IcBack = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IcDots = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>
  </svg>
);

/* ── Left Sidebar ── */
function Sidebar({ activeId, onSelect }) {
  const [search, setSearch] = useState('');
  return (
    <div style={{
      width: 296, flexShrink: 0,
      borderRight: `1px solid ${BORDER}`,
      display:'flex', flexDirection:'column', height:'100%',
    }}>
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'16px 20px 14px', borderBottom:`1px solid ${BORDER}`,
      }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: T1, letterSpacing:'0.18em', textTransform:'uppercase' }}>
          Community
        </span>
        <button style={{ background:'none', border:'none', cursor:'pointer', color: T3, display:'flex', padding:2 }}>
          <IcCollapse />
        </button>
      </div>

      <div style={{ padding:'12px 16px', borderBottom:`1px solid ${BORDER}` }}>
        <div style={{
          display:'flex', alignItems:'center', gap:8,
          border:`1px solid ${BORDER}`, padding:'7px 11px',
        }}>
          <span style={{ color: T3 }}><IcSearch /></span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search community"
            style={{
              flex:1, background:'none', border:'none', outline:'none',
              fontFamily: MONO, fontSize:11, color: T2, letterSpacing:'0.04em',
            }}
          />
          <span style={{
            fontFamily: MONO, fontSize:9, color: T3,
            border:`1px solid ${BORDER}`, padding:'1px 5px', letterSpacing:'0.1em',
          }}>⌘ F</span>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto' }}>
        <SectionLabel>Following</SectionLabel>
        {FOLLOWING.map(c => (
          <SidebarItem key={c.id} c={c} active={activeId === c.id} onClick={() => onSelect(c.id)} />
        ))}
        <SectionLabel>Suggested</SectionLabel>
        {SUGGESTED.map(c => (
          <SidebarItem key={c.id} c={c} active={false} suggested onClick={() => onSelect(c.id)} />
        ))}
        <div style={{ padding:'16px 20px 24px' }}>
          <button style={{
            background:'none', border:'none', cursor:'pointer', padding:0,
            display:'flex', alignItems:'center', gap:6,
            fontFamily: MONO, fontSize:10, color: LIME, letterSpacing:'0.1em',
          }}>
            SEE ALL COMMUNITY <IcArrow />
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ padding:'14px 20px 6px' }}>
      <span style={{ fontFamily: MONO, fontSize:9, color: T3, letterSpacing:'0.2em', textTransform:'uppercase' }}>
        {children}
      </span>
    </div>
  );
}

function SidebarItem({ c, active, suggested, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:'flex', alignItems:'center', gap:11, padding:'9px 20px',
        background: active ? SEL_BG : hov ? 'rgba(255,255,255,0.02)' : 'transparent',
        borderLeft: active ? `2px solid ${LIME}` : '2px solid transparent',
        cursor:'pointer', transition:'background 100ms',
      }}
    >
      <DomainIcon code={c.code} size={38} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{
          fontFamily: SERIF, fontSize:13, color: active ? T1 : T2,
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:2,
        }}>
          {c.name}
        </div>
        <div style={{ fontFamily: MONO, fontSize:9, color: T3, letterSpacing:'0.08em' }}>
          {c.cat} · {c.mem}
        </div>
      </div>
      {!suggested && c.badge && <Badge n={c.badge} />}
      {suggested && (
        <button style={{
          width:22, height:22, border:`1px solid rgba(255,255,255,0.2)`,
          background:'transparent', cursor:'pointer', color: T2,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily: MONO, fontSize:14, flexShrink:0, lineHeight:1,
        }}>+</button>
      )}
    </div>
  );
}

/* ── Story Card ── */
function StoryCard({ story }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: BG,
        border: `1px solid ${hov ? 'rgba(255,255,255,0.12)' : BORDER}`,
        cursor: 'pointer',
        transition: 'border-color 150ms',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Image area */}
      <div style={{ display: 'flex', height: 210, overflow: 'hidden', flexShrink: 0 }}>

        {/* Left — large cropped headline text */}
        <div style={{
          flex: 1, overflow: 'hidden', position: 'relative',
          background: '#050505',
          borderRight: `1px solid ${BORDER}`,
        }}>
          <div style={{
            fontFamily: SERIF,
            fontSize: 64,
            fontWeight: 700,
            color: T1,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            padding: '16px 18px',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            position: 'absolute',
            top: 0, left: 0, right: 0,
          }}>
            {story.headline}
          </div>
        </div>

        {/* Right — 2 stacked images */}
        <div style={{ width: '42%', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ flex: 1, overflow: 'hidden', borderBottom: `1px solid ${BORDER}` }}>
            <img
              src={story.images[0]}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <img
              src={story.images[1]}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        </div>
      </div>

      {/* Meta */}
      <div style={{ padding: '14px 16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          fontFamily: MONO, fontSize: 9, color: T3,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          marginBottom: 10,
        }}>
          {story.source} · {story.community}
        </div>
        <div style={{
          fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: T1,
          lineHeight: 1.35, marginBottom: 14, flex: 1,
        }}>
          {story.headline}
        </div>
        <div style={{
          fontFamily: MONO, fontSize: 9, color: T3,
          letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>
          {story.readTime}
        </div>
      </div>
    </div>
  );
}

/* ── Main Feed — 2-col story grid ── */
function Feed() {
  return (
    <div style={{
      flex: 1, overflowY: 'auto', background: BG,
      borderRight: `1px solid ${BORDER}`,
      padding: '20px',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
      }}>
        {STORIES.map(s => <StoryCard key={s.id} story={s} />)}
      </div>
    </div>
  );
}

/* ── Right Detail Panel ── */
function DetailPanel() {
  return (
    <div style={{
      width:264, flexShrink:0,
      borderLeft:`1px solid ${BORDER}`,
      display:'flex', flexDirection:'column',
      height:'100%', overflowY:'auto',
    }}>
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'16px 18px 14px', borderBottom:`1px solid ${BORDER}`, flexShrink:0,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button style={{ background:'none', border:'none', cursor:'pointer', color: T3, display:'flex', padding:2 }}>
            <IcBack />
          </button>
          <span style={{ fontFamily: MONO, fontSize:10, color: T2, letterSpacing:'0.14em', textTransform:'uppercase' }}>
            Community Detail
          </span>
        </div>
        <button style={{ background:'none', border:'none', cursor:'pointer', color: T3, display:'flex', padding:2 }}>
          <IcDots />
        </button>
      </div>

      <div style={{ padding:'20px 18px 16px', borderBottom:`1px solid ${BORDER}` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <DomainIcon code={DETAIL.code} size={44} />
            <div>
              <div style={{ fontFamily: SERIF, fontSize:16, color: T1, lineHeight:1.3 }}>{DETAIL.name}</div>
            </div>
          </div>
          <button style={{
            width:32, height:32, border:`1px solid rgba(102,255,0,0.35)`, cursor:'pointer',
            background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}>
            <IcCheck />
          </button>
        </div>
        <span style={{ fontFamily: MONO, fontSize:10, color: LIME, letterSpacing:'0.08em', cursor:'pointer' }}>
          {DETAIL.members} MEMBERS ›
        </span>
      </div>

      <div style={{ padding:'16px 18px', borderBottom:`1px solid ${BORDER}` }}>
        <div style={{ fontFamily: MONO, fontSize:9, color: T3, letterSpacing:'0.2em', marginBottom:14 }}>COMMUNITY OVERVIEW</div>
        <Row label="Creator">
          <span style={{ fontFamily: MONO, fontSize:10, color: LIME, letterSpacing:'0.06em' }}>{DETAIL.creator}</span>
        </Row>
        <Row label="Date created">
          <span style={{ fontFamily: MONO, fontSize:10, color: T2 }}>{DETAIL.created}</span>
        </Row>
        <Row label="Category">
          <span style={{ fontFamily: MONO, fontSize:10, color: T2, letterSpacing:'0.1em' }}>{DETAIL.category}</span>
        </Row>
        <div>
          <div style={{ fontFamily: MONO, fontSize:9, color: T3, letterSpacing:'0.14em', marginBottom:8 }}>TAGS</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {DETAIL.tags.map(t => (
              <span key={t} style={{
                fontFamily: MONO, fontSize:9,
                color: t.startsWith('+') ? T3 : LIME,
                border:`1px solid ${t.startsWith('+') ? BORDER : 'rgba(102,255,0,0.2)'}`,
                padding:'2px 7px', letterSpacing:'0.06em',
              }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:'14px 18px', borderBottom:`1px solid ${BORDER}`, display:'flex', gap:8 }}>
        <button style={{
          flex:1, background:'transparent', border:`1px solid rgba(102,255,0,0.35)`, padding:'8px 0',
          fontFamily: MONO, fontSize:9, color: LIME,
          letterSpacing:'0.14em', cursor:'pointer',
        }}>
          CREATE POST +
        </button>
        <button style={{
          flex:1, background:'transparent', border:`1px solid ${BORDER}`, padding:'8px 0',
          fontFamily: MONO, fontSize:9, color: T2, letterSpacing:'0.14em', cursor:'pointer',
        }}>
          SHARE ↗
        </button>
      </div>

      <div style={{ padding:'16px 18px', borderBottom:`1px solid ${BORDER}` }}>
        <div style={{ fontFamily: MONO, fontSize:9, color: T3, letterSpacing:'0.2em', marginBottom:10 }}>DESCRIPTION</div>
        <div style={{ fontFamily: SERIF, fontSize:13, color: T2, lineHeight:1.7 }}>
          {DETAIL.description}{' '}
          <span style={{ color: LIME, cursor:'pointer' }}>Read more</span>
        </div>
      </div>

      <div style={{ padding:'16px 18px', borderBottom:`1px solid ${BORDER}` }}>
        <div style={{ fontFamily: MONO, fontSize:9, color: T3, letterSpacing:'0.2em', marginBottom:12 }}>COMMUNITY RULES</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {DETAIL.rules.map((rule, i) => (
            <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <span style={{ fontFamily: MONO, fontSize:10, color: LIME, flexShrink:0, marginTop:2 }}>{i + 1}</span>
              <span style={{ fontFamily: SERIF, fontSize:12, color: T2, lineHeight:1.6 }}>{rule}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px 18px 28px' }}>
        <div style={{ fontFamily: MONO, fontSize:9, color: T3, letterSpacing:'0.2em', marginBottom:12 }}>MEMBER ROLE</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {DETAIL.roles.map(r => (
            <div key={r.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{
                  fontFamily: MONO, fontSize:9, color: T2,
                  border:`1px solid ${BORDER}`, padding:'2px 8px', letterSpacing:'0.08em',
                }}>
                  {r.label.toUpperCase()}
                </span>
                {r.info && <span style={{ color: T3 }}><IcInfo /></span>}
              </div>
              <span style={{ fontFamily: MONO, fontSize:9, color: T3 }}>{r.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
      <span style={{ fontFamily: MONO, fontSize:9, color: T3, letterSpacing:'0.12em' }}>{label.toUpperCase()}</span>
      {children}
    </div>
  );
}

/* ── Root ── */
export default function CommunityView() {
  const [activeId, setActiveId] = useState(3);
  return (
    <div style={{
      position:'absolute', inset:0,
      display:'flex', flexDirection:'row',
      background: BG, overflow:'hidden',
    }}>
      <Sidebar activeId={activeId} onSelect={setActiveId} />
      <Feed />
      <DetailPanel />
    </div>
  );
}
