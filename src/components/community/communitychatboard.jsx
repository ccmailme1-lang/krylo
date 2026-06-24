// Community — Signal Chat Board
// Tufte: high data-ink ratio, no decorative chrome, hairline dividers, dual voice
import React, { useState, useRef, useEffect } from 'react';

const MONO  = "'IBM Plex Mono', monospace";
const SERIF = "Georgia, 'Times New Roman', serif";
const LIME  = '#66FF00';
const BLUE  = '#007FFF';
const BORDER = 'rgba(255,255,255,0.06)';
const DIM   = 'rgba(255,255,255,0.25)';
const MID   = 'rgba(255,255,255,0.55)';
const BRT   = 'rgba(255,255,255,0.88)';

const SEED_THREADS = [
  {
    id: 1,
    tag: 'SIGNAL THEORY',
    title: 'On convergence lag vs. field reality divergence',
    author: 'RAND_D',
    time: '11:42Z',
    replies: 7,
    messages: [
      { id: 1, author: 'RAND_D',    time: '11:42Z', text: 'Has anyone noticed the classifier hysteresis creating blind spots during rapid phase transitions? Field pressure was clearly building at 0.58 but stateId was still LOW_SIGNAL_YIELD for nearly 40 minutes.' },
      { id: 2, author: 'DiRESTA',   time: '11:51Z', text: 'Yes — this is a known artifact of the persistence buffer. The 3-frame smoothing that prevents false positives also delays true positives. The convergenceScore override at 0.55 was added specifically for this.' },
      { id: 3, author: 'PAUL_W',    time: '12:03Z', text: 'The noveltyDelta gate addresses the discovery problem but not the lag problem. They solve different failure modes.' },
      { id: 4, author: 'RAND_D',    time: '12:17Z', text: 'Agreed. The tri-gate is a pragmatic fix but the underlying architecture still has the fundamental tension between stability and sensitivity. At what point does hysteresis become epistemic conservatism?' },
      { id: 5, author: 'BEN_A',     time: '12:29Z', text: 'That\'s the right question. Hysteresis is operationally justified — but if the threshold is too high you start filtering real signal. The persistence matrix helps. Still needs calibration against live data.' },
      { id: 6, author: 'DiRESTA',   time: '12:44Z', text: 'We should probably run a backtest against the historical frames.ndjson to find the false-negative rate at different persistence thresholds.' },
      { id: 7, author: 'RAND_D',    time: '13:02Z', text: 'Agreed. I can pull the replay frames if someone writes the evaluation harness.' },
    ],
  },
  {
    id: 2,
    tag: 'LENS DESIGN',
    title: 'ATHLETE lens — contract horizon mapping needs work',
    author: 'WES_F',
    time: '10:15Z',
    replies: 4,
    messages: [
      { id: 1, author: 'WES_F',     time: '10:15Z', text: 'The ATHLETE adapter maps IMMEDIATE to "0–24h" but professional contract windows are measured in weeks not hours. The urgency weighting is miscalibrated for this lens.' },
      { id: 2, author: 'PAUL_W',    time: '10:31Z', text: 'The horizon system is lens-agnostic right now — TemporalHorizon.IMMEDIATE is defined as "minutes → hours" globally. The adapter would need to translate the canonical horizon into a lens-specific urgency context.' },
      { id: 3, author: 'BEN_A',     time: '10:48Z', text: 'This is the riskModel() problem deferred in WO-1342. The urgency interpretation is supposed to be modulated by the adapter but that layer isn\'t built yet.' },
      { id: 4, author: 'WES_F',     time: '11:02Z', text: 'Understood — noting it as a calibration issue for when riskModel() Phase A ships. The COA verbs are correct, just the time framing reads wrong to practitioners in this domain.' },
    ],
  },
  {
    id: 3,
    tag: 'PROVENANCE',
    title: 'Provenance DAG depth — what does PROV: 4 actually mean?',
    author: 'De_FILIPPI',
    time: '09:30Z',
    replies: 3,
    messages: [
      { id: 1, author: 'De_FILIPPI', time: '09:30Z', text: 'The intelligence brief will eventually show PROV: N as a depth indicator. Can someone clarify the counting convention? Is it source hops, claim derivation depth, or temporal chain length?' },
      { id: 2, author: 'RAND_D',    time: '09:41Z', text: 'Per WO-1336, provenance depth is the number of nodes in the causal DAG between the raw signal event and the final emergence artifact. Each intermediate validation step adds a node.' },
      { id: 3, author: 'De_FILIPPI', time: '09:55Z', text: 'So PROV: 4 means the emergence conclusion is 4 causal steps from primary evidence. That\'s meaningful — it tells you how many opportunities for error propagation exist. Need to make sure that\'s surfaced in the brief UI when it ships.' },
    ],
  },
  {
    id: 4,
    tag: 'GENERAL',
    title: 'Recommended viewing — Tufte on data density in intelligence displays',
    author: 'BEN_A',
    time: '08:20Z',
    replies: 2,
    messages: [
      { id: 1, author: 'BEN_A',     time: '08:20Z', text: 'Revisiting Tufte\'s work on the Challenger disaster analysis. His point about information suppression through chartjunk is directly applicable to how we\'re thinking about the intelligence brief layout.' },
      { id: 2, author: 'PAUL_W',    time: '08:44Z', text: 'The data-ink ratio principle is one of the reasons the STANDARD/PREMIUM toggle approach is architecturally sound — standard view compresses, premium reveals. That\'s information layering, not decoration.' },
    ],
  },
];

function formatTime(time) { return time; }

function ThreadList({ threads, activeId, onSelect }) {
  return (
    <div style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.3em' }}>COMMUNITY · SIGNAL CHAT</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {threads.map(t => (
          <div
            key={t.id}
            onClick={() => onSelect(t.id)}
            style={{
              padding: '14px 20px',
              borderBottom: `1px solid ${BORDER}`,
              cursor: 'pointer',
              background: activeId === t.id ? 'rgba(102,255,0,0.04)' : 'transparent',
              borderLeft: activeId === t.id ? `2px solid ${LIME}` : '2px solid transparent',
              transition: 'background 120ms',
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 9, color: activeId === t.id ? LIME : DIM, letterSpacing: '0.2em', marginBottom: 5 }}>
              {t.tag}
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 12, color: activeId === t.id ? BRT : MID, lineHeight: 1.4, marginBottom: 6 }}>
              {t.title}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontFamily: MONO, fontSize: 9, color: DIM }}>{t.author}</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: DIM }}>{t.time}</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: DIM }}>{t.replies} replies</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 20px', borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <button style={{
          width: '100%', fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em',
          color: LIME, background: 'transparent', border: `1px solid rgba(102,255,0,0.2)`,
          padding: '8px 0', cursor: 'pointer',
        }}>
          + NEW THREAD
        </button>
      </div>
    </div>
  );
}

function MessageThread({ thread }) {
  const [draft, setDraft]     = useState('');
  const [messages, setMessages] = useState(thread.messages);
  const bottomRef = useRef(null);

  useEffect(() => {
    setMessages(thread.messages);
    setDraft('');
  }, [thread.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handlePost() {
    if (!draft.trim()) return;
    setMessages(m => [...m, {
      id: m.length + 1,
      author: 'YOU',
      time: new Date().toTimeString().slice(0, 5) + 'Z',
      text: draft.trim(),
    }]);
    setDraft('');
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Thread header */}
      <div style={{ padding: '16px 28px 14px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: LIME, letterSpacing: '0.22em', marginBottom: 6 }}>{thread.tag}</div>
        <div style={{ fontFamily: SERIF, fontSize: 18, color: BRT, lineHeight: 1.3 }}>{thread.title}</div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
        {messages.map((msg, i) => (
          <div key={msg.id} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontFamily: MONO, fontSize: 8, color: msg.author === 'YOU' ? LIME : BLUE, letterSpacing: '0.16em' }}>{msg.author}</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: DIM }}>{msg.time}</span>
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 13, color: MID, lineHeight: 1.75, paddingLeft: 0 }}>
              {msg.text}
            </div>
            {i < messages.length - 1 && (
              <div style={{ height: 1, background: BORDER, marginTop: 20 }} />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div style={{ padding: '16px 28px', borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost(); }}
          placeholder="Add to the thread..."
          style={{
            width: '100%', height: 72, background: 'transparent',
            border: `1px solid ${draft.trim() ? 'rgba(102,255,0,0.3)' : BORDER}`,
            padding: '12px 14px', fontFamily: SERIF, fontSize: 13,
            color: BRT, outline: 'none', resize: 'none',
            boxSizing: 'border-box', lineHeight: 1.6,
            transition: 'border-color 200ms',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.14em' }}>⌘ ENTER TO POST</span>
          <button
            onClick={handlePost}
            disabled={!draft.trim()}
            style={{
              fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em',
              background: draft.trim() ? LIME : 'transparent',
              color: draft.trim() ? '#000' : DIM,
              border: draft.trim() ? 'none' : `1px solid ${BORDER}`,
              padding: '6px 20px', cursor: draft.trim() ? 'pointer' : 'default',
              transition: 'all 150ms',
            }}
          >
            POST
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CommunityChatboard() {
  const [activeId, setActiveId] = useState(SEED_THREADS[0].id);
  const activeThread = SEED_THREADS.find(t => t.id === activeId);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#000', fontFamily: MONO,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'row',
        width: 932, height: '100%',
      }}>
        <ThreadList threads={SEED_THREADS} activeId={activeId} onSelect={setActiveId} />
        {activeThread && <MessageThread thread={activeThread} key={activeThread.id} />}
      </div>
    </div>
  );
}
