// feedsbay.jsx — FP-3.0 NYT Front Page Anatomy (Founder-approved mockup 2026-06-10)
// Geometry: main well (~66%) | hairline spine | right rail (~34%)
//           well subdivides: text stack (~36%) | dominant image column (~64%)
// Grammar:  story atom = headline → deck → meta, degrading bottom-up.
//           Domain packages: header + subtopic links, LIVE-stamped text stack
//           left, package image right. No boxes, no fills — hairlines and
//           whitespace only. Monotonic density gradient.
// Skin locked per CLAUDE.md §6: #000000, #66FF00, IBM Plex Mono + Georgia.
import React, { useState, useEffect, useMemo } from 'react';

const MONO  = "'IBM Plex Mono', monospace";
const SERIF = "Georgia, 'Times New Roman', serif";
const BG    = '#000000';
const RULE  = 'rgba(255,255,255,0.10)';
const RULE2 = 'rgba(255,255,255,0.20)';
const LIME  = '#66FF00';
const TEXT  = 'rgba(255,255,255,0.92)';
const SOFT  = 'rgba(255,255,255,0.60)';
const MUTED = 'rgba(255,255,255,0.38)';
const FAINT = 'rgba(255,255,255,0.30)';

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

// Cone domain (server) → feeds domain (page)
const CONE_TO_FEED = {
  capital: 'FINANCIAL', ownership: 'MARKET', media: 'MARKET',
  labor: 'CAREER', technology: 'TECHNOLOGY', knowledge: 'TECHNOLOGY',
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

// ── Atoms ─────────────────────────────────────────────────────────────────────

function Meta({ story }) {
  return (
    <div style={{ fontFamily:MONO, fontSize:8, color:MUTED, letterSpacing:'0.15em', marginTop:6 }}>
      {readTime(story)} MIN READ
    </div>
  );
}

function Credit({ source }) {
  return (
    <div style={{ fontFamily:MONO, fontSize:7, color:FAINT, letterSpacing:'0.12em', marginTop:4 }}>
      {(source ?? 'KRYLO WIRE').toUpperCase()} · KRYLO
    </div>
  );
}

function LiveStamp({ story }) {
  return (
    <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:6 }}>
      <span style={{ fontFamily:MONO, fontSize:9, fontWeight:700, color:LIME, letterSpacing:'0.18em' }}>● LIVE</span>
      <span style={{ fontFamily:MONO, fontSize:8, color:MUTED, letterSpacing:'0.12em' }}>
        {story.publishedAt ? timeAgo(story.publishedAt) : story.time}
      </span>
    </div>
  );
}

function FidelityBar({ fs }) {
  if (fs == null) return null;
  return (
    <div style={{ marginTop:8, height:2, background:'rgba(255,255,255,0.10)', maxWidth:160 }}>
      <div style={{ width:`${Math.round(fs * 100)}%`, height:'100%', background:LIME }} />
    </div>
  );
}

function Img({ imageUrl, style = {} }) {
  if (!imageUrl) return null;
  return (
    <div style={{ overflow:'hidden', flexShrink:0, ...style }}>
      <img src={imageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
    </div>
  );
}

// Story atom: headline → deck → meta. Degrades bottom-up.
function StoryAtom({ story, size = 17, showDeck = false, showFs = false, live = false }) {
  return (
    <div>
      {live && <LiveStamp story={story} />}
      <h3 style={{ fontFamily:SERIF, fontSize:size, fontWeight:700, lineHeight:1.2, color:TEXT, margin:'0 0 4px' }}>
        {story.title}
      </h3>
      {showDeck && story.description && (
        <p style={{ fontFamily:SERIF, fontSize:14, lineHeight:1.55, color:SOFT, margin:'4px 0 0' }}>
          {story.description}
        </p>
      )}
      <Meta story={story} />
      {showFs && <FidelityBar fs={story.fs} />}
    </div>
  );
}

// ── Ticker + Filter (unchanged surfaces) ─────────────────────────────────────

function LiveTicker({ stories }) {
  const items = stories.slice(0, 6);
  if (!items.length) return null;
  return (
    <div style={{
      borderBottom:`1px solid ${RULE}`, padding:'8px 32px',
      display:'flex', alignItems:'center', overflowX:'auto', scrollbarWidth:'none',
    }}>
      <span style={{ fontFamily:MONO, fontSize:9, color:LIME, letterSpacing:'0.2em', marginRight:16, flexShrink:0 }}>● LIVE</span>
      <div style={{ display:'flex', alignItems:'center', flexWrap:'nowrap' }}>
        {items.map((s, i) => (
          <React.Fragment key={s.id}>
            {i > 0 && <span style={{ color:RULE2, margin:'0 12px', fontSize:10 }}>|</span>}
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

function Chip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontFamily:MONO, fontSize:9, letterSpacing:'0.18em',
      color: active ? '#000' : MUTED,
      background: active ? LIME : 'transparent',
      border:`1px solid ${active ? LIME : 'rgba(255,255,255,0.18)'}`,
      padding:'3px 10px', cursor:'pointer', borderRadius:2,
      whiteSpace:'nowrap', transition:'all 120ms',
    }}>
      {label}
    </button>
  );
}

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

// ── Main well: top package — text stack left, dominant image right ───────────

function TopWell({ lead, related, photo, mobile }) {
  if (mobile) {
    return (
      <div>
        <StoryAtom story={lead} size={26} showDeck showFs />
        {photo && (
          <div style={{ marginTop:20 }}>
            <Img imageUrl={photo.imageUrl} style={{ width:'100%', height:210 }} />
            <Credit source={photo.source} />
            <div style={{ marginTop:8 }}><StoryAtom story={photo} size={19} showDeck /></div>
          </div>
        )}
        {related.map(s => (
          <div key={s.id} style={{ borderTop:`1px solid ${RULE}`, marginTop:16, paddingTop:16 }}>
            <StoryAtom story={s} size={17} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display:'flex', gap:32 }}>
      {/* TEXT STACK — 36% of well */}
      <div style={{ width:'36%', flexShrink:0 }}>
        <StoryAtom story={lead} size={26} showDeck showFs />
        {related.map(s => (
          <div key={s.id} style={{ borderTop:`1px solid ${RULE}`, marginTop:18, paddingTop:18 }}>
            <StoryAtom story={s} size={17} />
          </div>
        ))}
      </div>
      {/* DOMINANT IMAGE COLUMN — 64% of well */}
      <div style={{ flex:1, minWidth:0 }}>
        {photo ? (
          <>
            <Img imageUrl={photo.imageUrl} style={{ width:'100%', height:340 }} />
            <Credit source={photo.source} />
            <div style={{ marginTop:10 }}><StoryAtom story={photo} size={20} showDeck /></div>
          </>
        ) : (
          <StoryAtom story={related[related.length - 1] ?? lead} size={20} showDeck />
        )}
      </div>
    </div>
  );
}

// ── Domain package — header + subtopics, LIVE text stack left, image right ───

function PackageSection({ domain, stories, setDomain, mobile }) {
  const photo   = stories.find(s => s.imageUrl);
  const lead    = stories.find(s => s !== photo) ?? stories[0];
  const related = stories.filter(s => s !== lead && s !== photo).slice(0, 2);
  const subs    = (SUBCATEGORIES[domain] ?? []).slice(0, 4);
  const canNav  = DOMAINS.includes(domain);

  return (
    <div style={{ borderTop:`1px solid ${RULE2}`, marginTop:28, paddingTop:20 }}>
      {/* Package header: domain label + plain-text subtopic links */}
      <div style={{ display:'flex', alignItems:'baseline', gap:18, flexWrap:'wrap', marginBottom:16 }}>
        <span style={{ fontFamily:MONO, fontSize:10, fontWeight:700, color:LIME, letterSpacing:'0.26em' }}>{domain}</span>
        {subs.map(t => (
          <span key={t} style={{ fontFamily:MONO, fontSize:8, color:MUTED, letterSpacing:'0.16em' }}>{t}</span>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection: mobile ? 'column' : 'row', gap: mobile ? 18 : 32 }}>
        {/* TEXT STACK */}
        <div style={{ width: mobile ? '100%' : '36%', flexShrink:0 }}>
          <StoryAtom story={lead} size={19} showDeck live />
          {canNav && (
            <button onClick={() => setDomain(domain)} style={{
              fontFamily:MONO, fontSize:9, letterSpacing:'0.18em', color:LIME,
              background:'transparent', border:'none', padding:0, cursor:'pointer',
              marginTop:10, display:'block',
            }}>
              SEE MORE {domain} SIGNALS ›
            </button>
          )}
          {related.map(s => (
            <div key={s.id} style={{ borderTop:`1px solid ${RULE}`, marginTop:16, paddingTop:16 }}>
              <StoryAtom story={s} size={15} />
            </div>
          ))}
        </div>
        {/* PACKAGE IMAGE */}
        {photo && (
          <div style={{ flex:1, minWidth:0 }}>
            <Img imageUrl={photo.imageUrl} style={{ width:'100%', height: mobile ? 200 : 280 }} />
            <Credit source={photo.source} />
            <div style={{ marginTop:8 }}><StoryAtom story={photo} size={17} /></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Right rail sections — hairline-separated, no boxes ───────────────────────

function RailSection({ label, children, first = false }) {
  return (
    <div style={{ borderTop: first ? 'none' : `1px solid ${RULE}`, marginTop: first ? 0 : 20, paddingTop: first ? 0 : 18 }}>
      {label && (
        <div style={{ fontFamily:MONO, fontSize:9, fontWeight:700, color:LIME, letterSpacing:'0.26em', marginBottom:12 }}>
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

function RailFeature({ story, extra }) {
  if (!story) return null;
  return (
    <div>
      {/* Mosaic: large image + up to 2 small stacked beside it */}
      <div style={{ display:'flex', gap:6 }}>
        <Img imageUrl={story.imageUrl} style={{ flex:2, height:170 }} />
        {extra.length > 0 && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
            {extra.map(s => <Img key={s.id} imageUrl={s.imageUrl} style={{ flex:1, minHeight:0 }} />)}
          </div>
        )}
      </div>
      <Credit source={story.source} />
      <div style={{ marginTop:8 }}><StoryAtom story={story} size={20} showDeck /></div>
    </div>
  );
}

function RailPair({ pair }) {
  if (!pair.length) return null;
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      {pair.map(s => (
        <div key={s.id}>
          <Img imageUrl={s.imageUrl} style={{ width:'100%', height:110, marginBottom:8 }} />
          <StoryAtom story={s} size={14} />
        </div>
      ))}
    </div>
  );
}

function RailScroll({ stories }) {
  if (!stories.length) return null;
  return (
    <div>
      {stories.map((s, i) => (
        <div key={s.id} style={{ marginBottom: i < stories.length - 1 ? 12 : 0 }}>
          <div style={{ fontFamily:MONO, fontSize:8, color:LIME, letterSpacing:'0.14em', marginBottom:2 }}>
            {s.type} · {s.publishedAt ? timeAgo(s.publishedAt) : s.time}
          </div>
          <div style={{ fontFamily:SERIF, fontSize:13, fontWeight:700, lineHeight:1.35, color:TEXT }}>
            {s.title}
          </div>
        </div>
      ))}
    </div>
  );
}

function RailPressure({ stories }) {
  const counts = {};
  stories.forEach(s => { counts[s.type] = (counts[s.type] ?? 0) + 1; });
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max  = Math.max(1, ...rows.map(([, n]) => n));
  if (!rows.length) return null;
  return (
    <div>
      {rows.map(([d, n]) => (
        <div key={d} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
          <span style={{ fontFamily:MONO, fontSize:8, color:SOFT, letterSpacing:'0.16em' }}>{d}</span>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:70, height:2, background:'rgba(255,255,255,0.10)' }}>
              <div style={{ width:`${Math.round((n / max) * 100)}%`, height:'100%', background:LIME }} />
            </div>
            <span style={{ fontFamily:MONO, fontSize:9, color:MUTED, minWidth:14, textAlign:'right' }}>{n}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RailWire({ stories }) {
  if (!stories.length) return null;
  return (
    <div>
      {stories.map((s, i) => (
        <div key={s.id} style={{ display:'flex', gap:8, alignItems:'baseline', marginBottom: i < stories.length - 1 ? 8 : 0 }}>
          <span style={{ fontFamily:MONO, fontSize:8, color:LIME, flexShrink:0 }}>▸</span>
          <span style={{ fontFamily:SERIF, fontSize:12, lineHeight:1.4, color:SOFT }}>{s.title}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FeedsBay() {
  const [stories, setStories] = useState(MOCK);
  const [loading, setLoading] = useState(false);
  const [domain,  setDomain]  = useState('ALL');
  const [sub,     setSub]     = useState('ALL');
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
            type: domain !== 'ALL' ? domain : (CONE_TO_FEED[a.domain] ?? 'SIGNAL'),
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

  // Page mandate: never render empty — empty sub-filter falls back to full set
  const subFiltered = sub === 'ALL' ? stories : stories.filter(s => s.sub === sub);
  const filtered = subFiltered.length > 0 ? subFiltered : stories;
  const sorted = useMemo(() => [...filtered].sort((a, b) => (b.fs ?? 0) - (a.fs ?? 0)), [filtered]);

  // Allocation: top well → rail features → digest/wire → domain packages take the rest
  const alloc = useMemo(() => {
    const used = new Set();
    const take = (pred, n = 1) => {
      const out = [];
      for (const s of sorted) {
        if (out.length >= n) break;
        if (!used.has(s.id) && (!pred || pred(s))) { out.push(s); used.add(s.id); }
      }
      return out;
    };
    const lead        = take(s => s.description)[0] ?? take()[0];
    const photo       = take(s => s.imageUrl)[0] ?? null;
    const related     = take(null, 2);
    const railFeature = take(s => s.imageUrl)[0] ?? null;
    const railExtra   = take(s => s.imageUrl, 2);
    const railPair    = take(s => s.imageUrl, 2);
    const digest      = take(null, 5);
    const wire        = take(null, 6);
    const rest        = sorted.filter(s => !used.has(s.id));
    const groups = {};
    rest.forEach(s => { (groups[s.type] = groups[s.type] ?? []).push(s); });
    const packages = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
    return { lead, photo, related, railFeature, railExtra, railPair, digest, wire, packages };
  }, [sorted]);

  const pad = mobile ? '14px 16px' : '18px 32px 14px';

  return (
    <div style={{ background:BG, color:TEXT, height:'100%', overflowY:'auto', zoom:0.9 }}>
     <div style={{ maxWidth:1280, margin:'0 auto' }}>

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
          <div style={{ fontFamily:MONO, fontSize:7, color:MUTED, letterSpacing:'0.3em', marginTop:3 }}>SIGNAL / INTELLIGENCE · FP-3.0</div>
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

      {alloc.lead ? (
        mobile ? (
          <div style={{ padding:'24px 16px 48px' }}>
            <TopWell lead={alloc.lead} related={alloc.related} photo={alloc.photo} mobile />
            {alloc.packages.map(([d, items]) => (
              <PackageSection key={d} domain={d} stories={items} setDomain={setDomain} mobile />
            ))}
            <RailSection label="FEATURED"><RailFeature story={alloc.railFeature} extra={alloc.railExtra} /></RailSection>
            <RailSection><RailPair pair={alloc.railPair} /></RailSection>
            <RailSection label="THE SCROLL"><RailScroll stories={alloc.digest} /></RailSection>
            <RailSection label="DOMAIN PRESSURE"><RailPressure stories={sorted} /></RailSection>
            <RailSection label="SIGNAL WIRE"><RailWire stories={alloc.wire} /></RailSection>
          </div>
        ) : (
          <div style={{ display:'flex', padding:'28px 32px 56px' }}>
            {/* MAIN WELL ~66% */}
            <div style={{ flex:2, minWidth:0, paddingRight:28 }}>
              <TopWell lead={alloc.lead} related={alloc.related} photo={alloc.photo} mobile={false} />
              {alloc.packages.map(([d, items]) => (
                <PackageSection key={d} domain={d} stories={items} setDomain={setDomain} mobile={false} />
              ))}
            </div>
            {/* HAIRLINE SPINE + RIGHT RAIL ~34% */}
            <div style={{ flex:1, minWidth:0, borderLeft:`1px solid ${RULE2}`, paddingLeft:28 }}>
              <RailSection first><RailFeature story={alloc.railFeature} extra={alloc.railExtra} /></RailSection>
              <RailSection><RailPair pair={alloc.railPair} /></RailSection>
              <RailSection label="THE SCROLL"><RailScroll stories={alloc.digest} /></RailSection>
              <RailSection label="DOMAIN PRESSURE"><RailPressure stories={sorted} /></RailSection>
              <RailSection label="SIGNAL WIRE"><RailWire stories={alloc.wire} /></RailSection>
            </div>
          </div>
        )
      ) : (
        <div style={{ padding:'60px 32px', fontFamily:MONO, fontSize:10, color:MUTED, letterSpacing:'0.2em', textAlign:'center' }}>
          NO SIGNALS MATCH THIS FILTER
        </div>
      )}

     </div>
    </div>
  );
}
