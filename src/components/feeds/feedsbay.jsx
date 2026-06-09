// feedsbay.jsx — Newspaper Front Page (NYT-inspired)
import React, { useState, useEffect, useRef } from 'react';

const MONO  = "'IBM Plex Mono', monospace";
const SERIF = "Georgia, 'Times New Roman', serif";
const BG    = '#000000';
const RULE  = 'rgba(255,255,255,0.10)';
const RULE2 = 'rgba(255,255,255,0.20)';
const LIME  = '#66FF00';
const TEXT  = 'rgba(255,255,255,0.92)';
const MUTED = 'rgba(255,255,255,0.38)';
const DIM   = 'rgba(255,255,255,0.18)';

const DOMAINS = ['ALL', 'FINANCIAL', 'MARKET', 'LEGAL', 'HEALTH', 'CAREER', 'TECHNOLOGY'];
const SUBCATEGORIES = {
  ALL:        [],
  FINANCIAL:  ['EARNINGS', 'RATES', 'DEBT', 'EQUITY', 'M&A'],
  MARKET:     ['EQUITIES', 'CRYPTO', 'COMMODITIES', 'FOREX', 'ETFs'],
  LEGAL:      ['REGULATION', 'LITIGATION', 'COMPLIANCE', 'ANTITRUST'],
  HEALTH:     ['PHARMA', 'POLICY', 'RESEARCH', 'OUTBREAKS'],
  CAREER:     ['LAYOFFS', 'HIRING', 'COMPENSATION', 'STARTUPS'],
  TECHNOLOGY: ['AI', 'SEMICONDUCTORS', 'CYBERSECURITY', 'PLATFORMS'],
};

const MOCK = [
  { id:1, type:'FINANCIAL', title:'Rate compression signals detected across regional banking sector as Federal Reserve holds rates steady', description:'Central bank officials cited persistent inflationary pressure as justification for maintaining current policy stance through Q3.', source:'Signal Intelligence', time:'09:41Z', imageUrl:null, fs:0.89 },
  { id:2, type:'MARKET',    title:'Equity overhang detected prior to Series B close — insider activity flagged across three portfolio firms', description:'Pattern analysis confirms pre-announcement positioning inconsistent with disclosed trading windows.', source:'Market Desk', time:'09:35Z', imageUrl:null, fs:0.81 },
  { id:3, type:'LEGAL',     title:'Court filing contradicts public narrative on revenue recognition — restructuring mechanism confirmed', description:null, source:'Legal Wire', time:'09:28Z', imageUrl:null, fs:0.76 },
  { id:4, type:'CAREER',    title:'Labor market tightening in high-skill verticals accelerates — talent exodus pattern matches P2 telemetry', description:null, source:'Career Signal', time:'09:20Z', imageUrl:null, fs:0.71 },
  { id:5, type:'TECHNOLOGY',title:'Supply chain pressure building in semiconductor vertical — lead times extend to 28 weeks', description:null, source:'Tech Monitor', time:'09:14Z', imageUrl:null, fs:0.68 },
  { id:6, type:'LEGAL',     title:'Debt instrument obscured via SPV — mechanism confirmed across four jurisdictions', description:null, source:'Legal Wire', time:'09:08Z', imageUrl:null, fs:0.65 },
  { id:7, type:'FINANCIAL', title:'Board-level friction signal detected — COO departure imminent based on behavioral pattern analysis', description:null, source:'Signal Intelligence', time:'08:57Z', imageUrl:null, fs:0.62 },
  { id:8, type:'MARKET',    title:'Commodity index divergence signals demand compression in three key industrial sectors', description:null, source:'Market Desk', time:'08:44Z', imageUrl:null, fs:0.59 },
];

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 900);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 900);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

function readTime(story) {
  const words = ((story.title ?? '') + ' ' + (story.description ?? '')).split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1)  return 'just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }).toUpperCase();
}

function CategoryTag({ type }) {
  return (
    <span style={{ fontFamily:MONO, fontSize:8, letterSpacing:'0.22em', color:LIME, border:`1px solid ${LIME}`, padding:'1px 5px' }}>
      {type}
    </span>
  );
}

function Chip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontFamily:MONO, fontSize:9, letterSpacing:'0.18em',
      color: active ? '#000' : MUTED,
      background: active ? LIME : 'transparent',
      border:`1px solid ${active ? LIME : DIM}`,
      padding:'3px 10px', cursor:'pointer', borderRadius:2,
      whiteSpace:'nowrap', transition:'all 120ms',
    }}>
      {label}
    </button>
  );
}

function ImageBlock({ imageUrl, category, style = {} }) {
  return (
    <div style={{ overflow:'hidden', position:'relative', flexShrink:0, ...style }}>
      {imageUrl ? (
        <img src={imageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
      ) : (
        <div style={{
          width:'100%', height:'100%',
          background:`repeating-linear-gradient(0deg,rgba(255,255,255,0.025) 0px,rgba(255,255,255,0.025) 1px,transparent 1px,transparent 24px),repeating-linear-gradient(90deg,rgba(255,255,255,0.025) 0px,rgba(255,255,255,0.025) 1px,transparent 1px,transparent 24px),#080808`,
          display:'flex', alignItems:'flex-end', padding:10,
        }}>
          <CategoryTag type={category} />
        </div>
      )}
    </div>
  );
}

// ── Live Ticker ───────────────────────────────────────────────────────────────
function LiveTicker({ stories }) {
  const tickerRef = useRef(null);
  const items = stories.slice(0, 6);
  if (!items.length) return null;
  return (
    <div style={{
      borderBottom:`1px solid ${RULE}`,
      padding:'8px 32px',
      display:'flex', alignItems:'center', gap:0,
      overflowX:'auto', scrollbarWidth:'none',
    }}>
      <span style={{ fontFamily:MONO, fontSize:9, color:LIME, letterSpacing:'0.2em', marginRight:16, flexShrink:0 }}>
        ● LIVE
      </span>
      <div ref={tickerRef} style={{ display:'flex', gap:0, alignItems:'center', flexWrap:'nowrap' }}>
        {items.map((s, i) => (
          <React.Fragment key={s.id}>
            {i > 0 && <span style={{ color:DIM, margin:'0 12px', fontSize:10 }}>|</span>}
            <span style={{ display:'flex', alignItems:'center', gap:8, whiteSpace:'nowrap' }}>
              <span style={{ fontFamily:SERIF, fontSize:12, color:TEXT }}>{s.title}</span>
              <span style={{ fontFamily:MONO, fontSize:9, color:LIME, letterSpacing:'0.12em' }}>
                {s.publishedAt ? timeAgo(s.publishedAt) : s.time}
              </span>
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── Filter Bar ────────────────────────────────────────────────────────────────
function FilterBar({ domain, setDomain, sub, setSub, mobile }) {
  const subs = SUBCATEGORIES[domain] ?? [];
  return (
    <div style={{ borderBottom:`1px solid ${RULE2}`, padding: mobile ? '10px 16px' : '10px 32px' }}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom: subs.length ? 8 : 0 }}>
        {DOMAINS.map(d => (
          <Chip key={d} label={d} active={domain === d} onClick={() => { setDomain(d); setSub('ALL'); }} />
        ))}
      </div>
      {subs.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, paddingTop:6, borderTop:`1px solid ${RULE}` }}>
          <Chip label="ALL" active={sub === 'ALL'} onClick={() => setSub('ALL')} />
          {subs.map(s => <Chip key={s} label={s} active={sub === s} onClick={() => setSub(s)} />)}
        </div>
      )}
    </div>
  );
}

// ── Left Column Story (text + small right thumbnail) ──────────────────────────
function LeftStory({ story, divider }) {
  const rt = readTime(story);
  return (
    <div style={{ display:'flex', gap:12, paddingBottom:16, marginBottom:16, borderBottom: divider ? `1px solid ${RULE}` : 'none', alignItems:'flex-start' }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ marginBottom:6 }}><CategoryTag type={story.type} /></div>
        <h3 style={{ fontFamily:SERIF, fontSize:15, fontWeight:700, lineHeight:1.3, color:TEXT, margin:'0 0 6px' }}>
          {story.title}
        </h3>
        <div style={{ fontFamily:MONO, fontSize:8, color:MUTED, letterSpacing:'0.14em' }}>
          {rt} MIN READ
        </div>
      </div>
      <ImageBlock imageUrl={story.imageUrl} category={story.type} style={{ width:72, height:56, borderRadius:1 }} />
    </div>
  );
}

// ── Center Story (dominant) ───────────────────────────────────────────────────
function CenterStory({ story }) {
  const rt = readTime(story);
  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      <ImageBlock imageUrl={story.imageUrl} category={story.type} style={{ width:'100%', height:340 }} />
      <div style={{ padding:'16px 0 0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <CategoryTag type={story.type} />
        </div>
        <h1 style={{ fontFamily:SERIF, fontSize:24, fontWeight:700, lineHeight:1.25, color:TEXT, margin:'0 0 10px', letterSpacing:'-0.01em' }}>
          {story.title}
        </h1>
        {story.description && (
          <p style={{ fontFamily:SERIF, fontSize:14, lineHeight:1.6, color:'rgba(255,255,255,0.60)', margin:'0 0 12px' }}>
            {story.description}
          </p>
        )}
        <div style={{ fontFamily:MONO, fontSize:8, color:MUTED, letterSpacing:'0.15em' }}>
          {story.source.toUpperCase()} · {story.time} · {rt} MIN READ
        </div>
      </div>
    </div>
  );
}

// ── Right Column Card (image top, text below) ─────────────────────────────────
function RightCard({ story, divider }) {
  const rt = readTime(story);
  return (
    <div style={{ paddingBottom:16, marginBottom:16, borderBottom: divider ? `1px solid ${RULE}` : 'none' }}>
      <ImageBlock imageUrl={story.imageUrl} category={story.type} style={{ width:'100%', height:140, marginBottom:10 }} />
      <div style={{ marginBottom:6 }}><CategoryTag type={story.type} /></div>
      <h3 style={{ fontFamily:SERIF, fontSize:14, fontWeight:700, lineHeight:1.3, color:TEXT, margin:'0 0 6px' }}>
        {story.title}
      </h3>
      <div style={{ fontFamily:MONO, fontSize:8, color:MUTED, letterSpacing:'0.14em' }}>
        {rt} MIN READ
      </div>
    </div>
  );
}

// ── Below Fold — headline only, no image ─────────────────────────────────────
function TextStory({ story, mobile }) {
  return (
    <div style={{
      padding: mobile ? '0 0 20px' : '0 20px 20px',
      borderRight: mobile ? 'none' : `1px solid ${RULE}`,
      borderBottom: `1px solid ${RULE}`,
      marginBottom: 20,
    }}>
      <h3 style={{ fontFamily:SERIF, fontSize:16, fontWeight:700, lineHeight:1.3, color:TEXT, margin:'0 0 8px' }}>
        {story.title}
      </h3>
      <div style={{ fontFamily:MONO, fontSize:8, color:MUTED, letterSpacing:'0.14em' }}>
        {story.source.toUpperCase()}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function FeedsBay() {
  const [stories, setStories]  = useState(MOCK);
  const [loading, setLoading]  = useState(false);
  const [domain,  setDomain]   = useState('ALL');
  const [sub,     setSub]      = useState('ALL');
  const mobile = useIsMobile();

  useEffect(() => {
    setLoading(true);
    const q = domain !== 'ALL' ? `?domain=${domain}` : '';
    fetch(`/api/news${q}`)
      .then(r => r.json())
      .then(data => {
        if (data.articles?.length > 0) {
          const mapped = data.articles.map((a, i) => ({
            id: i,
            type: domain !== 'ALL' ? domain : 'SIGNAL',
            sub: null,
            title: a.title ?? '',
            description: a.description ?? null,
            source: a.source ?? 'unknown',
            publishedAt: a.publishedAt ?? null,
            time: a.publishedAt ? new Date(a.publishedAt).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', timeZoneName:'short' }) : '',
            imageUrl: a.imageUrl ?? null,
            url: a.url ?? null,
            fs: 0.70 + Math.random() * 0.25,
          }));
          setStories(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [domain]);

  const filtered  = sub === 'ALL' ? stories : stories.filter(s => s.sub === sub);
  const sorted    = [...filtered].sort((a, b) => (b.fs ?? 0) - (a.fs ?? 0));
  const center    = sorted[0];
  const leftCol   = sorted.slice(1, 4);
  const rightCol  = sorted.slice(4, 7);
  const belowFold = sorted.slice(7, 13);

  const pad = mobile ? '14px 16px' : '18px 32px 14px';

  return (
    <div style={{ background:BG, color:TEXT, minHeight:'100vh', overflowY:'auto' }}>

      {/* MASTHEAD */}
      <header style={{
        display:'flex', flexDirection: mobile ? 'column' : 'row',
        justifyContent:'space-between', alignItems: mobile ? 'center' : 'baseline',
        gap: mobile ? 6 : 0, padding:pad,
        borderBottom:`2px solid ${RULE2}`, textAlign: mobile ? 'center' : 'unset',
      }}>
        {!mobile && <div style={{ fontFamily:MONO, fontSize:9, color:MUTED, letterSpacing:'0.22em' }}>{formatDate()}</div>}
        <div>
          <div style={{ fontFamily:SERIF, fontSize: mobile ? 22 : 28, fontWeight:700, color:TEXT, letterSpacing:'-0.02em', lineHeight:1 }}>KRYLO</div>
          <div style={{ fontFamily:MONO, fontSize:7, color:MUTED, letterSpacing:'0.3em', marginTop:3 }}>SIGNAL / INTELLIGENCE</div>
        </div>
        <div style={{ fontFamily:MONO, fontSize:9, letterSpacing:'0.2em', textAlign: mobile ? 'center' : 'right' }}>
          <span style={{ color:LIME }}>● LIVE</span>
          <span style={{ color:MUTED, marginLeft:10 }}>{loading ? 'UPDATING...' : `${stories.length} SIGNALS`}</span>
        </div>
      </header>

      {/* FILTER BAR */}
      <FilterBar domain={domain} setDomain={setDomain} sub={sub} setSub={setSub} mobile={mobile} />

      {/* LIVE TICKER */}
      {!mobile && <LiveTicker stories={sorted} />}

      {/* MAIN BODY */}
      {center ? (
        <>
          {mobile ? (
            /* Mobile: single column stack */
            <div style={{ padding:'20px 16px' }}>
              <CenterStory story={center} />
              {leftCol.map((s, i) => <div key={s.id} style={{ marginTop:20, paddingTop:20, borderTop:`1px solid ${RULE}` }}><LeftStory story={s} divider={false} /></div>)}
              {rightCol.map((s, i) => <div key={s.id} style={{ marginTop:20, paddingTop:20, borderTop:`1px solid ${RULE}` }}><RightCard story={s} divider={false} /></div>)}
            </div>
          ) : (
            /* Desktop: 3-column */
            <div style={{
              display:'grid',
              gridTemplateColumns:'260px 1fr 280px',
              gap:0,
              padding:'28px 32px 0',
              borderBottom:`1px solid ${RULE2}`,
            }}>
              {/* LEFT */}
              <div style={{ borderRight:`1px solid ${RULE}`, paddingRight:24 }}>
                {leftCol.map((s, i) => <LeftStory key={s.id} story={s} divider={i < leftCol.length - 1} />)}
              </div>

              {/* CENTER */}
              <div style={{ padding:'0 24px', borderRight:`1px solid ${RULE}` }}>
                <CenterStory story={center} />
              </div>

              {/* RIGHT */}
              <div style={{ paddingLeft:24 }}>
                {rightCol.map((s, i) => <RightCard key={s.id} story={s} divider={i < rightCol.length - 1} />)}
              </div>
            </div>
          )}

          {/* CONTINUED SIGNALS */}
          {belowFold.length > 0 && (
            <>
              <div style={{
                padding: mobile ? '10px 16px' : '10px 32px',
                borderBottom:`1px solid ${RULE}`, borderTop: mobile ? 'none' : `1px solid ${RULE2}`,
                fontFamily:MONO, fontSize:8, color:MUTED, letterSpacing:'0.28em',
              }}>
                CONTINUED SIGNALS
              </div>
              <div style={{
                display: mobile ? 'block' : 'grid',
                gridTemplateColumns: mobile ? undefined : 'repeat(4, 1fr)',
                padding: mobile ? '20px 16px 40px' : '24px 12px 40px',
              }}>
                {belowFold.map(s => <TextStory key={s.id} story={s} mobile={mobile} />)}
              </div>
            </>
          )}
        </>
      ) : (
        <div style={{ padding:'60px 32px', fontFamily:MONO, fontSize:10, color:MUTED, letterSpacing:'0.2em', textAlign:'center' }}>
          NO SIGNALS MATCH THIS FILTER
        </div>
      )}

    </div>
  );
}
