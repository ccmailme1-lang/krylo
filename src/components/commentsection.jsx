// src/components/commentsection.jsx
// WO-609: Comment Section — Layer 2 (10K)

import React, { useState } from 'react';

const MONO = 'IBM Plex Mono, monospace';
const LIME = '#66FF00';
const TRUNCATE_CHARS = 300;

const MOCK_COMMENTS = [
  {
    id: 1,
    author: 'M. Chen',
    initials: 'MC',
    badge: 'Core Analyst',
    badgeType: 'analyst',
    time: '2h ago',
    text: 'The leadership silence pattern here is consistent with a pre-announcement window. Regulatory filings typically precede public statements by 14–21 days. This signal is tracking ahead of that curve — if the historical pattern holds, expect a statement within the week.',
    likes: 128,
    replies: [
      {
        id: 11,
        author: 'J. Kowalski',
        initials: 'JK',
        time: '1h ago',
        text: 'Agreed. The filing amendment timing aligns precisely with this read.',
        likes: 18,
      },
      {
        id: 12,
        author: 'Krylo Team',
        initials: 'KT',
        badge: 'Team',
        badgeType: 'team',
        time: '45m ago',
        text: "We're cross-referencing this against the spine signal database. Pending update in the next cycle.",
        likes: 31,
      },
    ],
  },
  {
    id: 2,
    author: 'S. Lee',
    initials: 'SL',
    time: '3h ago',
    text: "The recruiting spike in previously exited markets is the tell. Companies in distress mode don't hire into headwinds unless the exit was strategic and not operational. The signal here points to re-entry, not retreat. Watch the velocity over the next 30 days.",
    likes: 84,
    replies: [],
  },
  {
    id: 3,
    author: 'R. Okonkwo',
    initials: 'RO',
    badge: 'Verified',
    badgeType: 'verified',
    time: '5h ago',
    text: 'Revenue guidance revised downward with an aggressively optimistic investor call is a classic mismatch signal. The delta between stated numbers and projected sentiment has historically been a 60–90 day leading indicator of a correction event.',
    likes: 64,
    replies: [],
  },
  {
    id: 4,
    author: 'D. Alvarez',
    initials: 'DA',
    time: '7h ago',
    text: 'Three exec departures in sixty days with no narrative is not noise. That is a pattern. The board approval without a public statement compounds it. Both data points land in the Forensic tier — high-confidence, multi-source variance.',
    likes: 47,
    replies: [],
  },
];

const BADGE_STYLE = {
  analyst:  { background: 'rgba(102,255,0,0.1)',  color: 'rgba(102,255,0,0.75)' },
  team:     { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' },
  verified: { background: 'rgba(0,255,204,0.1)',  color: 'rgba(0,255,204,0.7)' },
};

/* ── Avatar ──────────────────────────────────────────────────────── */
const Avatar = ({ initials, size = 32 }) => (
  <div style={{
    width:          `${size}px`,
    height:         `${size}px`,
    borderRadius:   '50%',
    background:     'rgba(255,255,255,0.06)',
    border:         '1px solid rgba(255,255,255,0.1)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontFamily:     MONO,
    fontSize:       `${size * 0.25}px`,
    color:          'rgba(255,255,255,0.45)',
    letterSpacing:  '0.04em',
    flexShrink:     0,
  }}>
    {initials}
  </div>
);

/* ── Comment body with read-more ─────────────────────────────────── */
const CommentBody = ({ text }) => {
  const [expanded, setExpanded] = useState(false);
  const needsTrunc = text.length > TRUNCATE_CHARS;
  const display = needsTrunc && !expanded ? text.slice(0, TRUNCATE_CHARS) + '…' : text;

  return (
    <>
      <div style={{ fontFamily: MONO, fontSize: '0.72rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, marginBottom: needsTrunc ? '6px' : '10px' }}>
        {display}
      </div>
      {needsTrunc && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: MONO, fontSize: '0.62rem', color: LIME, letterSpacing: '0.04em', marginBottom: '10px', display: 'block' }}
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </>
  );
};

/* ── Single comment card ─────────────────────────────────────────── */
const CommentCard = ({ comment, isReply = false }) => {
  const badge = comment.badge ? BADGE_STYLE[comment.badgeType] : null;

  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      <Avatar initials={comment.initials} size={isReply ? 28 : 32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
          <span style={{ fontFamily: MONO, fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.88)', letterSpacing: '0.02em' }}>
            {comment.author}
          </span>
          {badge && (
            <span style={{
              ...badge,
              borderRadius:  '999px',
              padding:       '2px 7px',
              fontSize:      '0.56rem',
              letterSpacing: '0.08em',
              fontFamily:    MONO,
            }}>
              {comment.badge}
            </span>
          )}
          <span style={{ fontFamily: MONO, fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>
            {comment.time}
          </span>
        </div>

        <CommentBody text={comment.text} />

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: MONO, fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>
            ↑ {comment.likes}
          </button>
          <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: MONO, fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>
            Reply
          </button>
          {!isReply && (
            <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: MONO, fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>
              Share
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Top-level comment with collapsible replies ───────────────────── */
const TopLevelComment = ({ comment }) => {
  const [repliesOpen, setRepliesOpen] = useState(false);
  const hasReplies = comment.replies?.length > 0;

  return (
    <div style={{ paddingBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <CommentCard comment={comment} />
      {hasReplies && (
        <div style={{ marginLeft: '42px', marginTop: '10px' }}>
          <button
            onClick={() => setRepliesOpen(o => !o)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: MONO, fontSize: '0.62rem', color: LIME, letterSpacing: '0.04em', marginBottom: repliesOpen ? '12px' : 0 }}
          >
            {repliesOpen
              ? '↑ Collapse'
              : `↓ View ${comment.replies.length} repl${comment.replies.length === 1 ? 'y' : 'ies'}`}
          </button>
          {repliesOpen && (
            <div style={{
              borderLeft:     `2px solid rgba(102,255,0,0.15)`,
              paddingLeft:    '14px',
              display:        'flex',
              flexDirection:  'column',
              gap:            '14px',
            }}>
              {comment.replies.map(r => (
                <CommentCard key={r.id} comment={r} isReply />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Main export ─────────────────────────────────────────────────── */
export default function CommentSection() {
  const [sort, setSort]                     = useState('Best');
  const [composerActive, setComposerActive] = useState(false);
  const [composerText, setComposerText]     = useState('');
  const [comments, setComments]             = useState(MOCK_COMMENTS);

  const handlePost = () => {
    if (!composerText.trim()) return;
    const newComment = {
      id:       Date.now(),
      author:   'You',
      initials: 'YO',
      time:     'just now',
      text:     composerText.trim(),
      likes:    0,
      replies:  [],
    };
    setComments(prev => [newComment, ...prev]);
    setComposerText('');
    setComposerActive(false);
  };

  const labelStyle = {
    fontFamily:    MONO,
    fontSize:      '0.58rem',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color:         'rgba(255,255,255,0.35)',
  };

  return (
    <div style={{
      background:   'rgba(255,255,255,0.04)',
      border:       '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px',
      padding:      '16px',
      marginTop:    '10px',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ ...labelStyle }}>
          Community Signal&nbsp;
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>(10.4K)</span>
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={{
            background:    'rgba(255,255,255,0.05)',
            border:        '1px solid rgba(255,255,255,0.08)',
            borderRadius:  '6px',
            color:         'rgba(255,255,255,0.45)',
            fontFamily:    MONO,
            fontSize:      '0.58rem',
            letterSpacing: '0.06em',
            padding:       '5px 8px',
            cursor:        'pointer',
          }}
        >
          <option>Best</option>
          <option>Newest</option>
          <option>Oldest</option>
        </select>
      </div>

      {/* Composer */}
      <div style={{ marginBottom: '20px' }}>
        {!composerActive ? (
          <div
            onClick={() => setComposerActive(true)}
            style={{
              background:    'rgba(255,255,255,0.02)',
              border:        '1px solid rgba(255,255,255,0.07)',
              borderRadius:  '8px',
              padding:       '11px 13px',
              fontFamily:    MONO,
              fontSize:      '0.68rem',
              color:         'rgba(255,255,255,0.2)',
              cursor:        'text',
              letterSpacing: '0.02em',
            }}
          >
            Add to the signal...
          </div>
        ) : (
          <div style={{
            background:   'rgba(255,255,255,0.02)',
            border:       `1px solid rgba(102,255,0,0.2)`,
            borderRadius: '8px',
            padding:      '12px 13px',
          }}>
            <textarea
              autoFocus
              value={composerText}
              onChange={e => setComposerText(e.target.value)}
              placeholder="Add to the signal..."
              rows={3}
              style={{
                width:         '100%',
                background:    'none',
                border:        'none',
                outline:       'none',
                resize:        'none',
                fontFamily:    MONO,
                fontSize:      '0.72rem',
                color:         'rgba(255,255,255,0.82)',
                lineHeight:    1.6,
                letterSpacing: '0.02em',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button
                onClick={() => { setComposerActive(false); setComposerText(''); }}
                style={{
                  background:    'none',
                  border:        '1px solid rgba(255,255,255,0.1)',
                  borderRadius:  '6px',
                  padding:       '6px 12px',
                  fontFamily:    MONO,
                  fontSize:      '0.58rem',
                  color:         'rgba(255,255,255,0.35)',
                  cursor:        'pointer',
                  letterSpacing: '0.06em',
                }}
              >
                Cancel
              </button>
              <button
                style={{
                  background:    composerText.trim() ? LIME : 'rgba(102,255,0,0.15)',
                  border:        'none',
                  borderRadius:  '6px',
                  padding:       '6px 14px',
                  fontFamily:    MONO,
                  fontSize:      '0.58rem',
                  color:         composerText.trim() ? '#000' : 'rgba(102,255,0,0.35)',
                  cursor:        composerText.trim() ? 'pointer' : 'default',
                  letterSpacing: '0.06em',
                }}
                onClick={handlePost}
              >
                Post
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comment list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {comments.map(c => (
          <TopLevelComment key={c.id} comment={c} />
        ))}
      </div>

      {/* Load more */}
      <button style={{
        width:         '100%',
        marginTop:     '18px',
        background:    'none',
        border:        '1px solid rgba(255,255,255,0.07)',
        borderRadius:  '8px',
        padding:       '10px',
        fontFamily:    MONO,
        fontSize:      '0.58rem',
        color:         'rgba(255,255,255,0.25)',
        cursor:        'pointer',
        letterSpacing: '0.1em',
      }}>
        Load more
      </button>

    </div>
  );
}
