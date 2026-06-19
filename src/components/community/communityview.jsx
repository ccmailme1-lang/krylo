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

/* ── data ── */
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

const STORIES = [
  {
    id: 1,
    authorName:    'Rand D.',
    authorHandle:  '@rand_d',
    authorInitials:'RD',
    role: 'Top Contributor',
    community: 'Macro Readers',
    source: 'Signal Briefing',
    readTime: '4 min read',
    displayWords: ['TECHNOLOGY','cone','broke','above'],
    images: [
      'https://picsum.photos/seed/tech1a/600/400',
      'https://picsum.photos/seed/tech1b/600/400',
    ],
    text: 'TECHNOLOGY cone broke above 65 this morning. EDGAR Form D volume is up 22% WoW in infrastructure categories. This is the forward compute demand pattern from WO-1732 — 12–18 months before CAPITAL confirms.',
    linkPreview: {
      url: 'krylo.org/signals/technology-breakout',
      label: 'Signal Briefing',
      title: 'TECHNOLOGY Convergence — Infrastructure Commitment Flow',
      desc: 'TECHNOLOGY score crossed HIGH CONVERGENCE threshold. EDGAR data suggests hyperscaler commitment pipeline forming...',
      img: 'https://picsum.photos/seed/tech1/120/88',
    },
    video: null,
    hashtags: [],
    likes: '3.2K', comments: 87, shares: '1.1K',
    date: 'June 15, 2026',
  },
  {
    id: 2,
    authorName:    'DiResta',
    authorHandle:  '@diresta',
    authorInitials:'DR',
    role: 'Moderator',
    community: 'Macro Readers',
    source: 'Macro Readers',
    readTime: '6 min read',
    displayWords: ['Anyone','else','seeing','the'],
    images: [
      'https://picsum.photos/seed/chart2a/600/400',
      'https://picsum.photos/seed/chart2b/600/400',
    ],
    text: 'Anyone else seeing the MEDIA → KNOWLEDGE divergence in the AI regulation space? MEDIA hit TURBULENT CONVERGENCE (attention saturation) while KNOWLEDGE is still BUILDING. Godin Protocol says this is the Purple Cow window.',
    linkPreview: null,
    video: false,
    chart: true,
    img: 'https://picsum.photos/seed/chart2/800/260',
    hashtags: ['#narrativepermission','#mediasaturation','#godinprotocol','#convergence'],
    likes: '2.8K', comments: 142, shares: '980',
    date: 'June 15, 2026',
  },
  {
    id: 3,
    authorName:    'Ben A.',
    authorHandle:  '@ben_a',
    authorInitials:'BA',
    role: 'Member',
    community: 'Macro Readers',
    source: 'Pattern Scouts',
    readTime: '3 min read',
    displayWords: ['First','time','running','the'],
    images: [
      'https://picsum.photos/seed/signal3a/600/400',
      'https://picsum.photos/seed/signal3b/600/400',
    ],
    text: 'First time running the Non-Consensus detector on my real estate query. consensusDelta is 34 — DIVERGING gap wide open. If the Khosla Protocol is right, this is exactly when non-consensus bets outperform...',
    hashtags: [],
    likes: null, comments: null, shares: null,
    date: null,
  },
  {
    id: 4,
    authorName:    'Paul K.',
    authorHandle:  '@paul_k',
    authorInitials:'PK',
    role: 'Top Contributor',
    community: 'Signal Analysts',
    source: 'Signal Analysts',
    readTime: '5 min read',
    displayWords: ['Non','consensus','window','open'],
    images: [
      'https://picsum.photos/seed/nc1a/600/400',
      'https://picsum.photos/seed/nc1b/600/400',
    ],
    text: 'Non-consensus window is open on CAPITAL. consensusDelta hit 41 — widest gap in 30 days. EDGAR volume confirms institutional accumulation while MEDIA stays cold. This is the setup.',
    hashtags: [],
    likes: '1.4K', comments: 31, shares: '620',
    date: 'June 16, 2026',
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
const IcHeart = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const IcComment = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IcShare = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
    <polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
);
const IcBookmark = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
  </svg>
);
const IcDots = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>
  </svg>
);
const IcBack = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
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
const IcPlay = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={LIME}>
    <polygon points="5 3 19 12 5 21 5 3"/>
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
      {/* Header */}
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

      {/* Search */}
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

      {/* Lists */}
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

/* ── Main Feed ── */
function Feed() {
  return (
    <div style={{
      flex:1, overflowY:'auto', background: BG,
      borderRight:`1px solid ${BORDER}`,
      padding:'16px',
      fontSize:16, lineHeight:1.2,
    }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {STORIES.map(story => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>
    </div>
  );
}

function StoryCard({ story }) {
  return (
    <div style={{
      border: `1px solid ${BORDER}`,
      display: 'flex',
      background: '#0a0a0a',
    }}>
      {/* Left: Text Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px',
        borderRight: `1px solid ${BORDER}`,
      }}>
        <div style={{
          fontFamily: SERIF,
          fontSize: 20,
          fontWeight: 700,
          lineHeight: 1.2,
          color: T1,
          letterSpacing: '-0.02em',
          marginBottom: 12,
        }}>
          {story.displayWords.join(' ')}
        </div>
        <div style={{
          fontFamily: SERIF,
          fontSize: 13,
          fontWeight: 400,
          lineHeight: 1.65,
          color: T2,
        }}>
          {story.text}
        </div>
      </div>

      {/* Right: Images */}
      <div style={{
        width: '42%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: `1px solid ${BORDER}`,
      }}>
        {story.images && story.images.length > 0 && (
          <>
            {story.images.slice(0, 1).map((src, i) => (
              <div key={i} style={{
                flex: 1,
                overflow: 'hidden',
              }}>
                <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              </div>
            ))}
          </>
        )}
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
      {/* Header */}
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

      {/* Identity */}
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

      {/* Overview */}
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

      {/* Actions */}
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

      {/* Description */}
      <div style={{ padding:'16px 18px', borderBottom:`1px solid ${BORDER}` }}>
        <div style={{ fontFamily: MONO, fontSize:9, color: T3, letterSpacing:'0.2em', marginBottom:10 }}>DESCRIPTION</div>
        <div style={{ fontFamily: SERIF, fontSize:13, color: T2, lineHeight:1.7 }}>
          {DETAIL.description}{' '}
          <span style={{ color: LIME, cursor:'pointer' }}>Read more</span>
        </div>
      </div>

      {/* Rules */}
      <div style={{ padding:'16px 18px', borderBottom:`1px solid ${BORDER}` }}>
        <div style={{ fontFamily: MONO, fontSize:9, color: T3, letterSpacing:'0.2em', marginBottom:12 }}>COMMUNITY RULES</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {DETAIL.rules.map((rule, i) => (
            <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <span style={{ fontFamily: MONO, fontSize:10, color: LIME, flexShrink:0, marginTop:2 }}>
                {i + 1}
              </span>
              <span style={{ fontFamily: SERIF, fontSize:12, color: T2, lineHeight:1.6 }}>{rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Member roles */}
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
  const [activeId, setActiveId] = useState(null);
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
