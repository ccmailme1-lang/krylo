// src/components/hostinteraction.jsx
// WO-1122/1123 — Host Interaction (Conversational Mode)
// Active host: greets guest on query load, asks qualifying questions, tracks replies.
// Guardrails enforced server-side. Mounted globally in app.jsx — all post-Layer-1 views.

import React from 'react';

const MONO  = 'IBM Plex Mono, monospace';
const SERIF = 'Georgia, Charter, "Times New Roman", serif';

function TypewriterText({ text, style, speed = 28 }) {
  const [displayed, setDisplayed] = React.useState('');

  React.useEffect(() => {
    setDisplayed('');
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return <div style={style}>{displayed}</div>;
}

export default function HostInteraction({ contextQuery, view }) {
  const dark      = view === 'oracle';
  const isLayer4  = view === 'proxy';
  const textColor = dark ? 'rgba(0,0,0,0.82)' : 'rgba(255,255,255,0.88)';
  const dimColor  = dark ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.38)';
  const lineColor = dark ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)';

  const [thread,   setThread]   = React.useState([]);
  const [input,    setInput]    = React.useState('');
  const [loading,  setLoading]  = React.useState(false);
  const [stateNum, setStateNum] = React.useState(0);
  const scrollRef   = React.useRef(null);
  const activeQuery = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread, loading]);

  React.useEffect(() => {
    if (!contextQuery || contextQuery === activeQuery.current) return;
    activeQuery.current = contextQuery;
    setThread([]);
    setStateNum(0);
    fire(contextQuery, []);
  }, [contextQuery]);

  async function fire(query, messages) {
    setLoading(true);
    try {
      const res     = await fetch('http://localhost:3001/api/host', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query, messages }),
      });
      const payload = await res.json();
      const reply   = payload.data?.host?.output;
      const state   = payload.data?.state ?? 0;
      if (reply) setThread(t => [...t, { role: 'host', text: reply }]);
      setStateNum(state);
    } catch {
      setThread(t => [...t, { role: 'host', text: 'Signal lost. Try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  const submit = () => {
    if (!input.trim() || loading) return;
    const guestMsg  = input.trim();
    const newThread = [...thread, { role: 'guest', text: guestMsg }];
    setThread(newThread);
    setInput('');
    fire(contextQuery || guestMsg, newThread);
  };

  return (
    <div style={{
      position:  'fixed',
      top:       isLayer4 ? 'auto' : '50%',
      bottom:    isLayer4 ? '32px' : 'auto',
      left:      '24px',
      transform: isLayer4 ? 'none' : 'translateY(-50%)',
      zIndex:    50,
      width:     '280px',
    }}>

      {/* Thread */}
      <div ref={scrollRef} style={{ maxHeight: '340px', overflowY: 'auto', marginBottom: '16px' }}>
        {thread.map((msg, i) => (
          <div key={i} style={{ marginBottom: '14px' }}>
            {msg.role === 'host' ? (
              <TypewriterText
                text={msg.text}
                style={{ fontFamily: SERIF, fontSize: '1.55rem', color: textColor, lineHeight: 1.65 }}
              />
            ) : (
              <div style={{ fontFamily: MONO, fontSize: '0.78rem', color: dimColor, letterSpacing: '0.04em', paddingLeft: '12px', borderLeft: `2px solid ${dimColor}` }}>
                {msg.text}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder=""
          autoFocus
          style={{
            flex:          1,
            background:    'transparent',
            border:        'none',
            outline:       'none',
            caretColor:    'transparent',
            fontFamily:    MONO,
            fontSize:      '1.08rem',
            color:         textColor,
            padding:       '4px 0',
            letterSpacing: '0.03em',
          }}
        />
      </div>
    </div>
  );
}
