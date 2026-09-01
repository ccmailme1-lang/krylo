// feedsbay.jsx — FP-3.0 NYT Front Page Anatomy (Founder-approved mockup 2026-06-10)
// Geometry: main well (~66%) | hairline spine | right rail (~34%)
//           well subdivides: text stack (~36%) | dominant image column (~64%)
// Grammar:  story atom = headline → deck → meta, degrading bottom-up.
//           Domain packages: header + subtopic links, LIVE-stamped text stack
//           left, package image right. No boxes, no fills — hairlines and
//           whitespace only. Monotonic density gradient.
// Skin locked per CLAUDE.md §6: #000000, #66FF00, IBM Plex Mono + Georgia.
import React, { useState, useEffect, useMemo } from 'react';
import HelpMark from '../shared/helpmark.jsx';
import LiveTicker from '../shared/liveticker.jsx';
import { useNewsFeed } from '../../hooks/usenewsfeed.js';

const RAIL_HELP = {
  'FEATURED':         'A hand-picked story the system thinks is worth your attention right now.',
  'THE SCROLL':       'A quick-scroll list of smaller stories, for when you just want headlines.',
  'DOMAIN PRESSURE':  'Which topic areas (Tech, Money, Career, etc.) have the most activity right now.',
  'SIGNAL WIRE':      'A raw feed of individual signals as they come in, without editorial grouping.',
};

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

// News source + the live ticker now live in shared modules (KRYL-1251):
//   src/hooks/usenewsfeed.js       — /api/news fetch + deterministic ordering
//   src/components/shared/liveticker.jsx

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
  const [loaded, setLoaded] = React.useState(false);
  return (
    <div style={{ overflow:'hidden', flexShrink:0, background:'#111', ...style }}>
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', opacity: loaded ? 1 : 0, transition:'opacity 0.3s ease' }}
      />
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

// ── Filter ──────────────────────────────────────────────────────────────────
// LiveTicker moved to src/components/shared/liveticker.jsx (KRYL-1251).

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
        <div style={{ fontFamily:MONO, fontSize:9, fontWeight:700, color:LIME, letterSpacing:'0.26em', marginBottom:12, display:'flex', alignItems:'center' }}>
          {label}<HelpMark text={RAIL_HELP[label]} />
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
  const [domain,  setDomain]  = useState('ALL');
  const [sub,     setSub]     = useState('ALL');
  const mobile = useIsMobile();
  // KRYL-1251 — one shared, deterministically-ordered news source. No local
  // fetch, no `fs: Math.random()`. Real articles carry fs: null (FidelityBar
  // renders nothing for null); MOCK keeps authored fs for offline dev.
  const { stories, loading } = useNewsFeed(domain);

  // Page mandate: never render empty — empty sub-filter falls back to full set
  const subFiltered = sub === 'ALL' ? stories : stories.filter(s => s.sub === sub);
  const filtered = subFiltered.length > 0 ? subFiltered : stories;
  // KRYL-1251 — `stories` arrives already ordered (published_at DESC, deterministic
  // tie-break). No re-sort by a fabricated fs score.
  const sorted = filtered;

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
